import { describe, expect, it } from 'vitest';
import { comparable, decimal1, isSizeUnit, sizeText, sizeUnitOf } from './size.ts';

describe('量あたり', () => {
  it('量あたりの単位だけ、量の単位と比べる量を返す', () => {
    expect(sizeUnitOf('size_g')).toEqual({ label: 'g', base: 100, per: '100g' });
    expect(sizeUnitOf('size_ml')).toEqual({ label: 'ml', base: 100, per: '100ml' });
    expect(sizeUnitOf('size_count')).toEqual({ label: '個', base: 1, per: '個' });
    expect(sizeUnitOf('piece')).toBeNull();
    expect(sizeUnitOf('100g')).toBeNull();
    expect(isSizeUnit('size_g')).toBe(true);
    expect(isSizeUnit('none')).toBe(false);
  });

  it('比べる値段：量あたりは 100g（個は1個）あたりに直す。ほかはそのまま', () => {
    expect(comparable(100, 100, 'size_g')).toBe(100);
    expect(comparable(150, 180, 'size_g')).toBeCloseTo(83.333, 2);
    expect(comparable(298, 10, 'size_count')).toBeCloseTo(29.8, 5);
    expect(comparable(198, null, 'piece')).toBe(198);
  });

  it('量のない値段は比べない', () => {
    expect(comparable(150, null, 'size_g')).toBeNull();
    expect(comparable(150, undefined, 'size_ml')).toBeNull();
    expect(comparable(150, 0, 'size_g')).toBeNull();
  });

  it('小数は1けたまで。整数なら小数を付けない', () => {
    expect(decimal1(150 / 180 * 100)).toBe('83.3');
    expect(decimal1(100)).toBe('100');
    expect(decimal1(99.96)).toBe('100');
  });

  it('量の書き方', () => {
    expect(sizeText(180, 'size_g')).toBe('180g');
    expect(sizeText(10, 'size_count')).toBe('10個');
    expect(sizeText(null, 'size_ml')).toBe('');
  });
});
