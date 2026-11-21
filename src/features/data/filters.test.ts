import { describe, expect, it } from 'vitest';
import type { Price, Product, SalePrice, Store } from '../../domain/types.ts';
import { buildDataRows, formatDate, formatPrice, formatSale } from './filters.ts';

const meta = { field_times: {}, deleted_at: null };
const store = (id: string, name: string, sort_order: number, deleted = false): Store => ({
  ...meta, id, name, sort_order, visit_mode: 'usual', default_tax_mode: 'included',
  deleted_at: deleted ? '2026-11-01T00:00:00Z' : null,
});
const product = (id: string, name: string, unit: Product['unit'] = 'piece', tax_rate = 8): Product => ({
  ...meta, id, name, unit, tax_rate, is_preset: true,
});
const price = (store_id: string, product_id: string, amount: number): Price => ({
  ...meta, id: `${store_id}:${product_id}`, store_id, product_id, amount, tax_mode: 'included',
  price_updated_at: '2026-11-15T03:00:00Z',
});
const sale = (store_id: string, product_id: string, weekday: number, amount: number): SalePrice => ({
  ...meta, id: `${store_id}:${product_id}:${weekday}`, store_id, product_id, weekday, amount, tax_mode: 'included',
});

const stores = [store('B', 'B店', 2), store('A', 'A店', 1), store('X', '閉店', 3, true)];
const products = [product('p2', 'たまご'), product('p1', 'ぎゅうにゅう'), product('p3', 'キャベツ')];
const prices = [price('A', 'p1', 198), price('B', 'p1', 188), price('A', 'p2', 248), price('X', 'p3', 100)];
const sales = [sale('A', 'p2', 2, 98), sale('A', 'p2', 6, 120)];
const data = { stores, products, prices, sales };
const key = (r: { product: Product; store: Store | null }) => `${r.product.name}@${r.store?.name ?? ''}`;

describe('buildDataRows', () => {
  it('絞り込みなし：値段がある行だけ。商品名の順 → 店の優先順。消した店は出さない', () => {
    const rows = buildDataRows(data, { storeId: null, query: '' });
    expect(rows.map(key)).toEqual(['ぎゅうにゅう@A店', 'ぎゅうにゅう@B店', 'たまご@A店']);
  });

  it('商品だけ：名前の部分一致。当てはまる商品を、値段のない店も含めて店ごとに並べる', () => {
    expect(buildDataRows(data, { storeId: null, query: 'にゅう' }).map(key)).toEqual(['ぎゅうにゅう@A店', 'ぎゅうにゅう@B店']);
    const rows = buildDataRows(data, { storeId: null, query: 'たま' });
    expect(rows.map(key)).toEqual(['たまご@A店', 'たまご@B店']);
    expect(rows[1].price).toBeNull();
  });

  it('店だけ：その店に値段がない商品も、値段が空の行で出る', () => {
    const rows = buildDataRows(data, { storeId: 'B', query: '' });
    expect(rows.map(key)).toEqual(['キャベツ@B店', 'ぎゅうにゅう@B店', 'たまご@B店']);
    expect(rows.find((r) => r.product.id === 'p2')!.price).toBeNull();
    expect(rows.find((r) => r.product.id === 'p1')!.price!.amount).toBe(188);
  });

  it('店と商品の両方', () => {
    const rows = buildDataRows(data, { storeId: 'A', query: 'たま' });
    expect(rows.map(key)).toEqual(['たまご@A店']);
    expect(rows[0].sales.map((s) => s.weekday)).toEqual([2, 6]);
  });

  it('消した商品と消した値段は出さない', () => {
    const d = {
      ...data,
      products: [...products, { ...product('p9', 'ぎゅうどん'), deleted_at: '2026-11-01T00:00:00Z' }],
      prices: [...prices, { ...price('A', 'p9', 500) }, { ...price('B', 'p2', 1), deleted_at: '2026-11-01T00:00:00Z' }],
    };
    expect(buildDataRows(d, { storeId: null, query: 'ぎゅう' }).map(key)).toEqual(['ぎゅうにゅう@A店', 'ぎゅうにゅう@B店']);
    expect(buildDataRows(d, { storeId: null, query: 'たま' })[1].price).toBeNull();
    expect(buildDataRows(d, { storeId: 'B', query: 'たま' })[0].price).toBeNull();
  });

  it('値段を入れない商品：すべての店では店なしの1行。値段は出さない。店で絞り込むと出ない', () => {
    const d = {
      ...data,
      products: [...products, product('p4', 'たまねぎ', 'none')],
      prices: [...prices, price('A', 'p4', 100)],
    };
    const all = buildDataRows(d, { storeId: null, query: '' });
    expect(all.map((r) => `${r.product.name}@${r.store?.name ?? ''}`)).toEqual(['ぎゅうにゅう@A店', 'ぎゅうにゅう@B店', 'たまご@A店', 'たまねぎ@']);
    expect(all[3].price).toBeNull();
    expect(buildDataRows(d, { storeId: null, query: 'たま' }).map((r) => `${r.product.name}@${r.store?.name ?? ''}`))
      .toEqual(['たまご@A店', 'たまご@B店', 'たまねぎ@']);
    expect(buildDataRows(d, { storeId: 'A', query: '' }).map((r) => r.product.name)).not.toContain('たまねぎ');
  });
});

describe('表示', () => {
  it('税込にそろえ、100g は「/100g」を付ける', () => {
    expect(formatPrice({ amount: 180, tax_mode: 'excluded' }, product('p', '牛こま', '100g'))).toBe('194円/100g');
    expect(formatPrice({ amount: 198, tax_mode: 'included' }, product('p', '牛乳'))).toBe('198円');
  });
  it('曜日セールは「火 98円」', () => {
    expect(formatSale({ weekday: 2, amount: 98, tax_mode: 'excluded' }, product('p', '卵'))).toBe('火 105円');
  });
  it('更新日は日本時間で 2026/11/15', () => {
    expect(formatDate('2026-11-14T15:00:00Z')).toBe('2026/11/15');
  });
});
