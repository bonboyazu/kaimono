import { describe, expect, it } from 'vitest';
import { periodStart, purchaseCounts } from './dashboard.ts';
import type { ListItem, Product, Store } from './types.ts';

const meta = { field_times: {}, deleted_at: null };
const store = (id: string, o: Partial<Store> = {}): Store => ({
  ...meta, id, name: `${id}店`, sort_order: 0, visit_mode: 'usual', default_tax_mode: 'included', ...o,
});
const product = (id: string, o: Partial<Product> = {}): Product => ({
  ...meta, id, name: id, unit: 'piece', tax_rate: 8, is_preset: true, ...o,
});
let seq = 0;
/** checked_at は日本時間の日付 'YYYY-MM-DD' を受け取り、その日の 0:00（日本時間）にする */
const bought = (product_id: string, jstDay: string | null, store: string | null = 'A', o: Partial<ListItem> = {}): ListItem => {
  seq += 1;
  return {
    ...meta, id: `i${seq}`, product_id, memo: '', added_by: null, added_at: '2026-01-01T00:00:00Z',
    checked_at: jstDay ? `${jstDay}T00:00:00+09:00` : null, checked_by: null,
    bought_store_id: store, forced_store_id: null, ...o,
  };
};

const stores = [store('A'), store('B')];
const products = [product('卵'), product('牛乳'), product('食パン')];
const TODAY = '2026-11-19';

describe('periodStart', () => {
  it('今月は今月の1日。3か月は2か月前の1日。全期間は null', () => {
    expect(periodStart('this_month', TODAY)).toBe('2026-11-01');
    expect(periodStart('three_months', TODAY)).toBe('2026-09-01');
    expect(periodStart('all', TODAY)).toBeNull();
  });
  it('年をまたぐ', () => {
    expect(periodStart('three_months', '2026-02-10')).toBe('2025-12-01');
  });
});

describe('purchaseCounts', () => {
  it('回数の多い順。同じ回数は名前の順', () => {
    const r = purchaseCounts({
      items: [bought('牛乳', '2026-11-02'), bought('卵', '2026-11-03', 'B'), bought('卵', '2026-11-04'), bought('食パン', '2026-11-05', 'B')],
      products, stores, period: 'all', today: TODAY,
    });
    expect(r.byProduct).toEqual([{ name: '卵', count: 2 }, { name: '牛乳', count: 1 }, { name: '食パン', count: 1 }]);
    expect(r.byStore).toEqual([{ name: 'A店', count: 2 }, { name: 'B店', count: 2 }]);
  });

  it('今月の境目：月の1日は入り、前の月末は入らない（日本時間）', () => {
    const r = purchaseCounts({
      items: [bought('卵', '2026-11-01'), bought('牛乳', '2026-10-31')],
      products, stores, period: 'this_month', today: TODAY,
    });
    expect(r.byProduct).toEqual([{ name: '卵', count: 1 }]);
  });

  it('日本時間で11/1の朝（UTCでは10/31）は今月に入る', () => {
    const r = purchaseCounts({
      items: [bought('卵', null, 'A', { checked_at: '2026-10-31T16:00:00Z' })],
      products, stores, period: 'this_month', today: TODAY,
    });
    expect(r.byProduct).toEqual([{ name: '卵', count: 1 }]);
  });

  it('3か月の境目：2か月前の1日は入り、その前の月末は入らない', () => {
    const r = purchaseCounts({
      items: [bought('卵', '2026-09-01'), bought('牛乳', '2026-08-31'), bought('食パン', '2026-11-19')],
      products, stores, period: 'three_months', today: TODAY,
    });
    expect(r.byProduct.map((x) => x.name).sort()).toEqual(['卵', '食パン'].sort());
  });

  it('全期間は全部', () => {
    const r = purchaseCounts({ items: [bought('卵', '2020-01-01'), bought('卵', '2026-11-19')], products, stores, period: 'all', today: TODAY });
    expect(r.byProduct).toEqual([{ name: '卵', count: 2 }]);
  });

  it('チェックしていないもの・消したものは数えない', () => {
    const r = purchaseCounts({
      items: [bought('卵', null), bought('牛乳', '2026-11-02', 'A', { deleted_at: '2026-11-03T00:00:00Z' })],
      products, stores, period: 'all', today: TODAY,
    });
    expect(r).toEqual({ byProduct: [], byStore: [] });
  });

  it('店が null のものは、店では数えない（商品では数える）', () => {
    const r = purchaseCounts({ items: [bought('卵', '2026-11-02', null)], products, stores, period: 'all', today: TODAY });
    expect(r.byProduct).toEqual([{ name: '卵', count: 1 }]);
    expect(r.byStore).toEqual([]);
  });

  it('消した商品・店は出さない', () => {
    const r = purchaseCounts({
      items: [bought('卵', '2026-11-02', 'B'), bought('牛乳', '2026-11-02', 'A')],
      products: [product('卵', { deleted_at: '2026-11-10T00:00:00Z' }), product('牛乳')],
      stores: [store('A'), store('B', { deleted_at: '2026-11-10T00:00:00Z' })],
      period: 'all', today: TODAY,
    });
    expect(r.byProduct).toEqual([{ name: '牛乳', count: 1 }]);
    expect(r.byStore).toEqual([{ name: 'A店', count: 1 }]);
  });
});
