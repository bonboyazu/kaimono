// データ一覧：店 × 商品の値段。絞り込み・編集・続けて入力
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRows } from '../../data/hooks.ts';
import { isMeatName } from '../../domain/meat.ts';
import { normalizeName } from '../../domain/similar.ts';
import Header from '../../ui/Header.tsx';
import Select from '../../ui/Select.tsx';
import { addProductByName } from './actions.ts';
import AddMenu from './AddMenu.tsx';
import { buildDataRows } from './filters.ts';
import MeatField from './MeatField.tsx';
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

  // 打った名前の商品がなければ、一覧の最後に「足す」を出す
  const q = query.trim();
  const same = q ? products?.find((p) => !p.deleted_at && normalizeName(p.name) === normalizeName(q)) : undefined;
  const canAdd = !!q && !!products && !same && (stores?.length ?? 0) > 0;
  const [error, setError] = useState('');
  // 足した商品の値段の欄に移る。iPhone はキーボードを出したままにするため、押した直後に仮の欄へ移しておく
  const holder = useRef<HTMLInputElement>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  useEffect(() => {
    if (!focusId) return;
    const i = rows.findIndex((r) => r.product.id === focusId && r.store);
    if (i < 0) return;
    inputs.current[i]?.focus();
    setFocusId(null);
  }, [rows, focusId]);
  const addByName = async () => {
    if (quick) holder.current?.focus();
    try {
      const id = await addProductByName(q);
      setError('');
      if (quick) setFocusId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <Header title="データ" />
      <main className="page">
        <div className="filters">
          <Select
            label="店で絞り込む" value={storeId} onChange={setStoreId}
            options={[{ value: '', label: 'すべての店' }, ...sortedStores.map((s) => ({ value: s.id, label: s.name }))]}
          />
          <MeatField onPick={setQuery}>
            <input
              type="search" aria-label="商品名で絞り込む" placeholder="商品名" value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </MeatField>
        </div>
        {quick && <p className="note">値段の欄に打って確定すると、保存して次の商品に進みます</p>}
        {stores && rows.length === 0 && !canAdd && (
          <p className="note empty">
            {stores.length === 0
              ? '店がまだありません。右下の「＋」から店を足してください'
              : quick ? '当てはまる商品がありません' : '値段はまだありません。上で店を選ぶと、商品ごとに続けて入力できます'}
          </p>
        )}
        <ul className="price-list">
          {rows.map((row, i) => (
            <PriceRow
              key={`${row.store?.id ?? ''}:${row.product.id}`}
              ref={(el) => { inputs.current[i] = el; }}
              row={row}
              quick={quick}
              onOpen={() =>
                setOpen(row.store
                  ? { kind: 'price', storeId: row.store.id, productId: row.product.id }
                  : { kind: 'product', id: row.product.id })}
              onNext={() => inputs.current[i + 1]?.focus()}
            />
          ))}
          {canAdd && (
            <li>
              <button type="button" className="add-row" aria-label={`“${q}”を足す`} onClick={() => void addByName()}>
                <span>＋ “{q}”を足す</span>
                <span className="note">{isMeatName(q) ? '100gあたり' : '1つあたり'}</span>
              </button>
            </li>
          )}
        </ul>
        {quick && same?.unit === 'none' && <p className="note">「{same.name}」は値段を入れない商品です</p>}
        {error && <p className="error">{error}</p>}
        <input ref={holder} className="focus-holder" inputMode="numeric" aria-hidden="true" tabIndex={-1} />
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
