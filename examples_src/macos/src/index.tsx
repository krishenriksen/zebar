/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { createStore } from 'solid-js/store';
import { createSignal, createEffect, createMemo } from 'solid-js';
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
  type MenuItem = {
    name: string;
    action: string;
    hwnd: number;
    icon?: string | null;
    key?: string | null;
    disabled?: boolean;
  };
  
  type MenuGroup = {
    name: string;
    items: MenuItem[];
  };

  type DropdownOption = {
    name: string;
    items?: MenuItem[];
  };

  type ModuleType = {
    applicationTitles: string[];
    menuItems: {
      name: string;
      items: {
        name: string;
        action: string;
        hwnd: number;
        icon?: string | null;
        key?: string | null;
        disabled?: boolean;
      }[];
    }[];
  };

  const [isMenuVisible, setMenuVisible] = createSignal(false);
  const [activeMenuName, setActiveMenuName] = createSignal<string | null>(
    null,
  );
  const windowsModule = Applications['Windows'];
  const fileExplorerModule = Applications['FileExplorer'];
  const [appSpecificOptions, setAppSpecificOptions] = createSignal<DropdownOption[]>(
    [
      ...(windowsModule
        ? windowsModule.menuItems.map((menuGroup: MenuGroup) => ({
            name: menuGroup.name,
            items: menuGroup.items.map((item: MenuItem) => ({
              name: item.name,
              action: item.action,
              hwnd: 0,
              icon: item.icon || null,
              key: item.key || null,
              disabled: item.disabled || false,
            })),
          }))
        : []),
      ...(fileExplorerModule
        ? fileExplorerModule.menuItems.map((menuGroup: MenuGroup) => ({
            name: menuGroup.name,
            items: menuGroup.items.map((item: MenuItem) => ({
              name: item.name,
              action: item.action,
              hwnd: 0,
              icon: item.icon || null,
              key: item.key || null,
              disabled: item.disabled || false,
            })),
          }))
        : []),
    ],
  );
  const defaultTitle = 'File Explorer';
  const replaceTitle = ['Program Manager'];

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

      // Check if the module exists in Applications
      const module: ModuleType | undefined = Object.values(
        Applications
      ).find(mod => 
        mod.applicationTitles && mod.applicationTitles.includes(title)
      );

      if (module) {
        module.menuItems.forEach((section: MenuGroup) => {
          options.push({
            name: section.name,
            items: section.items.map((item: MenuItem) => ({
              name: item.name,
              action: item.action,
              hwnd: hwnd,
              icon: item.icon || null,
              key: item.key || null,
              disabled: item.disabled || false,
            })),
          });
        });
      } else {
        // If the module is not found, add only the title and hwnd
        options.push({
          name: title
        });
      }

      // Update appSpecificOptions while preserving the Windows module at index 0
      setAppSpecificOptions(prevOptions => {
        const firstOption = prevOptions[0];
        return [firstOption, ...options];
      });
    }
  });

  const handleMenuInteraction = async (
    e: MouseEvent,
    name: string | (() => string),
    index: number,
    items: MenuItem[],
  ) => {
    const target = e.currentTarget as HTMLButtonElement;
    const rect = target.getBoundingClientRect();
    const monitorInfo = await currentMonitor();
    const monitor = monitorInfo?.position || { x: 0, y: 0 };
    const adjustedLeft = monitor?.x + rect.left;
    const button_x = Math.round(adjustedLeft);

    showMenu(
      name,
      index,
      items,
      button_x,
      monitor?.y > 0 ? monitor?.y + 10 : monitor?.y || 0,
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

  interface IconCacheValue {
    element: HTMLLIElement;
    processed: boolean;
  }

  const iconCache: Map<string, IconCacheValue> = new Map();

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
            if (tooltip.includes('gpu - nvidia geforce rtx 5080')) return 2;
            if (tooltip.includes('gpu - nvidia geforce rtx 3060')) return 3;
            return 99; // everything else gets a lower priority
          };

          return getPriority(a) - getPriority(b);
        })
        .map((icon: SystrayIcon) => {
          if (iconCache.has(icon.id)) {
            const cachedIcon = iconCache.get(icon.id);
            if (cachedIcon) {
              const img = cachedIcon.element.querySelector('img');
              if (img) {
                if (!cachedIcon.processed) {
                  img.src = icon.iconUrl;
                  img.title = icon.tooltip;
                }
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
                <img
                  src={icon.iconUrl}
                  title={icon.tooltip}
                  onLoad={e => {
                    const img = e.currentTarget as HTMLImageElement;

                    // Check if the icon has already been processed
                    const cachedIcon = iconCache.get(icon.id);
                    if (cachedIcon?.processed) {
                      return;
                    }

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (ctx) {
                      canvas.width = img.width;
                      canvas.height = img.height;
                      ctx.drawImage(img, 0, 0, img.width, img.height);

                      // Get the top-left 10x10 pixel area
                      const imageData = ctx.getImageData(0, 0, 10, 10);
                      const pixels = imageData.data;

                      let isWhite = true;

                      // Check each pixel in the 10x10 area
                      for (let i = 0; i < pixels.length; i += 4) {
                        const [r, g, b, a] = [
                          pixels[i],     // Red
                          pixels[i + 1], // Green
                          pixels[i + 2], // Blue
                          pixels[i + 3], // Alpha
                        ];

                        // If any pixel is not white, set isWhite to false and break
                        if (a > 0 && (r <= 240 || g <= 240 || b <= 240)) {
                          isWhite = false;
                          break;
                        }
                      }

                      // If the entire 10x10 area is white, replace all white pixels in the image with black
                      if (isWhite) {
                        const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const fullPixels = fullImageData.data;

                        for (let i = 0; i < fullPixels.length; i += 4) {
                          const [r, g, b, a] = [
                            fullPixels[i],     // Red
                            fullPixels[i + 1], // Green
                            fullPixels[i + 2], // Blue
                            fullPixels[i + 3], // Alpha
                          ];

                          // If the pixel is white, make it black
                          if (a > 0 && r > 240 && g > 240 && b > 240) {
                            fullPixels[i] = 0;     // Red
                            fullPixels[i + 1] = 0; // Green
                            fullPixels[i + 2] = 0; // Blue
                          }
                        }

                        // Put the modified image data back on the canvas
                        ctx.putImageData(fullImageData, 0, 0);

                        // Update the image source with the modified canvas
                        img.src = canvas.toDataURL();

                        // Mark the icon as processed in the cache only if it is white
                        iconCache.set(icon.id, { element: li as HTMLLIElement, processed: true });
                      }
                    }
                  }}
                />
              </li>
            );

            iconCache.set(icon.id, { element: li as HTMLLIElement, processed: false });
          }

          return iconCache.get(icon.id)?.element;
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
