import type { TaxMode } from './types.ts';

/** 税込にそろえる。税抜からは floor(税抜 × (100 + 税率) / 100) */
export function toTaxIncluded(amount: number, mode: TaxMode, taxRate: number): number {
  if (mode === 'included') return amount;
  return Math.floor((amount * (100 + taxRate)) / 100);
}
