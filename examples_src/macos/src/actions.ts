import { shellExec, setForegroundWindow } from 'zebar';

export async function performAction(action: string): Promise<string> {
  try {
    const result = await shellExec('powershell', ['-Command', action]);
    if (result.success) {
      return result.stdout.trim();
    } else {
      console.error('Error in executing command:', result.stderr);
      return Promise.reject(result.stderr);
    }
  } catch (err) {
    console.error('Error in executing command:', err);
    return Promise.reject(
      err instanceof Error ? err.message : 'Unknown error occurred',
    );
  }
}

/**
 * Wraps an action with additional logic, such as setting the foreground window.
 * @param name - The name of the menu item.
 * @param menuItemActions - The object associating menu item names with actions.
 */
export function createMenuItem(
  name: string,
  menuItemActions: Record<string, () => Promise<string>>,
): {
  name: string;
  action: (hwnd?: number) => void | Promise<void>;
} {
  const action = menuItemActions[name];

  if (!action) {
    throw new Error(`Action not defined for menu item: ${name}`);
  }

  return {
    name,
    action: async (hwnd?: number) => {
      try {
        setForegroundWindow(hwnd);
        action();
      } catch (error) {
        console.error(`Error executing action for '${name}':`, error);
      }
    },
  };
}
