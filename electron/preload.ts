import { contextBridge, ipcRenderer } from 'electron';

/**
 * 描画側へ公開する唯一の窓口。
 * contextIsolation により、ここに書いた関数以外は一切呼び出せない。
 */
const api = {
  app: {
    info: () => ipcRenderer.invoke('app:info'),
    openLogs: () => ipcRenderer.invoke('logs:open'),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (s: unknown) => ipcRenderer.invoke('settings:set', s),
  },
  firstRun: {
    start: () => ipcRenderer.invoke('firstRun:start'),
    onStep: (cb: (step: unknown) => void) => {
      const h = (_e: unknown, step: unknown) => cb(step);
      ipcRenderer.on('firstRun:step', h);
      return () => ipcRenderer.off('firstRun:step', h);
    },
  },
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    state: () => ipcRenderer.invoke('update:state'),
    onState: (cb: (state: unknown) => void) => {
      const h = (_e: unknown, state: unknown) => cb(state);
      ipcRenderer.on('update:state', h);
      return () => ipcRenderer.off('update:state', h);
    },
  },
  backup: {
    create: (reason: 'manual' | 'auto' = 'manual') => ipcRenderer.invoke('backup:create', reason),
    list: () => ipcRenderer.invoke('backup:list'),
    restore: (id: string) => ipcRenderer.invoke('backup:restore', id),
    remove: (id: string) => ipcRenderer.invoke('backup:delete', id),
  },
  save: {
    write: (slot: string, data: unknown) => ipcRenderer.invoke('save:write', slot, data),
    read: (slot: string) => ipcRenderer.invoke('save:read', slot),
    list: () => ipcRenderer.invoke('save:list'),
  },
};

contextBridge.exposeInMainWorld('tds', api);
export type TdsApi = typeof api;
