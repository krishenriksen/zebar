import { createMenuItem, performAction } from '../actions';

const menuItemActions: Record<string, () => Promise<string>> = {
  File: async () => performAction('code --new-window'),
  Edit: async () => performAction('code --new-window'),
  Selection: async () => performAction('code --new-window'),
  View: async () => performAction('code --new-window'),
  Go: async () => performAction('code --new-window'),
  Run: async () => performAction('code --new-window'),
  Terminal: async () => performAction('code --new-window'),
  Help: async () => performAction('start ms-contact-support:'),
};

export const menuItems = Object.keys(menuItemActions).map(name =>
  createMenuItem(name, menuItemActions),
);
