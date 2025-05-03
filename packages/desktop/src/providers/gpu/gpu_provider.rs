use nvml_wrapper::Nvml;
use serde::{Deserialize, Serialize};

use crate::{
  common::SyncInterval,
  providers::{CommonProviderState, Provider, ProviderInputMsg, RuntimeType},
};

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GpuProviderConfig {
  pub refresh_interval: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuInfo {
  pub utilization_gpu: u32,
  pub utilization_memory: u32,
  pub total_memory: u64,
  pub free_memory: u64,
  pub temperature: u32,
  pub vendor: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuOutput {
  pub gpus: Vec<GpuInfo>,
}

pub struct GpuProvider {
  config: GpuProviderConfig,
  common: CommonProviderState,
}

impl GpuProvider {
  pub fn new(config: GpuProviderConfig, common: CommonProviderState) -> GpuProvider {
    GpuProvider { config, common }
  }

  fn run_interval(&self) -> anyhow::Result<GpuOutput> {
    let nvml = Nvml::init()?;
    let device_count = nvml.device_count()?;
    let mut gpus_info = Vec::new();

    for index in 0..device_count {
      match nvml.device_by_index(index) {
        Ok(device) => match device.utilization_rates() {
          Ok(utilization) => match device.memory_info() {
            Ok(memory) => {
              match device.temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu)
              {
                Ok(temperature) => match device.brand() {
                  Ok(vendor_enum) => {
                    let vendor_string = format!("{:?}", vendor_enum);
                    gpus_info.push(GpuInfo {
                      utilization_gpu: utilization.gpu,
                      utilization_memory: utilization.memory,
                      total_memory: memory.total,
                      free_memory: memory.free,
                      temperature,
                      vendor: vendor_string,
                    });
                  }
                  Err(e) => eprintln!("Error getting brand for device {}: {}", index, e),
                },
                Err(e) => eprintln!("Error getting temperature for device {}: {}", index, e),
              }
            }
            Err(e) => eprintln!("Error getting memory info for device {}: {}", index, e),
          },
          Err(e) => eprintln!("Error getting utilization for device {}: {}", index, e),
        },
        Err(e) => {
          eprintln!("Error getting device at index {}: {}", index, e)
        }
      }
    }

    Ok(GpuOutput { gpus: gpus_info })
  }
}

impl Provider for GpuProvider {
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
