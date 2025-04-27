import { createMenuItem, performAction } from '../actions';

export const titles = [
  'Mozilla Firefox',
  'Mozilla Firefox Developer Edition',
  'Mozilla Firefox Nightly',
  'Mozilla Firefox Beta',
  'Mozilla Firefox ESR',
  'Mozilla Firefox Focus',
];

const menuItemActions: Record<string, () => Promise<string>> = {
  File: async () => performAction('start firefox'),
  Edit: async () => performAction('start firefox'),
  View: async () => performAction('start firefox'),
  History: async () => performAction('start firefox'),
  Bookmarks: async () => performAction('start firefox'),
  Tools: async () => performAction('start firefox'),
  Help: async () => performAction('start ms-contact-support:'),
};

export const menuItems = Object.keys(menuItemActions).map(name =>
  createMenuItem(name, menuItemActions),
);
