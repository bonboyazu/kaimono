import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import NotificationSettings from './NotificationSettings.tsx';

test('ホーム画面から開いていないときは、追加を促し、スイッチは出さない', () => {
  render(<NotificationSettings env={{ standalone: false, supported: true }} />);
  expect(screen.getByText('ホーム画面に追加してから開いてください')).toBeInTheDocument();
  expect(screen.queryByRole('switch')).toBeNull();
});

test('見出しの横にスイッチだけが出る', () => {
  render(<NotificationSettings env={{ standalone: true, supported: true }} initialOn={false} />);
  expect(screen.getByRole('switch', { name: '通知' })).toHaveAttribute('aria-checked', 'false');
  expect(screen.queryAllByRole('button')).toHaveLength(1);
});

test('オンのときは、スイッチがオンで出る', () => {
  render(<NotificationSettings env={{ standalone: true, supported: true }} initialOn />);
  expect(screen.getByRole('switch', { name: '通知' })).toHaveAttribute('aria-checked', 'true');
});
