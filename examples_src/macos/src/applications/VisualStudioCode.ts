const applicationTitles = ['Visual Studio Code'];

const menuItems = [
  {
    name: 'Code',
    items: [
      { name: 'About Visual Studio Code', action: '' },
      { name: 'Check for Updates...', action: '' },
      { name: 'spacer', action: '' },
      { name: 'Hide Visual Studio Code', action: '' },
      { name: 'Hide Others', action: '' },
      { name: 'Show All', action: '' },
      { name: 'spacer', action: '' },
      { name: 'Quit Visual Studio Code', action: 'Stop-Process -Name "Code' },
    ],
  },
  {
    name: 'File',
    items: [
      { name: 'New Text File', action: 'start code' },
    ],
  },
  {
    name: 'Edit',
    items: [
      { name: 'Undo', action: '' },
      { name: 'Redo', action: '' },
      { name: 'spacer', action: '' },
      { name: 'Cut', action: '' },
      { name: 'Copy', action: '' },
      { name: 'Paste', action: '' },
      { name: 'spacer', action: '' },
      { name: 'Find', action: '' },
      { name: 'Replace', action: '' },
      { name: 'spacer', action: '' },
      { name: 'Find in Files', action: '' },
      { name: 'Replace in Files', action: '' },
      { name: 'spacer', action: '' },
      { name: 'Toggle Linne Comment', action: '' },
      { name: 'Toggle Block Comment', action: '' },
      { name: 'Emmet: Expand Abbreviation', action: '' },
      { name: 'spacer', action: '' },
      { name: 'Start Dictation...', action: '' },
      { name: 'Emoji & Symbols', action: '' },
    ],
  },
  {
    name: 'Selection',
    items: [{ name: '123456', action: '' }],
  },
  {
    name: 'View',
    items: [{ name: '123456', action: '' }],
  },
  {
    name: 'Go',
    items: [{ name: '123456', action: '' }],
  },
  {
    name: 'Run',
    items: [{ name: '123456', action: '' }],
  },
  {
    name: 'Terminal',
    items: [{ name: '123456', action: '' }],
  },
  {
    name: 'Help',
    items: [
      { name: 'Windows Help', action: 'start ms-contact-support:' },
      { name: 'spacer', action: '' },
      {
        name: "See What's New in Windows",
        action: 'start ms-contact-support:',
      },
      {
        name: 'New to Windows? Learn the Basics',
        action: 'start ms-contact-support:',
      },
    ],
  },
];

export { applicationTitles, menuItems };
