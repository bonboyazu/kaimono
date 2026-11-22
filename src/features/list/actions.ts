// リストの書き込み。画面からはここを呼ぶ
import { db as defaultDb } from '../../data/db.ts';
import { createRow, patchRow, softDelete, type MutateContext } from '../../data/sync/mutate.ts';
import { addDays } from '../../domain/dates.ts';
import { excludedDateId, newId, storeOverrideId } from '../../domain/ids.ts';
import { isMeatName } from '../../domain/meat.ts';
import { normalizeName } from '../../domain/similar.ts';
import type { ListItem, Store } from '../../domain/types.ts';
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
  // 肉の組み立てでできる名前は 100gあたり
  const id = same?.id ?? (await addProduct({ name, unit: isMeatName(name) ? '100g' : 'piece', tax_rate: 8 }, ctx));
  await addToList(id, userId, ctx);
}

/** 買った店には、提案で選ばれた店を入れる（店が未定なら null） */
export function check(item: ListItem, userId: string | null, storeId: string | null = null, ctx: MutateContext = defaultCtx) {
  return patchRow('list_items', item.id, { checked_at: ctx.now(), checked_by: userId, bought_store_id: storeId }, ctx);
}

export function uncheck(item: ListItem, ctx: MutateContext = defaultCtx) {
  return patchRow('list_items', item.id, { checked_at: null, checked_by: null, bought_store_id: null }, ctx);
}

export function saveMemo(item: ListItem, memo: string, ctx: MutateContext = defaultCtx) {
  if (memo === item.memo) return Promise.resolve();
  return patchRow('list_items', item.id, { memo }, ctx);
}

export const removeItem = (item: ListItem, ctx: MutateContext = defaultCtx) => softDelete('list_items', item.id, ctx);

/** 提案の日を外す・戻す。外した日は excluded_dates に入れる */
export async function toggleDate(date: string, ctx: MutateContext = defaultCtx): Promise<void> {
  const id = await excludedDateId(date);
  const row = await ctx.db.excluded_dates.get(id);
  if (row && !row.deleted_at) await softDelete('excluded_dates', id, ctx);
  else await createRow('excluded_dates', { id, date }, ctx);
}

/** 今週だけ、その店に行く・行かないを今と逆にする。期限は今から7日後。設定と同じに戻ったら消す */
export async function toggleStoreThisWeek(store: Store, goingNow: boolean, ctx: MutateContext = defaultCtx): Promise<void> {
  const id = await storeOverrideId(store.id);
  const going = !goingNow;
  if (going === (store.visit_mode === 'usual')) {
    const row = await ctx.db.store_overrides.get(id);
    if (row && !row.deleted_at) await softDelete('store_overrides', id, ctx);
    return;
  }
  const now = ctx.now();
  const expires_at = `${addDays(now.slice(0, 10), 7)}${now.slice(10)}`;
  await createRow('store_overrides', { id, store_id: store.id, going, expires_at }, ctx);
}

/** その商品だけ、ほかの店に回す（null で元に戻す） */
export function forceStore(item: ListItem, storeId: string | null, ctx: MutateContext = defaultCtx) {
  return patchRow('list_items', item.id, { forced_store_id: storeId }, ctx);
}
