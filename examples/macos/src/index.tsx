/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { createStore } from 'solid-js/store';
import { createProviderGroup, setForegroundWindow } from 'zebar';
import { createSignal, createEffect, createMemo, JSX } from 'solid-js';

import { performAction } from './actions';
import { getUpdates } from './updates';
import { countdownOptions } from './countdownOptions';

/**
 * 
 */
type ProviderOutput = {
  window?: { title: string, hwnd: string };
  audio?: {
    defaultPlaybackDevice?: { volume: number };
    setVolume: (volume: number) => void;
  };
  systray?: {
    icons: SystrayIcon[];
    onLeftClick: (id: string) => void;
    onRightClick: (id: string) => void;
  };
  date?: { formatted: string };
  fullDate?: { formatted: string };
};

type SystrayIcon = {
  id: string;
  iconUrl: string;
  tooltip: string;
};

export type DropdownOption = {
  name: string;
  action: () => void;
};

const providers = createProviderGroup({
  window: { type: 'window', refreshInterval: 1000 },
  audio: { type: 'audio' },
  systray: { type: 'systray', refreshInterval: 5000 },
  date: { type: 'date', formatting: 'EEE d MMM t' },
  fullDate: { type: 'date', formatting: 'EEEE, MMMM d, yyyy' },
});

export const [output, setOutput] = createStore<ProviderOutput>(
  providers.outputMap,
);

function App() {
  const [isDropdownVisible, setDropdownVisible] =
    createSignal<boolean>(false);
  const [countdown, setCountdown] = createSignal<number>(60);
  const [countdownActive, setCountdownActive] = createSignal<string>('');
  let countdownInteval: number | undefined;

  /**
   * Fetches the number of updates available on the system.
   */
  const [updates, setUpdates] = createSignal<string>('');

  createEffect(() => {
    getUpdates().then(setUpdates);

    const interval = setInterval(
      () => {
        getUpdates().then(setUpdates);
      },
      2 * 60 * 60 * 1000,
    ); // 2 hours in milliseconds

    return () => clearInterval(interval);
  });

  /**
   * Performs an action based on the provided command.
   */
  const dropdownOptions = createMemo(() => [
    {
      name: 'About This PC',
      action: () => performAction('start ms-settings:'),
    },
    {
      name: 'System Preferences...',
      action: () => performAction('start ms-settings:system'),
    },
    ...(updates() && updates() !== 'Error'
      ? [
          {
            name: () => {
              const count = updates();
              return count === '1' ? '1 update' : `${count} updates`;
            },
            action: () => performAction('start ms-settings:windowsupdate'),
          },
        ]
      : []),
    {
      name: 'App Store...',
      action: () => performAction('start ms-windows-store:'),
    },
  ]);

  createEffect(() => providers.onOutput(setOutput));

  /**
   * Renders the icons in the system tray.
   */
  const iconCache = new Map<string, HTMLElement>();

  const renderIcon = (icon: SystrayIcon): HTMLElement => {
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
      ) as unknown as HTMLElement;
      iconCache.set(icon.id, li);
    } else {
      const cachedIcon = iconCache.get(icon.id)!;
      const img = cachedIcon.querySelector('img')!;
      img.src = icon.iconUrl;
      img.title = icon.tooltip;
    }

    return iconCache.get(icon.id)!;
  };

  const updateCache = (icons: SystrayIcon[]): void => {
    const currentIds = new Set(icons.map(icon => icon.id));
    iconCache.forEach((_, id) => {
      if (!currentIds.has(id)) {
        iconCache.delete(id);
      }
    });
  };

  const SystrayIcons = createMemo<JSX.Element | null>(() => {
    if (output.systray) {
      updateCache(output.systray.icons);

      return output.systray.icons
        .filter(icon => !icon.tooltip?.toLowerCase().includes('speakers'))
        .sort((a, b) => {
          const getPriority = (icon: SystrayIcon): number => {
            const tooltip = icon.tooltip?.toLowerCase() || '';
            if (tooltip.includes('cpu core')) return 1;
            if (tooltip.includes('gpu')) return 2;
            return 99; // everything else gets a lower priority
          };

          return getPriority(a) - getPriority(b);
        })
        .map(icon => renderIcon(icon));
    }

    return null;
  });

  const startCountdown = (name: string, action: () => void): void => {
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

  const resetCountdown = (): void => {
    clearInterval(countdownInteval);
    countdownInteval = undefined;
    setCountdownActive('');
    setCountdown(60);
  };

  /**
   * Get menu entries for specific applications
   * Dynamically import the file based on the application title
   */
  const [appSpecificOptions, setAppSpecificOptions] = createSignal<DropdownOption[]>([]);
  const importCache = new Map<string, DropdownOption[]>(); // Cache for imported modules

  createEffect(async () => {
    if (output.window?.title) {
      const sanitizedTitle = output.window.title.replace(/\s+/g, '');

      if (importCache.has(sanitizedTitle)) {
        // Use cached module if available
        setAppSpecificOptions(importCache.get(sanitizedTitle)!);
      } else {
        try {
          const module = await import(`./applications/_${sanitizedTitle}.ts`);
          const options = module.appMenuOptions || [];
          importCache.set(sanitizedTitle, options); // Cache the imported module
          setAppSpecificOptions(options);
        } catch {
          console.warn(`No configuration found for ${sanitizedTitle}`);
        }
      }
    }
  });

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
          {dropdownOptions().map(({ name, action }) => (
            <li class={isDropdownVisible() ? 'inline-flex' : 'none'}>
              <button
                onClick={action}
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

          {countdownOptions.map(({ name, action }) => (
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
              </button>
              {countdownActive() === name && (
                <button onClick={resetCountdown}>Cancel</button>
              )}
            </li>
          ))}

          {!isDropdownVisible() && (
            <li class="application">
              <button
                onClick={async () => {
                  if (output.window?.title === 'File Explorer') {
                    performAction('start $HOME');
                  } else {
                    const hwnd = output.window?.hwnd; // Assuming hwnd is available in output.window
                    if (hwnd) {
                      try {
                        await setForegroundWindow(parseInt(hwnd));
                      } catch (error) {
                        console.error('Failed to set foreground window:', error);
                      }
                    }
                  }
                }}
              >
                {output.window?.title || 'File Explorer'}
              </button>
            </li>
          )}

          {!isDropdownVisible() && appSpecificOptions() &&
            appSpecificOptions().map(({ name, action }) => (
              <li>
                <button onClick={action}>{name}</button>
              </li>
          ))}
        </ul>
      </div>

      <div class="right">
        <ul>
          {output.audio?.defaultPlaybackDevice && (
            <li>
              <input
                type="range"
                min="0"
                max="100"
                step="2"
                value={output.audio.defaultPlaybackDevice.volume}
                onChange={(e: Event & { target: HTMLInputElement }) =>
                  output.audio?.setVolume(e.target.valueAsNumber)
                }
              />
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
