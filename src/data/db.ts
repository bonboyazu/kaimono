// 端末の中の写し（IndexedDB）。画面はここだけを読み書きする
import Dexie, { type EntityTable } from 'dexie';
import type {
  ExcludedDate, ListItem, Price, Product, SalePrice, Settings, Store, StoreOverride, SyncTable,
} from '../domain/types.ts';

export type OutboxKind = 'create' | 'patch';

export type OutboxEntry = {
  seq?: number;
  table: SyncTable;
  row_id: string;
  kind: OutboxKind;
  patch: Record<string, unknown>;
  op_time: string;
  attempts: number;
  last_error: string | null;
};

export type MetaEntry = { table: SyncTable; cursor: string | null };

/** 3回失敗したら「反映できなかった操作」 */
export const MAX_ATTEMPTS = 3;

export class LocalDb extends Dexie {
  stores!: EntityTable<Store, 'id'>;
  products!: EntityTable<Product, 'id'>;
  prices!: EntityTable<Price, 'id'>;
  sale_prices!: EntityTable<SalePrice, 'id'>;
  list_items!: EntityTable<ListItem, 'id'>;
  excluded_dates!: EntityTable<ExcludedDate, 'id'>;
  store_overrides!: EntityTable<StoreOverride, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  outbox!: EntityTable<OutboxEntry, 'seq'>;
  meta!: EntityTable<MetaEntry, 'table'>;

  constructor(name = 'kaimono') {
    super(name);
    this.version(1).stores({
      stores: 'id',
      products: 'id',
      prices: 'id, store_id, product_id',
      sale_prices: 'id, store_id, product_id',
      list_items: 'id, product_id',
      excluded_dates: 'id, date',
      store_overrides: 'id, store_id',
      settings: 'id',
      outbox: '++seq, [table+row_id]',
      meta: 'table',
    });
  }
}

export const db = new LocalDb();
