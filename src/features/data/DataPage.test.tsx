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
    expect((await db.stores.get(storeId))!.default_tax_mode).toBe('included');
  });

  it('店を税抜にすると、新しく入れる値段の初期値が税抜になる', async () => {
    const store = (await db.stores.get(storeId))!;
    const egg = (await db.products.toArray()).find((p) => p.name === '卵')!;
    await savePrice(store, egg, 198, 'included');
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /^卵/ }));
    await user.click(await screen.findByRole('button', { name: '店を編集' }));
    const sheet = await screen.findByRole('dialog', { name: '店を編集' });
    const tax = within(sheet).getByRole('group', { name: '値段の書き方' });
    expect(within(tax).getByRole('button', { name: '税込' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(tax).getByRole('button', { name: '税抜' }));
    await user.click(within(sheet).getByRole('button', { name: '保存' }));
    await waitFor(async () => expect((await db.stores.get(storeId))!.default_tax_mode).toBe('excluded'));
    // 前に入れた卵は税込のまま
    expect((await db.prices.toArray())[0].tax_mode).toBe('included');
  });

  it('税抜の店で値段を足すと、最初から税抜が選ばれている', async () => {
    await db.stores.update(storeId, { default_tax_mode: 'excluded' });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '足す' }));
    await user.click(screen.getByRole('button', { name: '値段' }));
    const dialog = screen.getByRole('dialog');
    await pick(user, within(dialog).getByRole('button', { name: '店' }), 'A店');
    await user.type(within(dialog).getByLabelText('商品'), '牛乳');
    await user.click(within(within(dialog).getByRole('list', { name: '商品の候補' })).getByRole('button', { name: '牛乳' }));
    await within(dialog).findByLabelText('通常の値段');
    expect(within(dialog).getByRole('button', { name: '税抜' })).toHaveAttribute('aria-pressed', 'true');
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

  it('値段を入れない商品は、すべての店で横線の1行。押すと商品の編集が開き、単位を戻せる', async () => {
    await addProduct({ name: 'キャベツ', unit: 'none', tax_rate: 8 });
    const user = userEvent.setup();
    renderPage();
    const row = await screen.findByRole('button', { name: 'キャベツ' });
    expect(row.closest('li')).toHaveTextContent('—');
    await user.click(row);
    const sheet = await screen.findByRole('dialog', { name: '商品を編集' });
    expect(within(sheet).getByRole('radio', { name: '値段を入れない' })).toBeChecked();
    await user.click(within(sheet).getByRole('radio', { name: '1つあたり' }));
    await user.click(within(sheet).getByRole('button', { name: '保存' }));
    await waitFor(async () => expect((await db.products.toArray()).find((p) => p.name === 'キャベツ')!.unit).toBe('piece'));
  });

  it('値段を入れない商品は、店で絞り込んだ一覧と、値段を足すときの商品の候補に出ない', async () => {
    await addProduct({ name: 'キャベツ', unit: 'none', tax_rate: 8 });
    const user = userEvent.setup();
    renderPage();
    await pick(user, screen.getByRole('button', { name: '店で絞り込む' }), 'A店');
    expect(await screen.findByRole('button', { name: /^卵/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /キャベツ/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: '足す' }));
    await user.click(screen.getByRole('button', { name: '値段' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('商品'), 'キャ');
    expect(within(dialog).queryByRole('button', { name: 'キャベツ' })).toBeNull();
  });

  it('値段を足すとき、ない商品はその場で足して、そのまま値段を入れられる', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '足す' }));
    await user.click(screen.getByRole('button', { name: '値段' }));
    const dialog = screen.getByRole('dialog');
    await pick(user, within(dialog).getByRole('button', { name: '店' }), 'A店');
    await user.type(within(dialog).getByLabelText('商品'), '豆板醤');
    await user.click(within(dialog).getByRole('button', { name: '“豆板醤”を足す' }));
    await user.type(await within(dialog).findByLabelText('通常の値段'), '298');
    await user.click(within(dialog).getByRole('button', { name: '保存' }));
    expect(await screen.findByText('298円')).toBeInTheDocument();
    const made = (await db.products.toArray()).find((p) => p.name === '豆板醤')!;
    expect(made).toMatchObject({ unit: 'piece', tax_rate: 8 });
  });

  it('値段を足すとき、「肉」で名前を組み立てると、100gあたりの商品として足せる', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '足す' }));
    await user.click(screen.getByRole('button', { name: '値段' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: '肉の名前を組み立てる' }));
    await user.click(within(within(dialog).getByRole('group', { name: '種類' })).getByRole('button', { name: '豚' }));
    await user.click(within(within(dialog).getByRole('group', { name: '部位' })).getByRole('button', { name: 'バラ' }));
    await user.click(within(within(dialog).getByRole('group', { name: 'カット' })).getByRole('button', { name: '薄切り' }));
    expect(within(dialog).getByLabelText('商品')).toHaveValue('豚バラ薄切り');
    expect(within(dialog).queryByRole('group', { name: '種類' })).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: '“豚バラ薄切り”を足す' }));
    await waitFor(async () => expect((await db.products.toArray()).find((p) => p.name === '豚バラ薄切り')?.unit).toBe('100g'));
  });

  it('「肉」で組み立てた名前が今ある商品なら、候補に出て、足すボタンは出ない', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '足す' }));
    await user.click(screen.getByRole('button', { name: '値段' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: '肉の名前を組み立てる' }));
    await user.click(within(dialog).getByRole('button', { name: '牛' }));
    await user.click(within(dialog).getByRole('button', { name: 'こま' }));
    const candidates = within(dialog).getByRole('list', { name: '商品の候補' });
    expect(within(candidates).getByRole('button', { name: '牛こま' })).toBeInTheDocument();
    expect(within(candidates).queryByRole('button', { name: /を足す/ })).toBeNull();
  });

  it('商品を足すとき、「肉」で名前を入れると、単位が100gあたりになる', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '足す' }));
    await user.click(screen.getByRole('button', { name: '商品' }));
    const sheet = screen.getByRole('dialog', { name: '商品を足す' });
    await user.click(within(sheet).getByRole('button', { name: '肉の名前を組み立てる' }));
    await user.click(within(sheet).getByRole('button', { name: '鶏' }));
    await user.click(within(sheet).getByRole('button', { name: '手羽元' }));
    expect(within(sheet).getByLabelText('名前')).toHaveValue('手羽元');
    expect(within(sheet).getByRole('radio', { name: '100gあたり' })).toBeChecked();
  });

  it('店で絞り込んで名前を打ち、ない商品は一覧の「足す」で足すと、その行の値段の欄に移る', async () => {
    const user = userEvent.setup();
    renderPage();
    await pick(user, screen.getByRole('button', { name: '店で絞り込む' }), 'A店');
    await user.type(screen.getByLabelText('商品名で絞り込む'), '豆板醤');
    expect(screen.queryByText('当てはまる商品がありません')).toBeNull();
    await user.click(screen.getByRole('button', { name: '“豆板醤”を足す' }));
    const input = await screen.findByLabelText('豆板醤の値段');
    await waitFor(() => expect(input).toHaveFocus());
    await user.type(input, '298{Enter}');
    await waitFor(async () => expect((await db.prices.toArray()).map((p) => p.amount)).toEqual([298]));
  });

  it('一覧の名前の欄で肉を組み立てると、ある商品はそのまま値段の欄が出る', async () => {
    const user = userEvent.setup();
    renderPage();
    await pick(user, screen.getByRole('button', { name: '店で絞り込む' }), 'A店');
    await user.click(screen.getByRole('button', { name: '肉の名前を組み立てる' }));
    await user.click(screen.getByRole('button', { name: '牛' }));
    expect(screen.getByLabelText('商品名で絞り込む')).toHaveValue('牛');
    await user.click(screen.getByRole('button', { name: 'こま' }));
    expect(screen.getByLabelText('商品名で絞り込む')).toHaveValue('牛こま');
    expect(await screen.findByLabelText('牛こまの値段')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /を足す/ })).toBeNull();
  });

  it('肉は1段ずつ進み、上の印を押すと前の段に戻れる', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: '肉の名前を組み立てる' }));
    await user.click(screen.getByRole('button', { name: '豚' }));
    await user.click(screen.getByRole('button', { name: 'バラ' }));
    expect(screen.getByRole('group', { name: 'カット' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '部位' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '種類を選び直す（豚）' }));
    expect(screen.getByRole('group', { name: '種類' })).toBeInTheDocument();
    expect(screen.getByLabelText('商品名で絞り込む')).toHaveValue('');
    await user.click(screen.getByRole('button', { name: '鶏' }));
    await user.click(screen.getByRole('button', { name: 'もも' }));
    await user.click(screen.getByRole('button', { name: '角切り' }));
    expect(screen.getByLabelText('商品名で絞り込む')).toHaveValue('鶏もも角切り');
    expect(screen.getByRole('button', { name: '“鶏もも角切り”を足す' })).toBeInTheDocument();
  });

  it('肉は押すたびに欄へ名前が入り、カットを選ばずにやめてもよい。ひき肉は種類の段から選ぶ', async () => {
    const user = userEvent.setup();
    renderPage();
    await pick(user, screen.getByRole('button', { name: '店で絞り込む' }), 'A店');
    const field = screen.getByLabelText('商品名で絞り込む');
    await user.click(screen.getByRole('button', { name: '肉の名前を組み立てる' }));
    expect(screen.getByRole('button', { name: '肉の名前を組み立てる' })).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: '豚' }));
    expect(field).toHaveValue('豚');
    await user.click(screen.getByRole('button', { name: 'バラ' }));
    expect(field).toHaveValue('豚バラ');
    expect(screen.getByRole('button', { name: '“豚バラ”を足す' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '肉の名前を組み立てる' }));
    expect(screen.queryByRole('group', { name: 'カット' })).toBeNull();
    expect(field).toHaveValue('豚バラ');
    await user.click(screen.getByRole('button', { name: '肉の名前を組み立てる' }));
    await user.click(screen.getByRole('button', { name: 'ひき肉' }));
    expect(screen.getByRole('group', { name: '部位' })).toHaveTextContent('牛豚鶏合いびき');
    await user.click(screen.getByRole('button', { name: '合いびき' }));
    expect(field).toHaveValue('合いびき肉');
  });

  it('欄に文字があると × が出て、押すと空になる', async () => {
    const user = userEvent.setup();
    renderPage();
    const field = await screen.findByLabelText('商品名で絞り込む');
    expect(screen.queryByRole('button', { name: '欄を空にする' })).toBeNull();
    await user.type(field, '牛乳');
    await user.click(screen.getByRole('button', { name: '欄を空にする' }));
    expect(field).toHaveValue('');
    expect(field).toHaveFocus();
  });
});
