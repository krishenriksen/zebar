use serde::Serialize;

#[cfg(windows)]
use super::{
  audio::AudioOutput,
  media::MediaOutput,
  systray::SystrayOutput,
  window::WindowOutput,
};
use super::{
  battery::BatteryOutput,
  cpu::CpuOutput,
  disk::DiskOutput,
  host::HostOutput,
  memory::MemoryOutput,
  network::NetworkOutput,
};

/// Implements `From<T>` for `ProviderOutput` for each given variant.
macro_rules! impl_provider_output {
  ($($variant:ident($type:ty)),* $(,)?) => {
    $(
      impl From<$type> for ProviderOutput {
        fn from(value: $type) -> Self {
          Self::$variant(value)
        }
      }
    )*
  };
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(untagged)]
pub enum ProviderOutput {
  #[cfg(windows)]
  Window(WindowOutput),
  Audio(AudioOutput),
  Battery(BatteryOutput),
  Cpu(CpuOutput),
  Host(HostOutput),
  Media(MediaOutput),
  Memory(MemoryOutput),
  Disk(DiskOutput),
  Network(NetworkOutput),
  Systray(SystrayOutput),
}

impl_provider_output! {
  Battery(BatteryOutput),
  Cpu(CpuOutput),
  Host(HostOutput),
  Memory(MemoryOutput),
  Disk(DiskOutput),
  Network(NetworkOutput),
}

#[cfg(windows)]
impl_provider_output! {
  Window(WindowOutput),
  Audio(AudioOutput),
  Media(MediaOutput),
  Systray(SystrayOutput),
}
