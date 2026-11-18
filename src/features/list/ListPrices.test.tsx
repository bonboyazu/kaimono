import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthApi } from '../../data/auth.ts';
import { db } from '../../data/db.ts';
import { createRow } from '../../data/sync/mutate.ts';
import { SETTINGS_ID } from '../../domain/types.ts';
import { addToList } from './actions.ts';
import ListPage from './ListPage.tsx';

const user = { id: '11111111-1111-4111-8111-111111111111', email: 'a@example.com' };

beforeEach(async () => {
  // 日本時間 2026/11/15（日）の昼
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-15T03:00:00Z') });
  await Promise.all(db.tables.map((t) => t.clear()));
  await createRow('settings', { id: SETTINGS_ID, available_weekdays: [3, 5, 6, 0] });
  await createRow('stores', { id: 'A', name: 'A店', sort_order: 0, visit_mode: 'usual', default_tax_mode: 'included' });
  await createRow('stores', { id: 'B', name: 'B店', sort_order: 1, visit_mode: 'other', default_tax_mode: 'included' });
  await createRow('products', { id: 'egg', name: '卵', unit: 'piece', tax_rate: 8, is_preset: true });
  await createRow('prices', { id: 'pa', store_id: 'A', product_id: 'egg', amount: 198, tax_mode: 'included', price_updated_at: '2026-11-01T00:00:00Z' });
  await createRow('prices', { id: 'pb', store_id: 'B', product_id: 'egg', amount: 168, tax_mode: 'included', price_updated_at: '2026-11-01T00:00:00Z' });
  await createRow('sale_prices', { id: 'sa', store_id: 'A', product_id: 'egg', weekday: 3, amount: 98, tax_mode: 'included' });
  await addToList('egg', user.id);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('リストの値段', () => {
  it('チェックすると、いちばん安い店が買った店に入る', async () => {
    const u = userEvent.setup();
    render(
      <AuthContext.Provider value={{ user, auth: {} as AuthApi }}>
        <MemoryRouter initialEntries={['/list']}><ListPage /></MemoryRouter>
      </AuthContext.Provider>,
    );
    await u.click(await screen.findByRole('button', { name: '卵をチェック' }));
    await waitFor(async () => expect((await db.list_items.toArray())[0].bought_store_id).toBe('A'));
  });

  it('リストの行に値段は出さず、行を押すと店の安い順が開く', async () => {
    const u = userEvent.setup();
    render(
      <AuthContext.Provider value={{ user, auth: {} as AuthApi }}>
        <MemoryRouter initialEntries={['/list']}><ListPage /></MemoryRouter>
      </AuthContext.Provider>,
    );
    const btn = await screen.findByRole('button', { name: '卵' });
    expect(btn).not.toHaveTextContent('円');
    await u.click(btn);
    const list = screen.getByRole('list', { name: '卵の安い店' });
    const rows = within(list).getAllByRole('listitem').map((li) => li.textContent);
    expect(rows).toEqual(['1A店98円水曜セール（ふだん 198円）', '2B店168円']);
    await u.click(within(list).getByRole('button', { name: /B店/ }));
    expect(await screen.findByText('卵（B店）')).toBeInTheDocument();
  });

  it('ほかの店の値段を入れるときは、商品は決まったまま、値段のない店だけ選べる', async () => {
    const u = userEvent.setup();
    render(
      <AuthContext.Provider value={{ user, auth: {} as AuthApi }}>
        <MemoryRouter initialEntries={['/list']}><ListPage /></MemoryRouter>
      </AuthContext.Provider>,
    );
    await u.click(await screen.findByRole('button', { name: '卵' }));
    await u.click(screen.getByRole('button', { name: '＋ ほかの店の値段を入れる' }));
    const dialog = await screen.findByRole('dialog', { name: '値段を足す' });
    expect(within(dialog).getByText('卵')).toBeInTheDocument();
    expect(within(dialog).queryByRole('combobox')).toBeNull();
    expect(within(dialog).queryByRole('searchbox')).toBeNull();
    expect(within(dialog).getByText('すべての店に値段が入っています')).toBeInTheDocument();
  });

  it('値段のない店を選ぶと、その店の値段を入れられる', async () => {
    await createRow('stores', { id: 'C', name: 'C店', sort_order: 2, visit_mode: 'usual', default_tax_mode: 'included' });
    const u = userEvent.setup();
    render(
      <AuthContext.Provider value={{ user, auth: {} as AuthApi }}>
        <MemoryRouter initialEntries={['/list']}><ListPage /></MemoryRouter>
      </AuthContext.Provider>,
    );
    await u.click(await screen.findByRole('button', { name: '卵' }));
    await u.click(screen.getByRole('button', { name: '＋ ほかの店の値段を入れる' }));
    const dialog = await screen.findByRole('dialog', { name: '値段を足す' });
    await u.click(within(dialog).getByRole('button', { name: '店' }));
    const options = within(dialog).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['C店']);
    await u.click(within(dialog).getByRole('option', { name: 'C店' }));
    expect(await within(dialog).findByLabelText('通常の値段')).toBeInTheDocument();
  });
});
