// 読み取り用の hook。写しだけを読む
import { useLiveQuery } from 'dexie-react-hooks';
import type { RowOf, SyncTable } from '../domain/types.ts';
import { db } from './db.ts';

/** 消されていない行 */
export function useRows<T extends SyncTable>(table: T): RowOf<T>[] | undefined {
  return useLiveQuery(
    async () => ((await db.table(table).toArray()) as RowOf<T>[]).filter((r) => !r.deleted_at),
    [table],
  );
}

export function useRow<T extends SyncTable>(table: T, id: string | undefined): RowOf<T> | undefined {
  return useLiveQuery(async () => (id ? ((await db.table(table).get(id)) as RowOf<T>) : undefined), [table, id]);
}
