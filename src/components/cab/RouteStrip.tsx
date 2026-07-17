import { ASPECT, type Route } from '../../sim/types';

const AHEAD = 1200; // 前方に見通す距離 [m]

/** 前方の線路。駅・信号・制限・勾配を、距離のとおりに並べた帯 */
export default function RouteStrip({ route, pos, speed }: { route: Route; pos: number; speed: number }) {
  const x = (p: number) => ((p - pos) / AHEAD) * 100;
  const inView = (p: number) => p >= pos - 60 && p <= pos + AHEAD;

  return (
    <div className="plate px-4 py-3">
      <div className="flex items-baseline justify-between mb-2.5">
        <p className="eyebrow">前方 {AHEAD} m</p>
        <p className="text-xs text-slate-500 font-mono tabular-nums">
          {Math.round(pos)} m / {route.length} m
        </p>
      </div>

      <div className="relative h-24 overflow-hidden">
        {/* 制限速度の区間 */}
        <div className="absolute inset-x-0 top-0 h-5">
          {route.limits.filter((l) => l.to > pos && l.from < pos + AHEAD).map((l) => (
            <div key={`${l.from}`}
                 className="absolute h-full border-l border-lamp-red/50 bg-lamp-red/[0.07] overflow-hidden"
                 style={{ left: `${Math.max(0, x(l.from))}%`, width: `${Math.min(100, x(l.to)) - Math.max(0, x(l.from))}%` }}>
              <span className="text-[10px] text-lamp-red/80 font-mono px-1 whitespace-nowrap">
                {l.limit} {l.reason}
              </span>
            </div>
          ))}
        </div>

        {/* 線路 */}
        <div className="absolute inset-x-0 top-10 h-px bg-rail" />
        <div className="absolute inset-x-0 top-[46px] h-px bg-rail/50" />

        {/* 100m ごとの目盛り */}
        {Array.from({ length: AHEAD / 100 + 1 }, (_, i) => {
          const p = Math.ceil(pos / 100) * 100 + i * 100;
          if (p > pos + AHEAD) return null;
          return (
            <div key={p} className="absolute top-10 h-2 w-px bg-rail/60" style={{ left: `${x(p)}%` }} />
          );
        })}

        {/* 自車 */}
        <div className="absolute top-[34px] w-2.5 h-2.5 -ml-1.5 rotate-45 bg-lamp-amber"
             style={{ left: 0, boxShadow: '0 0 10px #FFC24A' }} aria-hidden />

        {/* 信号機 */}
        {route.signals.filter((s) => inView(s.pos)).map((s) => (
          <div key={s.id} className="absolute top-2" style={{ left: `${x(s.pos)}%` }}>
            <div className="w-2 h-2 rounded-full -ml-1"
                 style={{
                   background: s.aspect === 'G' ? '#3FE07A' : s.aspect === 'R' ? '#FF4A4A' : '#FFB020',
                   boxShadow: `0 0 8px ${s.aspect === 'G' ? '#3FE07A' : s.aspect === 'R' ? '#FF4A4A' : '#FFB020'}`,
                 }} />
            <div className="w-px h-7 bg-rail ml-[-0.5px]" />
            <p className="text-[9px] text-slate-500 whitespace-nowrap -ml-1 mt-0.5">
              {ASPECT[s.aspect].label}
            </p>
          </div>
        ))}

        {/* 駅 */}
        {route.stations.filter((st) => inView(st.pos)).map((st) => (
          <div key={st.id} className="absolute top-[38px]" style={{ left: `${x(st.pos)}%` }}>
            <div className="w-0.5 h-4 bg-slate-200 -ml-px" />
            <p className="text-[11px] text-slate-200 whitespace-nowrap -ml-2 mt-1">{st.name}</p>
          </div>
        ))}

        {/* 勾配 */}
        <div className="absolute inset-x-0 bottom-0 h-4">
          {route.gradients.filter((g) => g.permil !== 0 && g.to > pos && g.from < pos + AHEAD).map((g) => (
            <div key={g.from}
                 className="absolute h-full flex items-center"
                 style={{ left: `${Math.max(0, x(g.from))}%`, width: `${Math.min(100, x(g.to)) - Math.max(0, x(g.from))}%` }}>
              <div className={`h-px w-full ${g.permil > 0 ? 'bg-lamp-amber/60' : 'bg-lamp-green/60'}`} />
              <span className="absolute text-[9px] font-mono text-slate-500 px-1">
                {g.permil > 0 ? '↗' : '↘'} {Math.abs(g.permil)}‰
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-slate-600 font-mono tabular-nums mt-1">
        制動距離の目安 {Math.round(((speed / 3.6) ** 2) / (2 * (3.5 / 3.6)))} m
      </p>
    </div>
  );
}
