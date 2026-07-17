import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import log from './logger';
import { ensureDirs, loadSettings, saveSettings, paths, GameSettings } from './store';

export interface FirstRunStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'warn';
  detail?: string;
}

export interface FirstRunResult {
  steps: FirstRunStep[];
  settings: GameSettings;
  skipped: boolean;
}

/** GPU 情報から画質プリセットを決める */
function decidePreset(gpu: string, vramMB: number, cores: number, ramGB: number): GameSettings['graphics'] {
  const g = gpu.toLowerCase();
  const highEnd = /rtx\s*(30|40|50)|radeon\s*rx\s*(6|7|9)\d00|arc\s*a7/.test(g);
  const midRange = /gtx\s*16|rtx\s*20|radeon\s*rx\s*5\d00|iris\s*xe/.test(g);

  if (highEnd && vramMB >= 6000 && ramGB >= 16) {
    return { preset: 'ultra', resolutionScale: 1.0, shadows: true, particles: true, vsync: true };
  }
  if ((highEnd || midRange) && cores >= 6) {
    return { preset: 'high', resolutionScale: 1.0, shadows: true, particles: true, vsync: true };
  }
  if (vramMB >= 2000 && cores >= 4) {
    return { preset: 'medium', resolutionScale: 0.9, shadows: true, particles: true, vsync: true };
  }
  return { preset: 'low', resolutionScale: 0.75, shadows: false, particles: false, vsync: true };
}

/** 初回起動セットアップを実行し、進捗を onStep で通知する */
export async function runFirstRun(onStep: (step: FirstRunStep) => void): Promise<FirstRunResult> {
  const settings = loadSettings();
  const steps: FirstRunStep[] = [];

  const push = (s: FirstRunStep) => { steps.push(s); onStep(s); };
  const update = (id: string, patch: Partial<FirstRunStep>) => {
    const s = steps.find((x) => x.id === id);
    if (s) { Object.assign(s, patch); onStep(s); }
  };
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  if (settings.firstRunCompleted) {
    return { steps, settings, skipped: true };
  }

  // 1. 必要ファイル確認
  push({ id: 'files', label: '必要ファイルを確認しています', status: 'running' });
  const resDir = process.resourcesPath ?? path.join(app.getAppPath(), 'resources');
  const required = ['assets', 'audio', 'routes'];
  const missing = required.filter((d) => !fs.existsSync(path.join(resDir, d)));
  await wait(300);
  update('files', missing.length
    ? { status: 'warn', detail: `見つからないフォルダ: ${missing.join(', ')}` }
    : { status: 'done', detail: `${required.length} 件を確認しました` });

  // 2. GPU 性能確認
  push({ id: 'gpu', label: 'GPU性能を確認しています', status: 'running' });
  let gpuName = '不明';
  let vramMB = 0;
  try {
    const info = (await app.getGPUInfo('complete')) as any;
    const dev = info?.gpuDevice?.find((d: any) => d.active) ?? info?.gpuDevice?.[0];
    gpuName = dev?.deviceString || dev?.driverVendor || '不明';
    vramMB = Math.round((dev?.videoMemory ?? 0) / (1024 * 1024));
  } catch (e) {
    log.warn('GPU情報を取得できませんでした', e);
  }
  const cores = os.cpus()?.length ?? 4;
  const ramGB = Math.round(os.totalmem() / 1024 ** 3);
  await wait(300);
  update('gpu', { status: 'done', detail: `${gpuName} / ${cores} コア / RAM ${ramGB}GB` });

  // 3. 画質自動設定
  push({ id: 'graphics', label: '画質を自動設定しています', status: 'running' });
  settings.graphics = decidePreset(gpuName, vramMB, cores, ramGB);
  await wait(200);
  update('graphics', { status: 'done', detail: `プリセット: ${settings.graphics.preset.toUpperCase()}` });

  // 4. サウンド確認（デバイス列挙は描画側で実施。ここでは音声ファイルの存在を確認）
  push({ id: 'audio', label: 'サウンドを確認しています', status: 'running' });
  const audioDir = path.join(resDir, 'audio');
  const hasAudio = fs.existsSync(audioDir) && fs.readdirSync(audioDir).length > 0;
  await wait(200);
  update('audio', hasAudio
    ? { status: 'done', detail: '音声ファイルを確認しました' }
    : { status: 'warn', detail: '音声ファイルが見つかりません（無音で起動します）' });

  // 5. ゲームデータ生成
  push({ id: 'data', label: 'ゲームデータを作成しています', status: 'running' });
  ensureDirs();
  if (!fs.existsSync(paths.ranking)) {
    fs.writeFileSync(paths.ranking, JSON.stringify({ payload: { records: [] }, sig: '' }, null, 2));
  }
  await wait(200);
  update('data', { status: 'done', detail: paths.root });

  // 6. 設定ファイル作成
  push({ id: 'settings', label: '設定ファイルを作成しています', status: 'running' });
  settings.firstRunCompleted = true;
  saveSettings(settings);
  await wait(150);
  update('settings', { status: 'done', detail: 'settings.json' });

  log.info('初回セットアップが完了しました', { gpu: gpuName, preset: settings.graphics.preset });
  return { steps, settings, skipped: false };
}
