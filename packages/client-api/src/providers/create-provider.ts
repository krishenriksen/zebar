import { createWindowProvider } from './window/create-window-provider';
import type {
  WindowProviderConfig,
  WindowProvider,
} from './window/window-provider-types';

import { createAudioProvider } from './audio/create-audio-provider';
import type {
  AudioProviderConfig,
  AudioProvider,
} from './audio/audio-provider-types';

import { createBatteryProvider } from './battery/create-battery-provider';
import type {
  BatteryProviderConfig,
  BatteryProvider,
} from './battery/battery-provider-types';

import { createCpuProvider } from './cpu/create-cpu-provider';
import type {
  CpuProviderConfig,
  CpuProvider,
} from './cpu/cpu-provider-types';

import { createDateProvider } from './date/create-date-provider';
import type {
  DateProviderConfig,
  DateProvider,
} from './date/date-provider-types';

import { createHostProvider } from './host/create-host-provider';
import type {
  HostProviderConfig,
  HostProvider,
} from './host/host-provider-types';

import type {
  MediaProviderConfig,
  MediaProvider,
} from './media/media-provider-types';

import { createMediaProvider } from './media/create-media-provider';
import { createMemoryProvider } from './memory/create-memory-provider';
import type {
  MemoryProviderConfig,
  MemoryProvider,
} from './memory/memory-provider-types';

import { createNetworkProvider } from './network/create-network-provider';
import type {
  NetworkProviderConfig,
  NetworkProvider,
} from './network/network-provider-types';

import { createDiskProvider } from './disk/create-disk-provider';
import type {
  DiskProvider,
  DiskProviderConfig,
} from './disk/disk-provider-types';

import { createSystrayProvider } from './systray/create-systray-provider';
import type {
  SystrayProviderConfig,
  SystrayProvider,
} from './systray/systray-provider-types';

export interface ProviderConfigMap {
  window: WindowProviderConfig;
  audio: AudioProviderConfig;
  battery: BatteryProviderConfig;
  cpu: CpuProviderConfig;
  date: DateProviderConfig;
  host: HostProviderConfig;
  media: MediaProviderConfig;
  memory: MemoryProviderConfig;
  network: NetworkProviderConfig;
  disk: DiskProviderConfig;
  systray: SystrayProviderConfig;
}

export interface ProviderMap {
  window: WindowProvider;
  audio: AudioProvider;
  battery: BatteryProvider;
  cpu: CpuProvider;
  date: DateProvider;
  host: HostProvider;
  media: MediaProvider;
  memory: MemoryProvider;
  network: NetworkProvider;
  disk: DiskProvider;
  systray: SystrayProvider;
}

export type ProviderType = keyof ProviderConfigMap;

export type ProviderConfig = ProviderConfigMap[keyof ProviderConfigMap];

export type ProviderOutput = ProviderMap[keyof ProviderMap]['output'];

/**
 * Creates a provider, which is a collection of functions and variables
 * that can change over time. Alternatively, multiple providers can be
 * created using {@link createProviderGroup}.
 *
 * The provider will continue to output until its `stop` function is
 * called.
 *
 * @throws If the provider config is invalid. Errors are emitted via the
 * `onError` method.
 */
export function createProvider<T extends ProviderConfig>(
  config: T,
): ProviderMap[T['type']] {
  switch (config.type) {
    case 'window':
      return createWindowProvider(config) as any;
    case 'audio':
      return createAudioProvider(config) as any;
    case 'battery':
      return createBatteryProvider(config) as any;
    case 'cpu':
      return createCpuProvider(config) as any;
    case 'date':
      return createDateProvider(config) as any;
    case 'host':
      return createHostProvider(config) as any;
    case 'media':
      return createMediaProvider(config) as any;
    case 'memory':
      return createMemoryProvider(config) as any;
    case 'network':
      return createNetworkProvider(config) as any;
    case 'disk':
      return createDiskProvider(config) as any;
    case 'systray':
      return createSystrayProvider(config) as any;
    default:
      throw new Error('Not a supported provider type.');
  }
}
