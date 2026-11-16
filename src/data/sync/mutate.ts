// 画面が使う書き込み口は createRow・patchRow・softDelete の3つだけ
import type { RowOf, SyncTable } from '../../domain/types.ts';
import { db as defaultDb, type LocalDb } from '../db.ts';

export type MutateContext = { db: LocalDb; now: () => string };

const defaultCtx: MutateContext = { db: defaultDb, now: () => new Date().toISOString() };

type Listener = () => void;
const listeners = new Set<Listener>();
/** 書き込みの直後に同期を動かすため */
export function onWrite(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const notify = () => listeners.forEach((fn) => fn());

const META_KEYS = new Set(['field_times', 'server_updated_at']);

function dataFields(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (!META_KEYS.has(k)) out[k] = v;
  return out;
}

function timesFor(fields: Record<string, unknown>, opTime: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(fields)) if (k !== 'id') out[k] = opTime;
  return out;
}

export type NewRow<T extends SyncTable> = Omit<RowOf<T>, 'field_times' | 'deleted_at' | 'server_updated_at'>;

export async function createRow<T extends SyncTable>(
  table: T,
  row: NewRow<T>,
  ctx: MutateContext = defaultCtx,
): Promise<void> {
  const opTime = ctx.now();
  const fields = dataFields({ ...row, deleted_at: null });
  const { db } = ctx;
  await db.transaction('rw', db.table(table), db.outbox, async () => {
    const prev = await db.table(table).get(fields.id as string);
    await db.table(table).put({
      ...(prev ?? {}),
      ...fields,
      field_times: { ...(prev?.field_times ?? {}), ...timesFor(fields, opTime) },
    });
    await db.outbox.add({
      table, row_id: fields.id as string, kind: 'create', patch: fields,
      op_time: opTime, attempts: 0, last_error: null,
    });
  });
  notify();
}

export async function patchRow<T extends SyncTable>(
  table: T,
  id: string,
  patch: Partial<RowOf<T>>,
  ctx: MutateContext = defaultCtx,
): Promise<void> {
  const opTime = ctx.now();
  const fields = dataFields(patch as Record<string, unknown>);
  delete fields.id;
  if (Object.keys(fields).length === 0) return;
  const { db } = ctx;
  await db.transaction('rw', db.table(table), db.outbox, async () => {
    const prev = await db.table(table).get(id);
    if (!prev) throw new Error(`${table} ${id} がありません`);
    await db.table(table).put({
      ...prev,
      ...fields,
      field_times: { ...prev.field_times, ...timesFor(fields, opTime) },
    });
    await db.outbox.add({
      table, row_id: id, kind: 'patch', patch: fields,
      op_time: opTime, attempts: 0, last_error: null,
    });
  });
  notify();
}

/** 行は消さない。deleted_at に日時を入れる */
export function softDelete(table: SyncTable, id: string, ctx: MutateContext = defaultCtx): Promise<void> {
  return patchRow(table, id, { deleted_at: ctx.now() } as Partial<RowOf<typeof table>>, ctx);
}
