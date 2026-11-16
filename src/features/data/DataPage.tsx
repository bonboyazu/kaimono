// データ一覧：店 × 商品の値段。絞り込み・編集・続けて入力
import { useMemo, useRef, useState } from 'react';
import { useRows } from '../../data/hooks.ts';
import Header from '../../ui/Header.tsx';
import AddMenu from './AddMenu.tsx';
import { buildDataRows } from './filters.ts';
import PriceEditor from './PriceEditor.tsx';
import PriceRow from './PriceRow.tsx';
import ProductEditor from './ProductEditor.tsx';
import StoreEditor from './StoreEditor.tsx';

type Open =
  | { kind: 'add' }
  | { kind: 'price'; storeId: string | null; productId: string | null }
  | { kind: 'product'; id: string | null }
  | { kind: 'store'; id: string | null };

export default function DataPage() {
  const stores = useRows('stores');
  const products = useRows('products');
  const prices = useRows('prices');
  const sales = useRows('sale_prices');
  const [storeId, setStoreId] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Open | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const rows = useMemo(
    () =>
      stores && products && prices && sales
        ? buildDataRows({ stores, products, prices, sales }, { storeId: storeId || null, query })
        : [],
    [stores, products, prices, sales, storeId, query],
  );
  const sortedStores = useMemo(() => [...(stores ?? [])].sort((a, b) => a.sort_order - b.sort_order), [stores]);
  const quick = storeId !== '';
  const close = () => setOpen(null);

  return (
    <>
      <Header title="データ" />
      <main className="page">
        <div className="filters">
          <select aria-label="店で絞り込む" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">すべての店</option>
            {sortedStores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input
            type="search" aria-label="商品名で絞り込む" placeholder="商品名" value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {quick && <p className="note">値段の欄に打って確定すると、保存して次の商品に進みます</p>}
        {stores && rows.length === 0 && (
          <p className="note empty">
            {stores.length === 0
              ? '店がまだありません。右下の「＋」から店を足してください'
              : quick ? '当てはまる商品がありません' : '値段はまだありません。上で店を選ぶと、商品ごとに続けて入力できます'}
          </p>
        )}
        <ul className="price-list">
          {rows.map((row, i) => (
            <PriceRow
              key={`${row.store.id}:${row.product.id}`}
              ref={(el) => { inputs.current[i] = el; }}
              row={row}
              quick={quick}
              onOpen={() => setOpen({ kind: 'price', storeId: row.store.id, productId: row.product.id })}
              onNext={() => inputs.current[i + 1]?.focus()}
            />
          ))}
        </ul>
        <button type="button" className="fab" aria-label="足す" onClick={() => setOpen({ kind: 'add' })}>＋</button>
      </main>

      {open?.kind === 'add' && (
        <AddMenu
          onClose={close}
          onPick={(k) =>
            setOpen(k === 'price' ? { kind: 'price', storeId: storeId || null, productId: null } : { kind: k, id: null })
          }
        />
      )}
      {open?.kind === 'price' && (
        <PriceEditor
          storeId={open.storeId}
          productId={open.productId}
          onClose={close}
          onEditProduct={(id) => setOpen({ kind: 'product', id })}
          onEditStore={(id) => setOpen({ kind: 'store', id })}
        />
      )}
      {open?.kind === 'product' && <ProductEditor id={open.id} onClose={close} />}
      {open?.kind === 'store' && <StoreEditor id={open.id} onClose={close} />}
    </>
  );
}
