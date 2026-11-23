// 量あたりの商品（きなこなど）：量と値段から 100g（100ml・1個）あたりの値段を出して比べる
import type { Unit } from './types.ts';

export type SizeUnit = { label: string; base: number; per: string };

const SIZE_UNITS: Partial<Record<Unit, SizeUnit>> = {
  size_g: { label: 'g', base: 100, per: '100g' },
  size_ml: { label: 'ml', base: 100, per: '100ml' },
  size_count: { label: '個', base: 1, per: '個' },
};

/** 量あたりの単位なら、量の単位と比べる量。ほかは null */
export const sizeUnitOf = (unit: Unit): SizeUnit | null => SIZE_UNITS[unit] ?? null;
export const isSizeUnit = (unit: Unit) => sizeUnitOf(unit) !== null;

/** 比べる値段（税込）。量あたりの商品は 100g などあたりに直す。量がなければ null（比べない） */
export function comparable(taxIncluded: number, size: number | null | undefined, unit: Unit): number | null {
  const u = sizeUnitOf(unit);
  if (!u) return taxIncluded;
  if (!size || size <= 0) return null;
  return (taxIncluded / size) * u.base;
}

/** 小数1けたまで：83.333 → '83.3'、100 → '100' */
export const decimal1 = (v: number) => String(Math.round(v * 10) / 10);

/** 商品の単位の呼び名（候補の横などに出す） */
export function unitLabel(unit: Unit): string {
  if (unit === '100g') return '100gあたり';
  if (unit === 'none') return '値段を入れない';
  const u = sizeUnitOf(unit);
  return u ? `量あたり（${u.label}）` : '1つあたり';
}

/** 180 → '180g'。量がなければ空 */
export function sizeText(size: number | null | undefined, unit: Unit): string {
  const u = sizeUnitOf(unit);
  return u && size ? `${size}${u.label}` : '';
}
