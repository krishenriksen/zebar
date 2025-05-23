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

import { createGpuProvider } from './gpu/create-gpu-provider';
import type {
  GpuProviderConfig,
  GpuProvider,
} from './gpu/gpu-provider-types';

import { createDateProvider } from './date/create-date-provider';
import type {
  DateProviderConfig,
  DateProvider,
} from './date/date-provider-types';

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

import { createSystrayProvider } from './systray/create-systray-provider';
import type {
  SystrayProviderConfig,
  SystrayProvider,
} from './systray/systray-provider-types';

import { createWindowProvider } from './window/create-window-provider';
import type {
  WindowProviderConfig,
  WindowProvider,
} from './window/window-provider-types';

export interface ProviderConfigMap {
  audio: AudioProviderConfig;
  battery: BatteryProviderConfig;
  cpu: CpuProviderConfig;
  gpu: GpuProviderConfig;
  date: DateProviderConfig;
  media: MediaProviderConfig;
  memory: MemoryProviderConfig;
  network: NetworkProviderConfig;
  systray: SystrayProviderConfig;
  window: WindowProviderConfig;
}

export interface ProviderMap {
  audio: AudioProvider;
  battery: BatteryProvider;
  cpu: CpuProvider;
  gpu: GpuProvider;
  date: DateProvider;
  media: MediaProvider;
  memory: MemoryProvider;
  network: NetworkProvider;
  systray: SystrayProvider;
  window: WindowProvider;
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
    case 'audio':
      return createAudioProvider(config) as any;
    case 'battery':
      return createBatteryProvider(config) as any;
    case 'cpu':
      return createCpuProvider(config) as any;
    case 'gpu':
      return createGpuProvider(config) as any;
    case 'date':
      return createDateProvider(config) as any;
    case 'media':
      return createMediaProvider(config) as any;
    case 'memory':
      return createMemoryProvider(config) as any;
    case 'network':
      return createNetworkProvider(config) as any;
    case 'systray':
      return createSystrayProvider(config) as any;
    case 'window':
      return createWindowProvider(config) as any;
    default:
      throw new Error('Not a supported provider type.');
  }
}
