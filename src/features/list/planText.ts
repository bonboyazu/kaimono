// 提案の画面の言葉
import { addDays, weekdayOf } from '../../domain/dates.ts';
import type { Alt } from '../../domain/plan.ts';
import { decimal1, sizeUnitOf } from '../../domain/size.ts';
import type { Product } from '../../domain/types.ts';
import { WEEKDAYS } from '../data/filters.ts';

/** '2026-11-18' → '11/18(水)' */
export function md(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}/${d}(${WEEKDAYS[weekdayOf(date)]})`;
}

/** 今日から7日間：'11/15(日)〜11/21(土)' */
export function period(today: string): string {
  return `${md(today)}〜${md(addDays(today, 6))}`;
}

export const dayLabel = (date: string, today: string) => (date === today ? '今日' : md(date));

/** 比べる値段の書き方。量あたりの商品は '83.3円/100g' */
export function priceText(price: number, product: Product): string {
  const u = sizeUnitOf(product.unit);
  if (u) return `${decimal1(price)}円/${u.per}`;
  return `${price}円${product.unit === '100g' ? '/100g' : ''}`;
}

/** +40 → '+40円'、−30 → '−30円' */
export const diffText = (diff: number) => `${diff < 0 ? '−' : '+'}${decimal1(Math.abs(diff))}円`;

/** 'A店 238円（+40円）' */
export const altText = (a: Alt, storeName: string, product: Product) => `${storeName} ${priceText(a.price, product)}（${diffText(a.diff)}）`;

/** 一言：'B店なら 168円（−30円）'。今の候補がないときは差額を付けない */
export const tipText = (a: Alt, storeName: string, product: Product, withDiff: boolean) =>
  `${storeName}なら ${priceText(a.price, product)}${withDiff ? `（${diffText(a.diff)}）` : ''}`;

/** 曜日の並び：[3, 0] → '水・日' */
export const weekdaysText = (days: number[]) => days.map((d) => WEEKDAYS[d]).join('・');

