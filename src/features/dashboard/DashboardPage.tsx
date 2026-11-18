// ダッシュボード：よく買う商品・よく行く店（回数だけ。金額は出さない）
import { useMemo, useState } from 'react';
import { useRows } from '../../data/hooks.ts';
import { purchaseCounts, type Period } from '../../domain/dashboard.ts';
import { jstDate } from '../../domain/dates.ts';
import Header from '../../ui/Header.tsx';
import BarList from './BarList.tsx';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'this_month', label: '今月' },
  { value: 'three_months', label: '3か月' },
  { value: 'all', label: '全期間' },
];
const TOP = 10;

export default function DashboardPage({ now }: { now?: Date }) {
  const [period, setPeriod] = useState<Period>('this_month');
  const items = useRows('list_items');
  const products = useRows('products');
  const stores = useRows('stores');
  const today = jstDate(now ?? new Date());

  const counts = useMemo(
    () =>
      items && products && stores ? purchaseCounts({ items, products, stores, period, today }) : null,
    [items, products, stores, period, today],
  );

  return (
    <>
      <Header title="ダッシュボード" />
      <main className="page">
        <div className="segmented period-switch" role="group" aria-label="期間">
          {PERIODS.map((p) => (
            <button key={p.value} type="button" aria-pressed={period === p.value} onClick={() => setPeriod(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
        {counts && (
          <>
            <BarList label="よく買う商品" rows={counts.byProduct.slice(0, TOP)} />
            <BarList label="よく行く店" rows={counts.byStore.slice(0, TOP)} />
          </>
        )}
      </main>
    </>
  );
}
