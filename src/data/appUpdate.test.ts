import { afterEach, expect, test, vi } from 'vitest';
import { refreshApp, setRegistration } from './appUpdate.ts';

afterEach(() => setRegistration(undefined));

test('新しい版がなければ、すぐ読み直す', async () => {
  const update = vi.fn().mockResolvedValue(undefined);
  setRegistration({ update, installing: null, waiting: null } as unknown as ServiceWorkerRegistration);
  const reload = vi.fn();
  await refreshApp(reload);
  expect(update).toHaveBeenCalled();
  expect(reload).toHaveBeenCalledTimes(1);
});

test('電波がなくても読み直す', async () => {
  setRegistration({ update: vi.fn().mockRejectedValue(new Error('offline')), installing: null, waiting: null } as unknown as ServiceWorkerRegistration);
  const reload = vi.fn();
  await refreshApp(reload);
  expect(reload).toHaveBeenCalledTimes(1);
});

test('新しい版が入ってくるときは、それを待って読み直す', async () => {
  vi.useFakeTimers();
  setRegistration({ update: vi.fn().mockResolvedValue(undefined), installing: {}, waiting: null } as unknown as ServiceWorkerRegistration);
  const reload = vi.fn();
  await refreshApp(reload);
  expect(reload).not.toHaveBeenCalled();
  vi.advanceTimersByTime(3000);
  expect(reload).toHaveBeenCalledTimes(1);
  vi.useRealTimers();
});
