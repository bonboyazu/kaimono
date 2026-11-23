// 買うものを追加する画面。空なら「よく買うもの」、文字を打てば絞り込む。ない商品はその場で足せる
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../data/auth.ts';
import { useRows } from '../../data/hooks.ts';
import { frequentProducts, searchProducts } from '../../domain/list.ts';
import { normalizeName } from '../../domain/similar.ts';
import Sheet from '../../ui/Sheet.tsx';
import MeatField from '../data/MeatField.tsx';
import { addNewProductToList, addToList, removeFromList } from './actions.ts';

export default function AddSheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const products = useRows('products');
  const items = useRows('list_items');
  const [query, setQuery] = useState('');
  const [added, setAdded] = useState<string | null>(null);
  const q = query.trim();

  const inList = useMemo(
    () => new Set((items ?? []).filter((i) => !i.checked_at).map((i) => i.product_id)),
    [items],
  );
  const shown = useMemo(() => {
    if (!products || !items) return [];
    if (q) return searchProducts(products, q);
    const frequent = frequentProducts(items, products);
    // 買った記録がないうちは、最初から入っている商品を名前の順
    return frequent.length > 0 ? frequent : searchProducts(products.filter((p) => p.is_preset), '');
  }, [products, items, q]);
  const exact = !!products?.some((p) => !p.deleted_at && normalizeName(p.name) === normalizeName(q));
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(null), 3000);
    return () => clearTimeout(t);
  }, [added]);

  // 足したら検索を空にして、足したことを知らせる
  const afterAdd = (name: string) => {
    setQuery('');
    setAdded(name);
  };

  return (
    <Sheet title="買うものを追加" onClose={onClose}>
      <div className="form-grid">
        <MeatField value={query} onChange={(v) => { setQuery(v); setAdded(null); }}>
          <input
            type="search" aria-label="商品を探す" placeholder="商品名で探す" value={query}
            onChange={(e) => { setQuery(e.target.value); setAdded(null); }}
          />
        </MeatField>
        {added && <p className="added-note" role="status">「{added}」をリストに入れました</p>}
        <p className="note">{q ? '押すとリストに入ります。もう一度押すと外れます' : 'よく買うもの（押すとリストに入ります）'}</p>
        <ul className="add-list" aria-label="候補">
          {shown.map((p) => {
            const on = inList.has(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button" aria-pressed={on}
                  onClick={async () => {
                    if (on) return removeFromList(p.id);
                    await addToList(p.id, userId);
                    afterAdd(p.name);
                  }}
                >
                  <span>{p.name}</span>
                  {on && <span className="note">✓ リストにあり</span>}
                </button>
              </li>
            );
          })}
          {q && !exact && (
            <li>
              <button type="button" className="add-new" onClick={async () => { await addNewProductToList(q, userId); afterAdd(q); }}>
                “{q}”を追加
              </button>
            </li>
          )}
        </ul>
      </div>
    </Sheet>
  );
}
