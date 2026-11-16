import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../data/db.ts';
import { addProduct, addStore, savePrice } from './actions.ts';
import DataPage from './DataPage.tsx';

let storeId = '';
beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  storeId = await addStore('A店');
  await addProduct({ name: '卵', unit: 'piece', tax_rate: 8 });
  await addProduct({ name: '牛こま', unit: '100g', tax_rate: 8 });
  await addProduct({ name: '牛乳', unit: 'piece', tax_rate: 8 });
});

/** セレクトボックスの代わりの部品で選ぶ。店は読み込みを待つ */
async function pick(user: ReturnType<typeof userEvent.setup>, button: HTMLElement, name: string) {
  await user.click(button);
  await user.click(await screen.findByRole('option', { name }));
}

const renderPage = () => render(<MemoryRouter><DataPage /></MemoryRouter>);

describe('データ一覧', () => {
  it('税抜で入れると、横に税込が出て、一覧は税込で出る', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '足す' }));
    await user.click(screen.getByRole('button', { name: '値段' }));
    const dialog = screen.getByRole('dialog');
    await pick(user, within(dialog).getByRole('button', { name: '店' }), 'A店');
    await user.type(within(dialog).getByLabelText('商品'), 'こま');
    const candidates = within(dialog).getByRole('list', { name: '商品の候補' });
    expect(within(candidates).queryByRole('button', { name: '卵' })).toBeNull();
    await user.click(within(candidates).getByRole('button', { name: '牛こま' }));
    await user.type(await within(dialog).findByLabelText('通常の値段'), '180');
    await user.click(within(dialog).getByRole('button', { name: '税抜' }));
    expect(within(dialog).getByText('→ 税込 194円')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '保存' }));
    expect(await screen.findByText('194円/100g')).toBeInTheDocument();
    expect((await db.stores.get(storeId))!.default_tax_mode).toBe('excluded');
  });

  it('通常の値段がないと、曜日セールは足せない', async () => {
    const user = userEvent.setup();
    renderPage();
    await pick(user, screen.getByRole('button', { name: '店で絞り込む' }), 'A店');
    await user.click(await screen.findByRole('button', { name: /^卵/ }));
    const dialog = screen.getByRole('dialog');
    const addSale = await within(dialog).findByRole('button', { name: '曜日セールを足す' });
    expect(addSale).toBeDisabled();
    await user.type(within(dialog).getByLabelText('通常の値段'), '248');
    expect(addSale).toBeEnabled();
    await user.click(addSale);
    await user.type(within(dialog).getByLabelText('火曜のセールの値段'), '98');
    await user.click(within(dialog).getByRole('button', { name: '保存' }));
    await waitFor(async () => expect(await db.sale_prices.count()).toBe(1));
  });

  it('店で絞り込むと値段のない商品も並び、確定で保存して次の欄に移る', async () => {
    const user = userEvent.setup();
    renderPage();
    await pick(user, screen.getByRole('button', { name: '店で絞り込む' }), 'A店');
    const first = await screen.findByLabelText('卵の値段');
    expect(screen.getByLabelText('牛こまの値段')).toBeInTheDocument();
    expect(screen.getByLabelText('牛乳の値段')).toBeInTheDocument();
    // 並びは名前の順：卵 → 牛こま → 牛乳（localeCompare）。最初の欄から順に打つ
    const inputs = screen.getAllByLabelText(/の値段$/);
    await user.click(inputs[0]);
    await user.keyboard('198{Enter}');
    expect(inputs[1]).toHaveFocus();
    await user.keyboard('298{Enter}');
    expect(inputs[2]).toHaveFocus();
    await waitFor(async () => expect(await db.prices.count()).toBe(2));
    expect(first).toBeInTheDocument();
  });

  it('「＋」から店と商品を足せる', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '足す' }));
    await user.click(screen.getByRole('button', { name: '店' }));
    await user.type(screen.getByLabelText('名前'), 'B店');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(async () => expect((await db.stores.toArray()).map((s) => s.name)).toContain('B店'));
    await user.click(screen.getByRole('button', { name: '店で絞り込む' }));
    expect(await screen.findByRole('option', { name: 'B店' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '店で絞り込む' }));
    await user.click(screen.getByRole('button', { name: '足す' }));
    await user.click(screen.getByRole('button', { name: '商品' }));
    await user.type(screen.getByLabelText('名前'), 'ちくわ');
    await user.click(screen.getByLabelText('100gあたり'));
    await user.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(async () => expect((await db.products.toArray()).find((p) => p.name === 'ちくわ')?.unit).toBe('100g'));
  });

  it('商品を足すとき、似た商品が出る', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '足す' }));
    await user.click(screen.getByRole('button', { name: '商品' }));
    await user.type(screen.getByLabelText('名前'), '低脂肪牛乳');
    const note = await screen.findByRole('note', { name: '似た商品' });
    expect(note).toHaveTextContent('牛乳');
    expect(note).not.toHaveTextContent('卵');
  });

  it('同じ名前の商品は足せない', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '足す' }));
    await user.click(screen.getByRole('button', { name: '商品' }));
    await user.type(screen.getByLabelText('名前'), ' 卵 ');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByText('「卵」はもうあります')).toBeInTheDocument();
  });

  it('消した店の値段は一覧に出ない', async () => {
    const store = (await db.stores.get(storeId))!;
    const egg = (await db.products.toArray()).find((p) => p.name === '卵')!;
    await savePrice(store, egg, 198, 'included');
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('198円')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^卵/ }));
    await user.click(await screen.findByRole('button', { name: '店を編集' }));
    const ok = window.confirm;
    window.confirm = () => true;
    await user.click(await screen.findByRole('button', { name: 'この店を消す' }));
    window.confirm = ok;
    await waitFor(() => expect(screen.queryByText('198円')).toBeNull());
  });
});
