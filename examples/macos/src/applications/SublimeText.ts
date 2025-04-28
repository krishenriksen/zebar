import { createMenuItem, performAction } from '../actions';

export const titles = [
  'Sublime Text',
  'Sublime Text (UNREGISTERED)',
];

const menuItemActions: Record<string, () => Promise<string>> = {
  File: async () => performAction('Start-Process "C:\Program Files\Sublime Text\sublime_text.exe"'),
  Edit: async () => performAction('Start-Process "C:\Program Files\Sublime Text\sublime_text.exe"'),
  Selection: async () => performAction('Start-Process "C:\Program Files\Sublime Text\sublime_text.exe"'),
  Find: async () => performAction('Start-Process "C:\Program Files\Sublime Text\sublime_text.exe"'),
  View: async () => performAction('Start-Process "C:\Program Files\Sublime Text\sublime_text.exe"'),
  Goto: async () => performAction('Start-Process "C:\Program Files\Sublime Text\sublime_text.exe"'),
  Tools: async () => performAction('Start-Process "C:\Program Files\Sublime Text\sublime_text.exe"'),
  Project: async () => performAction('Start-Process "C:\Program Files\Sublime Text\sublime_text.exe"'),
  Window: async () => performAction('Start-Process "C:\Program Files\Sublime Text\sublime_text.exe"'),
  Help: async () => performAction('start ms-contact-support:'),
};

export const menuItems = Object.keys(menuItemActions).map(name =>
  createMenuItem(name, menuItemActions),
);
