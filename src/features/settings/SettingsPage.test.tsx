import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../data/db.ts';
import { createRow } from '../../data/sync/mutate.ts';
import { SETTINGS_ID } from '../../domain/types.ts';
import StoreSetting from './StoreSetting.tsx';
import WeekdaySetting from './WeekdaySetting.tsx';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('行ける曜日', () => {
  it('押すと settings に入り、もう一度押すと外れる', async () => {
    await createRow('settings', { id: SETTINGS_ID, available_weekdays: [3, 5, 6, 0] });
    const u = userEvent.setup();
    render(<WeekdaySetting />);
    const group = await screen.findByRole('group', { name: '行ける曜日' });
    const mon = within(group).getByRole('button', { name: '月' });
    expect(mon).toHaveAttribute('aria-pressed', 'false');
    await u.click(mon);
    await waitFor(async () => expect((await db.settings.get(SETTINGS_ID))!.available_weekdays).toEqual([0, 1, 3, 5, 6]));
    await u.click(within(group).getByRole('button', { name: '水' }));
    await waitFor(async () => expect((await db.settings.get(SETTINGS_ID))!.available_weekdays).toEqual([0, 1, 5, 6]));
  });

  it('設定の行がまだなくても、初期値から切り替えられる', async () => {
    const u = userEvent.setup();
    render(<WeekdaySetting />);
    await u.click(await screen.findByRole('button', { name: '日' }));
    await waitFor(async () => expect((await db.settings.get(SETTINGS_ID))!.available_weekdays).toEqual([3, 5, 6]));
  });
});

describe('店', () => {
  const add = (id: string, name: string, sort_order: number) =>
    createRow('stores', { id, name, sort_order, visit_mode: 'usual', default_tax_mode: 'included' });

  it('上へ・下へで sort_order が 0 から振り直される', async () => {
    await add('a', 'A店', 0);
    await add('b', 'B店', 5);
    await add('c', 'C店', 9);
    const u = userEvent.setup();
    render(<StoreSetting />);
    await u.click(await screen.findByRole('button', { name: 'C店を上へ' }));
    await waitFor(async () => {
      const s = await db.stores.toArray();
      expect(Object.fromEntries(s.map((x) => [x.name, x.sort_order]))).toEqual({ A店: 0, C店: 1, B店: 2 });
    });
    const list = screen.getByRole('list', { name: '店の優先順' });
    await waitFor(() => expect(within(list).getAllByRole('listitem').map((li) => li.querySelector('.store-setting-name')?.textContent)).toEqual(['A店', 'C店', 'B店']));
  });

  it('店の扱いを選べる', async () => {
    await add('a', 'A店', 0);
    const u = userEvent.setup();
    render(<StoreSetting />);
    const group = await screen.findByRole('group', { name: 'A店の扱い' });
    await u.click(within(group).getByRole('button', { name: 'ふだん行かない' }));
    await waitFor(async () => expect((await db.stores.get('a'))!.visit_mode).toBe('other'));
    await waitFor(() => expect(within(group).getByRole('button', { name: 'ふだん行かない' })).toHaveAttribute('aria-pressed', 'true'));
  });
});
