const NOTCHES = [5, 4, 3, 2, 1, 0];
const label = (n: number) => (n === 0 ? 'N' : `P${n}`);

/** 力行ハンドル。上に倒すほど加速する */
export default function MasterController({
  notch, disabled, onChange,
}: { notch: number; disabled: boolean; onChange: (n: number) => void }) {
  return (
    <div className="plate p-3 w-[92px]">
      <p className="eyebrow text-center mb-2">力行</p>
      <div className="flex flex-col gap-1">
        {NOTCHES.map((n) => {
          const active = notch === n;
          const lit = notch > 0 && n > 0 && n <= notch;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              disabled={disabled && n > 0}
              aria-pressed={active}
              className={[
                'h-9 rounded-sm border text-xs font-mono tracking-wider transition',
                'disabled:opacity-30 disabled:cursor-not-allowed',
                active
                  ? 'border-lamp-green bg-lamp-green/25 text-lamp-green'
                  : lit
                  ? 'border-lamp-green/40 bg-lamp-green/10 text-lamp-green/70'
                  : 'border-rail bg-rail/25 text-slate-400 hover:bg-rail/50',
              ].join(' ')}
            >
              {label(n)}
            </button>
          );
        })}
      </div>
      {disabled && (
        <p className="text-[10px] text-slate-500 text-center mt-2 leading-tight">
          ブレーキを<br />緩めてください
        </p>
      )}
    </div>
  );
}
