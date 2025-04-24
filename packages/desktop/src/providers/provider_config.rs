use serde::Deserialize;

#[cfg(windows)]
use super::{
  audio::AudioProviderConfig, media::MediaProviderConfig,
  systray::SystrayProviderConfig, window::WindowProviderConfig,
};
use super::{
  battery::BatteryProviderConfig, cpu::CpuProviderConfig, gpu::GpuProviderConfig,
  memory::MemoryProviderConfig, network::NetworkProviderConfig,
};

#[derive(Deserialize, Debug)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ProviderConfig {
  #[cfg(windows)]
  Audio(AudioProviderConfig),
  Battery(BatteryProviderConfig),
  Cpu(CpuProviderConfig),
  Gpu(GpuProviderConfig),
  Media(MediaProviderConfig),
  Memory(MemoryProviderConfig),
  Network(NetworkProviderConfig),
  Systray(SystrayProviderConfig),
  Window(WindowProviderConfig),
}
