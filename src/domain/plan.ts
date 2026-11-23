// 提案の計算：どの日にどの店で買うと安いか
import { addDays, weekdayOf } from './dates.ts';
import { comparable } from './size.ts';
import { toTaxIncluded } from './tax.ts';
import type { ListItem, Price, Product, SalePrice, Store, StoreOverride } from './types.ts';

export type Candidate = { date: string; store_id: string; price: number; is_sale: boolean };
export type Alt = Candidate & { diff: number };
export type PlannedItem = {
  item: ListItem;
  product: Product;
  chosen: Candidate | null;
  /** 選ばれた店を外したときの次の候補（diff >= 0） */
  alt_if_store_excluded: Alt | null;
  /** 選ばれた日を外したときの次の候補（diff >= 0） */
  alt_if_date_excluded: Alt | null;
  /** 行かない店のほうが安いとき（diff < 0）。chosen が null のときは diff = 0 で候補を入れる */
  cheaper_elsewhere: Alt | null;
};
export type Plan = {
  dates: string[];
  going_store_ids: string[];
  groups: { date: string; stores: { store_id: string; items: PlannedItem[] }[] }[];
  undecided: PlannedItem[];
};
export type PlanInput = {
  today: string;
  /** ISO。store_overrides の期限の判定に使う */
  now: string;
  available_weekdays: number[];
  excluded_dates: string[];
  stores: Store[];
  store_overrides: StoreOverride[];
  products: Product[];
  prices: Price[];
  sale_prices: SalePrice[];
  /** 未チェックで、消されていないもの */
  items: ListItem[];
};

const alive = <T extends { deleted_at: string | null }>(rows: T[]) => rows.filter((r) => !r.deleted_at);

/** 対象の日：今日から7日間のうち、行ける曜日で、外していない日 */
export function planDates(today: string, availableWeekdays: number[], excludedDates: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    if (availableWeekdays.includes(weekdayOf(d)) && !excludedDates.includes(d)) out.push(d);
  }
  return out;
}

/** 今週行く店かどうか。期限内の切り替えがあればそれ、なければ「ふだん行く」 */
export function isGoing(store: Store, overrides: StoreOverride[], now: string): boolean {
  if (store.visit_mode === 'never') return false;
  const o = alive(overrides).find((x) => x.store_id === store.id && Date.parse(x.expires_at) > Date.parse(now));
  return o ? o.going : store.visit_mode === 'usual';
}

export function buildPlan(input: PlanInput): Plan {
  const dates = planDates(input.today, input.available_weekdays, input.excluded_dates);
  const stores = alive(input.stores).filter((s) => s.visit_mode !== 'never');
  const storeById = new Map(stores.map((s) => [s.id, s]));
  const going = new Set(stores.filter((s) => isGoing(s, input.store_overrides, input.now)).map((s) => s.id));
  const products = new Map(alive(input.products).map((p) => [p.id, p]));
  const prices = alive(input.prices);
  const sales = alive(input.sale_prices);
  const dayIndex = new Map(dates.map((d, i) => [d, i]));

  /** 指定した店で、対象の日ごとの候補 */
  const candidatesAt = (product: Product, storeIds: Iterable<string>): Candidate[] => {
    const out: Candidate[] = [];
    for (const storeId of storeIds) {
      const p = prices.find((x) => x.store_id === storeId && x.product_id === product.id);
      if (!p) continue;
      // 量あたりの商品は 100g などあたりで比べる。量のない値段は使わない
      const normal = comparable(toTaxIncluded(p.amount, p.tax_mode, product.tax_rate), p.size, product.unit);
      if (normal === null) continue;
      for (const date of dates) {
        const s = sales.find((x) => x.store_id === storeId && x.product_id === product.id && x.weekday === weekdayOf(date));
        const salePrice = s ? comparable(toTaxIncluded(s.amount, s.tax_mode, product.tax_rate), p.size, product.unit) : null;
        const onSale = salePrice !== null && salePrice < normal;
        out.push({ date, store_id: storeId, price: onSale ? salePrice : normal, is_sale: onSale });
      }
    }
    return out;
  };

  /** 安い → 日が近い → 優先順が上 */
  const pick = (cs: Candidate[]): Candidate | null => {
    let best: Candidate | null = null;
    for (const c of cs) {
      if (!best) {
        best = c;
        continue;
      }
      const order =
        c.price - best.price ||
        dayIndex.get(c.date)! - dayIndex.get(best.date)! ||
        storeById.get(c.store_id)!.sort_order - storeById.get(best.store_id)!.sort_order;
      if (order < 0) best = c;
    }
    return best;
  };
  const alt = (c: Candidate | null, base: Candidate): Alt | null => (c ? { ...c, diff: c.price - base.price } : null);

  const planned: PlannedItem[] = [];
  const sortedItems = [...input.items].sort((a, b) => a.added_at.localeCompare(b.added_at) || a.id.localeCompare(b.id));
  for (const item of sortedItems) {
    const product = products.get(item.product_id);
    if (!product || product.unit === 'none') continue;
    const forced = item.forced_store_id && storeById.has(item.forced_store_id)
      ? candidatesAt(product, [item.forced_store_id])
      : [];
    const isForced = forced.length > 0;
    const pool = isForced ? forced : candidatesAt(product, going);
    const chosen = pick(pool);
    const others = stores.filter((s) => !going.has(s.id)).map((s) => s.id);
    const elsewhere = isForced ? null : pick(candidatesAt(product, others));
    planned.push({
      item,
      product,
      chosen,
      alt_if_store_excluded: chosen ? alt(pick(pool.filter((c) => c.store_id !== chosen.store_id)), chosen) : null,
      alt_if_date_excluded: chosen ? alt(pick(pool.filter((c) => c.date !== chosen.date)), chosen) : null,
      cheaper_elsewhere: !elsewhere
        ? null
        : !chosen
          ? { ...elsewhere, diff: 0 }
          : elsewhere.price < chosen.price
            ? alt(elsewhere, chosen)
            : null,
    });
  }

  const groups: Plan['groups'] = [];
  for (const date of dates) {
    const byStore = new Map<string, PlannedItem[]>();
    for (const p of planned) {
      if (p.chosen?.date !== date) continue;
      const list = byStore.get(p.chosen.store_id) ?? [];
      list.push(p);
      byStore.set(p.chosen.store_id, list);
    }
    if (byStore.size === 0) continue;
    const storesOfDay = [...byStore.entries()]
      .sort(([a], [b]) => storeById.get(a)!.sort_order - storeById.get(b)!.sort_order)
      .map(([store_id, items]) => ({ store_id, items }));
    groups.push({ date, stores: storesOfDay });
  }

  return {
    dates,
    going_store_ids: stores.filter((s) => going.has(s.id)).sort((a, b) => a.sort_order - b.sort_order).map((s) => s.id),
    groups,
    undecided: planned.filter((p) => !p.chosen),
  };
}
