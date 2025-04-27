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
  Shell: async () => performAction('Start-Process pwsh'),
  Edit: async () => performAction('Start-Process notepad'),
  View: async () => performAction('Start-Process notepad'),
  Window: async () => performAction('Start-Process pwsh'),
  Help: async () => performAction('start ms-contact-support:'),
};

export const menuItems = Object.keys(menuItemActions).map(name =>
  createMenuItem(name, menuItemActions),
);
