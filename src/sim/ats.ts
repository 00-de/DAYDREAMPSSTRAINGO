import { ASPECT, type Route, type AtsState, type Station } from './types';

/**
 * ATS-P 相当の速度照査。
 * 停止目標・信号・制限速度のそれぞれに対して照査パターンを引き、
 * いちばん厳しいものを現在の照査速度とする。
 */
const BETA = 0.85;        // パターンの減速度 [m/s²]（常用最大より緩く取る）
const MARGIN = 20;        // 目標手前の余裕距離 [m]
const APPROACH_BAND = 8;  // パターン接近とみなす差 [km/h]
const RELEASE_BAND = 3;   // ブレーキを緩めるヒステリシス [km/h]
const EMERGENCY_OVER = 15;// この差を超えたら非常ブレーキ

/** 目標地点まで距離 d、目標速度 vt のときの照査速度 [km/h] */
export function patternSpeed(d: number, targetKmh: number): number {
  const dist = Math.max(0, d - MARGIN);
  const vt = targetKmh / 3.6;
  const v = Math.sqrt(vt * vt + 2 * BETA * dist);
  return v * 3.6;
}

interface Target { distance: number; speed: number; name: string }

function collectTargets(route: Route, pos: number, stoppedIds: Set<string>): Target[] {
  const out: Target[] = [];

  // 停車駅の停止位置
  for (const st of route.stations) {
    if (st.pos <= pos || stoppedIds.has(st.id)) continue;
    out.push({ distance: st.pos - pos, speed: 0, name: `${st.name} 停止位置` });
  }

  // 信号現示
  for (const sg of route.signals) {
    if (sg.pos <= pos) continue;
    const sp = ASPECT[sg.aspect].speed;
    if (sp >= 120) continue; // 進行現示は照査しない
    out.push({ distance: sg.pos - pos, speed: sp, name: `${sg.name} ${ASPECT[sg.aspect].label}` });
  }

  // 制限速度区間の始点
  for (const lm of route.limits) {
    if (lm.from <= pos) continue;
    out.push({ distance: lm.from - pos, speed: lm.limit, name: `${lm.reason} ${lm.limit}` });
  }

  return out;
}

export interface AtsResult {
  ats: AtsState;
  autoBrake: number; // ATSが自動で込めるブレーキノッチ（0 / 8 / 9）
}

export function evaluateAts(
  route: Route,
  pos: number,
  speed: number,
  currentLimit: number,
  prev: AtsState,
  stoppedIds: Set<string>,
): AtsResult {
  if (!prev.power) {
    return { ats: { ...prev, phase: 'normal', pattern: 999 }, autoBrake: 0 };
  }

  // いま走っている区間の制限も常時照査の対象
  let pattern = currentLimit;
  let name = '現在の制限速度';
  let distance = 0;

  for (const t of collectTargets(route, pos, stoppedIds)) {
    const p = patternSpeed(t.distance, t.speed);
    if (p < pattern) {
      pattern = p;
      name = t.name;
      distance = t.distance;
    }
  }

  // 非常ブレーキは停止して確認扱いをするまで解けない
  if (prev.phase === 'emergency') {
    return {
      ats: { ...prev, pattern, targetName: name, targetDistance: distance },
      autoBrake: 9,
    };
  }

  let phase: AtsState['phase'] = 'normal';
  let autoBrake = 0;

  if (speed > pattern + EMERGENCY_OVER) {
    phase = 'emergency';
    autoBrake = 9;
  } else if (speed > pattern) {
    phase = 'braking';
    autoBrake = 8; // 常用最大
  } else if (prev.phase === 'braking' && speed > pattern - RELEASE_BAND) {
    phase = 'braking'; // ヒステリシス：すぐには緩めない
    autoBrake = 8;
  } else if (speed > pattern - APPROACH_BAND) {
    phase = 'approach';
  }

  return {
    ats: { power: true, phase, pattern, targetName: name, targetDistance: distance },
    autoBrake,
  };
}

/** 確認扱い。停止していれば非常ブレーキを緩解できる */
export function confirmAts(ats: AtsState, speed: number): AtsState {
  if (ats.phase !== 'emergency') return ats;
  if (speed > 0.3) return ats;
  return { ...ats, phase: 'normal' };
}

/** 停止位置と時刻の採点 */
export function gradeStop(station: Station, errorM: number, delaySec: number): string {
  const e = Math.abs(errorM);
  const d = Math.abs(delaySec);
  if (e <= 0.5 && d <= 5) return '優';
  if (e <= 1.5 && d <= 15) return '良';
  if (e <= 4) return '可';
  return '停止位置不良';
}
