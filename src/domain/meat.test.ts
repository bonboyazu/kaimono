import { describe, expect, it } from 'vitest';
import { isMeatName, MEAT_KINDS, meatName, meatParts, needsCut } from './meat.ts';

describe('meatName', () => {
  it('種類＋部位＋カット', () => {
    expect(meatName('豚', 'バラ', '薄切り')).toBe('豚バラ薄切り');
    expect(meatName('牛', 'ロース', 'かたまり')).toBe('牛ロースかたまり');
  });
  it('カットが「なし」なら付けない', () => {
    expect(meatName('鶏', 'もも', 'なし')).toBe('鶏もも');
    expect(meatName('豚', 'バラ', null)).toBe('豚バラ');
  });
  it('こま・ひき肉はカットを付けない', () => {
    expect(meatName('牛', 'こま', '薄切り')).toBe('牛こま');
    expect(meatName('鶏', 'ひき肉', null)).toBe('鶏ひき肉');
  });
  it('合いびきは「合いびき肉」', () => {
    expect(meatName('合いびき', 'ひき肉', null)).toBe('合いびき肉');
  });
  it('手羽元・手羽先は「鶏」を付けない', () => {
    expect(meatName('鶏', '手羽元', 'なし')).toBe('手羽元');
    expect(meatName('鶏', '手羽先', '唐揚げ用')).toBe('手羽先唐揚げ用');
  });
});

describe('選べるもの', () => {
  it('種類は4つ。合いびきはひき肉だけ', () => {
    expect(MEAT_KINDS).toEqual(['牛', '豚', '鶏', '合いびき']);
    expect(meatParts('合いびき')).toEqual(['ひき肉']);
    expect(meatParts('鶏')).toContain('ささみ');
  });
  it('カットの段は、こま・ひき肉・合いびきでは出さない', () => {
    expect(needsCut('豚', 'バラ')).toBe(true);
    expect(needsCut('豚', 'こま')).toBe(false);
    expect(needsCut('牛', 'ひき肉')).toBe(false);
    expect(needsCut('合いびき', 'ひき肉')).toBe(false);
  });
});

describe('isMeatName', () => {
  it('組み合わせでできる名前なら true（今ある肉の商品も含む）', () => {
    for (const n of ['豚バラ薄切り', '牛こま', '豚バラ', '牛ロースかたまり', '鶏ささみ', '手羽元', '合いびき肉', '豚ひき肉'])
      expect(isMeatName(n), n).toBe(true);
  });
  it('前後の空白は無視する。肉でない名前は false', () => {
    expect(isMeatName(' 豚バラ薄切り ')).toBe(true);
    expect(isMeatName('キャベツ')).toBe(false);
    expect(isMeatName('豚')).toBe(false);
  });
});
