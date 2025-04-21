/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import { createStore } from 'solid-js/store';
import { createProviderGroup, shellExec } from 'zebar';
import { createSignal, createEffect, createMemo } from 'solid-js';

const providers = createProviderGroup({
  window: { type: 'window', refreshInterval: 1500 },
  audio: { type: 'audio' },
  systray: { type: 'systray', refreshInterval: 5000 },
  date: { type: 'date', formatting: 'EEE d MMM t' },
  fullDate: { type: 'date', formatting: 'EEEE, MMMM d, yyyy' },
});

function App() {
  const [output, setOutput] = createStore(providers.outputMap);
  const [countdown, setCountdown] = createSignal(60);
  const [countdownActive, setCountdownActive] = createSignal(false);
  let countdownInteval: number | undefined;

  const performAction = async (command, params = []) => {
    try {
      switch (command) {
        case '$HOME':
        case 'ms-settings:':
        case 'ms-settings:system':
        case 'ms-windows-store:':
          await shellExec('powershell', ['/c', 'start', command]);
          break;
        default:
          await shellExec(command, params);
          break;
      }
    } catch (err) {
      console.error('Error in executing command:', err);
    }
  };

  const dropdownOptions = [
    { name: 'About This PC', action: () => performAction('ms-settings:') },
    {
      name: 'System Preferences',
      action: () => performAction('ms-settings:system'),
    },
    {
      name: 'App Store',
      action: () => performAction('ms-windows-store:'),
    },
  ];

  const countdownOptions = [
    {
      name: 'Sleep',
      action: () =>
        performAction('rundll32.exe', [
          'powrprof.dll,SetSuspendState',
          '0',
          '1',
          '0',
        ]),
    },
    {
      name: 'Shut Down',
      action: () => performAction('shutdown', ['/s', '/t', '0']),
    },
    {
      name: 'Restart',
      action: () => performAction('shutdown', ['/r', '/t', '0']),
    },
    { name: 'Log Out', action: () => performAction('shutdown', ['/l']) },
  ];

  createEffect(() => providers.onOutput(setOutput));

  const iconCache = new Map();

  const renderIcon = icon => {
    if (!iconCache.has(icon.id)) {
      const li = (
        <li id={icon.id}>
          <img
            class="systray-icon"
            src={icon.iconUrl}
            title={icon.tooltip}
            onClick={e => {
              e.preventDefault();
              output.systray.onLeftClick(icon.id);
            }}
            onContextMenu={e => {
              e.preventDefault();
              output.systray.onRightClick(icon.id);
            }}
          />
        </li>
      );
      iconCache.set(icon.id, li);
    } else {
      const cachedIcon = iconCache.get(icon.id);
      const img = cachedIcon.querySelector('img');
      if (img) {
        img.src = icon.iconUrl;
        img.title = icon.tooltip;
      }
    }
    return iconCache.get(icon.id);
  };

  const updateCache = icons => {
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
        .filter(icon => !icon.tooltip?.toLowerCase().includes('speakers'))

        .sort((a, b) => {
          const getPriority = icon => {
            const tooltip = icon.tooltip?.toLowerCase() || '';
            // Fan Control
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

  const startCountdown = (name, action) => {
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
          return;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetCountdown = () => {
    clearInterval(countdownInteval);
    countdownInteval = undefined;
    setCountdownActive(false);
    setCountdown(60);
  };

  const toggleDropdown = () => {
    const dropdownMenu = document.getElementById('dropdown');
    const appleIcon = document.querySelector('.logo');
    if (dropdownMenu && appleIcon) {
      const isVisible = dropdownMenu.style.display === 'block';
      dropdownMenu.style.display = isVisible ? 'none' : 'block';
      appleIcon.classList.toggle('active', !isVisible);
    }
  };

  return (
    <div class="app">
      <div class="left">
        <i
          class="logo nf nf-fa-windows"
          onClick={() => toggleDropdown()}
        ></i>
        <ul id="dropdown">
          {dropdownOptions.map(({ name, action }) => (
            <li onClick={action}>
              <button>{name}</button>
            </li>
          ))}
          {countdownOptions.map(({ name, action }) => (
            <li class={countdownActive() == name && `act`}>
              <button
                onClick={() => {
                  startCountdown(name, action);
                }}
              >
                {name} {countdownActive() == name && `(${countdown()}s)`}
              </button>
              {countdownActive() == name && (
                <button onClick={resetCountdown}>Cancel</button>
              )}
            </li>
          ))}
        </ul>

        <ul>
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
                  output.audio.setVolume(e.target.valueAsNumber)
                }
              />
            </li>
          )}

          {SystrayIcons()}

          {output.date && (
            <li title={output.fullDate?.formatted}>
              {output.date?.formatted}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

render(() => <App />, document.getElementById('root')!);
