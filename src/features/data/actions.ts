// データ一覧の書き込み。画面からはここを呼ぶ
import { db as defaultDb } from '../../data/db.ts';
import { createRow, patchRow, softDelete, type MutateContext } from '../../data/sync/mutate.ts';
import { newId, priceId, salePriceId } from '../../domain/ids.ts';
import { isMeatName } from '../../domain/meat.ts';
import { isSizeUnit } from '../../domain/size.ts';
import type { Price, Product, SalePrice, Store, TaxMode, Unit } from '../../domain/types.ts';

const defaultCtx: MutateContext = { db: defaultDb, now: () => new Date().toISOString() };

/** 1 以上の整数だけ。全角の数字も受け付ける */
export function parseAmount(text: string): number | null {
  const s = text.trim().replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 && Number.isSafeInteger(n) ? n : null;
}

/** size：量あたりの商品の量。ほかの商品では使わない */
export type PriceInput = { amount: number; tax_mode: TaxMode; size?: number | null };

export async function savePrice(
  store: Store,
  product: Product,
  input: PriceInput,
  ctx: MutateContext = defaultCtx,
): Promise<void> {
  const id = await priceId(store.id, product.id);
  const existing = await ctx.db.prices.get(id);
  const fields = {
    amount: input.amount,
    tax_mode: input.tax_mode,
    price_updated_at: ctx.now(),
    // 量あたりの商品だけ量を送る（ほかの商品の値段は、量の列を使わない）
    ...(isSizeUnit(product.unit) ? { size: input.size ?? null } : {}),
  };
  if (existing && !existing.deleted_at) await patchRow('prices', id, fields, ctx);
  else await createRow('prices', { id, store_id: store.id, product_id: product.id, ...fields }, ctx);
}

export async function deletePrice(price: Price, sales: SalePrice[], ctx: MutateContext = defaultCtx) {
  for (const s of sales) await softDelete('sale_prices', s.id, ctx);
  await softDelete('prices', price.id, ctx);
}

export type SaleInput = { weekday: number; amount: number; tax_mode: TaxMode };

/** 曜日セールを、渡した内容にそろえる。通常の値段がなければ足せない */
export async function saveSales(
  store: Store,
  product: Product,
  sales: SaleInput[],
  ctx: MutateContext = defaultCtx,
): Promise<void> {
  const price = await ctx.db.prices.get(await priceId(store.id, product.id));
  if (sales.length > 0 && (!price || price.deleted_at)) throw new Error('通常の値段がないと、曜日セールは足せません');
  const current = (await ctx.db.sale_prices.toArray()).filter(
    (s) => !s.deleted_at && s.store_id === store.id && s.product_id === product.id,
  );
  const wanted = new Map(sales.map((s) => [s.weekday, s]));
  for (const s of current) if (!wanted.has(s.weekday)) await softDelete('sale_prices', s.id, ctx);
  for (const s of wanted.values()) {
    const id = await salePriceId(store.id, product.id, s.weekday);
    const prev = current.find((c) => c.id === id);
    if (prev) {
      if (prev.amount !== s.amount || prev.tax_mode !== s.tax_mode)
        await patchRow('sale_prices', id, { amount: s.amount, tax_mode: s.tax_mode }, ctx);
    } else {
      await createRow('sale_prices', { id, store_id: store.id, product_id: product.id, ...s }, ctx);
    }
  }
}

const sameName = (a: string, b: string) => a.trim() === b.trim();

export class DuplicateNameError extends Error {}

export async function addProduct(
  input: { name: string; unit: Unit; tax_rate: number },
  ctx: MutateContext = defaultCtx,
): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error('名前を入れてください');
  const all = await ctx.db.products.toArray();
  if (all.some((p) => !p.deleted_at && sameName(p.name, name))) throw new DuplicateNameError(`「${name}」はもうあります`);
  const id = newId();
  await createRow('products', { id, name, unit: input.unit, tax_rate: input.tax_rate, is_preset: false }, ctx);
  return id;
}

/** 探す欄に打った名前で足す。肉の組み立てでできる名前は 100gあたり、ほかは 1つあたり。税率は食品 */
export function addProductByName(name: string, ctx: MutateContext = defaultCtx): Promise<string> {
  return addProduct({ name, unit: isMeatName(name) ? '100g' : 'piece', tax_rate: 8 }, ctx);
}

export async function updateProduct(
  product: Product,
  input: { name: string; unit: Unit; tax_rate: number },
  ctx: MutateContext = defaultCtx,
): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error('名前を入れてください');
  const all = await ctx.db.products.toArray();
  if (all.some((p) => !p.deleted_at && p.id !== product.id && sameName(p.name, name)))
    throw new DuplicateNameError(`「${name}」はもうあります`);
  const patch: Partial<Product> = {};
  if (name !== product.name) patch.name = name;
  if (input.unit !== product.unit) patch.unit = input.unit;
  if (input.tax_rate !== product.tax_rate) patch.tax_rate = input.tax_rate;
  await patchRow('products', product.id, patch, ctx);
}

/** 店の税込・税抜は、値段を入れるときの初期値になる */
export async function addStore(
  nameInput: string,
  ctx: MutateContext = defaultCtx,
  taxMode: TaxMode = 'included',
): Promise<string> {
  const name = nameInput.trim();
  if (!name) throw new Error('名前を入れてください');
  const all = (await ctx.db.stores.toArray()).filter((s) => !s.deleted_at);
  const sort_order = all.reduce((m, s) => Math.max(m, s.sort_order), 0) + 1;
  const id = newId();
  await createRow('stores', { id, name, sort_order, visit_mode: 'usual', default_tax_mode: taxMode }, ctx);
  return id;
}

export async function updateStore(
  store: Store,
  input: { name: string; default_tax_mode: TaxMode },
  ctx: MutateContext = defaultCtx,
) {
  const name = input.name.trim();
  if (!name) throw new Error('名前を入れてください');
  const patch: Partial<Store> = {};
  if (name !== store.name) patch.name = name;
  if (input.default_tax_mode !== store.default_tax_mode) patch.default_tax_mode = input.default_tax_mode;
  if (Object.keys(patch).length > 0) await patchRow('stores', store.id, patch, ctx);
}

export const deleteStore = (store: Store, ctx: MutateContext = defaultCtx) => softDelete('stores', store.id, ctx);
export const deleteProduct = (product: Product, ctx: MutateContext = defaultCtx) =>
  softDelete('products', product.id, ctx);
