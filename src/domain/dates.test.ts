import { expect, test } from 'vitest';
import { jstDate, jstTime, weekdayOf, addDays } from './dates.ts';

test('jstDate は日本時間の日付', () => {
  expect(jstDate(new Date('2026-11-14T15:00:00Z'))).toBe('2026-11-15');
  expect(jstDate(new Date('2026-11-14T14:59:59Z'))).toBe('2026-11-14');
});
test('jstTime は日本時間の HH:MM', () => {
  expect(jstTime(new Date('2026-11-14T23:05:00Z'))).toBe('08:05');
});
test('weekdayOf は 0=日', () => {
  expect(weekdayOf('2026-11-15')).toBe(0);
  expect(weekdayOf('2026-11-18')).toBe(3);
});
test('addDays は月をまたぐ', () => {
  expect(addDays('2026-11-28', 6)).toBe('2026-12-04');
  expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
});
