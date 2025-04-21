use std::{ffi::OsString, os::windows::ffi::OsStringExt};

use anyhow::Result;
use serde::{Deserialize, Serialize};
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::HWND;
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
  GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW, SetForegroundWindow,
};

use crate::{
  common::SyncInterval,
  providers::{
    CommonProviderState, Provider, ProviderInputMsg, RuntimeType,
  },
};

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WindowProviderConfig {
  pub refresh_interval: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowOutput {
  pub title: String,
  pub hwnd: isize,
}

pub struct WindowProvider {
  config: WindowProviderConfig,
  common: CommonProviderState,
  replace_title: Vec<&'static str>,
  default_title: &'static str,
}

impl WindowProvider {
  pub fn new(
    config: WindowProviderConfig,
    common: CommonProviderState,
  ) -> Self {
    WindowProvider {
      config,
      common,
      replace_title: vec!["Zebar - macos/macos", "Program Manager"],
      default_title: "File Explorer",
    }
  }

  fn get_active_window_title(&self) -> Result<(HWND, String)> {
      unsafe {
          let hwnd: HWND = GetForegroundWindow();
          if hwnd.0.is_null() {
              return Ok((hwnd, self.default_title.to_string()));
          }

          let length = GetWindowTextLengthW(hwnd);
          if length == 0 {
              return Ok((hwnd, self.default_title.to_string()));
          }

          let mut buffer: Vec<u16> = vec![0; (length + 1) as usize];

          let copied = GetWindowTextW(hwnd, &mut buffer);

          if copied == 0 {
              return Ok((hwnd, self.default_title.to_string()));
          }

          let os_string = OsString::from_wide(&buffer[..copied as usize]);
          let full_title = os_string.to_string_lossy().to_string();

          let normalized = if self.replace_title.contains(&full_title.as_str())
          {
              self.default_title.to_string()
          } else {
              let processed_title = full_title
                  .replace(" – ", " - ") // Replace en-dash with space-hyphen-space
                  .replace(" — ", " - "); // Replace em-dash with space-hyphen-space

              let app_title = processed_title
                  .split(" - ")
                  .last()
                  .map(|s| s.trim())
                  .filter(|s| !s.is_empty())
                  .unwrap_or(&full_title.as_str());

              app_title.to_string()
          };

          Ok((hwnd, normalized))
      }
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

  fn run_interval(&self) -> anyhow::Result<WindowOutput> {
      let (hwnd, title) = match self.get_active_window_title() {
          Ok(result) => result,
          Err(_err) => {
              return Ok(WindowOutput {
                  title: self.default_title.to_string(),
                  hwnd: 0, // Default to 0 if no valid HWND is found
              });
          }
      };

      Ok(WindowOutput {
          title,
          hwnd: hwnd.0 as isize, // Convert raw pointer to isize
      })
  }
}

impl Provider for WindowProvider {
  fn runtime_type(&self) -> RuntimeType {
    RuntimeType::Sync
  }

  fn start_sync(&mut self) {
    let mut interval = SyncInterval::new(self.config.refresh_interval);

    loop {
      crossbeam::select! {
          recv(interval.tick()) -> _ => {
              let output = self.run_interval();
              self.common.emitter.emit_output(output);
          }
          recv(self.common.input.sync_rx) -> input => {
              if let Ok(ProviderInputMsg::Stop) = input {
                  break;
              }
          }
      }
    }
  }
}
