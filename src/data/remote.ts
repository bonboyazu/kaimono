// サーバーとのやりとり。テストでは偽物（fakeRemote.ts）に差し替える
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SyncTable } from '../domain/types.ts';

export interface Remote {
  fetchRow(table: SyncTable, id: string): Promise<Record<string, unknown> | null>;
  insertRow(table: SyncTable, row: Record<string, unknown>): Promise<'inserted' | 'conflict'>;
  updateRow(table: SyncTable, id: string, patch: Record<string, unknown>): Promise<void>;
  /** server_updated_at >= cursor の行を、古い順に */
  fetchSince(table: SyncTable, cursor: string | null): Promise<Record<string, unknown>[]>;
}

/** 通信の失敗。outbox を残してあとでやり直す */
export class NetworkError extends Error {}
/** それ以外の失敗（4xx など）。飛ばして数える */
export class RemoteError extends Error {}

type PgError = { message: string; code?: string } | null;

function toError(error: PgError, status: number): Error {
  const msg = error?.message ?? `status ${status}`;
  // status 0 は通信できなかった。5xx・429 もやり直す
  if (status === 0 || status >= 500 || status === 429) return new NetworkError(msg);
  return new RemoteError(msg);
}

const PAGE = 500;

export function supabaseRemote(client: SupabaseClient): Remote {
  return {
    async fetchRow(table, id) {
      const { data, error, status } = await client.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw toError(error, status);
      return data;
    },
    async insertRow(table, row) {
      const { error, status } = await client.from(table).insert(row);
      if (!error) return 'inserted';
      if (error.code === '23505') return 'conflict'; // 同じ id・同じ組み合わせがもうある
      throw toError(error, status);
    },
    async updateRow(table, id, patch) {
      const { error, status } = await client.from(table).update(patch).eq('id', id);
      if (error) throw toError(error, status);
    },
    async fetchSince(table, cursor) {
      const out: Record<string, unknown>[] = [];
      for (let from = 0; ; from += PAGE) {
        let q = client.from(table).select('*');
        if (cursor) q = q.gte('server_updated_at', cursor);
        const { data, error, status } = await q
          .order('server_updated_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw toError(error, status);
        out.push(...(data ?? []));
        if (!data || data.length < PAGE) return out;
      }
    },
  };
}
