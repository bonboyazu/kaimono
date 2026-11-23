-- 量あたりで比べる商品（きなこなど）：単位に size_g・size_ml・size_count を足し、値段に量を持つ（2026/11/23）
alter table public.products drop constraint products_unit_check;
alter table public.products add constraint products_unit_check
  check (unit in ('piece', '100g', 'none', 'size_g', 'size_ml', 'size_count'));
alter table public.prices add column size integer check (size is null or size > 0);
