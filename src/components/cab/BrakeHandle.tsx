const NOTCHES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const label = (n: number) => (n === 0 ? '緩解' : n === 9 ? '非常' : `B${n}`);

/** ブレーキハンドル。下へ行くほど強く効く。いちばん下が非常 */
export default function BrakeHandle({
  notch, applied, atsBrake, onChange,
}: { notch: number; applied: number; atsBrake: number; onChange: (n: number) => void }) {
  return (
    <div className="plate p-3 w-[92px]">
      <p className="eyebrow text-center mb-2">ブレーキ</p>
      <div className="flex flex-col gap-1">
        {NOTCHES.map((n) => {
          const active = notch === n;
          const byAts = atsBrake === n && atsBrake > notch;
          const lit = n > 0 && n <= Math.max(notch, atsBrake);
          const em = n === 9;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              aria-pressed={active}
              className={[
                'h-7 rounded-sm border text-[11px] font-mono tracking-wider transition',
                em ? 'mt-1.5' : '',
                active || byAts
                  ? em || byAts
                    ? 'border-lamp-red bg-lamp-red/25 text-lamp-red'
                    : 'border-lamp-amber bg-lamp-amber/25 text-lamp-amber'
                  : lit
                  ? 'border-lamp-amber/40 bg-lamp-amber/10 text-lamp-amber/70'
                  : 'border-rail bg-rail/25 text-slate-400 hover:bg-rail/50',
              ].join(' ')}
            >
              {label(n)}
            </button>
          );
        })}
      </div>
      <div className="mt-2.5">
        <p className="eyebrow text-center mb-1">実効</p>
        <div className="h-1 bg-rail/50 rounded-full overflow-hidden">
          <div className="h-full bg-lamp-amber transition-[width] duration-100"
               style={{ width: `${(applied / 9) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
