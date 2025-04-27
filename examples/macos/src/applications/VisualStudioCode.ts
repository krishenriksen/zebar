import { createMenuItem, performAction } from '../actions';

export const titles = [
  'Visual Studio Code',
];

const menuItemActions: Record<string, () => Promise<string>> = {
  File: async () => performAction('code --new-window'),
  Edit: async () => performAction('code --new-window'),
  Selection: async () => performAction('code --new-window'),
  View: async () => performAction('code --new-window'),
  Go: async () => performAction('start $HOME'),
  Run: async () => performAction('Start-Process pwsh'),
  Terminal: async () => performAction('Start-Process pwsh'),
  Help: async () => performAction('start ms-contact-support:'),
};

export const menuItems = Object.keys(menuItemActions).map(name =>
  createMenuItem(name, menuItemActions),
);
