/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { createStore } from 'solid-js/store';
import { createSignal, createEffect, createMemo, JSX } from 'solid-js';
import { createProviderGroup, shellExec, showMenu, hideMenu } from 'zebar';
import { currentMonitor } from '@tauri-apps/api/window';

// Use Vite's import.meta.glob to import all files dynamically
const modules = import.meta.glob('./applications/*.ts', { eager: true });
const Applications: Record<string, any> = {};
Object.keys(modules).forEach(filePath => {
  const moduleName = filePath.replace(/.*\/(.*)\.ts$/, '$1');
  Applications[moduleName] = modules[filePath];
});

function App() {
  /*
    cpu: { type: 'cpu', refreshInterval: 5000 },
    memory: { type: 'memory', refreshInterval: 5000 },
    gpu: { type: 'gpu', refreshInterval: 5000 },
  */

  const providers = createProviderGroup({
    audio: { type: 'audio' },
    systray: { type: 'systray' },
    window: { type: 'window' },
    date: { type: 'date', formatting: 'EEE d MMM t' },
    fullDate: { type: 'date', formatting: 'EEEE, MMMM d, yyyy' },
  });

  const [output, setOutput] = createStore(providers.outputMap);
  createEffect(() => providers.onOutput(setOutput));

  /**
   * Get menu entries for specific applications
   */
  type DropdownOption = {
    name: string;
    action?: string;
    hwnd?: number;
    icon?: string | null; // Add this line to include the 'icon' property
    key?: string | null;
  };

  type ModuleType = {
    titles: string[];
    menuItems: {
      name: string;
      items: { name: string; action: string, hwnd: number }[];
    }[];
    applicationTitles: string[];
  };

  const [isMenuVisible, setMenuVisible] = createSignal(false);
  const [activeMenuName, setActiveMenuName] = createSignal<string | null>(
    null,
  );
  const [appSpecificOptions, setAppSpecificOptions] = createSignal<
    DropdownOption[]
  >([]);
  const defaultTitle = 'File Explorer';
  const replaceTitle = ['Zebar - macos/macos', 'Program Manager'];

  createEffect(async () => {
    let title = replaceTitle.includes(output.window?.title)
      ? defaultTitle
      : output.window?.title;

    if (title && output.window?.hwnd) {
      // Extract the last part of the title or fallback to the full title
      title = title
        .replace(' – ', ' - ') // En-dash
        .replace(' — ', ' - ') // Em-dash
        .split(' - ')
        .filter((s: string) => s.trim() !== '')
        .pop()
        ?.trim();

      const hwnd = parseInt(output.window.hwnd);

      // close the current menu
      hideMenu();
      setMenuVisible(false);
      setActiveMenuName(null);

      let options: DropdownOption[] = [];

      // Always add the Windows module to options
      const windowsModule = Applications['Windows'];
      if (windowsModule) {
        windowsModule.menuItems.forEach((menuItem: any) => {
          options.push({
            name: menuItem.name,
            items: menuItem.items.map((item: any) => ({
              name: item.name,
              action: item.action,
              hwnd: hwnd,
              icon: item.icon || null,
              key: item.key || null,         
            })),
          });
        });
      }

      // Check if the module exists in Applications
      const module: ModuleType | undefined = Object.values(
        Applications,
      ).find(
        mod =>
          mod.applicationTitles && mod.applicationTitles.includes(title),
      );

      if (module) {
        // Add sections with sub-items
        module.menuItems.forEach(section => {
          options.push({
            name: section.name,
            items: section.items.map(item => ({
              name: item.name,
              action: item.action,
              hwnd: hwnd,
              icon: item.icon || null,
              key: item.key || null,          
            })),
          });
        });
      } else {
        // If the module is not found, add only the title and hwnd
        options.push({
          name: title
        });
      }

      setAppSpecificOptions(options);
    }
  });

  const handleMenuInteraction = async (
    e: MouseEvent,
    name: string | (() => string),
    index: number,
    items: DropdownOption[],
  ) => {
    const target = e.currentTarget as HTMLButtonElement;
    const rect = target.getBoundingClientRect();
    const monitorInfo = await currentMonitor();
    const monitor = monitorInfo?.position || { x: 0, y: 0 };
    const adjustedLeft = monitor?.x + rect.left;
    const button_x = Math.round(adjustedLeft);

    // Map items to tuples
    const subItems = items.map(item => [
      item.name,
      item.action || '',
      item.hwnd || 0,
      item.icon || null,
      item.key || null,
    ]);

    showMenu(
      name,
      index,
      subItems,
      button_x,
      monitor?.y > 0 ? monitor?.y + 14 : monitor?.y || 0,
    );
  };

  /**
   * set volume
   */
  const [isVolumeVisible, setVolumeVisible] = createSignal(false);
  let volumeInteval: number | undefined;

  /**
   * Handle volume slider visibility
   * Toggles the volume slider visibility and sets a timeout to hide it after a delay
   * @param {MouseEvent} e
   * @returns {void}
   */
  const handleVolume = (e: any) => {
    setVolumeVisible(true);

    if (volumeInteval) {
      clearTimeout(volumeInteval);
    }

    volumeInteval = setTimeout(() => {
      setVolumeVisible(false);
    }, 1000);
  };

  /**
   * Renders the icons in the system tray.
   */
  type SystrayIcon = {
    id: string;
    iconUrl: string;
    tooltip: string;
  };

  const iconCache = new Map<string, JSX.Element>();

  const SystrayIcons = createMemo(() => {
    if (output.systray) {
      // remove icons that are not in the current output
      const currentIds = new Set(
        output.systray.icons.map((icon: { id: any }) => icon.id),
      );
      iconCache.forEach((_, id) => {
        if (!currentIds.has(id)) {
          iconCache.delete(id);
        }
      });

      return output.systray.icons
        .filter(
          (icon: SystrayIcon) =>
            !icon.tooltip?.toLowerCase().includes('speakers'),
        )
        .sort((a: SystrayIcon, b: SystrayIcon) => {
          const getPriority = (icon: SystrayIcon) => {
            const tooltip = icon.tooltip?.toLowerCase() || '';
            if (tooltip.includes('cpu core')) return 1;
            if (tooltip.includes('gpu')) return 2;
            return 99; // everything else gets a lower priority
          };

          return getPriority(a) - getPriority(b);
        })
        .map((icon: SystrayIcon) => {
          if (iconCache.has(icon.id)) {
            const cachedIcon = iconCache.get(icon.id) as HTMLLIElement;
            if (cachedIcon) {
              const img = cachedIcon.querySelector('img');
              if (img) {
                img.src = icon.iconUrl;
                img.title = icon.tooltip;
              }
            }
          } else {
            const li = (
              <li
                id={icon.id}
                class="systray-icon"
                onClick={e => {
                  e.preventDefault();
                  output.systray?.onLeftClick(icon.id);
                }}
                onContextMenu={e => {
                  e.preventDefault();
                  output.systray?.onRightClick(icon.id);
                }}
              >
                <img src={icon.iconUrl} title={icon.tooltip} />
              </li>
            );

            iconCache.set(icon.id, li);
          }

          return iconCache.get(icon.id);
        });
    }

    return null;
  });

  return (
    <div class="app">
      <div class="left">
        <ul>
          {appSpecificOptions().map(({ name, items }, index) => (
            <li>
              <button
                class={`${
                  index === 0 ? 'nf nf-fa-windows' : ''
                } ${isMenuVisible() && activeMenuName() === name ? 'active' : ''}`}
                onClick={e => {
                  if (isMenuVisible()) {
                    hideMenu();
                    setActiveMenuName(null);
                  } else {
                    setActiveMenuName(name);
                    handleMenuInteraction(e, name, index, items || []);
                  }

                  setMenuVisible(!isMenuVisible());
                }}
                onMouseEnter={async e => {
                  if (isMenuVisible() && activeMenuName() !== name) {
                    setActiveMenuName(name);
                    handleMenuInteraction(e, name, index, items || []);
                  }
                }}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div class="right">
        <ul>
          {output.audio?.defaultPlaybackDevice && (
            <li>
              <button
                class={`volume-container ${isVolumeVisible() ? 'active' : ''}`}
                onMouseMove={handleVolume}
              >
                <i
                  class={`volume nf ${
                    output.audio.defaultPlaybackDevice.volume === 0
                      ? 'nf-fa-volume_xmark'
                      : output.audio.defaultPlaybackDevice.volume < 20
                        ? 'nf-fa-volume_low'
                        : output.audio.defaultPlaybackDevice.volume < 40
                          ? 'nf-fa-volume_low'
                          : 'nf-fa-volume_high'
                  }`}
                ></i>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="2"
                  value={output.audio.defaultPlaybackDevice.volume}
                  onInput={e =>
                    output.audio?.setVolume(e.target.valueAsNumber)
                  }
                />
              </button>
            </li>
          )}

          {SystrayIcons()}

          {output.date && (
            <li title={output.fullDate?.formatted}>
              <button
                class="date"
                onClick={() => {
                  shellExec('powershell', [
                    '-Command',
                    'start ms-actioncenter:',
                  ]);
                }}
              >
                {output.date?.formatted}
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

render(() => <App />, document.getElementById('root')!);
