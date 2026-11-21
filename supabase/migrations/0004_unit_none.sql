-- 値段を入れない商品（野菜など）：単位に none を足す（2026/11/21）
alter table public.products drop constraint products_unit_check;
alter table public.products add constraint products_unit_check check (unit in ('piece', '100g', 'none'));
