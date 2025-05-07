import { createSignal, onCleanup } from 'solid-js';
import { shellExec } from 'zebar';

/**
 * Fetches the number of updates available on the system.
 */
async function getUpdates(): Promise<number> {
  try {
    return await shellExec('powershell', [
      '-Command',
      '(New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher().Search("IsInstalled=0").Updates.Count',
    ]);
  } catch (err) {
    console.error('Failed to fetch updates:', err);
    return 0;
  }
}

// Signal to store the number of updates
const [updates, setUpdates] = createSignal<number>(0);

// Initialize updates fetching logic
function initializeUpdates() {
  // Fetch updates initially
  getUpdates().then(setUpdates);

  // Set up periodic updates fetching
  const interval = setInterval(() => {
    getUpdates().then(setUpdates);
  }, 2 * 60 * 60 * 1000); // 2 hours in milliseconds

  // Clean up the interval when no longer needed
  onCleanup(() => clearInterval(interval));
}

// Call the initialization function
initializeUpdates();

const menuItems = [
  {
    name: '',
    items: [
      { name: 'About This Windows', action: 'start ms-settings:' },
      { name: 'spacer', action: '' },
      {
        name: 'System Preferences...',
        action: 'start ms-settings:system',
        icon: 'updates',
        key: `${updates() || 0} updates`,
      },
      { name: 'App Store', action: 'start ms-windows-store:' },
      { name: 'spacer', action: '' },
      {
        name: 'Force Quit...',
        action: 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("%{F4}")',
        icon: 'nf nf-md-apple_keyboard_option',
        key: 'F4',
      },
      { name: 'spacer', action: '' },
      { name: 'Sleep', action: 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0' },
      { name: 'Restart...', action: 'shutdown /r /t 0' },
      { name: 'Shut Down...', action: 'shutdown /s /t 0' },
      { name: 'spacer', action: '' },
      {
        name: 'Lock Screen',
        action: 'rundll32.exe user32.dll,LockWorkStation',
        icon: 'nf nf-md-apple_keyboard_command',
        key: 'L',
      },
      { name: 'Log Out...', action: 'shutdown /l' },
    ],
  },
];

export { menuItems };
