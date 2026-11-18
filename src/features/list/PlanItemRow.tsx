// 提案の1行：チェック・商品名・値段・差額・一言（ほかの店に回す）
import { useAuth } from '../../data/auth.ts';
import { weekdayOf } from '../../domain/dates.ts';
import type { PlannedItem } from '../../domain/plan.ts';
import { WEEKDAYS } from '../data/filters.ts';
import { check, forceStore } from './actions.ts';
import { altText, dayLabel, priceText, tipText } from './planText.ts';

type Props = {
  p: PlannedItem;
  today: string;
  storeName: (id: string) => string;
  /** 店の見出しに「今週は行かない」を出しているとき、外したときの差額を出す */
  showStoreAlt: boolean;
  onOpenPrice: (storeId: string | null, productId: string) => void;
};

export default function PlanItemRow({ p, today, storeName, showStoreAlt, onOpenPrice }: Props) {
  const { user } = useAuth();
  const { item, product, chosen } = p;
  const name = product.name;
  const dateAlt = chosen?.is_sale && p.alt_if_date_excluded && p.alt_if_date_excluded.diff > 0 ? p.alt_if_date_excluded : null;
  const storeAlt = showStoreAlt ? p.alt_if_store_excluded : null;

  return (
    <li className="item-row plan-row">
      <div className="item-body">
        <button
          type="button" className="item-check" aria-label={`${name}をチェック`} aria-pressed={false}
          onClick={() => void check(item, user?.id ?? null, chosen?.store_id ?? null)}
        >
          <span aria-hidden="true" />
        </button>
        <div className="item-main">
          <div className="plan-line">
            <span className="plan-name">{name}</span>
            <button type="button" className="plain plan-price" onClick={() => onOpenPrice(chosen?.store_id ?? null, product.id)}>
              {chosen ? priceText(chosen.price, product) : '値段を入れる'}
              {chosen?.is_sale && <span className="badge sale">セール</span>}
            </button>
          </div>
          {item.memo && <span className="item-memo">{item.memo}</span>}
          {storeAlt && <span className="plan-hint">この店に行かないなら {altText(storeAlt, storeName(storeAlt.store_id), product)}</span>}
          {dateAlt && chosen && (
            <span className="plan-hint">
              {WEEKDAYS[weekdayOf(chosen.date)]}曜に行かないなら {dayLabel(dateAlt.date, today)} {altText(dateAlt, storeName(dateAlt.store_id), product)}
            </span>
          )}
          {item.forced_store_id ? (
            <button type="button" className="plain plan-tip" onClick={() => void forceStore(item, null)}>元に戻す</button>
          ) : (
            p.cheaper_elsewhere && (
              <button type="button" className="plain plan-tip" onClick={() => void forceStore(item, p.cheaper_elsewhere!.store_id)}>
                {tipText(p.cheaper_elsewhere, storeName(p.cheaper_elsewhere.store_id), product, !!chosen)}
              </button>
            )
          )}
        </div>
      </div>
    </li>
  );
}
