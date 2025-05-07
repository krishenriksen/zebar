import '../dropdown.css';
import { createSignal, onCleanup } from 'solid-js';
import { setForegroundWindow, shellExec, hideMenu } from 'zebar';

type DropDownItem = {
  name: string;
  action: string;
  hwnd?: number;
  icon?: string;
  key?: string;
};

declare global {
  interface Window {
    updateMenuItems: (newItems: DropDownItem[]) => void;
  }
}

export function DropDown() {
  const [items, setItems] = createSignal<DropDownItem[]>([]);
  const [updates, setUpdates] = createSignal<number>(0); // Signal to store the number of updates
  let updatesInitialized = false; // Flag to ensure updates logic is initialized only once

  // Fetches the number of updates available on the system
  const getUpdates = async (): Promise<number> => {
    try {
      return await shellExec('powershell', [
        '-Command',
        '(New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher().Search("IsInstalled=0").Updates.Count',
      ]);
    } catch (err) {
      console.error('Failed to fetch updates:', err);
      return 0;
    }
  };

  const initializeUpdates = () => {
    if (updatesInitialized) return; // Prevent multiple initializations
    updatesInitialized = true;

    // Fetch updates initially
    getUpdates().then(setUpdates);

    // Set up periodic updates fetching
    const interval = setInterval(() => {
      getUpdates().then(setUpdates);
    }, 2 * 60 * 60 * 1000); // 2 hours in milliseconds

    // Clean up the interval when no longer needed
    onCleanup(() => clearInterval(interval));
  };

  window.updateMenuItems = (newItems: DropDownItem[]) => {
    setItems(newItems);
    initializeUpdates();
  };

  const handleAction = async (action: string, hwnd?: number) => {
    setForegroundWindow(hwnd);
    await shellExec('powershell', ['-Command', action]);
    if (hwnd) {
      hideMenu(hwnd);
    }
  };

  const handleUpdatesClick = async (hwnd?: number) => {
    setForegroundWindow(hwnd);
    await shellExec('powershell', ['-Command', 'start ms-settings:windowsupdate']);
    if (hwnd) {
      hideMenu(hwnd);
    }
  };

  return (
    <ul class="dropdown">
      {items().map(item =>
        item.name === 'spacer' ? (
          <li class="spacer"></li>
        ) : (
          <li>
            <button
              onClick={() => handleAction(item.action, item.hwnd)}
            >
              {item.name}
            </button>
            {item.icon && !(item.icon === 'updates' && item.key === '0 updates') && (
              <i
                class={item.icon}
                onClick={
                  item.icon === 'updates'
                    ? () => handleUpdatesClick(item.hwnd)
                    : undefined
                }
              >
                <span class={item.icon === 'updates' ? 'badge' : ''}>
                  {item.key === 'updates' ? `${updates()} updates` : item.key}
                </span>
              </i>
            )}
          </li>
        ),
      )}
    </ul>
  );
}