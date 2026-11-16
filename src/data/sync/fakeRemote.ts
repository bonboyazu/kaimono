// テスト用：メモリの中だけで動く Remote
import type { SyncTable } from '../../domain/types.ts';
import { NetworkError, RemoteError, type Remote } from '../remote.ts';

type Row = Record<string, unknown>;

export class FakeRemote implements Remote {
  tables = new Map<SyncTable, Map<string, Row>>();
  offline = false;
  /** 次の n 回の書き込みを 4xx で失敗させる行の id */
  rejectIds = new Set<string>();
  fetchSinceCalls: { table: SyncTable; cursor: string | null }[] = [];
  private tick = 0;

  private table(t: SyncTable) {
    let m = this.tables.get(t);
    if (!m) this.tables.set(t, (m = new Map()));
    return m;
  }
  private stamp() {
    this.tick += 1;
    return new Date(Date.UTC(2030, 0, 1, 0, 0, this.tick)).toISOString();
  }
  private check(id?: string) {
    if (this.offline) throw new NetworkError('offline');
    if (id && this.rejectIds.has(id)) throw new RemoteError('400 bad request');
  }
  get(t: SyncTable, id: string) {
    return this.table(t).get(id) ?? null;
  }
  async fetchRow(t: SyncTable, id: string) {
    this.check();
    const r = this.table(t).get(id);
    return r ? { ...r } : null;
  }
  async insertRow(t: SyncTable, row: Row) {
    this.check(row.id as string);
    const m = this.table(t);
    if (m.has(row.id as string)) return 'conflict' as const;
    m.set(row.id as string, { ...row, server_updated_at: this.stamp() });
    return 'inserted' as const;
  }
  async updateRow(t: SyncTable, id: string, patch: Row) {
    this.check(id);
    const m = this.table(t);
    const cur = m.get(id);
    if (!cur) throw new RemoteError('not found');
    m.set(id, { ...cur, ...patch, server_updated_at: this.stamp() });
  }
  async fetchSince(t: SyncTable, cursor: string | null) {
    this.check();
    this.fetchSinceCalls.push({ table: t, cursor });
    return [...this.table(t).values()]
      .filter((r) => cursor === null || (r.server_updated_at as string) >= cursor)
      .sort((a, b) => ((a.server_updated_at as string) < (b.server_updated_at as string) ? -1 : 1))
      .map((r) => ({ ...r }));
  }
}
