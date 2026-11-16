import { describe, expect, test } from 'vitest';
import { uuidv5, priceId, salePriceId, excludedDateId, storeOverrideId, presetProductId, newId } from './ids.ts';

const DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('uuidv5', () => {
  test('RFC の例と一致する', async () => {
    expect(await uuidv5('www.example.com', DNS)).toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2');
  });
  test('同じ入力で同じ id', async () => {
    expect(await uuidv5('abc')).toBe(await uuidv5('abc'));
    expect(await uuidv5('abc')).not.toBe(await uuidv5('abd'));
  });
});

describe('id の決め方', () => {
  test('店 × 商品・曜日・日付・店の切り替え・最初の商品', async () => {
    expect(await priceId('s', 'p')).toBe(await uuidv5('s:p'));
    expect(await salePriceId('s', 'p', 2)).toBe(await uuidv5('s:p:2'));
    expect(await excludedDateId('2026-11-18')).toBe(await uuidv5('date:2026-11-18'));
    expect(await storeOverrideId('s')).toBe(await uuidv5('override:s'));
    expect(await presetProductId('牛乳')).toBe(await uuidv5('preset:牛乳'));
  });
  test('newId は毎回違う uuid', () => {
    expect(newId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(newId()).not.toBe(newId());
  });
});
