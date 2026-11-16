// リストの1行。左がチェック。名前を押すとメモの欄。左にずらすと「外す」
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../data/auth.ts';
import type { ListItem, Product } from '../../domain/types.ts';
import { check, removeItem, saveMemo, uncheck } from './actions.ts';

const SWIPE = 72;

export default function ItemRow({ item, product }: { item: ListItem; product: Product | undefined }) {
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
          onClick={() => (checked ? uncheck(item) : check(item, user?.id ?? null))}
        >
          <span aria-hidden="true">{checked ? '✓' : ''}</span>
        </button>
        <div className="item-main">
          <button type="button" className="item-name" aria-expanded={open} onClick={() => { setShift(0); setOpen((o) => !o); }}>
            {name}
            {!open && item.memo && <span className="item-memo">{item.memo}</span>}
          </button>
          {open && (
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
          )}
        </div>
      </div>
    </li>
  );
}
