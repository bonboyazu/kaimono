import { describe, expect, it } from 'vitest';
import { PRESET_PRODUCTS } from './presets.ts';
import { presetProductsSql } from './presetsSql.ts';
import { presetProductId } from './ids.ts';

describe('最初から入っている商品', () => {
  it('名前が重ならず、100個ほどある', () => {
    const names = PRESET_PRODUCTS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThanOrEqual(100);
  });

  it('単位と税率の指定どおり', () => {
    const by = (n: string) => PRESET_PRODUCTS.find((p) => p.name === n)!;
    expect(by('牛乳')).toEqual({ name: '牛乳', unit: 'piece', tax_rate: 8 });
    expect(by('牛こま').unit).toBe('100g');
    expect(by('ビール').tax_rate).toBe(10);
    expect(by('電池').tax_rate).toBe(10);
  });

  it('SQL は ids.ts の id を使い、何度流しても増えない', async () => {
    const sql = await presetProductsSql();
    expect(sql).toContain(`('${await presetProductId('牛乳')}', '牛乳', 'piece', 8, true)`);
    expect(sql).toContain('on conflict (id) do nothing');
    expect(sql.match(/, true\)/g)?.length).toBe(PRESET_PRODUCTS.length);
  });
});
