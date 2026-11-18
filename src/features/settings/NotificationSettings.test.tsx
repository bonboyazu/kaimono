import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import NotificationSettings, { type PushApi } from './NotificationSettings.tsx';

const ready = { standalone: true, supported: true, permission: 'granted' as NotificationPermission };

function fakeApi(o: Partial<PushApi> = {}): PushApi {
  return {
    load: vi.fn(async () => ({ enabled: true, notify_time: '08:00' })),
    subscribe: vi.fn(async () => ({ ok: true as const })),
    disable: vi.fn(async () => ({ ok: true as const })),
    setTime: vi.fn(async () => ({ ok: true as const })),
    ...o,
  };
}

test('ホーム画面から開いていないときは、追加を促し、スイッチは出さない', () => {
  render(<NotificationSettings env={{ ...ready, standalone: false }} api={fakeApi()} online />);
  expect(screen.getByText('ホーム画面に追加してから開いてください')).toBeInTheDocument();
  expect(screen.queryByRole('switch')).toBeNull();
});

test('オフのときは、スイッチだけが出て、時刻は出ない', () => {
  render(<NotificationSettings env={ready} api={fakeApi()} online initialOn={false} />);
  expect(screen.getByRole('switch', { name: '通知' })).toHaveAttribute('aria-checked', 'false');
  expect(screen.queryByRole('button', { name: '通知の時刻' })).toBeNull();
});

test('オンのときは、サーバーの時刻が出る', async () => {
  const api = fakeApi({ load: vi.fn(async () => ({ enabled: true, notify_time: '07:45' })) });
  render(<NotificationSettings env={ready} api={api} online initialOn />);
  expect(screen.getByRole('switch', { name: '通知' })).toHaveAttribute('aria-checked', 'true');
  expect(await screen.findByRole('button', { name: '通知の時刻' })).toHaveTextContent('7:45');
});

test('時刻は15分きざみで選べ、選ぶとサーバーに入る', async () => {
  const api = fakeApi();
  render(<NotificationSettings env={ready} api={api} online initialOn />);
  await userEvent.click(await screen.findByRole('button', { name: '通知の時刻' }));
  const options = screen.getAllByRole('option').map((o) => o.textContent);
  expect(options).toHaveLength(96);
  expect(options.slice(0, 3)).toEqual(['0:00', '0:15', '0:30']);
  await userEvent.click(screen.getByRole('option', { name: '6:30' }));
  expect(api.setTime).toHaveBeenCalledWith('06:30');
  expect(screen.getByRole('button', { name: '通知の時刻' })).toHaveTextContent('6:30');
});

test('サーバーで止まっていれば、オフで出す', async () => {
  const api = fakeApi({ load: vi.fn(async () => ({ enabled: false, notify_time: '08:00' })) });
  render(<NotificationSettings env={ready} api={api} online initialOn />);
  await waitFor(() => expect(screen.getByRole('switch', { name: '通知' })).toHaveAttribute('aria-checked', 'false'));
});

test('スイッチを押すと、オン・オフが切り替わる', async () => {
  const api = fakeApi();
  render(<NotificationSettings env={ready} api={api} online initialOn={false} />);
  await userEvent.click(screen.getByRole('switch', { name: '通知' }));
  expect(api.subscribe).toHaveBeenCalled();
  expect(screen.getByRole('switch', { name: '通知' })).toHaveAttribute('aria-checked', 'true');
  await userEvent.click(screen.getByRole('switch', { name: '通知' }));
  expect(api.disable).toHaveBeenCalled();
  expect(screen.getByRole('switch', { name: '通知' })).toHaveAttribute('aria-checked', 'false');
});

test('電波がないときは、変えられないことを出し、スイッチを押せない', () => {
  render(<NotificationSettings env={ready} api={fakeApi()} online={false} initialOn />);
  expect(screen.getByText('電波があるときに変更できます')).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: '通知' })).toBeDisabled();
});

test('通知の許可が切れているときは、直し方を出す', () => {
  render(<NotificationSettings env={{ ...ready, permission: 'denied' }} api={fakeApi()} online initialOn={false} />);
  expect(screen.getByText(/iPhone の設定 → 通知 → 買い物/)).toBeInTheDocument();
});
