// outbox を seq の順に1件ずつ送る
import { MAX_ATTEMPTS, type LocalDb, type OutboxEntry } from '../db.ts';
import { NetworkError, type Remote } from '../remote.ts';
import { resolvePatch } from './resolve.ts';

async function sendPatch(remote: Remote, e: OutboxEntry, server: Record<string, unknown>) {
  const serverTimes = (server.field_times ?? {}) as Record<string, string>;
  const { accepted, fieldTimes } = resolvePatch(serverTimes, e.patch, e.op_time);
  if (Object.keys(accepted).length === 0) return;
  await remote.updateRow(e.table, e.row_id, { ...accepted, field_times: fieldTimes });
}

async function sendOne(remote: Remote, e: OutboxEntry) {
  if (e.kind === 'create') {
    const existing = await remote.fetchRow(e.table, e.row_id);
    if (!existing) {
      const fieldTimes: Record<string, string> = {};
      for (const k of Object.keys(e.patch)) if (k !== 'id') fieldTimes[k] = e.op_time;
      const result = await remote.insertRow(e.table, { ...e.patch, field_times: fieldTimes });
      if (result === 'inserted') return;
    }
    // もう行がある：全部の列を patch として扱う
    const server = existing ?? (await remote.fetchRow(e.table, e.row_id));
    if (!server) throw new NetworkError('行が見つかりません');
    const { id: _id, ...rest } = e.patch;
    await sendPatch(remote, { ...e, patch: rest }, server);
    return;
  }
  const server = await remote.fetchRow(e.table, e.row_id);
  if (!server) throw new Error(`サーバーに ${e.table} ${e.row_id} がありません`);
  await sendPatch(remote, e, server);
}

/** 送れたら true。通信の失敗で止まったら false */
export async function push(db: LocalDb, remote: Remote): Promise<boolean> {
  const entries = await db.outbox.orderBy('seq').toArray();
  for (const e of entries) {
    if (e.attempts >= MAX_ATTEMPTS) continue;
    try {
      await sendOne(remote, e);
      await db.outbox.delete(e.seq!);
    } catch (err) {
      if (err instanceof NetworkError) return false;
      await db.outbox.update(e.seq!, {
        attempts: e.attempts + 1,
        last_error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return true;
}
