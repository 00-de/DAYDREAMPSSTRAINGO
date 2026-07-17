import { useEffect, useState } from 'react';
import FirstRunSetup from './components/FirstRunSetup';
import UpdateOverlay from './components/UpdateOverlay';
import CabScreen from './components/cab/CabScreen';

interface AppInfo { version: string; isPackaged: boolean; userDataPath: string }

export default function App() {
  const [ready, setReady] = useState(false);
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    void window.tds.app.info().then((i) => setInfo(i as AppInfo));
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!ready) return <FirstRunSetup onFinish={() => setReady(true)} />;

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between px-6 h-10 border-b border-rail/60 bg-panel/60 shrink-0">
        <div className="flex items-center gap-3">
          <span className={'lamp ' + (online ? 'lamp-on-green' : 'lamp-on-amber')} aria-hidden />
          <span className="text-xs tracking-wide text-slate-400">
            {online ? 'オンライン' : 'オフライン（通信が戻ると同期します）'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-xs text-slate-500 hover:text-slate-300"
                  onClick={() => window.tds.update.check()}>
            更新を確認
          </button>
          <span className="text-xs text-slate-600 tabular-nums">v{info?.version ?? '—'}</span>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <CabScreen />
      </main>

      <UpdateOverlay />
    </div>
  );
}
