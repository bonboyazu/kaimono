import { expect, test } from 'vitest';
import { normalizeName, similarNames } from './similar.ts';

const names = ['牛乳', '低脂肪牛乳', 'キャベツ', 'ヨーグルト', '卵', 'トイレットペーパー'];

test('ひらがなとカタカナ、全角と半角、空白を区別しない', () => {
  expect(normalizeName(' きゃべつ ')).toBe(normalizeName('キャベツ'));
  expect(normalizeName('ﾖｰｸﾞﾙﾄ')).toBe(normalizeName('ヨーグルト'));
});

test('入れた名前を含む・入れた名前に含まれる商品を出す', () => {
  expect(similarNames('牛乳', names)).toEqual(['牛乳', '低脂肪牛乳']);
  expect(similarNames('きゃべつ', names)).toEqual(['キャベツ']);
  expect(similarNames('卵焼き', names)).toEqual(['卵']);
  expect(similarNames('トイレット', names)).toEqual(['トイレットペーパー']);
});

test('空なら何も出さない', () => {
  expect(similarNames(' ', names)).toEqual([]);
});
