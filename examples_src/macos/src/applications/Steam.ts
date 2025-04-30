import { createMenuItem, performAction } from '../actions';

export const titles = ['Steam'];

const menuItemActions: Record<string, () => Promise<string>> = {
  Account: async () => performAction('start steam://settings'),
  View: async () => performAction('start steam://settings'),
  Friends: async () => performAction('start steam://friends'),
  Games: async () => performAction('start steam://library'),
  Window: async () => performAction('start steam://settings'),
  Help: async () => performAction('start steam://support'),
};

export const menuItems = Object.keys(menuItemActions).map(name =>
  createMenuItem(name, menuItemActions),
);
