use tokio::task;
#[allow(unused_imports)]
use windows::Win32::{
    Foundation::HWND,
    UI::{
        WindowsAndMessaging::{
          SetForegroundWindow, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_TOOLWINDOW
        },
    },
};

use tauri::{
  AppHandle, WebviewWindowBuilder, WebviewUrl, Manager, window::Color,
};

pub fn initialize_menu_window(app_handle: &AppHandle) -> anyhow::Result<()> { 
  if app_handle.get_webview_window("macos").is_none() {
    let app_handle_clone = app_handle.clone(); // Clone to move into the thread.
    // Use a separate thread for window creation. This is crucial.
    task::spawn(async move {
      if let Err(err) = WebviewWindowBuilder::new(
        &app_handle_clone,
        "macos",
        WebviewUrl::App("/index.html#/dropdown".into()),
      )
      .title("Dropdown - Zebar") // Include Zebar in the title so it can be ignored in the event callback
      .focused(true)
      .visible(false)
      .position(0.0, 0.0)
      .inner_size(100.0, 100.0)
      .resizable(false)
      .decorations(false)
      .skip_taskbar(true)
      .background_color(Color(240, 240, 245, 255))
      .build()
      {
        eprintln!("Failed to create window: {}", err);
      }
    });
  }

  hide_menu(app_handle)?;

  Ok(())
}

pub fn show_menu(
  app_handle: &AppHandle,
  _name: String,
  index: usize,
  sub_items: Vec<(String, String, isize, Option<String>, Option<String>)>,
  button_x: i32,
  monitor_y: i32,
) -> anyhow::Result<()> {
  // Remove spacer entries from sub_items
  let filtered_items: Vec<(String, String, isize, Option<String>, Option<String>)> = sub_items
    .iter() // Borrow sub_items instead of consuming it
    .filter(|(item_name, _, _, _, _)| item_name != "spacer")
    .cloned() // Clone the filtered items to create a new Vec
    .collect();

  // Ensure there are valid items to display
  if filtered_items.is_empty() {
    return Err(anyhow::anyhow!("No valid menu items provided"));
  }

  hide_menu(app_handle)?;

  update_menu_items(
    app_handle,
    sub_items
  )?;  

  // Calculate the width dynamically based on the longest menu item and key
  let font_size = 14.0;
  let max_text_width = filtered_items
      .iter()
      .map(|(item_name, _, _, _, key)| {
          let text_width = item_name.len() as f64 * font_size * 0.7; // Approximate width of text
          let key_width = key.as_ref().map_or(0.0, |k| k.len() as f64 * font_size * 0.5); // Approximate width of key
          text_width + key_width
      })
      .fold(0.0, f64::max); // Get the maximum width
  let width = (max_text_width.ceil() as u32) + 80;

  // Calculate the height dynamically based on the number of sub-items
  let item_height = 40; // Approximate height of each menu item in pixels
  let height = (filtered_items.len() as f64 * item_height as f64).ceil() as u32;

  resize_menu(app_handle, index, button_x, monitor_y, width, height)?;

  Ok(())
}

fn update_menu_items(
  app_handle: &AppHandle,
  sub_items: Vec<(String, String, isize, Option<String>, Option<String>)>,
) -> anyhow::Result<()> {
  if let Some(existing_window) = app_handle.get_webview_window("macos") {   
    // Serialize the items into JSON
    let items_json = serde_json::to_string(
        &sub_items
            .iter()
            .map(|(name, action, hwnd, icon, key)| {
                serde_json::json!({
                    "name": name,
                    "action": action,
                    "hwnd": hwnd,
                    "icon": icon,
                    "key": key
                })
            })
            .collect::<Vec<_>>(),
    )
    .unwrap_or_else(|_| "[]".to_string());

    existing_window.eval(format!("window.updateMenuItems({});", items_json))?;
  }

  Ok(())
}

pub fn hide_menu(app_handle: &AppHandle) -> anyhow::Result<()> {
  if let Some(existing_window) = app_handle.get_webview_window("macos") {
    existing_window.hide()?;
    existing_window.eval(format!("window.updateMenuItems({:?});", Vec::<serde_json::Value>::new()))?;
  }

  Ok(())
}

fn resize_menu(
  app_handle: &AppHandle,
  index: usize,
  button_x: i32,
  monitor_y: i32,
  width: u32,
  height: u32
) -> anyhow::Result<()> {
  if let Some(existing_window) = app_handle.get_webview_window("macos") {
    // do not show in taskbar
    unsafe {
      if let Ok(app_hwnd) = existing_window.hwnd() {
        SetWindowLongPtrW(HWND(app_hwnd.0), GWL_EXSTYLE, WS_EX_TOOLWINDOW.0 as isize);
      }
    }

    let adjusted_left = button_x + if index == 0 { 12 } else { index as i32 * 10 };
    let _ = existing_window.set_position(tauri::PhysicalPosition::new(adjusted_left, monitor_y + 35));

    existing_window
      .set_size(tauri::Size::Physical(tauri::PhysicalSize { width, height }))
      .map_err(|e| anyhow::anyhow!("Failed to resize window: {}", e))?;

    existing_window.show()?;
  }

  Ok(())
}