import { DropdownOption } from '../index';
import { performAction } from '../actions';
import { output } from '../index';
import { setForegroundWindow } from 'zebar';

// Wrapper function to handle setting the foreground window
async function handleDropdownAction(action: () => void | Promise<void>) {
  const hwnd = output.window?.hwnd; // Retrieve the hwnd from the global output
  if (hwnd) {
    try {
      await setForegroundWindow(parseInt(hwnd)); // Convert hwnd to a number and pass it
    } catch (error) {
      console.error('Failed to set foreground window:', error);
    }
  } else {
    console.warn('No hwnd available for the current window.');
  }

  // Execute the specific action for the dropdown option
  await action();
}

export const appMenuOptions: DropdownOption[] = [
  {
    name: 'File',
    action: async () => {
      await handleDropdownAction(() => {
        console.log('File menu clicked!');
      });
    },
  },
  {
    name: 'Edit',
    action: async () => {
      await handleDropdownAction(() => {
        console.log('Edit menu clicked!');
      });
    },
  },
  {
    name: 'View',
    action: async () => {
      await handleDropdownAction(() => {
        console.log('View menu clicked!');
      });
    },
  },
  {
    name: 'Go',
    action: async () => {
      await handleDropdownAction(() => {
        console.log('Go menu clicked!');
      });
    },
  },
  {
    name: 'Windows',
    action: async () => {
      await handleDropdownAction(() => {
        console.log('Windows menu clicked!');
      });
    },
  },
  {
    name: 'Help',
    action: async () => {
      await handleDropdownAction(() => {
        console.log('Help menu clicked!');
      });
    },
  },
];