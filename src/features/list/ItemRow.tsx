// リストの1行。左がチェック。行を押すと店の安い順が開く。右にずらすと「メモ」、左にずらすと「外す」
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../data/auth.ts';
import type { StoreRank } from '../../domain/ranking.ts';
import type { ListItem, Product } from '../../domain/types.ts';
import { check, removeItem, saveMemo, uncheck } from './actions.ts';
import Sheet from '../../ui/Sheet.tsx';
import PriceRanking from './PriceRanking.tsx';

const SWIPE = 72;

type Prices = {
  ranks: StoreRank[];
  storeName: (id: string) => string;
  onOpenPrice: (storeId: string | null, productId: string) => void;
};

/** storeId：チェックしたときに「買った店」として入れる店（提案で選ばれた店）。prices があれば、押すと店の安い順を出す */
export default function ItemRow({ item, product, storeId = null, prices }: {
  item: ListItem; product: Product | undefined; storeId?: string | null; prices?: Prices;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [memo, setMemo] = useState(item.memo);
  const [shift, setShift] = useState(0);
  const startX = useRef<number | null>(null);
  const checked = !!item.checked_at;
  // もう片方の端末でメモが変わったら、書いていない間は合わせる
  useEffect(() => {
    if (!editing) setMemo(item.memo);
  }, [item.memo, editing]);
  const name = product?.name ?? '（消した商品）';
  const showPrices = !!prices && !!product && !checked;

  const onTouchStart = (e: React.TouchEvent) => {
    if (checked) return;
    startX.current = e.touches[0].clientX - shift;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    setShift(Math.max(-SWIPE, Math.min(SWIPE, e.touches[0].clientX - startX.current)));
  };
  const onTouchEnd = () => {
    if (startX.current === null) return;
    startX.current = null;
    setShift((s) => (s < -SWIPE / 2 ? -SWIPE : s > SWIPE / 2 ? SWIPE : 0));
  };

  // 右にずらすと左に「メモ」、左にずらすと右に「外す」が出る
  const startMemo = () => { setShift(0); setEditing(true); };

  return (
    <li className={`item-row${checked ? ' checked' : ''}`}>
      {!checked && (
        <>
          <button type="button" className="item-memo-btn" tabIndex={shift > 0 ? 0 : -1} aria-label={`${name}のメモを書く`} onClick={startMemo}>
            メモ
          </button>
          <button type="button" className="item-remove" tabIndex={shift < 0 ? 0 : -1} aria-label={`${name}をリストから外す`} onClick={() => removeItem(item)}>
            外す
          </button>
        </>
      )}
      <div
        className="item-body" style={{ transform: `translateX(${shift}px)` }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      >
        <button
          type="button" className="item-check" aria-label={checked ? `${name}を戻す` : `${name}をチェック`}
          aria-pressed={checked}
          onClick={() => (checked ? uncheck(item) : check(item, user?.id ?? null, storeId))}
        >
          <span aria-hidden="true">{checked ? '✓' : ''}</span>
        </button>
        <div className="item-main">
          {showPrices ? (
            <button
              type="button" className="item-line" aria-expanded={open} aria-label={name}
              onClick={() => { if (shift) setShift(0); else setOpen((o) => !o); }}
            >
              <span className="item-name">
                {name}
                {item.memo && <span className="item-memo">{item.memo}</span>}
              </span>
              <span className="item-open-mark" aria-hidden="true">{open ? '▾' : '▸'}</span>
            </button>
          ) : (
            <div className="item-line">
              <span className="item-name">
                {name}
                {item.memo && <span className="item-memo">{item.memo}</span>}
              </span>
            </div>
          )}
          {open && showPrices && (
            <PriceRanking product={product} ranks={prices.ranks} storeName={prices.storeName} onOpenPrice={prices.onOpenPrice} />
          )}
        </div>
      </div>
      {editing && (
        <Sheet title={`メモ：${name}`} onClose={() => setEditing(false)} formId="memo-form">
          <form
            id="memo-form" className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              void saveMemo(item, memo.trim());
              setEditing(false);
            }}
          >
            <input
              type="text" aria-label={`${name}のメモ`} placeholder="メモ（例：300g・2パック）" value={memo} autoFocus enterKeyHint="done"
              onChange={(e) => setMemo(e.target.value)}
            />
          </form>
        </Sheet>
      )}
    </li>
  );
}
