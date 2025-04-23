import { shellExec } from 'zebar';
import { output } from './index';
import { DropdownOption } from '../index';

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

// Wrapper function to handle setting the foreground window
export async function handleDropdownAction(action: () => void | Promise<void>) {


  // Execute the specific action for the dropdown option
  await action();
}

export function getAppMenuOptions(menuNames: string[]): DropdownOption[] {
  return menuNames.map((name) => ({
    name,
    action: async () => {
      await handleDropdownAction(() => {
        console.log(`${name} menu clicked!`);
      });
    },
  }));
}