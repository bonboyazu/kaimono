import { beforeEach, describe, expect, it } from 'vitest';
import { LocalDb } from '../../data/db.ts';
import type { MutateContext } from '../../data/sync/mutate.ts';
import { priceId } from '../../domain/ids.ts';
import {
  addProduct, addStore, deleteStore, DuplicateNameError, parseAmount, savePrice, saveSales, updateStore,
} from './actions.ts';
import { buildDataRows } from './filters.ts';

let ctx: MutateContext;
let t = 0;
beforeEach(async () => {
  const db = new LocalDb(`actions-${Math.random()}`);
  t = 0;
  ctx = { db, now: () => new Date(Date.UTC(2026, 10, 15, 0, 0, t++)).toISOString() };
});

async function setup() {
  const storeId = await addStore('A店', ctx);
  const productId = await addProduct({ name: '卵', unit: 'piece', tax_rate: 8 }, ctx);
  return { store: (await ctx.db.stores.get(storeId))!, product: (await ctx.db.products.get(productId))! };
}

describe('値段', () => {
  it('1 以上の整数だけ受け付ける', () => {
    expect(parseAmount('198')).toBe(198);
    expect(parseAmount('１９８')).toBe(198);
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('-1')).toBeNull();
    expect(parseAmount('1.5')).toBeNull();
    expect(parseAmount('')).toBeNull();
  });

  it('保存すると更新日が入る。2回目は同じ行を直す', async () => {
    const { store, product } = await setup();
    await savePrice(store, product, 198, 'included', ctx);
    const first = (await ctx.db.prices.toArray())[0].price_updated_at;
    await savePrice(store, product, 188, 'included', ctx);
    const prices = await ctx.db.prices.toArray();
    expect(prices).toHaveLength(1);
    expect(prices[0].amount).toBe(188);
    expect(prices[0].id).toBe(await priceId(store.id, product.id));
    expect(prices[0].price_updated_at > first).toBe(true);
  });

  it('値段を税抜で入れても、店の税込・税抜の設定は変わらない', async () => {
    const { store, product } = await setup();
    await savePrice(store, product, 180, 'excluded', ctx);
    await saveSales(store, product, [{ weekday: 2, amount: 90, tax_mode: 'excluded' }], ctx);
    expect((await ctx.db.stores.get(store.id))!.default_tax_mode).toBe('included');
  });

  it('通常の値段がないと、曜日セールは足せない', async () => {
    const { store, product } = await setup();
    await expect(saveSales(store, product, [{ weekday: 2, amount: 98, tax_mode: 'included' }], ctx)).rejects.toThrow();
    await savePrice(store, product, 198, 'included', ctx);
    await saveSales(store, product, [{ weekday: 2, amount: 98, tax_mode: 'included' }], ctx);
    expect((await ctx.db.sale_prices.toArray()).map((s) => s.weekday)).toEqual([2]);
  });

  it('曜日セールを、渡した内容にそろえる（足す・直す・消す）', async () => {
    const { store, product } = await setup();
    await savePrice(store, product, 198, 'included', ctx);
    await saveSales(store, product, [{ weekday: 2, amount: 98, tax_mode: 'included' }, { weekday: 6, amount: 120, tax_mode: 'included' }], ctx);
    await saveSales(store, product, [{ weekday: 6, amount: 110, tax_mode: 'included' }], ctx);
    const alive = (await ctx.db.sale_prices.toArray()).filter((s) => !s.deleted_at);
    expect(alive.map((s) => [s.weekday, s.amount])).toEqual([[6, 110]]);
  });
});

describe('商品と店', () => {
  it('同じ名前（前後の空白を除く）の商品は足せない', async () => {
    await addProduct({ name: '卵', unit: 'piece', tax_rate: 8 }, ctx);
    await expect(addProduct({ name: ' 卵 ', unit: 'piece', tax_rate: 8 }, ctx)).rejects.toBeInstanceOf(DuplicateNameError);
  });

  it('店は優先順が最後、ふだん行く、税込で作る', async () => {
    await addStore('A店', ctx);
    const id = await addStore('B店', ctx);
    expect(await ctx.db.stores.get(id)).toMatchObject({ sort_order: 2, visit_mode: 'usual', default_tax_mode: 'included' });
  });

  it('税抜の店として作れる。あとから税込・税抜を変えられる', async () => {
    const id = await addStore('C店', ctx, 'excluded');
    expect((await ctx.db.stores.get(id))!.default_tax_mode).toBe('excluded');
    await updateStore((await ctx.db.stores.get(id))!, { name: 'C店', default_tax_mode: 'included' }, ctx);
    expect((await ctx.db.stores.get(id))!.default_tax_mode).toBe('included');
  });

  it('消した店の値段は一覧に出ない', async () => {
    const { store, product } = await setup();
    await savePrice(store, product, 198, 'included', ctx);
    await deleteStore(store, ctx);
    const src = {
      stores: await ctx.db.stores.toArray(), products: await ctx.db.products.toArray(),
      prices: await ctx.db.prices.toArray(), sales: await ctx.db.sale_prices.toArray(),
    };
    expect(buildDataRows(src, { storeId: null, query: '' })).toEqual([]);
  });
});
