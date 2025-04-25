/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { createStore } from 'solid-js/store';
import { createProviderGroup } from 'zebar';
import { createSignal, createEffect, createMemo } from 'solid-js';

import { performAction } from './actions';

import { dropdownOptions } from './dropdownOptions';
import { countdownOptions } from './countdownOptions';

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
  createEffect(() => providers.onOutput(setOutput));

  const [isDropdownVisible, setDropdownVisible] = createSignal(false);

  /**
   * Renders the icons in the system tray.
   */
  type SystrayIcon = {
    id: string;
    iconUrl: string;
    tooltip: string;
  };
  const iconCache = new Map();

  const renderIcon = (icon: SystrayIcon) => {
    if (!iconCache.has(icon.id)) {
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
    } else {
      const cachedIcon = iconCache.get(icon.id);
      const img = cachedIcon.querySelector('img');
      img.src = icon.iconUrl;
      img.title = icon.tooltip;
    }

    return iconCache.get(icon.id);
  };

  const updateCache = (icons: SystrayIcon[]) => {
    const currentIds = new Set(icons.map(icon => icon.id));
    iconCache.forEach((_, id) => {
      if (!currentIds.has(id)) {
        iconCache.delete(id);
      }
    });
  };

  const SystrayIcons = createMemo(() => {
    if (output.systray) {
      updateCache(output.systray.icons);

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
        .map((icon: SystrayIcon) => renderIcon(icon));
    }

    return null;
  });

  /**
   * Countdown timer for specific actions
   */
  const [countdown, setCountdown] = createSignal(60);
  const [countdownActive, setCountdownActive] = createSignal('');
  let countdownInteval: number | undefined;  
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
  const [appSpecificOptions, setAppSpecificOptions] = createSignal<
    DropdownOption[]
  >([]);
  const importCache = new Map<string, DropdownOption[]>(); // Cache for imported modules
  const defaultTitle = 'File Explorer';
  const replaceTitle = ['Zebar - macos/macos', 'Program Manager'];

  createEffect(async () => {
    if (output.window?.title && output.window?.hwnd) {
      const sanitizedTitle = getNormalizedWindowTitle().replace(
        /\s+/g,
        '',
      );
      const hwnd = parseInt(output.window.hwnd);

      if (importCache.has(sanitizedTitle)) {
        // Use cached module if available
        const cachedOptions = importCache.get(sanitizedTitle) ?? [];
        setAppSpecificOptions(cachedOptions);
      } else {
        try {
          const module = await import(
            `./applications/${sanitizedTitle}.ts`
          );
          const options = module.menuItems.map((item: any) => ({
            ...item,
            hwnd,
          }));
          importCache.set(sanitizedTitle, options); // Cache the imported module
          setAppSpecificOptions(options);
        } catch (err) {
          //console.log(`No specific options for ${sanitizedTitle}`);
          setAppSpecificOptions([]);
        }
      }
    }
  });

  const getNormalizedTitle = (
    fullTitle: string,
    defaultTitle: string,
    replaceTitle: string | any[],
  ) => {
    if (replaceTitle.includes(fullTitle)) {
      return defaultTitle;
    }

    // Replace en-dash and em-dash with space-hyphen-space
    const processedTitle = fullTitle
      .replace(' – ', ' - ') // En-dash
      .replace(' — ', ' - '); // Em-dash

    // Extract the last part of the title or fallback to the full title
    return (
      processedTitle
        .split(' - ')
        .filter(s => s.trim() !== '')
        .pop()
        ?.trim() || defaultTitle
    );
  };

  const getNormalizedWindowTitle = () => {
    if (output.window?.title) {
      return getNormalizedTitle(
        output.window.title,
        defaultTitle,
        replaceTitle,
      );
    }

    return defaultTitle;
  };

  /**
   * Handle volume slider visibility
   * Toggles the volume slider visibility and sets a timeout to hide it after a delay
   * @param {MouseEvent} e - The click event
   * @returns {void}
   */
  const [isVolumeVisible, setVolumeVisible] = createSignal(false);
  let timeoutId: number | undefined;
  const handleVolume = (e: any) => {
    setVolumeVisible(true);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
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
              <button>{getNormalizedWindowTitle()}</button>
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

          {output.gpu && output.gpu.gpus && output.gpu.gpus.map((gpu: any, index: number) => (
            <>
              <li title={`GPU Usage (${index})`}>
                <button
                  onClick={() => {
                    performAction('Start-Process taskmgr');
                  }}
                >
                  <i class="nf nf-cod-chip">
                    <span class={gpu.utilizationGpu == 100 ? 'high-usage' : ''}>
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
                    <span class={gpu.utilizationMemory > 85 ? 'high-usage' : ''}>
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
                    <span class={gpu.temperature > 85 ? 'high-usage' : ''}>
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
                <i class={`volume nf ${
                  output.audio.defaultPlaybackDevice.volume === 0
                    ? 'nf-fa-volume_xmark'
                    : output.audio.defaultPlaybackDevice.volume < 20
                    ? 'nf-fa-volume_low'
                    : output.audio.defaultPlaybackDevice.volume < 40
                    ? 'nf-fa-volume_low'
                    : 'nf-fa-volume_high'
                }`}></i>
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
