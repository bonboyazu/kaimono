import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthContext, type AuthApi } from '../../data/auth.ts';
import { db } from '../../data/db.ts';
import { createRow } from '../../data/sync/mutate.ts';
import { addProduct } from '../data/actions.ts';
import { addToList } from './actions.ts';
import ListPage from './ListPage.tsx';

const user = { id: '11111111-1111-4111-8111-111111111111', email: 'a@example.com' };
let ids: Record<string, string> = {};

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  ids = {};
  for (const name of ['牛乳', '卵', 'キャベツ']) {
    const id = crypto.randomUUID();
    await createRow('products', { id, name, unit: 'piece', tax_rate: 8, is_preset: true });
    ids[name] = id;
  }
});

const renderPage = (path = '/list') =>
  render(
    <AuthContext.Provider value={{ user, auth: {} as AuthApi }}>
      <MemoryRouter initialEntries={[path]}><ListPage /></MemoryRouter>
    </AuthContext.Provider>,
  );

describe('リスト', () => {
  it('チェックすると「買ったもの」に移り、押すと戻る', async () => {
    await addToList(ids['牛乳'], user.id);
    const u = userEvent.setup();
    renderPage();
    await u.click(await screen.findByRole('button', { name: '牛乳をチェック' }));
    const bought = await screen.findByRole('list', { name: '買ったもの' });
    expect(within(bought).getByText('牛乳')).toBeInTheDocument();
    const item = (await db.list_items.toArray())[0];
    expect(item.checked_by).toBe(user.id);
    expect(item.bought_store_id).toBeNull();
    await u.click(screen.getByRole('button', { name: '牛乳を戻す' }));
    await waitFor(() => expect(screen.queryByRole('list', { name: '買ったもの' })).toBeNull());
    expect((await db.list_items.toArray())[0]).toMatchObject({ checked_at: null, checked_by: null });
  });

  it('右にずらして「メモ」を押すと、メモを書いて保存できる', async () => {
    await addToList(ids['卵'], user.id);
    const u = userEvent.setup();
    renderPage();
    await u.click(await screen.findByRole('button', { name: '卵のメモを書く' }));
    await u.type(screen.getByLabelText('卵のメモ'), '10個入り{Enter}');
    await waitFor(async () => expect((await db.list_items.toArray())[0].memo).toBe('10個入り'));
    expect(await screen.findByText('10個入り')).toBeInTheDocument();
  });

  it('左にずらして「外す」で、リストから外せる', async () => {
    await addToList(ids['卵'], user.id);
    const u = userEvent.setup();
    renderPage();
    await u.click(await screen.findByRole('button', { name: '卵をリストから外す' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '卵をチェック' })).toBeNull());
  });

  it('同じ商品が2つあると、新しいほうを片付ける', async () => {
    const base = { memo: '', added_by: user.id, checked_at: null, checked_by: null, bought_store_id: null, forced_store_id: null };
    await createRow('list_items', { ...base, id: crypto.randomUUID(), product_id: ids['牛乳'], added_at: '2026-11-16T00:00:00Z' });
    await createRow('list_items', { ...base, id: crypto.randomUUID(), product_id: ids['牛乳'], added_at: '2026-11-16T00:01:00Z' });
    renderPage();
    await waitFor(async () => expect((await db.list_items.toArray()).filter((i) => !i.deleted_at)).toHaveLength(1), { timeout: 3000 });
    await waitFor(() => expect(screen.getAllByRole('button', { name: '牛乳をチェック' })).toHaveLength(1), { timeout: 3000 });
  });
});

describe('買うものを追加', () => {
  it('検索欄を押すと候補が出て、押すと入り、もう一度押すと外れる。同じ商品は2つ入らない', async () => {
    const u = userEvent.setup();
    renderPage();
    await u.click(await screen.findByRole('button', { name: /買うものを追加/ }));
    const list = await screen.findByRole('list', { name: '候補' });
    const egg = await within(list).findByRole('button', { name: '卵' });
    await u.click(egg);
    await waitFor(async () => expect(await db.list_items.count()).toBe(1));
    expect(await within(list).findByRole('button', { name: /卵.*リストにあり/ })).toHaveAttribute('aria-pressed', 'true');
    await u.click(within(list).getByRole('button', { name: /卵/ }));
    await waitFor(async () => expect((await db.list_items.toArray()).filter((i) => !i.deleted_at)).toHaveLength(0));
    await u.click(within(list).getByRole('button', { name: /卵/ }));
    await addToList(ids['卵'], user.id); // 2つ目は入らない
    await waitFor(async () => expect((await db.list_items.toArray()).filter((i) => !i.deleted_at)).toHaveLength(1));
  });

  it('文字で絞り込める。ひらがなでカタカナも当たる', async () => {
    const u = userEvent.setup();
    renderPage();
    await u.click(await screen.findByRole('button', { name: /買うものを追加/ }));
    await u.type(screen.getByLabelText('商品を探す'), 'きゃべ');
    const list = screen.getByRole('list', { name: '候補' });
    expect(await within(list).findByRole('button', { name: 'キャベツ' })).toBeInTheDocument();
    expect(within(list).queryByRole('button', { name: '卵' })).toBeNull();
  });

  it('探して足すと、検索が空になり、足したことが出る', async () => {
    const u = userEvent.setup();
    renderPage();
    await u.click(await screen.findByRole('button', { name: /買うものを追加/ }));
    await u.type(screen.getByLabelText('商品を探す'), 'きゃべ');
    await u.click(await within(screen.getByRole('list', { name: '候補' })).findByRole('button', { name: 'キャベツ' }));
    expect(await screen.findByText('「キャベツ」をリストに入れました')).toBeInTheDocument();
    expect(screen.getByLabelText('商品を探す')).toHaveValue('');
  });

  it('ない商品はその場で足せる（1つあたり・食品）', async () => {
    const u = userEvent.setup();
    renderPage();
    await u.click(await screen.findByRole('button', { name: /買うものを追加/ }));
    await u.type(screen.getByLabelText('商品を探す'), 'ちくわ');
    await u.click(await screen.findByRole('button', { name: '“ちくわ”を追加' }));
    await waitFor(async () => expect(await db.list_items.count()).toBe(1));
    const p = (await db.products.toArray()).find((x) => x.name === 'ちくわ')!;
    expect(p).toMatchObject({ unit: 'piece', tax_rate: 8, is_preset: false });
    expect((await db.list_items.toArray())[0]).toMatchObject({ product_id: p.id, added_by: user.id });
  });

  it('「肉」で名前を組み立てて足すと、100gあたりの商品としてリストに入る', async () => {
    const u = userEvent.setup();
    renderPage();
    await u.click(await screen.findByRole('button', { name: /買うものを追加/ }));
    await u.click(screen.getByRole('button', { name: '肉の名前を組み立てる' }));
    await u.click(screen.getByRole('button', { name: 'ひき肉' }));
    await u.click(screen.getByRole('button', { name: '合いびき' }));
    expect(screen.getByLabelText('商品を探す')).toHaveValue('合いびき肉');
    await u.click(await screen.findByRole('button', { name: '“合いびき肉”を追加' }));
    await waitFor(async () => expect(await db.list_items.count()).toBe(1));
    expect((await db.products.toArray()).find((x) => x.name === '合いびき肉')).toMatchObject({ unit: '100g' });
  });

  it('買った記録があれば、よく買う順に出る', async () => {
    await addProduct({ name: 'あめ', unit: 'piece', tax_rate: 8 });
    const base = { memo: '', added_by: user.id, checked_by: user.id, bought_store_id: null, forced_store_id: null, added_at: '2026-11-01T00:00:00Z' };
    for (const [n, k] of [['卵', 2], ['キャベツ', 1]] as const)
      for (let i = 0; i < k; i++) await createRow('list_items', { ...base, id: crypto.randomUUID(), product_id: ids[n], checked_at: '2026-11-01T01:00:00Z' });
    const u = userEvent.setup();
    renderPage();
    await u.click(await screen.findByRole('button', { name: /買うものを追加/ }));
    const list = await screen.findByRole('list', { name: '候補' });
    await waitFor(() => expect(within(list).getAllByRole('button').map((b) => b.textContent)).toEqual(['卵', 'キャベツ']));
  });
});
