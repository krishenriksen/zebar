use windows::Win32::{
  Foundation::{HWND},
  System::LibraryLoader::GetModuleHandleW,
  Graphics::Gdi::{BeginPaint, EndPaint, TextOutW, PAINTSTRUCT},
  UI::{
      Accessibility::{SetWinEventHook, UnhookWinEvent},
      WindowsAndMessaging::{
          GetWindowTextLengthW, GetWindowTextW, SetForegroundWindow,
          EVENT_SYSTEM_FOREGROUND, MSG, GetMessageW, TranslateMessage, DispatchMessageW,
      },
  },
};

use std::sync::Mutex;
use lazy_static::lazy_static;
use tokio::sync::mpsc::{self, UnboundedReceiver, UnboundedSender};

/// Represents a foreground window event.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WindowEvent {
  pub hwnd: isize,
  pub title: String,
}

#[derive(Debug)]
pub struct Window {
  event_rx: UnboundedReceiver<WindowEvent>,
  #[allow(dead_code)]
  event_tx: UnboundedSender<WindowEvent>,
}

lazy_static! {
  static ref EVENT_TX: Mutex<Option<UnboundedSender<WindowEvent>>> =
    Mutex::new(None);
}

impl Window {
  /// Creates a new `Window` instance.
  pub fn new() -> crate::Result<Self> {
    let (event_tx, event_rx) = mpsc::unbounded_channel();

    // Store the sender in the static `EVENT_TX`
    *EVENT_TX.lock().unwrap() = Some(event_tx.clone());

    Self::start_window_event_listener();

    Ok(Window { event_rx, event_tx })
  }

  /// Returns the next event from the `Window`.
  pub async fn events(&mut self) -> Option<WindowEvent> {
    while let Some(event) = self.event_rx.recv().await {
      if let Some(event) = self.on_event(event) {
        return Some(event);
      }
    }

    None
  }

  /// Returns the next event from the `Window` (synchronously).
  pub fn events_blocking(&mut self) -> Option<WindowEvent> {
    while let Some(event) = self.event_rx.blocking_recv() {
      if let Some(event) = self.on_event(event) {
        return Some(event);
      }
    }

    None
  }

  fn on_event(&mut self, event: WindowEvent) -> Option<WindowEvent> {
    // Example: Filter out events with empty titles
    if event.title.is_empty() {
      println!("Ignored event with empty title: {:?}", event);
      return None;
    }

    // Integrate window styling functionality
    /*
    let hwnd = HWND(event.hwnd as *mut _);
    if let Err(err) = move_window_icons_left(hwnd) {
        eprintln!("Error modifying window style: {}", err);
    }
    */

    Some(event)
  }

  fn start_window_event_listener() {
    std::thread::spawn(move || unsafe {
      let hook_foreground = SetWinEventHook(
          EVENT_SYSTEM_FOREGROUND,
          EVENT_SYSTEM_FOREGROUND,
          GetModuleHandleW(None).unwrap(),
          Some(event_callback),
          0,
          0,
          0,
      );

      if hook_foreground.0.is_null() {
          eprintln!("Failed to set foreground event hook");
          return;
      }

      println!("Listening for window events...");

      let mut msg = MSG::default();
      while GetMessageW(&mut msg, HWND(std::ptr::null_mut()), 0, 0).into() {
          let _ = TranslateMessage(&msg);
          DispatchMessageW(&msg);
      }

      let _ = UnhookWinEvent(hook_foreground);
      //let _ = UnhookWinEvent(hook_create);
      //let _ = UnhookWinEvent(hook_destroy);
    });
  }

  pub fn set_foreground_window(hwnd: isize) -> anyhow::Result<(), String> {
    unsafe {
      let hwnd = HWND(hwnd as *mut _); // Convert `isize` to a raw pointer
      if SetForegroundWindow(hwnd).as_bool() {
        Ok(())
      } else {
        Err("Failed to set foreground window".to_string())
      }
    }
  }
}

fn move_window_icons_left(hwnd: HWND) -> Result<(), String> {
  unsafe {
      let mut ps = PAINTSTRUCT::default();
      let hdc = BeginPaint(hwnd, &mut ps);
      
      if hdc.0 == std::ptr::null_mut() {
          return Err("Failed to get device context for drawing.".to_string());
      }

      let text = "Custom Icons Placement\0".encode_utf16().collect::<Vec<u16>>();
      // Correct method call with slice
      let _ = TextOutW(hdc, 50, 50, &text);

      let _ = EndPaint(hwnd, &ps);

      Ok(())
  }
}

// Callback function for foreground window changes
unsafe extern "system" fn event_callback(
  _: windows::Win32::UI::Accessibility::HWINEVENTHOOK,
  _: u32,
  hwnd: HWND,
  _: i32,
  _: i32,
  _: u32,
  _: u32,
) {
  // Retrieve the window title
  let length = GetWindowTextLengthW(hwnd) + 1;
  let mut buffer = vec![0u16; length as usize];
  let copied_length = GetWindowTextW(hwnd, &mut buffer);

  if copied_length > 0 {
    let window_title =
      String::from_utf16_lossy(&buffer[..copied_length as usize]);

    // Ignore events with the specific title
    if window_title.contains("Zebar") {
      println!("Ignored window with title: {:?}", window_title);
      return;
    }

    // Access the static `EVENT_TX` to send the event
    if let Some(sender) = EVENT_TX.lock().unwrap().as_ref() {
      if let Err(err) = sender.send(WindowEvent {
        hwnd: hwnd.0 as isize,
        title: window_title,
      }) {
        eprintln!("Failed to send event: {}", err);
      }
    }
  }
}