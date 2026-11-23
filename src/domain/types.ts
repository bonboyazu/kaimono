// 表の列と同じ名前（snake_case）で持つ。端末の中もサーバーも同じ形

export type TaxMode = 'included' | 'excluded';
export type VisitMode = 'usual' | 'other' | 'never';
/**
 * none：値段を入れない商品（野菜など）。値段を比べず、提案・安い順・データの店ごとの行に出さない
 * size_g・size_ml・size_count：量あたり（きなこなど）。値段を量と一緒に入れ、100g・100ml・1個あたりで比べる
 */
export type Unit = 'piece' | '100g' | 'none' | 'size_g' | 'size_ml' | 'size_count';

export type SyncMeta = {
  field_times: Record<string, string>;
  deleted_at: string | null;
  server_updated_at?: string;
};

export type SyncTable =
  | 'stores'
  | 'products'
  | 'prices'
  | 'sale_prices'
  | 'list_items'
  | 'excluded_dates'
  | 'store_overrides'
  | 'settings';

export const SYNC_TABLES: SyncTable[] = [
  'stores',
  'products',
  'prices',
  'sale_prices',
  'list_items',
  'excluded_dates',
  'store_overrides',
  'settings',
];

export type Store = SyncMeta & {
  id: string;
  name: string;
  sort_order: number;
  visit_mode: VisitMode;
  default_tax_mode: TaxMode;
};

export type Product = SyncMeta & {
  id: string;
  name: string;
  unit: Unit;
  tax_rate: number;
  is_preset: boolean;
};

export type Price = SyncMeta & {
  id: string;
  store_id: string;
  product_id: string;
  amount: number;
  tax_mode: TaxMode;
  price_updated_at: string;
  /** 量あたりの商品の量（g・ml・個）。ほかの商品と、量を入れる前の値段は空 */
  size?: number | null;
};

export type SalePrice = SyncMeta & {
  id: string;
  store_id: string;
  product_id: string;
  weekday: number;
  amount: number;
  tax_mode: TaxMode;
};

export type ListItem = SyncMeta & {
  id: string;
  product_id: string;
  memo: string;
  added_by: string | null;
  added_at: string;
  checked_at: string | null;
  checked_by: string | null;
  bought_store_id: string | null;
  forced_store_id: string | null;
};

export type ExcludedDate = SyncMeta & {
  id: string;
  date: string;
};

export type StoreOverride = SyncMeta & {
  id: string;
  store_id: string;
  going: boolean;
  expires_at: string;
};

/** 1行だけ。固定の id */
export const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export type Settings = SyncMeta & {
  id: string;
  available_weekdays: number[];
};

export type RowOf<T extends SyncTable> = {
  stores: Store;
  products: Product;
  prices: Price;
  sale_prices: SalePrice;
  list_items: ListItem;
  excluded_dates: ExcludedDate;
  store_overrides: StoreOverride;
  settings: Settings;
}[T];
