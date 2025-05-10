import { createSignal } from 'solid-js';
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

export function WidgetDropDown() {
  const [items, setItems] = createSignal<DropDownItem[]>([]);
  const [updates, setUpdates] = createSignal<number>(0);

  // Fetches the number of updates available on the system
  const getUpdates = async (): Promise<number> => {
    try {
      return await shellExec('powershell', [ '-Command',
        '(New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher().Search("IsInstalled=0").Updates.Count'
      ]);
    } catch (err) {
      console.error('Failed to fetch updates:', err);
      return 0;
    }
  };

  window.updateMenuItems = (newItems: DropDownItem[]) => {
    setItems(newItems);
    /*
    getUpdates().then(count => {
      setUpdates(count);
    });
    */
  };

  const handleAction = async (action: string, hwnd?: number) => {
    if (hwnd) {
      hideMenu(hwnd);
      setForegroundWindow(hwnd);
    }
    await shellExec('powershell', ['-Command', action]);
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
            {item.icon && (
              <i
                class={item.icon}
                onClick={
                  item.icon === 'updates'
                    ? () => handleAction('start ms-settings:windowsupdate', item.hwnd)
                    : undefined
                }
              >
                <span class={item.icon === 'updates' ? 'badge' : ''}>
                  {item.icon === 'updates' ? `${updates()} updates` : item.key}
                </span>
              </i>
            )}
          </li>
        ),
      )}
    </ul>
  );
}