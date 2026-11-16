// 画面の一番上で下に引っ張って離すと、更新する。更新が終わるまで、くるくるを出す
import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 70;
const MAX = THRESHOLD * 1.4;

type State = 'idle' | 'pulling' | 'refreshing';

export default function PullToRefresh({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [state, setState] = useState<State>('idle');
  const [distance, setDistance] = useState(0);
  const start = useRef<number | null>(null);
  const dist = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      const target = e.target as Element | null;
      if (busy.current || window.scrollY > 0 || target?.closest?.('.sheet-backdrop')) {
        start.current = null;
        return;
      }
      start.current = e.touches[0]?.clientY ?? null;
      dist.current = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current === null) return;
      // 指の動きの半分だけ下げる（引っ張っている手応え）
      const d = Math.max(0, ((e.touches[0]?.clientY ?? start.current) - start.current) / 2);
      dist.current = d;
      setDistance(Math.min(d, MAX));
      setState(d === 0 ? 'idle' : 'pulling');
    };
    const onEnd = () => {
      if (start.current === null) return;
      start.current = null;
      if (dist.current < THRESHOLD) {
        setDistance(0);
        setState('idle');
        return;
      }
      busy.current = true;
      setState('refreshing');
      setDistance(THRESHOLD);
      onRefresh().finally(() => {
        busy.current = false;
        setState('idle');
        setDistance(0);
      });
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
  const ready = distance >= THRESHOLD;
  const progress = Math.min(distance / THRESHOLD, 1);
  return (
    <div
      className={`ptr${state === 'refreshing' ? ' spinning' : ''}${ready ? ' ready' : ''}`}
      role="status"
      aria-label={state === 'refreshing' ? '更新しています' : ready ? '離すと更新' : '引っ張って更新'}
      style={{ transform: `translate(-50%, ${distance - 40}px)`, opacity: state === 'refreshing' ? 1 : progress }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style={state === 'refreshing' ? undefined : { transform: `rotate(${progress * 270}deg)` }}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={`${state === 'refreshing' ? 42 : progress * 42} 57`} />
      </svg>
    </div>
  );
}
