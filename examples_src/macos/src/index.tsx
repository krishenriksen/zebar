/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { createStore } from 'solid-js/store';
import { createProviderGroup } from 'zebar';
import { createSignal, createEffect, createMemo, JSX } from 'solid-js';

import { performAction } from './actions';

import { dropdownOptions } from './dropdownOptions';
import { countdownOptions } from './countdownOptions';

// Use Vite's import.meta.glob to import all files dynamically
const modules = import.meta.glob('./applications/*.ts', { eager: true });
const Applications: Record<string, any> = {};
Object.keys(modules).forEach(filePath => {
  const moduleName = filePath.replace(/.*\/(.*)\.ts$/, '$1');
  Applications[moduleName] = modules[filePath];
});

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

export const [output, setOutput] = createStore(providers.outputMap);

export type DropdownOption = {
  name: string | (() => string);
  icon?: string | { icon: string; key: string };
  action: (hwnd?: number) => void;
  hwnd?: number;
};

function App() {
  type SystrayIcon = {
    id: string;
    iconUrl: string;
    tooltip: string;
  };
  const iconCache = new Map<string, JSX.Element>();

  const [countdown, setCountdown] = createSignal(60);
  const [countdownActive, setCountdownActive] = createSignal('');
  let countdownInteval: number | undefined;

  type ModuleType = {
    titles: string[];
    menuItems: DropdownOption[];
  };
  const [title, setTitle] = createSignal<string[]>([]);
  const [appSpecificOptions, setAppSpecificOptions] = createSignal<
    DropdownOption[]
  >([]);
  const defaultTitle = 'File Explorer';
  const replaceTitle = ['Zebar - macos/macos', 'Program Manager'];

  const [isDropdownVisible, setDropdownVisible] = createSignal(false);
  const [isVolumeVisible, setVolumeVisible] = createSignal(false);
  let volumeInteval: number | undefined;

  createEffect(() => providers.onOutput(setOutput));

  /**
   * Renders the icons in the system tray.
   */
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

  /**
   * Countdown timer for specific actions
   */
  const startCountdown = (name: string, action: () => void) => {
    if (countdownActive() === name) {
      resetCountdown();
      action();
      return;
    }

    resetCountdown();
    setCountdownActive(name);

    countdownInteval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          resetCountdown();
          action();
        }

        return prev - 1;
      });
    }, 1000);
  };

  const resetCountdown = () => {
    clearInterval(countdownInteval);
    countdownInteval = undefined;
    setCountdownActive('');
    setCountdown(60);
  };

  /**
   * Get menu entries for specific applications
   * Dynamically import the file based on the application title
   */
  createEffect(async () => {
    let title = output.window?.title;

    if (title && output.window?.hwnd) {
      if (replaceTitle.includes(title)) {
        title = defaultTitle;
      }

      // Extract the last part of the title or fallback to the full title
      const sanitizedTitle = title
        .replace(' – ', ' - ') // En-dash
        .replace(' — ', ' - ') // Em-dash
        .split(' - ')
        .filter((s: string) => s.trim() !== '')
        .pop()
        ?.trim();

      const hwnd = parseInt(output.window.hwnd);

      let matchedModule: any = null;

      Object.values(Applications).forEach((module: ModuleType) => {
        if (module.titles.includes(sanitizedTitle)) {
          matchedModule = module;
        }
      });

      let options = { menuItems: [], title: sanitizedTitle };

      if (matchedModule) {
        options = {
          menuItems: matchedModule.menuItems.map(
            (item: DropdownOption) => ({ ...item, hwnd }),
          ),
          title: matchedModule.titles[0],
        };
      }

      setAppSpecificOptions(options.menuItems);
      setTitle([options.title || defaultTitle]);
    }
  });

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

  return (
    <div class="app">
      <div class="left">
        <i
          class={`logo nf nf-fa-windows ${isDropdownVisible() ? 'active' : ''}`}
          onClick={() => {
            setDropdownVisible(!isDropdownVisible());
          }}
        ></i>

        <ul>
          {dropdownOptions.map(({ name, action }) => (
            <li class={isDropdownVisible() ? 'inline-flex' : 'none'}>
              <button
                onClick={() => action()}
                class={
                  typeof name === 'function' && name().includes('update')
                    ? 'updates'
                    : ''
                }
              >
                {typeof name === 'function' && name().includes('update')
                  ? ''
                  : typeof name === 'function'
                    ? name()
                    : name}
                {typeof name === 'function' &&
                  name().includes('update') && (
                    <span class="badge">{name()}</span>
                  )}
              </button>
            </li>
          ))}

          {countdownOptions.map(({ name, icon, action }) => (
            <li
              classList={{
                act: countdownActive() === name,
                'inline-flex': isDropdownVisible(),
                none: !isDropdownVisible(),
              }}
            >
              <button
                onClick={() => {
                  startCountdown(name, action);
                }}
              >
                {name} {countdownActive() === name && `(${countdown()}s)`}
                {typeof icon === 'string' ? (
                  <i class={`nf ${icon}`}></i>
                ) : (
                  icon && (
                    <i class={`nf ${icon.icon}`}>
                      <span>{icon.key}</span>
                    </i>
                  )
                )}
              </button>
              {countdownActive() === name && (
                <button onClick={resetCountdown}>Cancel</button>
              )}
            </li>
          ))}

          {!isDropdownVisible() && (
            <li class="application">
              <button
                onClick={() => {
                  const hwnd = appSpecificOptions()[0]?.hwnd;
                  const action = appSpecificOptions()[0]?.action;
                  if (typeof action === 'function') {
                    action(hwnd);
                  }
                }}
              >
                {title()?.length ? title() : defaultTitle}
              </button>
            </li>
          )}

          {!isDropdownVisible() &&
            appSpecificOptions().map(({ name, action, hwnd }) => (
              <li>
                <button
                  onClick={() =>
                    typeof action === 'function' ? action(hwnd) : undefined
                  }
                >
                  {typeof name === 'string' ? name : name()}
                </button>
              </li>
            ))}
        </ul>
      </div>

      <div class="right">
        <ul>
          {output.cpu && (
            <li title="CPU Usage">
              <button
                onClick={() => {
                  performAction('Start-Process taskmgr');
                }}
              >
                <i class="nf nf-oct-cpu">
                  <span class={output.cpu.usage > 85 ? 'high-usage' : ''}>
                    {Math.round(output.cpu.usage)}%
                  </span>
                </i>
              </button>
            </li>
          )}

          {output.memory && (
            <li title="Memory Usage">
              <button
                onClick={() => {
                  performAction('Start-Process taskmgr');
                }}
              >
                <i class="nf nf-fae-chip">
                  <span>{Math.round(output.memory.usage)}%</span>
                </i>
              </button>
            </li>
          )}

          {output.gpu &&
            output.gpu.gpus &&
            output.gpu.gpus.map((gpu: any, index: number) => (
              <>
                <li title={`GPU Usage (${index})`}>
                  <button
                    onClick={() => {
                      performAction('Start-Process taskmgr');
                    }}
                  >
                    <i class="nf nf-cod-chip">
                      <span
                        class={
                          gpu.utilizationGpu == 100 ? 'high-usage' : ''
                        }
                      >
                        {Math.round(gpu.utilizationGpu)}%
                      </span>
                    </i>
                  </button>
                </li>
                <li title={`GPU Memory Usage (${index})`}>
                  <button
                    onClick={() => {
                      performAction('Start-Process taskmgr');
                    }}
                  >
                    <i class="nf nf-md-chip">
                      <span
                        class={
                          gpu.utilizationMemory > 85 ? 'high-usage' : ''
                        }
                      >
                        {Math.round(gpu.utilizationMemory)}%
                      </span>
                    </i>
                  </button>
                </li>
                <li title={`GPU Temperature (${index})`}>
                  <button
                    onClick={() => {
                      performAction('Start-Process taskmgr');
                    }}
                  >
                    <i class="nf nf-fa-temperature_empty">
                      <span
                        class={gpu.temperature > 85 ? 'high-usage' : ''}
                      >
                        {gpu.temperature}
                      </span>
                    </i>
                  </button>
                </li>
              </>
            ))}

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
                onClick={() => {
                  performAction('start ms-actioncenter:');
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
