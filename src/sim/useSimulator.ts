import { useCallback, useEffect, useRef, useState } from 'react';
import type { Route, SimState, StopRecord } from './types';
import { limitAt, gradientAt } from './route';
import { TRAIN, powerAccel, brakeDecel, runResistance, gradeAccel } from './physics';
import { evaluateAts, confirmAts, gradeStop } from './ats';

const PHYSICS_HZ = 120;   // 走行計算は固定ステップ
const UI_HZ = 30;         // 画面の更新はここまで間引く

function initialState(route: Route): SimState {
  const { limit } = limitAt(route, 0);
  return {
    t: 0, pos: 0, speed: 0,
    power: 0, brake: 8, appliedBrake: 8, atsBrake: 0,
    ats: { power: true, phase: 'normal', pattern: limit, targetName: '—', targetDistance: 0 },
    limit, gradient: 0,
    nextStation: route.stations[1] ?? null,
    nextSignal: null,
    stopped: true,
    records: [],
    finished: false,
  };
}

export function useSimulator(route: Route) {
  const [state, setState] = useState<SimState>(() => initialState(route));
  const ref = useRef(state);
  const stoppedIds = useRef(new Set<string>([route.stations[0].id]));
  const running = useRef(true);

  const commit = (next: SimState) => { ref.current = next; };

  /* ── 走行計算 1ステップ ── */
  const step = useCallback((s: SimState, dt: number): SimState => {
    if (s.finished) return s;

    const { limit } = limitAt(route, s.pos);
    const gradient = gradientAt(route, s.pos);

    // ATS：運転士のブレーキと、ATSが込めたブレーキの厳しい方を採る
    const { ats, autoBrake } = evaluateAts(route, s.pos, s.speed, limit, s.ats, stoppedIds.current);
    const commanded = Math.max(s.brake, autoBrake);

    // 空走時間ぶんブレーキの立ち上がりを遅らせる
    const k = Math.min(1, dt / TRAIN.brakeResponse);
    const applied = s.appliedBrake + (commanded - s.appliedBrake) * k;

    // ATS動作中と非常ブレーキ中は力行を切る
    const powerCut = ats.phase === 'braking' || ats.phase === 'emergency' || commanded > 0;
    const power = powerCut ? 0 : s.power;

    let a = powerAccel(power, s.speed) - brakeDecel(applied) + gradeAccel(gradient);
    a -= s.speed > 0.05 ? runResistance(s.speed) : 0;

    let speed = s.speed + a * dt;
    if (speed < 0) speed = 0;
    if (speed > TRAIN.maxSpeed) speed = TRAIN.maxSpeed;

    const pos = s.pos + (speed / 3.6) * dt;
    const stopped = speed < 0.15;

    // 停車判定：停止位置から±30m以内で止まったら記録する
    let records = s.records;
    let finished = s.finished;
    const target = route.stations.find((st) => !stoppedIds.current.has(st.id));
    if (stopped && target && Math.abs(pos - target.pos) < 30 && commanded > 0 && s.speed >= 0.15) {
      stoppedIds.current.add(target.id);
      const rec: StopRecord = {
        stationId: target.id,
        errorM: Math.round((pos - target.pos) * 10) / 10,
        delaySec: Math.round(s.t - target.arriveAt),
      };
      records = [...s.records, rec];
      if (target.id === route.stations[route.stations.length - 1].id) finished = true;
    }

    const nextStation = route.stations.find((st) => !stoppedIds.current.has(st.id)) ?? null;
    const sig = route.signals.find((x) => x.pos > pos);

    return {
      ...s,
      t: s.t + dt,
      pos, speed, power,
      appliedBrake: applied,
      atsBrake: autoBrake,
      ats, limit, gradient,
      nextStation,
      nextSignal: sig ? { ...sig, distance: sig.pos - pos } : null,
      stopped, records, finished,
    };
  }, [route]);

  /* ── ループ ── */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let uiAcc = 0;
    const fixed = 1 / PHYSICS_HZ;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const elapsed = Math.min((now - last) / 1000, 0.25); // タブ復帰時の飛びを抑える
      last = now;
      if (!running.current) return;

      acc += elapsed;
      let s = ref.current;
      while (acc >= fixed) { s = step(s, fixed); acc -= fixed; }
      commit(s);

      uiAcc += elapsed;
      if (uiAcc >= 1 / UI_HZ) { uiAcc = 0; setState(s); }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  /* ── 操作 ── */
  const setPower = useCallback((n: number) => {
    const s = ref.current;
    const power = Math.max(0, Math.min(TRAIN.powerNotches, n));
    // 力行はブレーキを緩解してからでないと入らない
    if (power > 0 && s.brake > 0) return;
    commit({ ...s, power });
    setState(ref.current);
  }, []);

  const setBrake = useCallback((n: number) => {
    const s = ref.current;
    const brake = Math.max(0, Math.min(9, n));
    commit({ ...s, brake, power: brake > 0 ? 0 : s.power });
    setState(ref.current);
  }, []);

  const emergency = useCallback(() => setBrake(9), [setBrake]);

  const confirm = useCallback(() => {
    const s = ref.current;
    commit({ ...s, ats: confirmAts(s.ats, s.speed) });
    setState(ref.current);
  }, []);

  const reset = useCallback(() => {
    stoppedIds.current = new Set([route.stations[0].id]);
    const s = initialState(route);
    commit(s);
    setState(s);
  }, [route]);

  const pause = useCallback((v: boolean) => { running.current = !v; }, []);

  return {
    state,
    setPower, setBrake, emergency, confirm, reset, pause,
    incPower: () => setPower(ref.current.power + 1),
    decPower: () => setPower(ref.current.power - 1),
    incBrake: () => setBrake(Math.min(8, ref.current.brake + 1)),
    decBrake: () => setBrake(ref.current.brake - 1),
    gradeStop,
  };
}
