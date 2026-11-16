import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import NotificationSettings from './NotificationSettings.tsx';

test('ホーム画面から開いていないときは、追加を促す', () => {
  render(<NotificationSettings env={{ standalone: false, supported: true }} />);
  expect(screen.getByText('ホーム画面に追加してから開いてください')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '通知を受け取る' })).toBeNull();
});

test('ホーム画面から開いているときは、ボタンが出る', () => {
  render(<NotificationSettings env={{ standalone: true, supported: true }} />);
  expect(screen.getByRole('button', { name: '通知を受け取る' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '試しの通知を送る' })).toBeInTheDocument();
});
