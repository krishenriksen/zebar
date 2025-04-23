import { DropdownOption } from './index';
import { performAction } from './actions';

export const countdownOptions: DropdownOption[] = [
  {
    name: 'Sleep',
    action: () =>
      performAction('rundll32.exe powrprof.dll,SetSuspendState 0,1,0'),
  },
  {
    name: 'Restart...',
    action: () => performAction('shutdown /r /t 0'),
  },
  {
    name: 'Shut Down...',
    action: () => performAction('shutdown /s /t 0'),
  },
  {
    name: 'Lock Screen',
    icon: {
      icon: 'nf-md-apple_keyboard_command',
      key: 'L',
    },
    action: () => performAction('rundll32.exe user32.dll,LockWorkStation'),
  },
  {
    name: 'Log Out...',
    action: () => performAction('shutdown /l'),
  },
];
