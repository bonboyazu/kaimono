// 店のボタン（常に外す店は出さない）。押すと今週だけ、行く・行かないを切り替える
import type { Store } from '../../domain/types.ts';
import { toggleStoreThisWeek } from './actions.ts';

export default function StoreChips({ stores, going }: { stores: Store[]; going: Set<string> }) {
  const shown = stores.filter((s) => s.visit_mode !== 'never').sort((a, b) => a.sort_order - b.sort_order);
  if (shown.length === 0) return null;
  return (
    <div className="chips" role="group" aria-label="行く店">
      {shown.map((s) => (
        <button key={s.id} type="button" aria-pressed={going.has(s.id)} onClick={() => void toggleStoreThisWeek(s, going.has(s.id))}>
          {s.name}
        </button>
      ))}
    </div>
  );
}
