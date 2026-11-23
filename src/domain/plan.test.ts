import { describe, expect, it } from 'vitest';
import { buildPlan, type PlanInput, type PlannedItem } from './plan.ts';
import type { ListItem, Price, Product, SalePrice, Store, StoreOverride, TaxMode, VisitMode } from './types.ts';

const meta = { field_times: {}, deleted_at: null };
const store = (id: string, sort_order: number, visit_mode: VisitMode): Store => ({
  ...meta, id, name: `${id}店`, sort_order, visit_mode, default_tax_mode: 'included',
});
const product = (id: string): Product => ({ ...meta, id, name: id, unit: 'piece', tax_rate: 8, is_preset: true });
const price = (store_id: string, product_id: string, amount: number, tax_mode: TaxMode = 'included'): Price => ({
  ...meta, id: `${store_id}:${product_id}`, store_id, product_id, amount, tax_mode, price_updated_at: '2026-11-01T00:00:00Z',
});
const sale = (store_id: string, product_id: string, weekday: number, amount: number): SalePrice => ({
  ...meta, id: `${store_id}:${product_id}:${weekday}`, store_id, product_id, weekday, amount, tax_mode: 'included',
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
const override = (store_id: string, going: boolean, expires_at = '2026-11-20T00:00:00Z'): StoreOverride => ({
  ...meta, id: `o-${store_id}`, store_id, going, expires_at,
});

const NOW = '2026-11-15T03:00:00Z';
const base = (o: Partial<PlanInput> = {}): PlanInput => ({
  today: '2026-11-15',
  now: NOW,
  available_weekdays: [3, 5, 6, 0],
  excluded_dates: [],
  stores: [store('A', 0, 'usual'), store('C', 1, 'usual'), store('B', 2, 'other'), store('D', 3, 'never')],
  store_overrides: [],
  products: ['牛乳', '食パン', '卵', '牛こま', 'ごぼう', 'のり'].map(product),
  prices: [
    price('A', '牛乳', 178), price('A', '食パン', 128), price('A', '卵', 198), price('A', '牛こま', 238),
    price('C', '牛こま', 198), price('C', '牛乳', 178),
    price('B', '卵', 168),
    price('D', '牛乳', 100),
  ],
  sale_prices: [sale('A', '卵', 3, 98)],
  items: [item('牛乳'), item('食パン'), item('卵'), item('牛こま')],
  ...o,
});

function find(plan: ReturnType<typeof buildPlan>, productId: string): PlannedItem {
  for (const g of plan.groups) for (const s of g.stores) for (const p of s.items) if (p.product.id === productId) return p;
  const u = plan.undecided.find((p) => p.product.id === productId);
  if (!u) throw new Error(`${productId} がない`);
  return u;
}

describe('buildPlan', () => {
  it('1. 対象の日', () => {
    expect(buildPlan(base()).dates).toEqual(['2026-11-15', '2026-11-18', '2026-11-20', '2026-11-21']);
  });

  it('2. 牛乳：同じ値段なら近い日、優先順が上の店', () => {
    expect(find(buildPlan(base()), '牛乳').chosen).toEqual({ date: '2026-11-15', store_id: 'A', price: 178, is_sale: false });
  });

  it('3. 牛こま：C店 198。店を外すと A店 238（+40）', () => {
    const p = find(buildPlan(base()), '牛こま');
    expect(p.chosen).toEqual({ date: '2026-11-15', store_id: 'C', price: 198, is_sale: false });
    expect(p.alt_if_store_excluded).toEqual({ date: '2026-11-15', store_id: 'A', price: 238, is_sale: false, diff: 40 });
  });

  it('4. 卵：水曜のセール 98。日を外すと 11/15 A店 198（+100）', () => {
    const p = find(buildPlan(base()), '卵');
    expect(p.chosen).toEqual({ date: '2026-11-18', store_id: 'A', price: 98, is_sale: true });
    expect(p.alt_if_date_excluded).toEqual({ date: '2026-11-15', store_id: 'A', price: 198, is_sale: false, diff: 100 });
  });

  it('5. 卵の一言：B店は 98 より安くないので null', () => {
    expect(find(buildPlan(base()), '卵').cheaper_elsewhere).toBeNull();
  });

  it('6. 11/18 を外すと、卵は 11/15 A店 198。一言は B店 168（−30）', () => {
    const p = find(buildPlan(base({ excluded_dates: ['2026-11-18'] })), '卵');
    expect(p.chosen).toEqual({ date: '2026-11-15', store_id: 'A', price: 198, is_sale: false });
    expect(p.cheaper_elsewhere).toEqual({ date: '2026-11-15', store_id: 'B', price: 168, is_sale: false, diff: -30 });
  });

  it('7. C店を期限内で行かないにすると、牛こまは A店 238。一言は C店 198（−40）', () => {
    const p = find(buildPlan(base({ store_overrides: [override('C', false)] })), '牛こま');
    expect(p.chosen).toEqual({ date: '2026-11-15', store_id: 'A', price: 238, is_sale: false });
    expect(p.cheaper_elsewhere).toEqual({ date: '2026-11-15', store_id: 'C', price: 198, is_sale: false, diff: -40 });
  });

  it('8. 7 の期限が切れていれば、牛こまは C店 198 に戻る', () => {
    const p = find(buildPlan(base({ store_overrides: [override('C', false, '2026-11-15T02:00:00Z')] })), '牛こま');
    expect(p.chosen).toMatchObject({ store_id: 'C', price: 198 });
  });

  it('9. B店を行くにすると、6 の条件で卵は 11/15 B店 168', () => {
    const p = find(buildPlan(base({ excluded_dates: ['2026-11-18'], store_overrides: [override('B', true)] })), '卵');
    expect(p.chosen).toEqual({ date: '2026-11-15', store_id: 'B', price: 168, is_sale: false });
  });

  it('10. D店は、どの条件でも候補にも一言にも出ない', () => {
    for (const o of [{}, { store_overrides: [override('D', true)] }]) {
      const plan = buildPlan(base(o));
      const p = find(plan, '牛乳');
      expect(p.chosen?.store_id).not.toBe('D');
      expect(p.cheaper_elsewhere).toBeNull();
      expect(plan.going_store_ids).not.toContain('D');
    }
  });

  it('11. 値段のない商品は未定。一言もない', () => {
    const p = find(buildPlan(base({ items: [item('ごぼう')] })), 'ごぼう');
    expect(p.chosen).toBeNull();
    expect(p.cheaper_elsewhere).toBeNull();
  });

  it('12. B店だけに値段がある商品は未定。一言は B店（差 0）', () => {
    const plan = buildPlan(base({ items: [item('のり')], prices: [price('B', 'のり', 300)] }));
    expect(plan.undecided.map((p) => p.product.id)).toEqual(['のり']);
    expect(find(plan, 'のり').cheaper_elsewhere).toEqual({ date: '2026-11-15', store_id: 'B', price: 300, is_sale: false, diff: 0 });
  });

  it('13. 卵を B店に回すと、11/15 B店 168。B店が groups に出る', () => {
    const plan = buildPlan(base({ items: [item('卵', { forced_store_id: 'B' })] }));
    expect(find(plan, '卵').chosen).toEqual({ date: '2026-11-15', store_id: 'B', price: 168, is_sale: false });
    expect(plan.groups[0].stores.map((s) => s.store_id)).toEqual(['B']);
  });

  it('14. 回した店に値段がなければ、指定がないときと同じ', () => {
    const p = find(buildPlan(base({ items: [item('卵', { forced_store_id: 'C' })] })), '卵');
    expect(p.chosen).toEqual({ date: '2026-11-18', store_id: 'A', price: 98, is_sale: true });
  });

  it('15. 行ける曜日が空なら、全部未定で dates は空', () => {
    const plan = buildPlan(base({ available_weekdays: [] }));
    expect(plan.dates).toEqual([]);
    expect(plan.groups).toEqual([]);
    expect(plan.undecided).toHaveLength(4);
  });

  it('16. セールが通常より高ければ通常を使い、is_sale は false', () => {
    const p = find(buildPlan(base({
      items: [item('のり')], prices: [price('A', 'のり', 100)], sale_prices: [sale('A', 'のり', 0, 120)],
    })), 'のり');
    expect(p.chosen).toEqual({ date: '2026-11-15', store_id: 'A', price: 100, is_sale: false });
  });

  it('17. 税抜は税込にしてから比べる（A店 180 税抜 → 194、C店 190 税込）', () => {
    const p = find(buildPlan(base({
      items: [item('のり')], prices: [price('A', 'のり', 180, 'excluded'), price('C', 'のり', 190)],
    })), 'のり');
    expect(p.chosen).toMatchObject({ store_id: 'C', price: 190 });
  });

  it('18. groups は日が近い順 → sort_order の順 → added_at の順', () => {
    const plan = buildPlan(base());
    const shape = plan.groups.map((g) => ({
      date: g.date,
      stores: g.stores.map((s) => ({ store_id: s.store_id, items: s.items.map((p) => p.product.id) })),
    }));
    expect(shape).toEqual([
      { date: '2026-11-15', stores: [
        { store_id: 'A', items: ['牛乳', '食パン'] },
        { store_id: 'C', items: ['牛こま'] },
      ] },
      { date: '2026-11-18', stores: [{ store_id: 'A', items: ['卵'] }] },
    ]);
  });

  it('19. 値段を入れない商品は、値段が残っていても、groups にも未定にも出ない', () => {
    const plan = buildPlan(base({
      products: [...['牛乳', '食パン', '卵', '牛こま'].map(product), { ...product('キャベツ'), unit: 'none' }],
      prices: [...base().prices, price('A', 'キャベツ', 150)],
      items: [item('牛乳'), item('キャベツ')],
    }));
    expect(() => find(plan, 'キャベツ')).toThrow();
    expect(find(plan, '牛乳').chosen).not.toBeNull();
  });

  it('20. 量あたりの商品は 100gあたりで比べる。量のない値段は使わない', () => {
    const kinako = { ...product('きなこ'), unit: 'size_g' as const };
    const plan = buildPlan(base({
      products: [...['牛乳'].map(product), kinako],
      prices: [
        { ...price('A', 'きなこ', 100), size: 100 },
        { ...price('C', 'きなこ', 150), size: 180 },
        price('B', 'きなこ', 50),
      ],
      sale_prices: [],
      items: [item('きなこ')],
    }));
    const k = find(plan, 'きなこ');
    expect(k.chosen?.store_id).toBe('C');
    expect(k.chosen?.price).toBeCloseTo(83.33, 1);
    expect(k.cheaper_elsewhere).toBeNull();
  });
});
