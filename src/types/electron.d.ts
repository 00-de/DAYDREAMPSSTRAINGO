import type { TdsApi } from '../../electron/preload';

declare global {
  interface Window {
    tds: TdsApi;
  }
}
export {};
