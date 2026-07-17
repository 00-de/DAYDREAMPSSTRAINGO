import fs from 'node:fs';
import path from 'node:path';
import log from './logger';
import { paths } from './store';

export interface BackupEntry {
  id: string;          // 世代ID（作成日時）
  createdAt: string;
  version: string;     // バックアップ時点のアプリバージョン
  reason: 'update' | 'manual' | 'auto';
  sizeBytes: number;
}

const MAX_GENERATIONS = 5; // 世代管理：直近5件を保持

const targets = () => [
  { src: paths.settings, rel: 'settings.json', isDir: false },
  { src: paths.saves, rel: 'saves', isDir: true },
  { src: paths.ranking, rel: 'ranking.json', isDir: false },
  { src: paths.screenshots, rel: 'screenshots', isDir: true },
  { src: paths.replays, rel: 'replays', isDir: true },
];

function dirSize(p: string): number {
  if (!fs.existsSync(p)) return 0;
  const st = fs.statSync(p);
  if (st.isFile()) return st.size;
  return fs.readdirSync(p).reduce((sum, f) => sum + dirSize(path.join(p, f)), 0);
}

/** バックアップを作成し、古い世代を自動削除する */
export function createBackup(version: string, reason: BackupEntry['reason']): BackupEntry {
  const id = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(paths.backups, id);
  fs.mkdirSync(dest, { recursive: true });

  for (const t of targets()) {
    if (!fs.existsSync(t.src)) continue;
    const to = path.join(dest, t.rel);
    fs.cpSync(t.src, to, { recursive: t.isDir });
  }

  const entry: BackupEntry = {
    id, createdAt: new Date().toISOString(), version, reason, sizeBytes: dirSize(dest),
  };
  fs.writeFileSync(path.join(dest, 'backup.json'), JSON.stringify(entry, null, 2));
  log.info(`バックアップを作成しました: ${id} (${reason})`);

  pruneGenerations();
  return entry;
}

/** 保持世代を超えた古いバックアップを削除する */
function pruneGenerations(): void {
  const list = listBackups();
  for (const old of list.slice(MAX_GENERATIONS)) {
    fs.rmSync(path.join(paths.backups, old.id), { recursive: true, force: true });
    log.info(`古いバックアップを削除しました: ${old.id}`);
  }
}

/** 新しい順に一覧を返す */
export function listBackups(): BackupEntry[] {
  if (!fs.existsSync(paths.backups)) return [];
  return fs.readdirSync(paths.backups)
    .map((id) => {
      const meta = path.join(paths.backups, id, 'backup.json');
      if (!fs.existsSync(meta)) return null;
      try { return JSON.parse(fs.readFileSync(meta, 'utf-8')) as BackupEntry; } catch { return null; }
    })
    .filter((x): x is BackupEntry => x !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 指定世代へ復元する。復元前に現在の状態を自動バックアップする */
export function restoreBackup(id: string, currentVersion: string): boolean {
  const src = path.join(paths.backups, id);
  if (!fs.existsSync(src)) {
    log.error(`バックアップが見つかりません: ${id}`);
    return false;
  }
  createBackup(currentVersion, 'auto'); // 復元の取り消しができるようにする

  for (const t of targets()) {
    const from = path.join(src, t.rel);
    if (!fs.existsSync(from)) continue;
    fs.rmSync(t.src, { recursive: true, force: true });
    fs.cpSync(from, t.src, { recursive: t.isDir });
  }
  log.info(`バックアップから復元しました: ${id}`);
  return true;
}

export function deleteBackup(id: string): boolean {
  const p = path.join(paths.backups, id);
  if (!fs.existsSync(p)) return false;
  fs.rmSync(p, { recursive: true, force: true });
  return true;
}
