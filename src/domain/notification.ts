// 毎朝の通知：今日がセールで、リストにある商品を知らせる
import { weekdayOf } from './dates.ts';
import { toTaxIncluded } from './tax.ts';
import type { ListItem, Price, Product, SalePrice, Store, Unit } from './types.ts';

export type SaleHit = { store_id: string; store_name: string; product_name: string; price: number; unit: Unit };

const alive = <T extends { deleted_at: string | null }>(rows: T[]) => rows.filter((r) => !r.deleted_at);

/** 行けない曜日なら空。「常に外す」店・ふだんより安くないセールは出さない */
export function saleHitsForToday(input: {
  today: string;
  available_weekdays: number[];
  stores: Store[];
  products: Product[];
  prices: Price[];
  sale_prices: SalePrice[];
  items: ListItem[];
}): SaleHit[] {
  const weekday = weekdayOf(input.today);
  if (!input.available_weekdays.includes(weekday)) return [];

  const stores = new Map(alive(input.stores).filter((s) => s.visit_mode !== 'never').map((s) => [s.id, s]));
  const products = new Map(alive(input.products).map((p) => [p.id, p]));
  const prices = alive(input.prices);
  const todaySales = alive(input.sale_prices).filter((s) => s.weekday === weekday);

  // リストに足した順。同じ商品は1つにまとめる
  const productIds = [
    ...new Set(
      alive(input.items)
        .filter((i) => !i.checked_at)
        .sort((a, b) => a.added_at.localeCompare(b.added_at))
        .map((i) => i.product_id),
    ),
  ];

  const hits: (SaleHit & { order: number; itemOrder: number })[] = [];
  productIds.forEach((productId, itemOrder) => {
    const product = products.get(productId);
    if (!product) return;
    for (const s of todaySales) {
      if (s.product_id !== productId) continue;
      const store = stores.get(s.store_id);
      if (!store) continue;
      const salePrice = toTaxIncluded(s.amount, s.tax_mode, product.tax_rate);
      const normal = prices.find((p) => p.store_id === s.store_id && p.product_id === productId);
      if (normal && salePrice >= toTaxIncluded(normal.amount, normal.tax_mode, product.tax_rate)) continue;
      hits.push({
        store_id: store.id, store_name: store.name, product_name: product.name, price: salePrice, unit: product.unit,
        order: store.sort_order, itemOrder,
      });
    }
  });

  return hits
    .sort((a, b) => a.order - b.order || a.itemOrder - b.itemOrder)
    .map(({ order: _o, itemOrder: _i, ...hit }) => hit);
}

/** 本文は店ごとに1行。同じ店の商品は「、」でつなぐ */
export function notificationText(hits: SaleHit[]): { title: string; body: string } {
  const lines = new Map<string, string[]>();
  for (const h of hits) {
    const key = `${h.store_id}\u0000${h.store_name}`;
    const text = `${h.product_name} ${h.price}円${h.unit === '100g' ? '/100g' : ''}`;
    lines.set(key, [...(lines.get(key) ?? []), text]);
  }
  const body = [...lines].map(([key, items]) => `${key.split('\u0000')[1]}：${items.join('、')}`).join('\n');
  return { title: '今日のセール（リストにあり）', body };
}

/** 送る時刻を過ぎていて、今日まだ送っていないか。時刻は 'HH:MM' なので文字で比べられる */
export function isDue(
  sub: { enabled: boolean; notify_time: string; last_sent_on: string | null },
  today: string,
  nowTime: string,
): boolean {
  if (!sub.enabled) return false;
  if (sub.notify_time > nowTime) return false;
  return sub.last_sent_on !== today;
}
