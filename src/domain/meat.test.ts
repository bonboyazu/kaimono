import { describe, expect, it } from 'vitest';
import { isMeatName, MEAT_CUTS, MEAT_KINDS, meatName, meatParts, needsCut } from './meat.ts';

describe('meatName', () => {
  it('押したところまでの名前：種類 → 種類＋部位 → 種類＋部位＋カット', () => {
    expect(meatName('豚')).toBe('豚');
    expect(meatName('豚', 'バラ')).toBe('豚バラ');
    expect(meatName('豚', 'バラ', '薄切り')).toBe('豚バラ薄切り');
    expect(meatName('牛', 'ロース', 'かたまり')).toBe('牛ロースかたまり');
  });
  it('ひき肉：牛・豚・鶏は「〇ひき肉」、合いびきは「合いびき肉」', () => {
    expect(meatName('ひき肉')).toBe('ひき肉');
    expect(meatName('ひき肉', '鶏')).toBe('鶏ひき肉');
    expect(meatName('ひき肉', '豚')).toBe('豚ひき肉');
    expect(meatName('ひき肉', '合いびき')).toBe('合いびき肉');
  });
  it('こまはカットを付けない', () => {
    expect(meatName('牛', 'こま', '薄切り')).toBe('牛こま');
  });
  it('手羽元・手羽先は「鶏」を付けない', () => {
    expect(meatName('鶏', '手羽元')).toBe('手羽元');
    expect(meatName('鶏', '手羽先', '角切り')).toBe('手羽先角切り');
  });
});

describe('選べるもの', () => {
  it('種類は牛・豚・鶏・ひき肉。ひき肉の中に合いびき。ほかの部位にひき肉はない', () => {
    expect(MEAT_KINDS).toEqual(['牛', '豚', '鶏', 'ひき肉']);
    expect(meatParts('ひき肉')).toEqual(['牛', '豚', '鶏', '合いびき']);
    for (const k of ['牛', '豚', '鶏'] as const) expect(meatParts(k)).not.toContain('ひき肉');
  });
  it('カットは5つ。「そのまま」と「〜用」はない', () => {
    expect(MEAT_CUTS).toEqual(['かたまり', '薄切り', '切り落とし', '厚切り', '角切り']);
  });
  it('カットの段は、こま・ひき肉では出さない', () => {
    expect(needsCut('豚', 'バラ')).toBe(true);
    expect(needsCut('豚', 'こま')).toBe(false);
    expect(needsCut('ひき肉', '鶏')).toBe(false);
  });
});

describe('isMeatName', () => {
  it('組み立てでできる名前なら true（今ある肉の商品も含む）', () => {
    for (const n of ['豚バラ薄切り', '牛こま', '豚バラ', '牛ロースかたまり', '鶏ささみ', '手羽元', '合いびき肉', '豚ひき肉', '鶏もも'])
      expect(isMeatName(n), n).toBe(true);
  });
  it('前後の空白は無視する。種類だけ・肉でない名前は false', () => {
    expect(isMeatName(' 豚バラ薄切り ')).toBe(true);
    expect(isMeatName('キャベツ')).toBe(false);
    expect(isMeatName('豚')).toBe(false);
    expect(isMeatName('ひき肉')).toBe(false);
  });
});
