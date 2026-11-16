import { expect, test } from 'vitest';
import { toTaxIncluded } from './tax.ts';

test('税抜から税込（1円未満は切り捨て）', () => {
  expect(toTaxIncluded(180, 'excluded', 8)).toBe(194);
  expect(toTaxIncluded(98, 'excluded', 8)).toBe(105);
  expect(toTaxIncluded(198, 'excluded', 10)).toBe(217);
});
test('税込はそのまま', () => {
  expect(toTaxIncluded(198, 'included', 8)).toBe(198);
});
