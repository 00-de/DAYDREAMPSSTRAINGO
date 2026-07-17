import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import log, { installCrashHandlers, logDir } from './logger';
import { ensureDirs, loadSettings, saveSettings, paths, GameSettings } from './store';
import { runFirstRun } from './firstRun';
import {
  initUpdater, checkForUpdates, downloadUpdate, quitAndInstall,
  startPeriodicCheck, getUpdateState,
} from './updater';
import { createBackup, listBackups, restoreBackup, deleteBackup } from './backup';

installCrashHandlers();

// 多重起動の防止（インストール型アプリの基本動作）
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let periodic: NodeJS.Timeout | null = null;

const DIST = path.join(__dirname, '../dist');
const PRELOAD = path.join(__dirname, 'preload.js');
const DEV_URL = process.env.VITE_DEV_SERVER_URL;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#141A22',
    show: false,
    icon: path.join(process.env.VITE_PUBLIC ?? DIST, 'icon.ico'),
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,     // セキュリティ: 描画側から Node へ直接触らせない
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  // 外部リンクは既定のブラウザで開く
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  // 想定外の遷移を禁止（改ざん・フィッシング対策）
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (DEV_URL && url.startsWith(DEV_URL)) return;
    e.preventDefault();
  });

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    log.error('描画プロセスが停止しました', details);
  });

  if (DEV_URL) {
    void mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(DIST, 'index.html'));
  }
}

app.whenReady().then(() => {
  ensureDirs();
  log.info(`Train Driver Simulator ${app.getVersion()} を起動しました`);
  createWindow();
  if (mainWindow) {
    initUpdater(mainWindow);
    periodic = startPeriodicCheck();
  }
});

app.on('window-all-closed', () => {
  if (periodic) clearInterval(periodic);
  if (process.platform !== 'darwin') app.quit();
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

/* ────────────── IPC ────────────── */

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  name: app.getName(),
  isPackaged: app.isPackaged,
  platform: process.platform,
  userDataPath: paths.root,
  logPath: logDir,
}));

ipcMain.handle('settings:get', () => loadSettings());
ipcMain.handle('settings:set', (_e, s: GameSettings) => { saveSettings(s); return true; });

ipcMain.handle('firstRun:start', async (e) => {
  return runFirstRun((step) => e.sender.send('firstRun:step', step));
});

ipcMain.handle('update:check', () => checkForUpdates(false));
ipcMain.handle('update:download', () => downloadUpdate());
ipcMain.handle('update:install', () => quitAndInstall());
ipcMain.handle('update:state', () => getUpdateState());

ipcMain.handle('backup:create', (_e, reason: 'manual' | 'auto') =>
  createBackup(app.getVersion(), reason));
ipcMain.handle('backup:list', () => listBackups());
ipcMain.handle('backup:restore', async (_e, id: string) => {
  const { response } = await dialog.showMessageBox(mainWindow!, {
    type: 'warning',
    buttons: ['復元する', 'キャンセル'],
    defaultId: 1,
    cancelId: 1,
    title: 'バックアップから復元',
    message: 'この世代のデータで現在のデータを置き換えます。',
    detail: '現在のデータは自動でバックアップされるため、後から戻せます。',
  });
  if (response !== 0) return false;
  return restoreBackup(id, app.getVersion());
});
ipcMain.handle('backup:delete', (_e, id: string) => deleteBackup(id));

ipcMain.handle('logs:open', () => shell.openPath(logDir));

/* ── セーブデータ（ローカル） ── */
ipcMain.handle('save:write', (_e, slot: string, data: unknown) => {
  const file = path.join(paths.saves, `${slot}.json`);
  fs.mkdirSync(paths.saves, { recursive: true });
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(data), 'utf-8');
  fs.renameSync(`${file}.tmp`, file);
  return true;
});

ipcMain.handle('save:read', (_e, slot: string) => {
  const file = path.join(paths.saves, `${slot}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
});

ipcMain.handle('save:list', () => {
  if (!fs.existsSync(paths.saves)) return [];
  return fs.readdirSync(paths.saves)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ slot: f.replace(/\.json$/, ''), mtime: fs.statSync(path.join(paths.saves, f)).mtime.toISOString() }));
});
