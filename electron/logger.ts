import log from 'electron-log';
import { app } from 'electron';
import path from 'node:path';

/**
 * ログ出力先: %APPDATA%\train-driver-simulator\logs\
 *  - main.log      … 通常ログ / エラーログ
 *  - crash.log     … 未捕捉例外
 *  - update.log    … アップデート履歴
 */
const logDir = path.join(app.getPath('userData'), 'logs');

log.transports.file.resolvePathFn = () => path.join(logDir, 'main.log');
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB でローテーション
log.transports.file.level = 'info';
log.transports.console.level = app.isPackaged ? false : 'debug';

export const updateLog = log.create({ logId: 'update' });
updateLog.transports.file.resolvePathFn = () => path.join(logDir, 'update.log');

export const crashLog = log.create({ logId: 'crash' });
crashLog.transports.file.resolvePathFn = () => path.join(logDir, 'crash.log');

/** 未捕捉例外・Promise reject をクラッシュログへ記録 */
export function installCrashHandlers(): void {
  process.on('uncaughtException', (err) => {
    crashLog.error('uncaughtException', err?.stack ?? err);
  });
  process.on('unhandledRejection', (reason) => {
    crashLog.error('unhandledRejection', reason);
  });
}

export { logDir };
export default log;
