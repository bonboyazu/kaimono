// 買い物リスト。行を押すと、店の安い順が開く
import { useEffect, useMemo, useState } from 'react';
import { useRows } from '../../data/hooks.ts';
import { softDelete } from '../../data/sync/mutate.ts';
import { activeItems, duplicatesToRemove } from '../../domain/list.ts';
import { rankStores, type StoreRank } from '../../domain/ranking.ts';
import Header from '../../ui/Header.tsx';
import PriceEditor from '../data/PriceEditor.tsx';
import ProductEditor from '../data/ProductEditor.tsx';
import StoreEditor from '../data/StoreEditor.tsx';
import AddSheet from './AddSheet.tsx';
import ItemRow from './ItemRow.tsx';
import { chosenStoreOf, usePlan } from './usePlan.ts';

/** 日付が変わったら「買ったもの」を消すため、1分ごとと前に出たときに時刻を取り直す */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return now;
}

type Open =
  | { kind: 'price'; storeId: string | null; productId: string }
  | { kind: 'product'; id: string }
  | { kind: 'store'; id: string };

export default function ListPage() {
  const items = useRows('list_items');
  const products = useRows('products');
  const stores = useRows('stores');
  const prices = useRows('prices');
  const sales = useRows('sale_prices');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Open | null>(null);
  const now = useNow();
  const plan = usePlan(now);

  // 2台で同時に同じ商品を足したとき、新しいほうを片付ける
  useEffect(() => {
    if (!items) return;
    for (const id of duplicatesToRemove(items)) void softDelete('list_items', id);
  }, [items]);

  const productOf = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);
  const { toBuy, boughtToday } = useMemo(() => activeItems(items ?? [], now), [items, now]);

  // 商品ごとに、店の安い順
  const ranksOf = useMemo(() => {
    const out = new Map<string, StoreRank[]>();
    if (!stores || !prices || !sales) return out;
    for (const i of toBuy) {
      const p = productOf.get(i.product_id);
      if (p && p.unit !== 'none') out.set(p.id, rankStores(p, stores, prices, sales));
    }
    return out;
  }, [toBuy, productOf, stores, prices, sales]);
  const storeName = useMemo(() => {
    const m = new Map((stores ?? []).map((s) => [s.id, s.name]));
    return (id: string) => m.get(id) ?? '（消した店）';
  }, [stores]);
  const openPrice = (storeId: string | null, productId: string) => setOpen({ kind: 'price', storeId, productId });

  return (
    <>
      <Header title="リスト" />
      <main className="page">
        <button type="button" className="search-trigger" onClick={() => setAdding(true)}>
          <span className="search-trigger-plus" aria-hidden="true">＋</span>買うものを追加
        </button>
        {items && toBuy.length === 0 && <p className="note empty">リストは空です。上の「買うものを追加」から入れてください</p>}
        <ul className="item-list" aria-label="買うもの">
          {toBuy.map((i) => {
            const product = productOf.get(i.product_id);
            // 値段を入れない商品は、押しても安い順を開かない
            const comparable = product?.unit !== 'none';
            return (
              <ItemRow
                key={i.id} item={i} product={product} storeId={chosenStoreOf(plan, i.id)}
                prices={comparable ? { ranks: ranksOf.get(i.product_id) ?? [], storeName, onOpenPrice: openPrice } : undefined}
              />
            );
          })}
        </ul>
        {boughtToday.length > 0 && (
          <>
            <h2 className="section-title">買ったもの</h2>
            <ul className="item-list" aria-label="買ったもの">
              {boughtToday.map((i) => <ItemRow key={i.id} item={i} product={productOf.get(i.product_id)} />)}
            </ul>
          </>
        )}
      </main>
      {adding && <AddSheet onClose={() => setAdding(false)} />}
      {open?.kind === 'price' && (
        <PriceEditor
          storeId={open.storeId} productId={open.productId} onClose={() => setOpen(null)}
          onEditProduct={(id) => setOpen({ kind: 'product', id })}
          onEditStore={(id) => setOpen({ kind: 'store', id })}
        />
      )}
      {open?.kind === 'product' && <ProductEditor id={open.id} onClose={() => setOpen(null)} />}
      {open?.kind === 'store' && <StoreEditor id={open.id} onClose={() => setOpen(null)} />}
    </>
  );
}
