import type { Provider } from '../create-base-provider';

export interface GpuProviderConfig {
  type: 'gpu';

  /**
   * How often this provider refreshes in milliseconds.
   */
  refreshInterval?: number;
}

export type GpuProvider = Provider<GpuProviderConfig, GpuOutput>;

export interface GpuInfo {
  utilizationGpu: number;
  utilizationMemory: number;
  totalMemory: number;
  freeMemory: number;
  temperature: number;
  vendor: string;
}

export interface GpuOutput {
  gpus: GpuInfo[];
}