// データ一覧の行を作る（純粋な関数）
import { jstDate } from '../../domain/dates.ts';
import { toTaxIncluded } from '../../domain/tax.ts';
import type { Price, Product, SalePrice, Store, TaxMode } from '../../domain/types.ts';

export type DataSource = { stores: Store[]; products: Product[]; prices: Price[]; sales: SalePrice[] };
export type DataFilter = { storeId: string | null; query: string };
/** store が null の行は、値段を入れない商品（店ごとに並べず1行だけ） */
export type DataRow = { product: Product; store: Store | null; price: Price | null; sales: SalePrice[] };

export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const alive = <T extends { deleted_at: string | null }>(rows: T[]) => rows.filter((r) => !r.deleted_at);
const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, 'ja');

export function buildDataRows(src: DataSource, filter: DataFilter): DataRow[] {
  const q = filter.query.trim();
  const stores = new Map(alive(src.stores).map((s) => [s.id, s]));
  const products = alive(src.products)
    .filter((p) => p.name.includes(q))
    .sort(byName);
  const priceOf = new Map(alive(src.prices).map((p) => [`${p.store_id}:${p.product_id}`, p]));
  const salesOf = (storeId: string, productId: string) =>
    alive(src.sales)
      .filter((s) => s.store_id === storeId && s.product_id === productId)
      .sort((a, b) => a.weekday - b.weekday);

  const rows: DataRow[] = [];
  if (filter.storeId) {
    const store = stores.get(filter.storeId);
    if (!store) return [];
    for (const product of products) {
      if (product.unit === 'none') continue;
      rows.push({ product, store, price: priceOf.get(`${store.id}:${product.id}`) ?? null, sales: salesOf(store.id, product.id) });
    }
    return rows;
  }
  // すべての店：文字を入れたら、当てはまる商品を店ごとに全部並べる（値段のない店も出す）。空なら値段のある行だけ
  // 値段を入れない商品は、いつも店なしの1行
  const storeList = [...stores.values()].sort((a, b) => a.sort_order - b.sort_order);
  for (const product of products) {
    if (product.unit === 'none') {
      rows.push({ product, store: null, price: null, sales: [] });
      continue;
    }
    for (const store of storeList) {
      const price = priceOf.get(`${store.id}:${product.id}`) ?? null;
      if (price || q) rows.push({ product, store, price, sales: salesOf(store.id, product.id) });
    }
  }
  return rows;
}

type Amount = { amount: number; tax_mode: TaxMode };

export const yen = (a: Amount, product: Product) => toTaxIncluded(a.amount, a.tax_mode, product.tax_rate);

export function formatPrice(a: Amount, product: Product): string {
  return `${yen(a, product)}円${product.unit === '100g' ? '/100g' : ''}`;
}

export function formatSale(s: Amount & { weekday: number }, product: Product): string {
  return `${WEEKDAYS[s.weekday]} ${yen(s, product)}円`;
}

export function formatDate(iso: string): string {
  return jstDate(new Date(iso)).replace(/-/g, '/');
}
