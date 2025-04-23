use serde::Serialize;

#[cfg(windows)]
use super::{
  audio::AudioOutput, media::MediaOutput, systray::SystrayOutput,
  window::WindowOutput,
};
use super::{
  battery::BatteryOutput, cpu::CpuOutput, memory::MemoryOutput,
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
  Audio(AudioOutput),
  Battery(BatteryOutput),
  Cpu(CpuOutput),
  Media(MediaOutput),
  Memory(MemoryOutput),
  Network(NetworkOutput),
  Systray(SystrayOutput),
  Window(WindowOutput),
}

impl_provider_output! {
  Battery(BatteryOutput),
  Cpu(CpuOutput),
  Memory(MemoryOutput),
  Network(NetworkOutput),
}

#[cfg(windows)]
impl_provider_output! {
  Audio(AudioOutput),
  Media(MediaOutput),
  Systray(SystrayOutput),
  Window(WindowOutput),
}
