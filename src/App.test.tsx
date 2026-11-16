import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import App from './App.tsx';
import type { AuthApi, AuthUser } from './data/auth.ts';

function fakeAuth(user: AuthUser | null, password = 'ok'): AuthApi {
  let current = user;
  const listeners = new Set<(u: AuthUser | null) => void>();
  return {
    async initialUser() {
      return current;
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    async signIn(email, pw) {
      if (pw !== password) return { ok: false };
      current = { id: 'u1', email };
      listeners.forEach((fn) => fn(current));
      return { ok: true };
    },
    async signOut() {
      current = null;
      listeners.forEach((fn) => fn(null));
    },
  };
}

describe('ログイン', () => {
  test('未ログインならログインの画面', async () => {
    render(<App auth={fakeAuth(null)} withSync={false} />);
    expect(await screen.findByRole('button', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  test('ログイン済みならメニューと歯車が出る', async () => {
    render(<App auth={fakeAuth({ id: 'u1', email: 'a@example.com' })} withSync={false} />);
    const nav = await screen.findByRole('navigation');
    expect(nav).toHaveTextContent('リスト');
    expect(nav).toHaveTextContent('ダッシュボード');
    expect(nav).toHaveTextContent('データ');
    expect(await screen.findByRole('link', { name: '設定' })).toBeInTheDocument();
  });

  test('パスワードが違うと知らせる。正しければ入れる', async () => {
    const user = userEvent.setup();
    render(<App auth={fakeAuth(null)} withSync={false} />);
    await user.type(await screen.findByLabelText('メールアドレス'), 'a@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'ng');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));
    expect(await screen.findByText('メールアドレスかパスワードが違います')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('パスワード'));
    await user.type(screen.getByLabelText('パスワード'), 'ok');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));
    expect(await screen.findByRole('navigation')).toBeInTheDocument();
  });
});

describe('画面の枠', () => {
  test('タブを押すと画面が切り替わる', async () => {
    const user = userEvent.setup();
    window.location.hash = '';
    render(<App auth={fakeAuth({ id: 'u1', email: 'a@example.com' })} withSync={false} />);
    expect(await screen.findByRole('heading', { name: 'リスト' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'データ' }));
    expect(await screen.findByRole('heading', { name: 'データ' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/data');
    await user.click(screen.getByRole('link', { name: 'ダッシュボード' }));
    expect(await screen.findByRole('heading', { name: 'ダッシュボード' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '設定' }));
    expect(await screen.findByRole('heading', { name: '設定' })).toBeInTheDocument();
  });
});
