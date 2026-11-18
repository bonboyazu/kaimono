import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSyncStatus } from '../data/sync/engine.ts';

/** ふつうは数秒で送り終わるので、しばらく残ったときだけ「反映待ち」を出す */
export const PENDING_DELAY_MS = 5000;

function useLasting(on: boolean, ms: number): boolean {
  const [lasting, setLasting] = useState(false);
  useEffect(() => {
    if (!on) {
      setLasting(false);
      return;
    }
    const t = setTimeout(() => setLasting(true), ms);
    return () => clearTimeout(t);
  }, [on, ms]);
  return on && lasting;
}

export function SyncBadges() {
  const { pending, failed, online } = useSyncStatus();
  const showPending = useLasting(pending > 0, PENDING_DELAY_MS);
  return (
    <span className="sync-badges">
      {!online && <span className="badge">オフライン</span>}
      {(showPending || (!online && pending > 0)) && <span className="badge">反映待ち {pending}件</span>}
      {failed > 0 && <span className="badge warn">反映できなかった操作 {failed}件</span>}
    </span>
  );
}

export default function Header({ title }: { title: string }) {
  return (
    <header className="header">
      <h1>{title}</h1>
      <SyncBadges />
      <NavLink to="/settings" className="gear" aria-label="設定">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"
            transform="translate(-1 0)"
          />
        </svg>
      </NavLink>
    </header>
  );
}
