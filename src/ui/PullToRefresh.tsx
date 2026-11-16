// 画面の一番上で下に引っ張って離すと、更新する（新しい版を入れ、データをそろえ直す）
import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 70;

type State = 'idle' | 'pulling' | 'ready' | 'refreshing';

export default function PullToRefresh({ onRefresh }: { onRefresh: () => void }) {
  const [state, setState] = useState<State>('idle');
  const [distance, setDistance] = useState(0);
  const start = useRef<number | null>(null);
  const dist = useRef(0);
  const refreshing = useRef(false);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      const target = e.target as Element | null;
      if (refreshing.current || window.scrollY > 0 || target?.closest?.('.sheet-backdrop')) {
        start.current = null;
        return;
      }
      start.current = e.touches[0]?.clientY ?? null;
      dist.current = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current === null) return;
      const d = Math.max(0, (e.touches[0]?.clientY ?? start.current) - start.current);
      dist.current = d;
      setDistance(Math.min(d, THRESHOLD * 1.5));
      setState(d === 0 ? 'idle' : d >= THRESHOLD ? 'ready' : 'pulling');
    };
    const onEnd = () => {
      if (start.current === null) return;
      start.current = null;
      setDistance(0);
      if (dist.current >= THRESHOLD) {
        refreshing.current = true;
        setState('refreshing');
        onRefresh();
      } else {
        setState('idle');
      }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [onRefresh]);

  if (state === 'idle') return null;
  const label = state === 'refreshing' ? '更新しています' : state === 'ready' ? '離すと更新' : '引っ張って更新';
  return (
    <div className="ptr" role="status" style={{ transform: `translate(-50%, ${state === 'refreshing' ? THRESHOLD / 2 : distance / 2}px)` }}>
      {label}
    </div>
  );
}
