import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import log from './logger';

export interface GameSettings {
  version: number;
  firstRunCompleted: boolean;
  graphics: {
    preset: 'low' | 'medium' | 'high' | 'ultra';
    resolutionScale: number;
    shadows: boolean;
    particles: boolean;
    vsync: boolean;
  };
  audio: { master: number; bgm: number; se: number; announce: number; muted: boolean };
  gameplay: { difficulty: 'easy' | 'normal' | 'hard'; assist: boolean; unit: 'km/h' };
  account: { mode: 'guest' | 'google'; uid: string | null };
  update: { autoCheck: boolean; autoDownload: boolean; channel: 'latest' | 'beta' };
}

export const DEFAULT_SETTINGS: GameSettings = {
  version: 1,
  firstRunCompleted: false,
  graphics: { preset: 'medium', resolutionScale: 1.0, shadows: true, particles: true, vsync: true },
  audio: { master: 0.8, bgm: 0.6, se: 0.8, announce: 0.9, muted: false },
  gameplay: { difficulty: 'normal', assist: true, unit: 'km/h' },
  account: { mode: 'guest', uid: null },
  update: { autoCheck: true, autoDownload: true, channel: 'latest' },
};

const userData = app.getPath('userData');
export const paths = {
  root: userData,
  settings: path.join(userData, 'settings.json'),
  saves: path.join(userData, 'saves'),
  backups: path.join(userData, 'backups'),
  screenshots: path.join(userData, 'screenshots'),
  replays: path.join(userData, 'replays'),
  ranking: path.join(userData, 'ranking.json'),
};

export function ensureDirs(): void {
  for (const p of [paths.saves, paths.backups, paths.screenshots, paths.replays]) {
    fs.mkdirSync(p, { recursive: true });
  }
}

/** 改ざん検出用: 本文の SHA-256 を併記して保存する */
interface Envelope<T> { payload: T; sig: string }

function sign(payload: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as Envelope<T>;
    if (!raw || typeof raw !== 'object' || !('payload' in raw)) return fallback;
    if (sign(raw.payload) !== raw.sig) {
      log.warn(`改ざんを検出しました: ${path.basename(file)} — 既定値で復旧します`);
      return fallback;
    }
    return raw.payload;
  } catch (e) {
    log.error(`読み込みに失敗しました: ${file}`, e);
    return fallback;
  }
}

export function writeJson<T>(file: string, payload: T): void {
  const env: Envelope<T> = { payload, sig: sign(payload) };
  const tmp = `${file}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(env, null, 2), 'utf-8');
  fs.renameSync(tmp, file); // 原子的置換：書き込み中の電源断でも破損しない
}

export function loadSettings(): GameSettings {
  return { ...DEFAULT_SETTINGS, ...readJson<GameSettings>(paths.settings, DEFAULT_SETTINGS) };
}

export function saveSettings(s: GameSettings): void {
  writeJson(paths.settings, s);
}
