// 設定の書き込み（2人で共有するもの）
import { db as defaultDb } from '../../data/db.ts';
import { createRow, patchRow, type MutateContext } from '../../data/sync/mutate.ts';
import { SETTINGS_ID, type Store, type VisitMode } from '../../domain/types.ts';

const defaultCtx: MutateContext = { db: defaultDb, now: () => new Date().toISOString() };

/** 初期値（サーバーの初期値と同じ） */
export const DEFAULT_WEEKDAYS = [3, 5, 6, 0];

/** 行ける曜日を1つ切り替える */
export async function toggleWeekday(weekday: number, ctx: MutateContext = defaultCtx): Promise<void> {
  const row = await ctx.db.settings.get(SETTINGS_ID);
  const current = row && !row.deleted_at ? row.available_weekdays : DEFAULT_WEEKDAYS;
  const next = current.includes(weekday)
    ? current.filter((w) => w !== weekday)
    : [...current, weekday].sort((a, b) => a - b);
  if (row) await patchRow('settings', SETTINGS_ID, { available_weekdays: next, deleted_at: null }, ctx);
  else await createRow('settings', { id: SETTINGS_ID, available_weekdays: next }, ctx);
}

/** 店を1つ上か下に動かし、sort_order を 0 から振り直す（変わった店だけ書く） */
export async function moveStore(stores: Store[], id: string, dir: -1 | 1, ctx: MutateContext = defaultCtx): Promise<void> {
  const order = [...stores].filter((s) => !s.deleted_at).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ja'));
  const i = order.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  for (const [k, s] of order.entries()) if (s.sort_order !== k) await patchRow('stores', s.id, { sort_order: k }, ctx);
}

export async function setVisitMode(store: Store, mode: VisitMode, ctx: MutateContext = defaultCtx): Promise<void> {
  if (store.visit_mode !== mode) await patchRow('stores', store.id, { visit_mode: mode }, ctx);
}
