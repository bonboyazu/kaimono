// 端末の写しから提案を作る
import { useMemo } from 'react';
import { useRow, useRows } from '../../data/hooks.ts';
import { jstDate } from '../../domain/dates.ts';
import { buildPlan, type Plan } from '../../domain/plan.ts';
import { SETTINGS_ID } from '../../domain/types.ts';
import { DEFAULT_WEEKDAYS } from '../settings/actions.ts';

/** 読み込み中は null */
export function usePlan(now: Date): Plan | null {
  const settings = useRow('settings', SETTINGS_ID);
  const stores = useRows('stores');
  const overrides = useRows('store_overrides');
  const excluded = useRows('excluded_dates');
  const products = useRows('products');
  const prices = useRows('prices');
  const sales = useRows('sale_prices');
  const items = useRows('list_items');
  return useMemo(() => {
    if (!stores || !overrides || !excluded || !products || !prices || !sales || !items) return null;
    return buildPlan({
      today: jstDate(now),
      now: now.toISOString(),
      available_weekdays: settings && !settings.deleted_at ? settings.available_weekdays : DEFAULT_WEEKDAYS,
      excluded_dates: excluded.map((e) => e.date),
      stores,
      store_overrides: overrides,
      products,
      prices,
      sale_prices: sales,
      items: items.filter((i) => !i.checked_at),
    });
  }, [settings, stores, overrides, excluded, products, prices, sales, items, now]);
}

/** 商品ごとに、提案で選ばれた店（チェックしたときの「買った店」） */
export function chosenStoreOf(plan: Plan | null, itemId: string): string | null {
  if (!plan) return null;
  for (const g of plan.groups) for (const s of g.stores) for (const p of s.items) if (p.item.id === itemId) return p.chosen?.store_id ?? null;
  return null;
}
