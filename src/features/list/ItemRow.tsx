// リストの1行。左がチェック。行を押すと、店の安い順・メモ・リストから外すが開く。左にずらしても「外す」
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../data/auth.ts';
import type { StoreRank } from '../../domain/ranking.ts';
import type { ListItem, Product } from '../../domain/types.ts';
import { check, removeItem, saveMemo, uncheck } from './actions.ts';
import PriceRanking from './PriceRanking.tsx';

const SWIPE = 72;

type Prices = {
  ranks: StoreRank[];
  storeName: (id: string) => string;
  onOpenPrice: (storeId: string | null, productId: string) => void;
};

/** storeId：チェックしたときに「買った店」として入れる店（提案で選ばれた店）。prices があれば右に安い店を出す */
export default function ItemRow({ item, product, storeId = null, prices }: {
  item: ListItem; product: Product | undefined; storeId?: string | null; prices?: Prices;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState(item.memo);
  const [shift, setShift] = useState(0);
  const startX = useRef<number | null>(null);
  const checked = !!item.checked_at;
  // もう片方の端末でメモが変わったら、閉じている間は合わせる
  useEffect(() => {
    if (!open) setMemo(item.memo);
  }, [item.memo, open]);
  const name = product?.name ?? '（消した商品）';
  const showPrices = !!prices && !!product && !checked;

  const onTouchStart = (e: React.TouchEvent) => {
    if (checked) return;
    startX.current = e.touches[0].clientX + (shift ? SWIPE : 0);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    setShift(Math.max(-SWIPE, Math.min(0, e.touches[0].clientX - startX.current)));
  };
  const onTouchEnd = () => {
    if (startX.current === null) return;
    startX.current = null;
    setShift((s) => (s < -SWIPE / 2 ? -SWIPE : 0));
  };

  return (
    <li className={`item-row${checked ? ' checked' : ''}`}>
      {!checked && (
        <button type="button" className="item-remove" tabIndex={shift ? 0 : -1} onClick={() => removeItem(item)}>
          外す
        </button>
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
          <button
            type="button" className="item-line" aria-expanded={open} aria-label={name}
            onClick={() => { setShift(0); setOpen((o) => !o); }}
          >
            <span className="item-name">
              {name}
              {!open && item.memo && <span className="item-memo">{item.memo}</span>}
            </span>
            <span className="item-open-mark" aria-hidden="true">{open ? '▾' : '▸'}</span>
          </button>
          {open && (
            <div className="item-panel">
              {showPrices && (
                <PriceRanking product={product} ranks={prices.ranks} storeName={prices.storeName} onOpenPrice={prices.onOpenPrice} />
              )}
              <div className="item-edit">
                <input
                  type="text" aria-label={`${name}のメモ`} placeholder="メモ（例：300g）" value={memo} enterKeyHint="done"
                  onChange={(e) => setMemo(e.target.value)}
                  onBlur={() => void saveMemo(item, memo.trim())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void saveMemo(item, memo.trim());
                      setOpen(false);
                    }
                  }}
                />
                {!checked && (
                  <button type="button" className="plain danger" onClick={() => removeItem(item)}>リストから外す</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
