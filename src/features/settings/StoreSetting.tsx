// 店の優先順（上下に動かす）と、店ごとの扱い（ふだん行く／ふだん行かない／常に外す）
import { useRows } from '../../data/hooks.ts';
import type { VisitMode } from '../../domain/types.ts';
import { moveStore, setVisitMode } from './actions.ts';

const MODES: { mode: VisitMode; label: string }[] = [
  { mode: 'usual', label: 'ふだん行く' },
  { mode: 'other', label: 'ふだん行かない' },
  { mode: 'never', label: '常に外す' },
];

export default function StoreSetting() {
  const stores = useRows('stores');
  const order = [...(stores ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ja'));
  return (
    <section className="card">
      <h2>店</h2>
      <p className="note">上にあるほど優先します（同じ値段・同じ日なら上の店）</p>
      {stores && order.length === 0 && <p className="note">店がまだありません。「データ」から足してください</p>}
      <ol className="store-setting" aria-label="店の優先順">
        {order.map((s, i) => (
          <li key={s.id}>
            <div className="store-setting-head">
              <span className="store-setting-name">{s.name}</span>
              <button type="button" aria-label={`${s.name}を上へ`} disabled={i === 0} onClick={() => void moveStore(order, s.id, -1)}>↑</button>
              <button type="button" aria-label={`${s.name}を下へ`} disabled={i === order.length - 1} onClick={() => void moveStore(order, s.id, 1)}>↓</button>
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
