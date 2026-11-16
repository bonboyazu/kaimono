import { describe, expect, it } from 'vitest';
import { activeItems, duplicatesToRemove, frequentProducts, searchProducts } from './list.ts';
import type { ListItem, Product } from './types.ts';

const meta = { field_times: {}, deleted_at: null };
const item = (id: string, product_id: string, o: Partial<ListItem> = {}): ListItem => ({
  ...meta, id, product_id, memo: '', added_by: 'u1', added_at: '2026-11-15T00:00:00Z',
  checked_at: null, checked_by: null, bought_store_id: null, forced_store_id: null, ...o,
});
const product = (id: string, name: string, deleted = false): Product => ({
  ...meta, id, name, unit: 'piece', tax_rate: 8, is_preset: true, deleted_at: deleted ? '2026-11-01T00:00:00Z' : null,
});

// 日本時間 2026/11/16 の昼
const now = new Date('2026-11-16T03:00:00Z');

describe('activeItems', () => {
  it('未チェックは toBuy、今日チェックしたものは boughtToday。昨日と消したものはどちらにも入らない', () => {
    const items = [
      item('a', 'p1', { added_at: '2026-11-16T01:00:00Z' }),
      item('b', 'p2', { added_at: '2026-11-15T01:00:00Z' }),
      item('c', 'p3', { checked_at: '2026-11-15T15:30:00Z' }), // 日本時間 11/16 0:30
      item('d', 'p4', { checked_at: '2026-11-15T14:00:00Z' }), // 日本時間 11/15 23:00
      item('e', 'p5', { deleted_at: '2026-11-16T00:00:00Z' }),
    ];
    const { toBuy, boughtToday } = activeItems(items, now);
    expect(toBuy.map((i) => i.id)).toEqual(['b', 'a']);
    expect(boughtToday.map((i) => i.id)).toEqual(['c']);
  });
});

describe('duplicatesToRemove', () => {
  it('同じ商品の未チェックが2つあると、added_at が新しいほうを返す。チェック済みは対象にしない', () => {
    const items = [
      item('old', 'p1', { added_at: '2026-11-15T00:00:00Z' }),
      item('new', 'p1', { added_at: '2026-11-16T00:00:00Z' }),
      item('done', 'p1', { checked_at: '2026-11-16T00:00:00Z' }),
      item('x', 'p2'),
      item('gone', 'p2', { deleted_at: '2026-11-16T00:00:00Z' }),
    ];
    expect(duplicatesToRemove(items)).toEqual(['new']);
  });
});

describe('frequentProducts', () => {
  it('チェック済みの回数が多い順。同じ回数は名前の順。消した商品は出さない', () => {
    const products = [product('p1', 'たまご'), product('p2', 'ぎゅうにゅう'), product('p3', 'あめ'), product('p4', 'けした', true)];
    const c = (id: string, p: string) => item(id, p, { checked_at: '2026-11-10T00:00:00Z' });
    const items = [c('1', 'p1'), c('2', 'p1'), c('3', 'p2'), c('4', 'p3'), c('5', 'p4'), c('6', 'p4'), c('7', 'p4'), item('8', 'p2')];
    expect(frequentProducts(items, products).map((p) => p.name)).toEqual(['たまご', 'あめ', 'ぎゅうにゅう']);
  });
});

describe('searchProducts', () => {
  const products = [product('p1', 'キャベツ'), product('p2', '牛乳'), product('p3', 'ロールキャベツ'), product('p4', 'きゃべつ巻き', true)];
  it('部分一致。ひらがなとカタカナを区別しない。消した商品は出さない', () => {
    expect(searchProducts(products, 'きゃべ').map((p) => p.name)).toEqual(['キャベツ', 'ロールキャベツ']);
  });
  it('空の文字なら全部', () => {
    expect(searchProducts(products, ' ')).toHaveLength(3);
  });
});
