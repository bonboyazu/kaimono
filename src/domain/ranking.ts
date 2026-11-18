// 商品ごとに、値段を入れてある店を安い順に並べる（税込で比べる。常に外す店は出さない）
import { toTaxIncluded } from './tax.ts';
import type { Price, Product, SalePrice, Store } from './types.ts';

export type StoreRank = {
  store_id: string;
  /** ふだんの値段（税込） */
  normal: number;
  /** いちばん安い値段（セールがあればセール） */
  best: number;
  /** best がセールのときの曜日（0=日）。ふだんの値段なら空 */
  sale_weekdays: number[];
};

const alive = <T extends { deleted_at: string | null }>(rows: T[]) => rows.filter((r) => !r.deleted_at);

export function rankStores(product: Product, stores: Store[], prices: Price[], sales: SalePrice[]): StoreRank[] {
  const order = new Map(stores.map((s) => [s.id, s.sort_order]));
  const out: StoreRank[] = [];
  for (const store of alive(stores)) {
    if (store.visit_mode === 'never') continue;
    const p = alive(prices).find((x) => x.store_id === store.id && x.product_id === product.id);
    if (!p) continue;
    const normal = toTaxIncluded(p.amount, p.tax_mode, product.tax_rate);
    let best = normal;
    let weekdays: number[] = [];
    for (const s of alive(sales)) {
      if (s.store_id !== store.id || s.product_id !== product.id) continue;
      const v = toTaxIncluded(s.amount, s.tax_mode, product.tax_rate);
      if (v < best) {
        best = v;
        weekdays = [s.weekday];
      } else if (v === best && v < normal) {
        weekdays.push(s.weekday);
      }
    }
    // 月曜はじまりで並べる
    weekdays.sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    out.push({ store_id: store.id, normal, best, sale_weekdays: weekdays });
  }
  return out.sort((a, b) => a.best - b.best || (order.get(a.store_id) ?? 0) - (order.get(b.store_id) ?? 0));
}
