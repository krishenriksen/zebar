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
  AppHandle, WebviewWindowBuilder, WebviewUrl, Manager, Emitter, window::Color,
};

use serde_json::Value;
use std::collections::HashMap;

const FONT_SIZE: f64 = 14.0;
const ITEM_HEIGHT: f64 = 29.0;
const SPACER_HEIGHT: f64 = 5.0;
const MENU_PADDING: u32 = 90;

pub fn initialize_menu_window(app_handle: &AppHandle) -> anyhow::Result<()> { 
  if app_handle.get_webview_window("macos").is_none() {
    let app_handle_clone = app_handle.clone(); // Clone the app_handle for the async task
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

    hide_menu(app_handle)?;
  }

  Ok(())
}

fn calculate_menu_position(
  existing_window: &tauri::WebviewWindow,
  index: usize,
  button_x: i32,
  monitor_y: i32,
) -> anyhow::Result<(i32, i32)> {
  let monitor_scale_factor = existing_window.scale_factor().unwrap_or(1.0);

  let adjusted_left = button_x + (index as i32 * 10);
  let adjusted_top = monitor_y + (35 * monitor_scale_factor as i32);

  Ok((adjusted_left, adjusted_top))
}

fn calculate_menu_size(
  existing_window: &tauri::WebviewWindow,
  sub_items: &Vec<HashMap<String, Value>>,
) -> anyhow::Result<(u32, u32)> {
  let filtered_items: Vec<&HashMap<String, Value>> = sub_items
    .iter()
    .filter(|item| item.get("name").and_then(Value::as_str) != Some("spacer"))
    .collect();

  if filtered_items.is_empty() {
    return Err(anyhow::anyhow!("No valid menu items provided"));
  }

  let max_text_width = filtered_items
    .iter()
    .map(|item| {
      let name_width = item
        .get("name")
        .and_then(Value::as_str)
        .map_or(0.0, |name| name.len() as f64 * FONT_SIZE * 0.7);
      let key_width = item
        .get("key")
        .and_then(Value::as_str)
        .map_or(0.0, |key| key.len() as f64 * FONT_SIZE * 0.5);
      let icon_width = item
        .get("icon")
        .and_then(Value::as_str)
        .map_or(0.0, |_| 20.0);
      name_width + key_width + icon_width
    })
    .fold(0.0, f64::max);

  let width = (max_text_width.ceil() as u32) + MENU_PADDING;

  let total_item_height = filtered_items.len() as f64 * ITEM_HEIGHT;
  let spacer_count = sub_items
    .iter()
    .filter(|item| item.get("name").and_then(Value::as_str) == Some("spacer"))
    .count();
  let total_spacer_height = spacer_count as f64 * SPACER_HEIGHT;

  let monitor_scale_factor = existing_window.scale_factor().unwrap_or(1.0);

  let height = ((total_item_height + total_spacer_height) * monitor_scale_factor).ceil() as u32;

  Ok((width, height))
}

fn resize_menu(
  existing_window: &tauri::WebviewWindow,
  left: i32,
  top: i32,
  width: u32,
  height: u32,
) -> anyhow::Result<()> {
  // Do not show in taskbar
  if let Ok(app_hwnd) = existing_window.hwnd() {
    unsafe {
      SetWindowLongPtrW(HWND(app_hwnd.0), GWL_EXSTYLE, WS_EX_TOOLWINDOW.0 as isize);
    }
  } else {
    eprintln!("Failed to retrieve HWND for the menu window.");
  }

  existing_window
    .set_position(tauri::PhysicalPosition::new(left, top))
    .map_err(|e| anyhow::anyhow!("Failed to set position of window: {}", e))?;

  existing_window
    .set_size(tauri::Size::Physical(tauri::PhysicalSize { width, height }))
    .map_err(|e| anyhow::anyhow!("Failed to resize window: {}", e))?;

  existing_window.show()?;

  Ok(())
}

pub fn hide_menu(app_handle: &AppHandle) -> anyhow::Result<()> {
  if let Some(existing_window) = app_handle.get_webview_window("macos") {
    existing_window.hide()?;
  }

  Ok(())
}

pub fn show_menu(
  app_handle: &AppHandle,
  _name: String,
  index: usize,
  sub_items: Vec<HashMap<String, Value>>,
  button_x: i32,
  monitor_y: i32,
) -> anyhow::Result<()> {
  hide_menu(app_handle)?;

  if let Some(existing_window) = app_handle.get_webview_window("macos") {
    let (left, top) = calculate_menu_position(&existing_window, index, button_x, monitor_y)?;

    // Calculate menu size based on raw sub_items
    let (width, height) = calculate_menu_size(&existing_window, &sub_items)?;

    resize_menu(&existing_window, left, top, width, height)?;

    // Emit raw sub_items directly
    existing_window.emit("updateMenuItems", sub_items).unwrap();
  } else {
    eprintln!("No existing window found for 'macos'.");
  }

  Ok(())
}