import { useEffect } from 'react';
import { useSimulator } from '../../sim/useSimulator';
import { PRACTICE_ROUTE } from '../../sim/route';
import { gradeStop } from '../../sim/ats';
import Speedometer from './Speedometer';
import MasterController from './MasterController';
import BrakeHandle from './BrakeHandle';
import AtsPanel from './AtsPanel';
import RouteStrip from './RouteStrip';

const mmss = (s: number) => {
  const m = Math.floor(Math.abs(s) / 60);
  const sec = Math.floor(Math.abs(s) % 60);
  return `${s < 0 ? '-' : ''}${m}:${sec.toString().padStart(2, '0')}`;
};

export default function CabScreen() {
  const route = PRACTICE_ROUTE;
  const sim = useSimulator(route);
  const s = sim.state;

  /* キー操作 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key) {
        case 'ArrowUp':    e.preventDefault(); sim.incPower(); break;
        case 'ArrowDown':  e.preventDefault(); sim.decPower(); break;
        case 'ArrowRight': e.preventDefault(); sim.incBrake(); break;
        case 'ArrowLeft':  e.preventDefault(); sim.decBrake(); break;
        case ' ':          e.preventDefault(); sim.emergency(); break;
        case 'Enter':      e.preventDefault(); sim.confirm(); break;
        case 'r': case 'R': sim.reset(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sim]);

  const next = s.nextStation;
  const delay = next ? s.t - next.arriveAt : 0;
  const lastRec = s.records[s.records.length - 1];
  const lastStation = lastRec ? route.stations.find((x) => x.id === lastRec.stationId)! : null;

  return (
    <div className="h-full flex flex-col gap-3 p-3">
      {/* 運転状況 */}
      <div className="flex items-center gap-6 px-4 h-11 plate shrink-0">
        <div className="flex items-baseline gap-2">
          <span className="eyebrow">{route.line}</span>
          <span className="text-sm text-slate-200">{route.name}</span>
        </div>
        <div className="h-4 w-px bg-rail" />
        <div className="flex items-baseline gap-2">
          <span className="eyebrow">次は</span>
          <span className="text-sm text-slate-100">{next ? next.name : '終着'}</span>
          {next && (
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              あと {Math.max(0, Math.round(next.pos - s.pos))} m
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-6">
          <div className="text-right">
            <p className="eyebrow">経過</p>
            <p className="text-sm font-mono tabular-nums text-slate-300">{mmss(s.t)}</p>
          </div>
          <div className="text-right">
            <p className="eyebrow">定刻差</p>
            <p className={`text-sm font-mono tabular-nums ${
              Math.abs(delay) <= 5 ? 'text-lamp-green' : delay > 0 ? 'text-lamp-red' : 'text-lamp-amber'
            }`}>
              {next ? mmss(delay) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* 前方 */}
      <RouteStrip route={route} pos={s.pos} speed={s.speed} />

      {/* 運転台 */}
      <div className="flex-1 flex gap-3 min-h-0">
        <MasterController notch={s.power} disabled={s.brake > 0} onChange={sim.setPower} />

        <div className="flex-1 flex items-start justify-center">
          <Speedometer speed={s.speed} limit={s.limit} pattern={s.ats.pattern} atsPhase={s.ats.phase} />
        </div>

        <div className="w-[280px] shrink-0 space-y-3 overflow-y-auto">
          <AtsPanel ats={s.ats} signal={s.nextSignal} onConfirm={sim.confirm} />

          {lastRec && lastStation && (
            <div className="plate p-4">
              <p className="eyebrow mb-2">{lastStation.name} 停車</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-slate-500">停止位置</p>
                  <p className="text-sm font-mono tabular-nums text-slate-200">
                    {lastRec.errorM > 0 ? '+' : ''}{lastRec.errorM} m
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">定刻差</p>
                  <p className="text-sm font-mono tabular-nums text-slate-200">
                    {lastRec.delaySec > 0 ? '+' : ''}{lastRec.delaySec} 秒
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">評価</p>
                  <p className="text-sm text-lamp-green">
                    {gradeStop(lastStation, lastRec.errorM, lastRec.delaySec)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {s.finished && (
            <div className="plate p-4">
              <p className="eyebrow mb-2">運転終了</p>
              <p className="text-sm text-slate-300 mb-3">
                {route.stations[route.stations.length - 1].name} に到着しました。
              </p>
              <button className="btn btn-primary w-full" onClick={sim.reset}>
                もう一度運転する
              </button>
            </div>
          )}
        </div>

        <BrakeHandle notch={s.brake} applied={s.appliedBrake} atsBrake={s.atsBrake}
                     onChange={sim.setBrake} />
      </div>

      {/* 操作の案内 */}
      <div className="plate px-4 py-2 flex items-center gap-5 text-[11px] text-slate-500 shrink-0">
        <Key k="↑ ↓" v="力行" />
        <Key k="→ ←" v="ブレーキ 込め / 緩め" />
        <Key k="Space" v="非常" />
        <Key k="Enter" v="ATS確認" />
        <Key k="R" v="やり直す" />
        <span className="ml-auto font-mono tabular-nums text-slate-600">
          勾配 {s.gradient > 0 ? '↗' : s.gradient < 0 ? '↘' : '—'} {s.gradient !== 0 ? `${Math.abs(s.gradient)}‰` : ''}
        </span>
      </div>
    </div>
  );
}

function Key({ k, v }: { k: string; v: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <kbd className="px-1.5 py-0.5 rounded-sm border border-rail bg-rail/30 text-slate-400 font-mono text-[10px]">
        {k}
      </kbd>
      {v}
    </span>
  );
}
