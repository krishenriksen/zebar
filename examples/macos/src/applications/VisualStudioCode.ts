import { createMenuItem, performAction } from '../actions';

const menuItemActions: Record<string, () => Promise<string>> = {
  File: async () => performAction('start $HOME'),
  Edit: async () => performAction('start $HOME'),
  Selection: async () => performAction('start $HOME'),
  View: async () => performAction('start $HOME'),
  Go: async () => performAction('start $HOME'),
  Run: async () => performAction('start $HOME'),
  Terminal: async () => performAction('start $HOME'),
  Help: async () => performAction('start ms-contact-support:'),
};

export const menuItems = Object.keys(menuItemActions).map(name =>
  createMenuItem(name, menuItemActions),
);
