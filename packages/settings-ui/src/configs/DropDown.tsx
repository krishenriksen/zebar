import '../dropdown.css';
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

export function DropDown() {
  const [items, setItems] = createSignal<DropDownItem[]>([]);

  window.updateMenuItems = (newItems: DropDownItem[]) => {
    setItems(newItems);
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
                  {item.key}
                </span>
              </i>
            )}
          </li>
        ),
      )}
    </ul>
  );
}