/**
 * 速度計。
 * この画面の見せ場：目盛りの上に ATS の照査パターンを重ねて描く。
 * 針が琥珀の帯に入る前に減速するのが、運転士のやることのすべて。
 */
const CX = 118, CY = 118, R = 92;
const SWEEP = 240;      // 目盛りの開き角
const VMAX = 120;

const angleOf = (v: number) => -SWEEP / 2 + (Math.min(v, VMAX) / VMAX) * SWEEP;

function point(deg: number, r: number) {
  const a = (deg * Math.PI) / 180;
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) };
}

function arc(r: number, from: number, to: number) {
  const a = point(from, r);
  const b = point(to, r);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

interface Props {
  speed: number;
  limit: number;
  pattern: number;
  atsPhase: 'normal' | 'approach' | 'braking' | 'emergency';
}

export default function Speedometer({ speed, limit, pattern, atsPhase }: Props) {
  const needle = angleOf(speed);
  const over = atsPhase === 'braking' || atsPhase === 'emergency';
  const patternClamped = Math.min(pattern, VMAX);

  return (
    <div className="plate p-4 flex flex-col items-center">
      <svg width="236" height="236" viewBox="0 0 236 236" role="img"
           aria-label={`速度 ${Math.round(speed)} キロ、照査速度 ${Math.round(pattern)} キロ`}>
        {/* 文字板 */}
        <circle cx={CX} cy={CY} r={R + 16} fill="#141A22" stroke="#3A4756" />

        {/* 照査を超える領域。ここへ針を入れないための帯 */}
        {patternClamped < VMAX && (
          <path d={arc(R + 6, angleOf(patternClamped), angleOf(VMAX))}
                fill="none" stroke={over ? '#FF4A4A' : '#FFB020'}
                strokeWidth="7" opacity={over ? 0.95 : 0.5} />
        )}

        {/* 目盛り */}
        {Array.from({ length: 25 }, (_, i) => i * 5).map((v) => {
          const major = v % 20 === 0;
          const a = angleOf(v);
          const p1 = point(a, R);
          const p2 = point(a, R - (major ? 13 : 7));
          return (
            <line key={v} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={v > limit ? '#FF4A4A' : '#8393A7'} strokeWidth={major ? 2 : 1} />
          );
        })}

        {/* 数字 */}
        {Array.from({ length: 7 }, (_, i) => i * 20).map((v) => {
          const p = point(angleOf(v), R - 28);
          return (
            <text key={v} x={p.x} y={p.y + 4} textAnchor="middle" fontSize="12"
                  fontFamily="monospace" fill={v > limit ? '#FF7A7A' : '#B9C4D2'}>
              {v}
            </text>
          );
        })}

        {/* 制限速度の指標 */}
        {limit <= VMAX && (
          <g>
            <line {...lineProps(angleOf(limit), R + 2, R + 13)} stroke="#FF4A4A" strokeWidth="3" />
          </g>
        )}

        {/* 針 */}
        <g transform={`rotate(${needle} ${CX} ${CY})`}
           style={{ transition: 'transform 60ms linear' }}>
          <line x1={CX} y1={CY + 14} x2={CX} y2={CY - R + 6}
                stroke="#FFC24A" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <circle cx={CX} cy={CY} r="7" fill="#1E2733" stroke="#3A4756" strokeWidth="2" />

        {/* デジタル表示 */}
        <text x={CX} y={CY + 58} textAnchor="middle" fontSize="34" fontFamily="monospace"
              fill={over ? '#FF4A4A' : '#FFC24A'} className="tabular-nums">
          {Math.round(speed).toString().padStart(3, ' ')}
        </text>
        <text x={CX} y={CY + 74} textAnchor="middle" fontSize="9" fill="#64748B"
              letterSpacing="2">km/h</text>
      </svg>

      <div className="w-full grid grid-cols-2 gap-px mt-3 text-center">
        <div className="bg-cab py-2">
          <p className="eyebrow">制限</p>
          <p className="text-lamp-red text-lg font-mono tabular-nums">{limit}</p>
        </div>
        <div className="bg-cab py-2">
          <p className="eyebrow">照査</p>
          <p className={`text-lg font-mono tabular-nums ${over ? 'text-lamp-red' : 'text-lamp-amber'}`}>
            {pattern >= 999 ? '—' : Math.round(pattern)}
          </p>
        </div>
      </div>
    </div>
  );
}

function lineProps(deg: number, r1: number, r2: number) {
  const a = point(deg, r1);
  const b = point(deg, r2);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}
