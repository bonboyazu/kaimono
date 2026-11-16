// サーバーの行を写しに入れる。未送信の操作は上から当て直す
import { SYNC_TABLES, type SyncTable } from '../../domain/types.ts';
import { MAX_ATTEMPTS, type LocalDb } from '../db.ts';
import type { Remote } from '../remote.ts';

type Row = Record<string, unknown>;

async function rebase(db: LocalDb, table: SyncTable, row: Row): Promise<Row> {
  const pending = (await db.outbox.where('[table+row_id]').equals([table, row.id as string]).toArray())
    .filter((e) => e.attempts < MAX_ATTEMPTS)
    .sort((a, b) => a.seq! - b.seq!);
  let merged: Row = { ...row, field_times: { ...((row.field_times ?? {}) as Record<string, string>) } };
  for (const e of pending) {
    const times = merged.field_times as Record<string, string>;
    for (const k of Object.keys(e.patch)) if (k !== 'id') times[k] = e.op_time;
    merged = { ...merged, ...e.patch, field_times: times };
  }
  return merged;
}

export async function applyRemoteRow(db: LocalDb, table: SyncTable, row: Row): Promise<void> {
  await db.transaction('rw', db.table(table), db.outbox, async () => {
    await db.table(table).put(await rebase(db, table, row));
  });
}

export async function pullTable(db: LocalDb, remote: Remote, table: SyncTable): Promise<void> {
  const meta = await db.meta.get(table);
  const cursor = meta?.cursor ?? null;
  const rows = await remote.fetchSince(table, cursor);
  if (rows.length === 0) return;
  let next = cursor;
  await db.transaction('rw', db.table(table), db.outbox, db.meta, async () => {
    for (const row of rows) {
      await db.table(table).put(await rebase(db, table, row));
      const t = row.server_updated_at as string;
      if (!next || t > next) next = t;
    }
    await db.meta.put({ table, cursor: next });
  });
}

export async function pull(db: LocalDb, remote: Remote): Promise<void> {
  for (const table of SYNC_TABLES) await pullTable(db, remote, table);
}
