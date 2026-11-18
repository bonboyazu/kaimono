// 店の優先順（上下に動かす）と、店ごとの扱い（ふだん行く／ふだん行かない）
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRows } from '../../data/hooks.ts';
import type { VisitMode } from '../../domain/types.ts';
import { moveStore, setVisitMode } from './actions.ts';

const MODES: { mode: VisitMode; label: string }[] = [
  { mode: 'usual', label: 'ふだん行く' },
  { mode: 'other', label: 'ふだん行かない' },
];

export default function StoreSetting() {
  const stores = useRows('stores');
  const order = [...(stores ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ja'));
  const [moved, setMoved] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const tops = useRef(new Map<string, number>());
  const key = order.map((s) => s.id).join(',');

  // 並びが変わったら、前の位置から今の位置へ滑らせる
  useLayoutEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    for (const [id, el] of rows.current) {
      const top = el.getBoundingClientRect().top;
      const before = tops.current.get(id);
      tops.current.set(id, top);
      if (reduce || before === undefined || before === top || !el.animate) continue;
      el.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'translateY(0)' }], {
        duration: 250, easing: 'ease-out',
      });
    }
  }, [key]);

  useEffect(() => {
    if (!moved) return;
    const t = setTimeout(() => setMoved(null), 1200);
    return () => clearTimeout(t);
  }, [moved]);

  const move = (id: string, dir: -1 | 1) => {
    setMoved(id);
    void moveStore(order, id, dir);
  };
  return (
    <section className="card">
      <h2>店</h2>
      <p className="note">上にあるほど優先します（同じ値段・同じ日なら上の店）</p>
      {stores && order.length === 0 && <p className="note">店がまだありません。「データ」から足してください</p>}
      <ol className="store-setting" aria-label="店の優先順">
        {order.map((s, i) => (
          <li
            key={s.id} className={moved === s.id ? 'moved' : undefined}
            ref={(el) => { if (el) rows.current.set(s.id, el); else rows.current.delete(s.id); }}
          >
            <div className="store-setting-head">
              <span className="store-setting-rank" aria-hidden="true">{i + 1}</span>
              <span className="store-setting-name">{s.name}</span>
              <button type="button" aria-label={`${s.name}を上へ`} disabled={i === 0} onClick={() => move(s.id, -1)}>↑</button>
              <button type="button" aria-label={`${s.name}を下へ`} disabled={i === order.length - 1} onClick={() => move(s.id, 1)}>↓</button>
            </div>
            <div className="mode-switch" role="group" aria-label={`${s.name}の扱い`}>
              {MODES.map((m) => (
                <button key={m.mode} type="button" aria-pressed={s.visit_mode === m.mode} onClick={() => void setVisitMode(s, m.mode)}>
                  {m.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
