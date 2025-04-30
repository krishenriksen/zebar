import { createMenuItem, performAction } from '../actions';

export const titles = [
  'Terminal',
  'PowerShell',
  'Windows PowerShell',
  'Command Prompt',
  'Windows PowerShell ISE',
  'Windows PowerShell (x86)',
  'Windows PowerShell (x64)',
  'Windows PowerShell (x86) - ISE',
  'Windows PowerShell (x64) - ISE',
  'Windows PowerShell (x86) - Console',
];

const menuItemActions: Record<string, () => Promise<string>> = {
  Shell: async () => performAction('start pwsh'),
  Edit: async () => performAction('start notepad'),
  View: async () => performAction('start notepad'),
  Window: async () => performAction('start pwsh'),
  Help: async () => performAction('start ms-contact-support:'),
};

export const menuItems = Object.keys(menuItemActions).map(name =>
  createMenuItem(name, menuItemActions),
);
