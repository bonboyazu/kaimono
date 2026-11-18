import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import { db } from '../../data/db.ts';
import type { ListItem, Product, Store } from '../../domain/types.ts';
import DashboardPage from './DashboardPage.tsx';

const meta = { field_times: {}, deleted_at: null };
const store = (id: string, name: string): Store => ({ ...meta, id, name, sort_order: 0, visit_mode: 'usual', default_tax_mode: 'included' });
const product = (id: string, name: string): Product => ({ ...meta, id, name, unit: 'piece', tax_rate: 8, is_preset: true });
let seq = 0;
const bought = (product_id: string, checked_at: string, bought_store_id: string | null): ListItem => {
  seq += 1;
  return {
    ...meta, id: `i${seq}`, product_id, memo: '', added_by: null, added_at: checked_at,
    checked_at, checked_by: null, bought_store_id, forced_store_id: null,
  };
};

const NOW = new Date('2026-11-19T03:00:00Z');

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

test('記録がないときは「まだ記録がありません」', async () => {
  render(<MemoryRouter><DashboardPage now={NOW} /></MemoryRouter>);
  expect(await screen.findAllByText('まだ記録がありません')).toHaveLength(2);
});

test('よく買う商品・よく行く店を、回数の多い順に出す。期間を切り替えられる', async () => {
  await db.stores.bulkPut([store('a', 'A店'), store('b', 'B店')]);
  await db.products.bulkPut([product('egg', '卵'), product('milk', '牛乳')]);
  await db.list_items.bulkPut([
    bought('egg', '2026-11-10T00:00:00Z', 'a'),
    bought('egg', '2026-11-12T00:00:00Z', 'b'),
    bought('milk', '2026-11-12T00:00:00Z', 'b'),
    bought('milk', '2026-10-01T00:00:00Z', 'b'),
    bought('milk', '2026-01-01T00:00:00Z', 'b'),
  ]);
  const u = userEvent.setup();
  render(<MemoryRouter><DashboardPage now={NOW} /></MemoryRouter>);

  const products = await screen.findByRole('list', { name: 'よく買う商品' });
  await within(products).findByText('卵');
  expect(within(products).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['卵2回', '牛乳1回']);
  const stores = screen.getByRole('list', { name: 'よく行く店' });
  expect(within(stores).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['B店2回', 'A店1回']);

  await u.click(screen.getByRole('button', { name: '全期間' }));
  expect(within(screen.getByRole('list', { name: 'よく買う商品' })).getAllByRole('listitem').map((li) => li.textContent))
    .toEqual(['牛乳3回', '卵2回']);
  await u.click(screen.getByRole('button', { name: '3か月' }));
  expect(within(screen.getByRole('list', { name: 'よく買う商品' })).getAllByRole('listitem').map((li) => li.textContent))
    .toEqual(['牛乳2回', '卵2回']);
});

test('それぞれ上位10件まで', async () => {
  await db.stores.bulkPut([store('a', 'A店')]);
  const ps = Array.from({ length: 12 }, (_, i) => product(`p${i}`, `商品${String(i).padStart(2, '0')}`));
  await db.products.bulkPut(ps);
  await db.list_items.bulkPut(ps.map((p) => bought(p.id, '2026-11-10T00:00:00Z', 'a')));
  render(<MemoryRouter><DashboardPage now={NOW} /></MemoryRouter>);
  const list = await screen.findByRole('list', { name: 'よく買う商品' });
  await within(list).findByText('商品00');
  expect(within(list).getAllByRole('listitem')).toHaveLength(10);
});
