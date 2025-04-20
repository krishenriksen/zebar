use serde::Deserialize;

#[cfg(windows)]
use super::{
  audio::AudioProviderConfig, media::MediaProviderConfig,
  systray::SystrayProviderConfig,
};
use super::{
  battery::BatteryProviderConfig, cpu::CpuProviderConfig,
  memory::MemoryProviderConfig, network::NetworkProviderConfig,
  window::WindowProviderConfig,
};

#[derive(Deserialize, Debug)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ProviderConfig {
  #[cfg(windows)]
  Window(WindowProviderConfig),
  Audio(AudioProviderConfig),
  Battery(BatteryProviderConfig),
  Cpu(CpuProviderConfig),
  Media(MediaProviderConfig),
  Memory(MemoryProviderConfig),
  Network(NetworkProviderConfig),
  Systray(SystrayProviderConfig),
}
