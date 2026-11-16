// 買い物リストの純粋な関数
import { jstDate } from './dates.ts';
import { normalizeName } from './similar.ts';
import type { ListItem, Product } from './types.ts';

const alive = <T extends { deleted_at: string | null }>(rows: T[]) => rows.filter((r) => !r.deleted_at);
const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, 'ja');

/** 未チェック（足した順）と、今日チェックしたもの（新しい順）。日付は日本時間で見る */
export function activeItems(items: ListItem[], now: Date): { toBuy: ListItem[]; boughtToday: ListItem[] } {
  const today = jstDate(now);
  const rows = alive(items);
  const toBuy = rows.filter((i) => !i.checked_at).sort((a, b) => a.added_at.localeCompare(b.added_at) || a.id.localeCompare(b.id));
  const boughtToday = rows
    .filter((i) => i.checked_at && jstDate(new Date(i.checked_at)) === today)
    .sort((a, b) => b.checked_at!.localeCompare(a.checked_at!));
  return { toBuy, boughtToday };
}

/** 同じ商品の未チェックが2つ以上あるとき、いちばん古いもの以外の id（2台で同時に足したとき） */
export function duplicatesToRemove(items: ListItem[]): string[] {
  const first = new Map<string, ListItem>();
  const out: string[] = [];
  const unchecked = alive(items)
    .filter((i) => !i.checked_at)
    .sort((a, b) => a.added_at.localeCompare(b.added_at) || a.id.localeCompare(b.id));
  for (const i of unchecked) {
    if (first.has(i.product_id)) out.push(i.id);
    else first.set(i.product_id, i);
  }
  return out;
}

/** チェックした回数が多い順。同じ回数は名前の順。買った記録のない商品は出さない */
export function frequentProducts(items: ListItem[], products: Product[]): Product[] {
  const count = new Map<string, number>();
  for (const i of items) if (i.checked_at && !i.deleted_at) count.set(i.product_id, (count.get(i.product_id) ?? 0) + 1);
  return alive(products)
    .filter((p) => count.has(p.id))
    .sort((a, b) => count.get(b.id)! - count.get(a.id)! || byName(a, b));
}

/** 名前の部分一致。ひらがなとカタカナ、全角と半角を区別しない。空なら全部。名前の順 */
export function searchProducts(products: Product[], query: string): Product[] {
  const q = normalizeName(query);
  return alive(products)
    .filter((p) => !q || normalizeName(p.name).includes(q))
    .sort(byName);
}
