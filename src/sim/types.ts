/** 信号現示。実際の鉄道と同じ5現示で扱う */
export type Aspect = 'R' | 'YY' | 'Y' | 'YG' | 'G';

export const ASPECT: Record<Aspect, { speed: number; label: string; short: string }> = {
  R:  { speed: 0,   label: '停止',  short: '停' },
  YY: { speed: 25,  label: '警戒',  short: '警' },
  Y:  { speed: 45,  label: '注意',  short: '注' },
  YG: { speed: 75,  label: '減速',  short: '減' },
  G:  { speed: 120, label: '進行',  short: '進' },
};

export interface Station {
  id: string;
  name: string;
  kana: string;
  pos: number;          // 停止位置 [m]
  arriveAt: number;     // 到着時刻 [経過秒]
  departAt: number;     // 発車時刻 [経過秒]
  cars: number;         // 停止位置目標の編成両数
}

export interface SpeedLimit { from: number; to: number; limit: number; reason: string }
export interface Gradient  { from: number; to: number; permil: number }  // + が上り勾配
export interface Signal    { id: string; pos: number; aspect: Aspect; name: string }

export interface Route {
  id: string;
  name: string;
  line: string;
  length: number;
  stations: Station[];
  limits: SpeedLimit[];
  gradients: Gradient[];
  signals: Signal[];
}

export type AtsPhase = 'normal' | 'approach' | 'braking' | 'emergency';

export interface AtsState {
  power: boolean;
  phase: AtsPhase;
  pattern: number;        // 現在地点の照査速度 [km/h]
  targetName: string;     // 照査の対象（駅・信号・制限）
  targetDistance: number; // 対象までの距離 [m]
}

export interface StopRecord {
  stationId: string;
  errorM: number;      // 停止位置誤差（+ が行きすぎ）
  delaySec: number;    // 定刻との差（+ が延着）
}

export interface SimState {
  t: number;            // 経過秒
  pos: number;          // 起点からの距離 [m]
  speed: number;        // [km/h]
  power: number;        // 力行ノッチ 0..5
  brake: number;        // ブレーキ 0..8、9 = 非常
  appliedBrake: number; // 空走を経て実際に効いているブレーキ
  atsBrake: number;     // ATSが自動で込めたブレーキ
  ats: AtsState;
  limit: number;        // 現在の制限速度
  gradient: number;     // 現在の勾配 [‰]
  nextStation: Station | null;
  nextSignal: (Signal & { distance: number }) | null;
  stopped: boolean;
  records: StopRecord[];
  finished: boolean;
}
