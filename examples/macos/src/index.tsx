/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { createStore } from 'solid-js/store';
import { createProviderGroup, shellExec } from 'zebar';
import { createSignal, createEffect, createMemo, Accessor, JSX } from 'solid-js';

type ProviderOutput = {
  window?: { title: string };
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

type DropdownOption = {
  name: string;
  action: () => void;
};

const providers = createProviderGroup({
  window: { type: 'window', refreshInterval: 1500 },
  audio: { type: 'audio' },
  systray: { type: 'systray', refreshInterval: 5000 },
  date: { type: 'date', formatting: 'EEE d MMM t' },
  fullDate: { type: 'date', formatting: 'EEEE, MMMM d, yyyy' },
});

function App() {
  const [output, setOutput] = createStore<ProviderOutput>(providers.outputMap);
  const [isDropdownVisible, setDropdownVisible] = createSignal<boolean>(false);
  const [countdown, setCountdown] = createSignal<number>(60);
  const [countdownActive, setCountdownActive] = createSignal<string>('');
  let countdownInteval: number | undefined;

  const performAction = async (command: string, params: string[] = []): Promise<void> => {
    try {
      await shellExec(command, params);
    } catch (err) {
      console.error('Error in executing command:', err);
    }
  };

  const dropdownOptions: DropdownOption[] = [
    { name: 'About This PC',
      action: () => performAction('powershell', ['/c', 'start', 'ms-settings:'])
    },
    {
      name: 'System Preferences',
      action: () => performAction('powershell', ['/c', 'start', 'ms-settings:system'])
    },
    {
      name: 'App Store',
      action: () => performAction('powershell', ['/c', 'start', 'ms-windows-store:'])
    }
  ];

  const countdownOptions: DropdownOption[] = [
    {
      name: 'Sleep',
      action: () => performAction('rundll32.exe', ['powrprof.dll,SetSuspendState', '0', '1', '0'])
    },
    {
      name: 'Shut Down',
      action: () => performAction('shutdown', ['/s', '/t', '0'])
    },
    {
      name: 'Restart',
      action: () => performAction('shutdown', ['/r', '/t', '0'])
    },
    {
      name: 'Log Out', action: () => performAction('shutdown', ['/l'])
    }
  ];

  createEffect(() => providers.onOutput(setOutput));

  const iconCache = new Map<string, HTMLElement>();

  const renderIcon = (icon: SystrayIcon): HTMLElement => {
    if (!iconCache.has(icon.id)) {
      const li = (
        <li
          id={icon.id}
          class="systray-icon"
          onClick={(e) => {
            e.preventDefault();
            output.systray?.onLeftClick(icon.id);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            output.systray?.onRightClick(icon.id);
          }}          
        >
          <img
            src={icon.iconUrl}
            title={icon.tooltip}
          />
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
    const currentIds = new Set(icons.map((icon) => icon.id));
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
        .filter((icon) => !icon.tooltip?.toLowerCase().includes('speakers'))
        .sort((a, b) => {
          const getPriority = (icon: SystrayIcon): number => {
            const tooltip = icon.tooltip?.toLowerCase() || '';
            if (tooltip.includes('cpu core')) return 1;
            if (tooltip.includes('gpu')) return 2;
            return 99; // everything else gets a lower priority
          };

          return getPriority(a) - getPriority(b);
        })
        .map((icon) => renderIcon(icon));
    }

    return null;
  });

  const startCountdown = (name: string, action: () => void): void => {
    if (countdownActive() === name) {
      action();
      return;
    }

    resetCountdown();

    setCountdownActive(name);
    countdownInteval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
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
            <li
              style={{ display: isDropdownVisible() ? 'block' : 'none' }}
            >
              <button
                onClick={action}
              >
                {name}
              </button>
            </li>
          ))}

          {countdownOptions.map(({ name, action }) => (
            <li
              class={countdownActive() === name ? 'act' : ''}
              style={{ display: isDropdownVisible() ? 'block' : 'none' }}
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
          <li>
            <button
              onClick={() => {
                if (output.window?.title === 'File Explorer') {
                  performAction('$HOME');
                }
              }}
            >
              {output.window?.title || 'File Explorer'}
            </button>
          </li>
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
                  performAction('powershell', ['/c', 'start', 'ms-actioncenter:'])
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