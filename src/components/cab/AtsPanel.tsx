import { ASPECT, type AtsState, type Aspect } from '../../sim/types';

const LAMP: Record<AtsState['phase'], { text: string; cls: string }> = {
  normal:    { text: '正常',       cls: 'lamp-on-green' },
  approach:  { text: 'パターン接近', cls: 'lamp-on-amber animate-pulse' },
  braking:   { text: 'ブレーキ動作', cls: 'lamp-on-red' },
  emergency: { text: '非常ブレーキ', cls: 'lamp-on-red animate-pulse' },
};

const ASPECT_COLOR: Record<Aspect, string> = {
  R: '#FF4A4A', YY: '#FFB020', Y: '#FFB020', YG: '#FFC24A', G: '#3FE07A',
};

interface Props {
  ats: AtsState;
  signal: { name: string; aspect: Aspect; distance: number } | null;
  onConfirm: () => void;
}

/** ATS-P の車上表示器。現示・照査対象・確認扱いをここへまとめる */
export default function AtsPanel({ ats, signal, onConfirm }: Props) {
  const l = LAMP[ats.phase];

  return (
    <div className="plate p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow">ATS-P</p>
        <div className="flex items-center gap-2">
          <span className={'lamp ' + (ats.power ? 'lamp-on-green' : 'lamp-off')} aria-hidden />
          <span className="text-[10px] text-slate-500 tracking-widest">電源</span>
        </div>
      </div>

      {/* 動作状態 */}
      <div className="flex items-center gap-3 bg-cab px-3 py-2.5 rounded-sm">
        <span className={'lamp ' + l.cls} aria-hidden />
        <span className={
          'text-sm ' + (ats.phase === 'normal' ? 'text-slate-300' : 'text-lamp-amber')
        }>
          {l.text}
        </span>
      </div>

      {/* 照査対象 */}
      <div>
        <p className="eyebrow mb-1.5">照査対象</p>
        <p className="text-sm text-slate-200 truncate">{ats.targetName}</p>
        <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
          {ats.targetDistance > 0 ? `${Math.round(ats.targetDistance)} m 手前` : '現在地点'}
        </p>
      </div>

      {/* 信号現示 */}
      <div>
        <p className="eyebrow mb-1.5">次の信号</p>
        {signal ? (
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold text-cab"
                  style={{ background: ASPECT_COLOR[signal.aspect], boxShadow: `0 0 12px ${ASPECT_COLOR[signal.aspect]}` }}>
              {ASPECT[signal.aspect].short}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-slate-200 truncate">{signal.name}</p>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                {ASPECT[signal.aspect].label} · {Math.round(signal.distance)} m
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">—</p>
        )}
      </div>

      {ats.phase === 'emergency' && (
        <button className="btn w-full border-lamp-red/60 bg-lamp-red/15 text-lamp-red hover:bg-lamp-red/25"
                onClick={onConfirm}>
          確認扱い（停止後に緩解）
        </button>
      )}
    </div>
  );
}
