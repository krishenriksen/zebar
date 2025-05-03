use anyhow::Context;
use serde::{Deserialize, Serialize};
use starship_battery::{
  units::{electric_potential::volt, power::watt, ratio::percent, time::millisecond},
  Manager, State,
};

use crate::{
  common::SyncInterval,
  providers::{CommonProviderState, Provider, ProviderInputMsg, RuntimeType},
};

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BatteryProviderConfig {
  pub refresh_interval: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatteryOutput {
  pub charge_percent: f32,
  pub health_percent: f32,
  pub state: String,
  pub is_charging: bool,
  pub time_till_full: Option<f32>,
  pub time_till_empty: Option<f32>,
  pub power_consumption: f32,
  pub voltage: f32,
  pub cycle_count: Option<u32>,
}

pub struct BatteryProvider {
  config: BatteryProviderConfig,
  common: CommonProviderState,
}

impl BatteryProvider {
  pub fn new(config: BatteryProviderConfig, common: CommonProviderState) -> BatteryProvider {
    BatteryProvider { config, common }
  }

  fn run_interval(&self) -> anyhow::Result<BatteryOutput> {
    let battery = Manager::new()?
      .batteries()
      .and_then(|mut batteries| batteries.nth(0).transpose())
      .unwrap_or(None)
      .context("No battery found.")?;

    Ok(BatteryOutput {
      charge_percent: battery.state_of_charge().get::<percent>(),
      health_percent: battery.state_of_health().get::<percent>(),
      state: battery.state().to_string(),
      is_charging: battery.state() == State::Charging,
      time_till_full: battery.time_to_full().map(|time| time.get::<millisecond>()),
      time_till_empty: battery
        .time_to_empty()
        .map(|time| time.get::<millisecond>()),
      power_consumption: battery.energy_rate().get::<watt>(),
      voltage: battery.voltage().get::<volt>(),
      cycle_count: battery.cycle_count(),
    })
  }
}

impl Provider for BatteryProvider {
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
