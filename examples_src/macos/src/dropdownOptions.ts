import { createSignal, createEffect } from 'solid-js';

import { getUpdates } from './updates';
import { DropdownOption } from './index';
import { performAction } from './actions';

/**
 * Fetches the number of updates available on the system.
 */
const [updates, setUpdates] = createSignal('');

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

export const dropdownOptions: DropdownOption[] = [
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
];
