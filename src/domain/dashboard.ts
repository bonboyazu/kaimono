// ダッシュボード：よく買う商品・よく行く店を、買った回数で数える
import { jstDate } from './dates.ts';
import type { ListItem, Product, Store } from './types.ts';

export type Period = 'this_month' | 'three_months' | 'all';
export type Count = { name: string; count: number };

/** 期間の始まりの日（日本時間）。全期間は null */
export function periodStart(period: Period, today: string): string | null {
  if (period === 'all') return null;
  const [y, m] = today.split('-').map(Number);
  const back = period === 'this_month' ? 0 : 2;
  const total = y * 12 + (m - 1) - back;
  const yy = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  return `${yy}-${String(mm).padStart(2, '0')}-01`;
}

const byCount = (a: Count, b: Count) => b.count - a.count || a.name.localeCompare(b.name, 'ja');

function tally(ids: string[], names: Map<string, string>): Count[] {
  const counts = new Map<string, number>();
  for (const id of ids) if (names.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].map(([id, count]) => ({ name: names.get(id)!, count })).sort(byCount);
}

export function purchaseCounts(input: {
  items: ListItem[];
  products: Product[];
  stores: Store[];
  period: Period;
  today: string;
}): { byProduct: Count[]; byStore: Count[] } {
  const start = periodStart(input.period, input.today);
  const bought = input.items.filter(
    (i) => !i.deleted_at && i.checked_at && (start === null || jstDate(new Date(i.checked_at)) >= start),
  );
  const productNames = new Map(input.products.filter((p) => !p.deleted_at).map((p) => [p.id, p.name]));
  const storeNames = new Map(input.stores.filter((s) => !s.deleted_at).map((s) => [s.id, s.name]));
  return {
    byProduct: tally(bought.map((i) => i.product_id), productNames),
    byStore: tally(bought.flatMap((i) => (i.bought_store_id ? [i.bought_store_id] : [])), storeNames),
  };
}
