import { describe, expect, it } from 'vitest';
import { rankStores } from './ranking.ts';
import type { Price, Product, SalePrice, Store, TaxMode, VisitMode } from './types.ts';

const meta = { field_times: {}, deleted_at: null };
const store = (id: string, sort_order: number, visit_mode: VisitMode = 'usual'): Store => ({
  ...meta, id, name: `${id}店`, sort_order, visit_mode, default_tax_mode: 'included',
});
const egg: Product = { ...meta, id: 'egg', name: '卵', unit: 'piece', tax_rate: 8, is_preset: true };
const price = (store_id: string, amount: number, tax_mode: TaxMode = 'included'): Price => ({
  ...meta, id: store_id, store_id, product_id: 'egg', amount, tax_mode, price_updated_at: '2026-11-01T00:00:00Z',
});
const sale = (store_id: string, weekday: number, amount: number): SalePrice => ({
  ...meta, id: `${store_id}:${weekday}`, store_id, product_id: 'egg', weekday, amount, tax_mode: 'included',
});
const stores = [store('A', 0), store('B', 1, 'other'), store('C', 2), store('D', 3, 'never')];

describe('店を安い順に並べる', () => {
  it('セールがあればセールの値段で比べ、曜日を返す', () => {
    const r = rankStores(egg, stores, [price('A', 198), price('B', 168), price('C', 218)], [sale('C', 3, 98)]);
    expect(r).toEqual([
      { store_id: 'C', normal: 218, best: 98, sale_weekdays: [3], size: null, pack: 98 },
      { store_id: 'B', normal: 168, best: 168, sale_weekdays: [], size: null, pack: 168 },
      { store_id: 'A', normal: 198, best: 198, sale_weekdays: [], size: null, pack: 198 },
    ]);
  });

  it('税抜は税込にそろえる。同じ値段なら店の順', () => {
    const r = rankStores(egg, stores, [price('C', 100, 'excluded'), price('A', 108)], []);
    expect(r.map((x) => [x.store_id, x.best])).toEqual([['A', 108], ['C', 108]]);
  });

  it('常に外す店・値段のない店・消した値段は出さない', () => {
    const gone = { ...price('C', 50), deleted_at: '2026-11-02T00:00:00Z' };
    const r = rankStores(egg, stores, [price('A', 198), price('D', 10), gone], []);
    expect(r.map((x) => x.store_id)).toEqual(['A']);
  });

  it('同じセール値段の曜日はまとめ、月曜はじまりで並べる。ふだんより高いセールは使わない', () => {
    const r = rankStores(egg, stores, [price('A', 198)], [sale('A', 0, 150), sale('A', 3, 150), sale('A', 5, 250)]);
    expect(r[0]).toMatchObject({ best: 150, sale_weekdays: [3, 0] });
  });

  it('量あたりの商品は 100gあたりで比べる。量のない値段は出さない', () => {
    const kinako: Product = { ...egg, id: 'kinako', name: 'きなこ', unit: 'size_g' };
    const kp = (store_id: string, amount: number, size: number | null): Price => ({ ...price(store_id, amount), product_id: 'kinako', size });
    const r = rankStores(kinako, stores, [kp('A', 100, 100), kp('B', 150, 180), kp('C', 120, null)], []);
    expect(r.map((x) => [x.store_id, Math.round(x.best * 10) / 10, x.size, x.pack])).toEqual([
      ['B', 83.3, 180, 150],
      ['A', 100, 100, 100],
    ]);
  });

  it('量あたりの商品のセールは、通常の値段と同じ量で比べる', () => {
    const kinako: Product = { ...egg, id: 'kinako', name: 'きなこ', unit: 'size_g' };
    const p = { ...price('A', 300), product_id: 'kinako', size: 200 };
    const s = { ...sale('A', 2, 240), product_id: 'kinako' };
    const r = rankStores(kinako, stores, [p], [s]);
    expect(r[0]).toMatchObject({ normal: 150, best: 120, pack: 240, size: 200, sale_weekdays: [2] });
  });
});
