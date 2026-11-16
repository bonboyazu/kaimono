-- 買い物アプリ：同期する表・RLS・許可・publication
-- 共通の列：field_times（列名 → その列を最後に変えた操作の時刻）・deleted_at・server_updated_at

create or replace function public.touch_server_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_updated_at := now();
  return new;
end;
$$;

create table public.stores (
  id uuid primary key,
  name text not null,
  sort_order int not null default 0,
  visit_mode text not null default 'usual' check (visit_mode in ('usual', 'other', 'never')),
  default_tax_mode text not null default 'included' check (default_tax_mode in ('included', 'excluded')),
  field_times jsonb not null default '{}',
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key,
  name text not null,
  unit text not null default 'piece' check (unit in ('piece', '100g')),
  tax_rate int not null default 8 check (tax_rate in (8, 10)),
  is_preset boolean not null default false,
  field_times jsonb not null default '{}',
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

create table public.prices (
  id uuid primary key,
  store_id uuid not null,
  product_id uuid not null,
  amount int not null check (amount > 0),
  tax_mode text not null check (tax_mode in ('included', 'excluded')),
  price_updated_at timestamptz not null default now(),
  field_times jsonb not null default '{}',
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  unique (store_id, product_id)
);

create table public.sale_prices (
  id uuid primary key,
  store_id uuid not null,
  product_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  amount int not null check (amount > 0),
  tax_mode text not null check (tax_mode in ('included', 'excluded')),
  field_times jsonb not null default '{}',
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  unique (store_id, product_id, weekday)
);

create table public.list_items (
  id uuid primary key,
  product_id uuid not null,
  memo text not null default '',
  added_by uuid,
  added_at timestamptz not null default now(),
  checked_at timestamptz,
  checked_by uuid,
  bought_store_id uuid,
  forced_store_id uuid,
  field_times jsonb not null default '{}',
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

create table public.excluded_dates (
  id uuid primary key,
  date date not null unique,
  field_times jsonb not null default '{}',
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

create table public.store_overrides (
  id uuid primary key,
  store_id uuid not null unique,
  going boolean not null,
  expires_at timestamptz not null,
  field_times jsonb not null default '{}',
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

create table public.settings (
  id uuid primary key,
  available_weekdays jsonb not null default '[3,5,6,0]',
  field_times jsonb not null default '{}',
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

-- 同期する表に共通の設定
do $$
declare
  t text;
begin
  foreach t in array array['stores', 'products', 'prices', 'sale_prices', 'list_items',
                           'excluded_dates', 'store_overrides', 'settings']
  loop
    execute format('create index %I on public.%I (server_updated_at)', t || '_server_updated_at_idx', t);
    execute format(
      'create trigger touch_server_updated_at before insert or update on public.%I
         for each row execute function public.touch_server_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
    -- ログインできるのは2人だけのため、ログインしていれば読み書きできる
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (true)', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (true) with check (true)', t || '_update', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end;
$$;

-- 共有の設定は1行だけ（固定の id）
insert into public.settings (id, available_weekdays)
values ('00000000-0000-0000-0000-000000000001', '[3,5,6,0]')
on conflict (id) do nothing;
