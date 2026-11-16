// リストの書き込み。画面からはここを呼ぶ
import { db as defaultDb } from '../../data/db.ts';
import { createRow, patchRow, softDelete, type MutateContext } from '../../data/sync/mutate.ts';
import { newId } from '../../domain/ids.ts';
import { normalizeName } from '../../domain/similar.ts';
import type { ListItem } from '../../domain/types.ts';
import { addProduct } from '../data/actions.ts';

const defaultCtx: MutateContext = { db: defaultDb, now: () => new Date().toISOString() };

/** リストに足す。同じ商品が未チェックで入っていれば足さない */
export async function addToList(productId: string, userId: string | null, ctx: MutateContext = defaultCtx): Promise<void> {
  const items = await ctx.db.list_items.toArray();
  if (items.some((i) => !i.deleted_at && !i.checked_at && i.product_id === productId)) return;
  await createRow('list_items', {
    id: newId(), product_id: productId, memo: '', added_by: userId, added_at: ctx.now(),
    checked_at: null, checked_by: null, bought_store_id: null, forced_store_id: null,
  }, ctx);
}

/** リストから外す（未チェックのものだけ） */
export async function removeFromList(productId: string, ctx: MutateContext = defaultCtx): Promise<void> {
  const items = await ctx.db.list_items.toArray();
  for (const i of items) if (!i.deleted_at && !i.checked_at && i.product_id === productId) await softDelete('list_items', i.id, ctx);
}

/** 名前だけで商品を作って（1つあたり・食品）、リストに入れる。同じ名前があればそれを使う */
export async function addNewProductToList(name: string, userId: string | null, ctx: MutateContext = defaultCtx): Promise<void> {
  const products = await ctx.db.products.toArray();
  const same = products.find((p) => !p.deleted_at && normalizeName(p.name) === normalizeName(name));
  const id = same?.id ?? (await addProduct({ name, unit: 'piece', tax_rate: 8 }, ctx));
  await addToList(id, userId, ctx);
}

export function check(item: ListItem, userId: string | null, ctx: MutateContext = defaultCtx) {
  // 買った店は段階4で、提案が割り当てた店を入れる
  return patchRow('list_items', item.id, { checked_at: ctx.now(), checked_by: userId, bought_store_id: null }, ctx);
}

export function uncheck(item: ListItem, ctx: MutateContext = defaultCtx) {
  return patchRow('list_items', item.id, { checked_at: null, checked_by: null, bought_store_id: null }, ctx);
}

export function saveMemo(item: ListItem, memo: string, ctx: MutateContext = defaultCtx) {
  if (memo === item.memo) return Promise.resolve();
  return patchRow('list_items', item.id, { memo }, ctx);
}

export const removeItem = (item: ListItem, ctx: MutateContext = defaultCtx) => softDelete('list_items', item.id, ctx);
