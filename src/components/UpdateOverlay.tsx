import { useEffect, useState } from 'react';

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'available'; version: string; notes: string; sizeBytes: number }
  | { phase: 'not-available'; version: string }
  | { phase: 'downloading'; percent: number; transferred: number; total: number; bytesPerSecond: number }
  | { phase: 'ready'; version: string }
  | { phase: 'error'; message: string };

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;

/**
 * アップデート通知。
 * ダウンロード進行は速度計の目盛りとして表示する（この画面の見せ場）。
 */
export default function UpdateOverlay() {
  const [state, setState] = useState<UpdateState>({ phase: 'idle' });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void window.tds.update.state().then((s) => setState(s as UpdateState));
    return window.tds.update.onState((s) => {
      setState(s as UpdateState);
      setDismissed(false);
    });
  }, []);

  const hidden =
    dismissed ||
    state.phase === 'idle' ||
    state.phase === 'checking' ||
    state.phase === 'not-available' ||
    state.phase === 'error'; // オフラインでも遊べるよう、失敗は前面に出さない

  if (hidden) return null;

  const percent = state.phase === 'downloading' ? state.percent : state.phase === 'ready' ? 100 : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 flex justify-center">
      <div className="plate w-full max-w-2xl px-6 py-5">
        <div className="flex items-start gap-6">
          {/* 速度計型の進行表示 */}
          <Gauge percent={percent} active={state.phase === 'downloading'} />

          <div className="flex-1 min-w-0">
            <p className="eyebrow mb-1.5">Software Update</p>

            {state.phase === 'available' && (
              <>
                <h2 className="text-base text-slate-100">
                  バージョン {state.version} が公開されました
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  変更されたファイルだけを取得します
                  {state.sizeBytes > 0 && `（最大 ${mb(state.sizeBytes)}）`}。
                  セーブデータと設定はそのまま引き継がれます。
                </p>
                <div className="mt-4 flex gap-2">
                  <button className="btn btn-primary" onClick={() => window.tds.update.download()}>
                    今すぐ更新する
                  </button>
                  <button className="btn" onClick={() => setDismissed(true)}>
                    あとで
                  </button>
                </div>
              </>
            )}

            {state.phase === 'downloading' && (
              <>
                <h2 className="text-base text-slate-100">ダウンロードしています</h2>
                <p className="text-xs text-slate-400 mt-1 tabular-nums">
                  {mb(state.transferred)} / {mb(state.total)}
                  <span className="text-slate-600"> · </span>
                  {mb(state.bytesPerSecond)}/秒
                </p>
                <div className="mt-3 h-1 bg-rail/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-lamp-amber transition-[width] duration-300"
                    style={{ width: `${state.percent}%` }}
                  />
                </div>
              </>
            )}

            {state.phase === 'ready' && (
              <>
                <h2 className="text-base text-slate-100">
                  バージョン {state.version} の準備ができました
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  更新前のデータは自動でバックアップしました。再起動すると新しい版で遊べます。
                </p>
                <div className="mt-4 flex gap-2">
                  <button className="btn btn-primary" onClick={() => window.tds.update.install()}>
                    再起動して適用する
                  </button>
                  <button className="btn" onClick={() => setDismissed(true)}>
                    次回の起動時に適用
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 円弧の速度計。針が進行度を指す */
function Gauge({ percent, active }: { percent: number; active: boolean }) {
  const R = 34;
  const C = Math.PI * R; // 半円の弧長
  const angle = -90 + (percent / 100) * 180;

  return (
    <svg width="92" height="60" viewBox="0 0 92 60" className="shrink-0" role="img"
         aria-label={`進行 ${percent} パーセント`}>
      <path d={`M 12 50 A ${R} ${R} 0 0 1 80 50`} fill="none"
            stroke="#3A4756" strokeWidth="5" strokeLinecap="round" />
      <path d={`M 12 50 A ${R} ${R} 0 0 1 80 50`} fill="none"
            stroke="#FFC24A" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C - (C * percent) / 100}
            style={{ transition: 'stroke-dashoffset .35s ease-out' }} />
      <g transform={`rotate(${angle} 46 50)`}>
        <line x1="46" y1="50" x2="46" y2="22" stroke="#FF4A4A" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle cx="46" cy="50" r="3.5" fill="#141A22" stroke="#3A4756" />
      <text x="46" y="40" textAnchor="middle" className="tabular-nums"
            fill={active ? '#FFC24A' : '#94A3B8'} fontSize="13" fontFamily="monospace">
        {percent}
      </text>
    </svg>
  );
}
