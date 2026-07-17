import { BrowserWindow, app } from 'electron';
import pkg from 'electron-updater';
import { updateLog } from './logger';
import { createBackup } from './backup';
import { loadSettings } from './store';

const { autoUpdater } = pkg;

export type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'available'; version: string; notes: string; sizeBytes: number }
  | { phase: 'not-available'; version: string }
  | { phase: 'downloading'; percent: number; transferred: number; total: number; bytesPerSecond: number }
  | { phase: 'ready'; version: string }
  | { phase: 'error'; message: string };

let win: BrowserWindow | null = null;
let state: UpdateState = { phase: 'idle' };

function send(next: UpdateState) {
  state = next;
  win?.webContents.send('update:state', next);
}

export function getUpdateState(): UpdateState {
  return state;
}

export function initUpdater(window: BrowserWindow): void {
  win = window;

  autoUpdater.logger = updateLog;
  autoUpdater.autoDownload = false;        // 通知してからユーザーの操作で開始する
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.disableWebInstaller = true;
  // 差分アップデート: blockmap により変更ブロックのみ取得（既定で有効）
  autoUpdater.disableDifferentialDownload = false;

  const settings = loadSettings();
  autoUpdater.channel = settings.update.channel;

  autoUpdater.on('checking-for-update', () => send({ phase: 'checking' }));

  autoUpdater.on('update-available', (info) => {
    updateLog.info(`新しいバージョンがあります: ${info.version}`);
    send({
      phase: 'available',
      version: info.version,
      notes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
      sizeBytes: info.files?.[0]?.size ?? 0,
    });
    if (loadSettings().update.autoDownload) void downloadUpdate();
  });

  autoUpdater.on('update-not-available', (info) => {
    send({ phase: 'not-available', version: info.version });
  });

  autoUpdater.on('download-progress', (p) => {
    send({
      phase: 'downloading',
      percent: Math.round(p.percent),
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateLog.info(`ダウンロードが完了しました: ${info.version}`);
    // ユーザーデータ保護: インストール直前に必ずバックアップを取る
    try {
      createBackup(app.getVersion(), 'update');
    } catch (e) {
      updateLog.error('アップデート前のバックアップに失敗しました', e);
    }
    send({ phase: 'ready', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    // オフライン時はエラーを表示せず、静かに待機する
    const message = err?.message ?? String(err);
    updateLog.error('アップデートに失敗しました', message);
    send({ phase: 'error', message });
  });
}

/** 起動時 / バックグラウンドの確認 */
export async function checkForUpdates(silent = false): Promise<void> {
  if (!app.isPackaged) {
    updateLog.info('開発モードのため確認をスキップしました');
    if (!silent) send({ phase: 'not-available', version: app.getVersion() });
    return;
  }
  try {
    await autoUpdater.checkForUpdates();
  } catch (e) {
    updateLog.error('確認に失敗しました', e);
    if (!silent) send({ phase: 'error', message: 'サーバーに接続できません' });
  }
}

export async function downloadUpdate(): Promise<void> {
  try {
    await autoUpdater.downloadUpdate();
  } catch (e) {
    send({ phase: 'error', message: (e as Error).message });
  }
}

/** 更新を適用して自動的に再起動する */
export function quitAndInstall(): void {
  updateLog.info('更新を適用して再起動します');
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
}

/** 起動時に1回 + 以後6時間ごとにバックグラウンドで確認 */
export function startPeriodicCheck(): NodeJS.Timeout | null {
  if (!loadSettings().update.autoCheck) return null;
  setTimeout(() => void checkForUpdates(true), 5_000);
  return setInterval(() => void checkForUpdates(true), 6 * 60 * 60 * 1000);
}
