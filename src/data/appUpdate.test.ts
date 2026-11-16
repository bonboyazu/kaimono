import { afterEach, expect, test, vi } from 'vitest';
import { refreshApp, setRegistration } from './appUpdate.ts';

afterEach(() => {
  setRegistration(undefined);
  vi.useRealTimers();
});

const reg = (r: object) => setRegistration(r as unknown as ServiceWorkerRegistration);

test('新しい版がなければ、データをそろえ直すだけで読み直さない', async () => {
  vi.useFakeTimers();
  const update = vi.fn().mockResolvedValue(undefined);
  reg({ update, installing: null, waiting: null });
  const reload = vi.fn();
  const sync = vi.fn().mockResolvedValue(undefined);
  const done = refreshApp(reload, sync);
  await vi.advanceTimersByTimeAsync(600);
  await done;
  expect(update).toHaveBeenCalled();
  expect(sync).toHaveBeenCalled();
  expect(reload).not.toHaveBeenCalled();
});

test('電波がなくても終わる', async () => {
  vi.useFakeTimers();
  reg({ update: vi.fn().mockRejectedValue(new Error('offline')), installing: null, waiting: null });
  const done = refreshApp(vi.fn(), vi.fn().mockRejectedValue(new Error('offline')));
  await vi.advanceTimersByTimeAsync(600);
  await expect(done).resolves.toBeUndefined();
});

test('新しい版が入ってくるときは、それを入れて読み直す', async () => {
  vi.useFakeTimers();
  reg({ update: vi.fn().mockResolvedValue(undefined), installing: {}, waiting: null });
  const reload = vi.fn();
  void refreshApp(reload, vi.fn().mockResolvedValue(undefined));
  await vi.advanceTimersByTimeAsync(600);
  expect(reload).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(3000);
  expect(reload).toHaveBeenCalledTimes(1);
});
