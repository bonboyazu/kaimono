// 商品を押すと開く、店の安い順。値段を押すと直せる
import type { StoreRank } from '../../domain/ranking.ts';
import { sizeText } from '../../domain/size.ts';
import type { Product } from '../../domain/types.ts';
import { priceText, weekdaysText } from './planText.ts';

type Props = {
  product: Product;
  ranks: StoreRank[];
  storeName: (id: string) => string;
  onOpenPrice: (storeId: string | null, productId: string) => void;
};

export default function PriceRanking({ product, ranks, storeName, onOpenPrice }: Props) {
  return (
    <div className="ranking">
      {ranks.length === 0 ? (
        <p className="note">まだどの店の値段も入っていません</p>
      ) : (
        <ol className="ranking-list" aria-label={`${product.name}の安い店`}>
          {ranks.map((r, i) => (
            <li key={r.store_id}>
              <button type="button" className="plain ranking-row" onClick={() => onOpenPrice(r.store_id, product.id)}>
                <span className="ranking-no" aria-hidden="true">{i + 1}</span>
                <span className="ranking-store">{storeName(r.store_id)}</span>
                <span className="ranking-price">
                  {priceText(r.best, product)}
                  {r.size !== null && <span className="ranking-size">{sizeText(r.size, product.unit)} {r.pack}円</span>}
                  {r.sale_weekdays.length > 0 && (
                    <span className="ranking-sale">
                      {weekdaysText(r.sale_weekdays)}曜セール（ふだん {priceText(r.normal, product)}）
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <button type="button" className="plain ranking-add" onClick={() => onOpenPrice(null, product.id)}>＋ ほかの店の値段を入れる</button>
    </div>
  );
}
