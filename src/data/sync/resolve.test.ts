import { expect, test } from 'vitest';
import { resolvePatch } from './resolve.ts';

test('サーバーより新しい操作の列だけ通る', () => {
  const r = resolvePatch(
    { memo: '2026-11-15T10:01:00Z', amount: '2026-11-15T10:03:00Z' },
    { checked_at: 'x', memo: 'm', amount: 188 },
    '2026-11-15T10:02:00Z',
  );
  expect(r.accepted).toEqual({ checked_at: 'x', memo: 'm' });
  expect(r.fieldTimes).toEqual({
    checked_at: '2026-11-15T10:02:00Z',
    memo: '2026-11-15T10:02:00Z',
    amount: '2026-11-15T10:03:00Z',
  });
});

test('同じ時刻なら通す', () => {
  const r = resolvePatch({ memo: '2026-11-15T10:00:00Z' }, { memo: 'a' }, '2026-11-15T10:00:00Z');
  expect(r.accepted).toEqual({ memo: 'a' });
});
