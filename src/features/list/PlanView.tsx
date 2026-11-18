// 提案：日 → 店 → 商品の順。上で日と店を、その週だけ切り替える
import { useMemo, useState } from 'react';
import { useRow, useRows } from '../../data/hooks.ts';
import { jstDate } from '../../domain/dates.ts';
import type { Plan } from '../../domain/plan.ts';
import { SETTINGS_ID } from '../../domain/types.ts';
import PriceEditor from '../data/PriceEditor.tsx';
import ProductEditor from '../data/ProductEditor.tsx';
import StoreEditor from '../data/StoreEditor.tsx';
import { DEFAULT_WEEKDAYS } from '../settings/actions.ts';
import { toggleStoreThisWeek } from './actions.ts';
import DateChips from './DateChips.tsx';
import PlanItemRow from './PlanItemRow.tsx';
import { dayLabel, md, period } from './planText.ts';
import StoreChips from './StoreChips.tsx';

type Open =
  | { kind: 'price'; storeId: string | null; productId: string }
  | { kind: 'product'; id: string }
  | { kind: 'store'; id: string };

export default function PlanView({ plan, now }: { plan: Plan | null; now: Date }) {
  const settings = useRow('settings', SETTINGS_ID);
  const stores = useRows('stores');
  const excluded = useRows('excluded_dates');
  const [open, setOpen] = useState<Open | null>(null);
  const today = jstDate(now);

  const storeById = useMemo(() => new Map((stores ?? []).map((s) => [s.id, s])), [stores]);
  const storeName = (id: string) => storeById.get(id)?.name ?? '（消した店）';
  const going = useMemo(() => new Set(plan?.going_store_ids ?? []), [plan]);
  const excludedSet = useMemo(() => new Set((excluded ?? []).map((e) => e.date)), [excluded]);
  const weekdays = settings && !settings.deleted_at ? settings.available_weekdays : DEFAULT_WEEKDAYS;

  if (!plan || !stores) return null;
  const empty = plan.groups.length === 0 && plan.undecided.length === 0;
  const openPrice = (storeId: string | null, productId: string) => setOpen({ kind: 'price', storeId, productId });

  return (
    <div className="plan">
      <p className="plan-period">{period(today)}</p>
      <DateChips today={today} weekdays={weekdays} excluded={excludedSet} />
      <StoreChips stores={stores} going={going} />

      {empty && <p className="note empty">リストに未チェックの商品がありません</p>}

      {plan.groups.map((g) => (
        <section key={g.date} className="plan-day" aria-label={dayLabel(g.date, today)}>
          <h2 className="plan-date">
            {md(g.date)}
            {g.date === today && <span className="badge">今日</span>}
          </h2>
          {g.stores.map((s) => {
            const store = storeById.get(s.store_id);
            const isGoing = going.has(s.store_id);
            return (
              <div key={s.store_id} className="plan-store">
                <div className="plan-store-head">
                  <h3>{storeName(s.store_id)}</h3>
                  {store && isGoing && (
                    <button type="button" className="plain" onClick={() => void toggleStoreThisWeek(store, true)}>
                      今週は行かない
                    </button>
                  )}
                </div>
                <ul className="item-list" aria-label={`${dayLabel(g.date, today)} ${storeName(s.store_id)}`}>
                  {s.items.map((p) => (
                    <PlanItemRow
                      key={p.item.id} p={p} today={today} storeName={storeName}
                      showStoreAlt={isGoing} onOpenPrice={openPrice}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      ))}

      {plan.undecided.length > 0 && (
        <section className="plan-day" aria-label="店が未定">
          <h2 className="plan-date">店が未定</h2>
          <ul className="item-list" aria-label="店が未定の商品">
            {plan.undecided.map((p) => (
              <PlanItemRow key={p.item.id} p={p} today={today} storeName={storeName} showStoreAlt={false} onOpenPrice={openPrice} />
            ))}
          </ul>
        </section>
      )}

      {open?.kind === 'price' && (
        <PriceEditor
          storeId={open.storeId} productId={open.productId} onClose={() => setOpen(null)}
          onEditProduct={(id) => setOpen({ kind: 'product', id })}
          onEditStore={(id) => setOpen({ kind: 'store', id })}
        />
      )}
      {open?.kind === 'product' && <ProductEditor id={open.id} onClose={() => setOpen(null)} />}
      {open?.kind === 'store' && <StoreEditor id={open.id} onClose={() => setOpen(null)} />}
    </div>
  );
}
