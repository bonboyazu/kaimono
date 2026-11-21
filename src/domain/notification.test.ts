import { describe, expect, it } from 'vitest';
import { isDue, notificationText, saleHitsForToday } from './notification.ts';
import type { ListItem, Price, Product, SalePrice, Store, TaxMode, Unit, VisitMode } from './types.ts';

const meta = { field_times: {}, deleted_at: null };
const store = (id: string, sort_order: number, visit_mode: VisitMode): Store => ({
  ...meta, id, name: `${id}店`, sort_order, visit_mode, default_tax_mode: 'included',
});
const product = (id: string, unit: Unit = 'piece'): Product => ({ ...meta, id, name: id, unit, tax_rate: 8, is_preset: true });
const price = (store_id: string, product_id: string, amount: number): Price => ({
  ...meta, id: `${store_id}:${product_id}`, store_id, product_id, amount, tax_mode: 'included', price_updated_at: '2026-11-01T00:00:00Z',
});
const sale = (store_id: string, product_id: string, weekday: number, amount: number, tax_mode: TaxMode = 'included'): SalePrice => ({
  ...meta, id: `${store_id}:${product_id}:${weekday}`, store_id, product_id, weekday, amount, tax_mode,
});
let seq = 0;
const item = (product_id: string, o: Partial<ListItem> = {}): ListItem => {
  seq += 1;
  return {
    ...meta, id: `i-${product_id}`, product_id, memo: '', added_by: null,
    added_at: `2026-11-15T00:00:${String(seq).padStart(2, '0')}Z`,
    checked_at: null, checked_by: null, bought_store_id: null, forced_store_id: null, ...o,
  };
};

type Input = Parameters<typeof saleHitsForToday>[0];
const base = (o: Partial<Input> = {}): Input => ({
  today: '2026-11-18',
  available_weekdays: [3, 5, 6, 0],
  stores: [store('A', 0, 'usual'), store('C', 1, 'usual'), store('B', 2, 'other'), store('D', 3, 'never')],
  products: [product('牛乳'), product('食パン'), product('卵'), product('牛こま'), product('豚こま', '100g')],
  prices: [
    price('A', '牛乳', 178), price('A', '食パン', 128), price('A', '卵', 198), price('A', '牛こま', 238),
    price('C', '牛こま', 198), price('C', '牛乳', 178), price('B', '卵', 168), price('D', '牛乳', 100),
  ],
  sale_prices: [sale('A', '卵', 3, 98)],
  items: [item('牛乳'), item('食パン'), item('卵'), item('牛こま')],
  ...o,
});

describe('saleHitsForToday', () => {
  it('11/18（水）・リストに卵 → A店・卵・98 が1件', () => {
    expect(saleHitsForToday(base())).toEqual([
      { store_id: 'A', store_name: 'A店', product_name: '卵', price: 98, unit: 'piece' },
    ]);
  });

  it('リストに卵がない → 空', () => {
    expect(saleHitsForToday(base({ items: [item('牛乳')] }))).toEqual([]);
  });

  it('値段を入れない商品は、セールが残っていても知らせない', () => {
    expect(saleHitsForToday(base({ products: [product('卵', 'none')] }))).toEqual([]);
  });

  it('卵がチェック済み → 空', () => {
    expect(saleHitsForToday(base({ items: [item('卵', { checked_at: '2026-11-17T00:00:00Z' })] }))).toEqual([]);
  });

  it('リストから消した卵 → 空', () => {
    expect(saleHitsForToday(base({ items: [item('卵', { deleted_at: '2026-11-17T00:00:00Z' })] }))).toEqual([]);
  });

  it('11/17（火。行けない曜日） → 空', () => {
    expect(saleHitsForToday(base({ today: '2026-11-17', sale_prices: [sale('A', '卵', 2, 98)] }))).toEqual([]);
  });

  it('セールの店が never → 空。other → 出す', () => {
    expect(saleHitsForToday(base({ sale_prices: [sale('D', '卵', 3, 98)] }))).toEqual([]);
    expect(saleHitsForToday(base({ sale_prices: [sale('B', '卵', 3, 98)] }))).toEqual([
      { store_id: 'B', store_name: 'B店', product_name: '卵', price: 98, unit: 'piece' },
    ]);
  });

  it('税抜のセール値段 → 税込にして出す', () => {
    expect(saleHitsForToday(base({ sale_prices: [sale('A', '卵', 3, 91, 'excluded')] }))[0].price).toBe(98);
  });

  it('セールがふだんより安くない → 出さない', () => {
    expect(saleHitsForToday(base({ sale_prices: [sale('A', '卵', 3, 198)] }))).toEqual([]);
  });

  it('ふだんの値段がない店のセール → 出す', () => {
    expect(saleHitsForToday(base({ sale_prices: [sale('C', '卵', 3, 120)] }))).toEqual([
      { store_id: 'C', store_name: 'C店', product_name: '卵', price: 120, unit: 'piece' },
    ]);
  });

  it('消した店・消したセールは出さない', () => {
    expect(saleHitsForToday(base({ sale_prices: [{ ...sale('A', '卵', 3, 98), deleted_at: '2026-11-17T00:00:00Z' }] }))).toEqual([]);
    expect(
      saleHitsForToday(base({ stores: [{ ...store('A', 0, 'usual'), deleted_at: '2026-11-17T00:00:00Z' }] })),
    ).toEqual([]);
  });

  it('並びは店の優先順 → リストに足した順', () => {
    const hits = saleHitsForToday(
      base({
        sale_prices: [sale('C', '牛こま', 3, 150), sale('A', '牛乳', 3, 150), sale('A', '卵', 3, 98)],
        items: [item('卵'), item('牛こま'), item('牛乳')],
      }),
    );
    expect(hits.map((h) => `${h.store_id}:${h.product_name}`)).toEqual(['A:卵', 'A:牛乳', 'C:牛こま']);
  });

  it('同じ商品がリストに2つあっても1件', () => {
    expect(saleHitsForToday(base({ items: [item('卵'), { ...item('卵'), id: 'i-卵2' }] }))).toHaveLength(1);
  });
});

describe('notificationText', () => {
  it('タイトルと、店ごとに1行の本文。同じ店は「、」でつなぐ', () => {
    expect(
      notificationText([
        { store_id: 'A', store_name: 'A店', product_name: '卵', price: 98, unit: 'piece' },
        { store_id: 'A', store_name: 'A店', product_name: '牛乳', price: 150, unit: 'piece' },
        { store_id: 'C', store_name: 'C店', product_name: '豚こま', price: 98, unit: '100g' },
      ]),
    ).toEqual({ title: '今日のセール（リストにあり）', body: 'A店：卵 98円、牛乳 150円\nC店：豚こま 98円/100g' });
  });
});

describe('isDue', () => {
  const sub = { enabled: true, notify_time: '08:00', last_sent_on: null };
  it('enabled が false → false', () => {
    expect(isDue({ ...sub, enabled: false }, '2026-11-18', '08:05')).toBe(false);
  });
  it('notify_time が今より後 → false', () => {
    expect(isDue(sub, '2026-11-18', '07:59')).toBe(false);
  });
  it('last_sent_on が今日 → false', () => {
    expect(isDue({ ...sub, last_sent_on: '2026-11-18' }, '2026-11-18', '08:05')).toBe(false);
  });
  it('それ以外 → true（ちょうどの時刻・前の日に送った）', () => {
    expect(isDue(sub, '2026-11-18', '08:00')).toBe(true);
    expect(isDue({ ...sub, last_sent_on: '2026-11-17' }, '2026-11-18', '12:30')).toBe(true);
  });
});
