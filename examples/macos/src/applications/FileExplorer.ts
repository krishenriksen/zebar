import { createMenuItem, performAction } from '../actions';

export const titles = [
  'File Explorer',
  'Windows Explorer',
];

const menuItemActions: Record<string, () => Promise<string>> = {
  File: async () => performAction('start $HOME'),
  Edit: async () => performAction('start notepad'),
  View: async () => performAction('start notepad'),
  Go: async () => performAction('start $HOME'),
  Window: async () => performAction('start pwsh'),
  Help: async () => performAction('start ms-contact-support:'),
};

export const menuItems = Object.keys(menuItemActions).map(name =>
  createMenuItem(name, menuItemActions),
);
