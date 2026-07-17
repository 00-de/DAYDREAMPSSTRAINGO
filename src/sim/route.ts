import type { Route } from './types';

/**
 * 練習線区「桜坂 → 港南台」全長 4.2km。
 * 上り勾配・急曲線・注意現示をひと通り含む、教習用の短い線区。
 */
export const PRACTICE_ROUTE: Route = {
  id: 'sakurazaka-kounandai',
  name: '各駅停車 港南台ゆき',
  line: '青葉線',
  length: 4200,

  stations: [
    { id: 'sakurazaka', name: '桜坂',   kana: 'さくらざか',   pos: 0,    arriveAt: 0,   departAt: 0,   cars: 10 },
    { id: 'nakagawa',   name: '中川',   kana: 'なかがわ',     pos: 2000, arriveAt: 155, departAt: 185, cars: 10 },
    { id: 'kounandai',  name: '港南台', kana: 'こうなんだい', pos: 4200, arriveAt: 340, departAt: 340, cars: 10 },
  ],

  limits: [
    { from: 0,    to: 300,  limit: 45,  reason: '構内' },
    { from: 300,  to: 1650, limit: 110, reason: '本線' },
    { from: 1650, to: 2000, limit: 75,  reason: '場内' },
    { from: 2000, to: 2900, limit: 110, reason: '本線' },
    { from: 2900, to: 3350, limit: 60,  reason: '曲線 R400' },
    { from: 3350, to: 3900, limit: 110, reason: '本線' },
    { from: 3900, to: 4200, limit: 45,  reason: '構内' },
  ],

  gradients: [
    { from: 0,    to: 600,  permil: 0 },
    { from: 600,  to: 1100, permil: 8 },    // 上り勾配
    { from: 1100, to: 2200, permil: 0 },
    { from: 2200, to: 2700, permil: -10 },  // 下り勾配
    { from: 2700, to: 4200, permil: 0 },
  ],

  signals: [
    { id: 'sig-1', pos: 1200, aspect: 'G',  name: '第1閉塞' },
    { id: 'sig-2', pos: 1650, aspect: 'YG', name: '中川 場内' },
    { id: 'sig-3', pos: 2800, aspect: 'G',  name: '第2閉塞' },
    { id: 'sig-4', pos: 3800, aspect: 'Y',  name: '港南台 場内' },
  ],
};

export function limitAt(route: Route, pos: number): { limit: number; reason: string } {
  const l = route.limits.find((x) => pos >= x.from && pos < x.to);
  return l ? { limit: l.limit, reason: l.reason } : { limit: 45, reason: '既定' };
}

export function gradientAt(route: Route, pos: number): number {
  return route.gradients.find((g) => pos >= g.from && pos < g.to)?.permil ?? 0;
}
