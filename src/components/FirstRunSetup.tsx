import { useEffect, useState } from 'react';

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'warn';
  detail?: string;
}

/**
 * 初回起動の点検画面。
 * 出庫前の車両点検表を模して、項目ごとに表示灯が緑へ変わっていく。
 */
export default function FirstRunSetup({ onFinish }: { onFinish: () => void }) {
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    const off = window.tds.firstRun.onStep((s) => {
      const step = s as Step;
      setSteps((prev) => {
        const i = prev.findIndex((p) => p.id === step.id);
        if (i === -1) return [...prev, step];
        const next = [...prev];
        next[i] = step;
        return next;
      });
    });

    void window.tds.firstRun.start().then((r: any) => {
      if (r.skipped) { onFinish(); return; }
      setTimeout(onFinish, 900);
    });

    return off;
  }, [onFinish]);

  return (
    <div className="h-full flex items-center justify-center px-8">
      <div className="w-full max-w-xl">
        <p className="eyebrow mb-2">出庫前点検 / Initial Setup</p>
        <h1 className="text-2xl font-semibold text-slate-100 mb-1">はじめての起動</h1>
        <p className="text-sm text-slate-400 mb-8">
          お使いのパソコンに合わせて設定を整えています。1分ほどで終わります。
        </p>

        <ul className="plate divide-y divide-rail/40">
          {steps.map((s) => (
            <li key={s.id} className="flex items-center gap-4 px-5 py-3.5">
              <span
                className={
                  'lamp ' +
                  (s.status === 'done' ? 'lamp-on-green'
                    : s.status === 'warn' ? 'lamp-on-amber'
                    : s.status === 'running' ? 'lamp-on-amber animate-pulse'
                    : 'lamp-off')
                }
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200">{s.label}</p>
                {s.detail && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">{s.detail}</p>
                )}
              </div>
              <span className="text-[10px] tracking-widest text-slate-500">
                {s.status === 'done' ? '良' : s.status === 'warn' ? '要確認' : '点検中'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
