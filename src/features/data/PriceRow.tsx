import { forwardRef } from 'react';
import type { DataRow } from './filters.ts';
import { formatDate, formatPrice, formatSale } from './filters.ts';
import QuickPriceInput from './QuickPriceInput.tsx';

type Props = { row: DataRow; quick: boolean; onOpen: () => void; onNext: () => void };

const PriceRow = forwardRef<HTMLInputElement, Props>(function PriceRow({ row, quick, onOpen, onNext }, ref) {
  const { product, store, price, sales } = row;
  const sub = [
    ...sales.map((s) => formatSale(s, product)),
    price ? `更新 ${formatDate(price.price_updated_at)}` : null,
  ].filter(Boolean).join('　');
  return (
    <li className="price-row">
      <button type="button" className="price-row-main" onClick={onOpen}>
        <span className="price-row-name">
          {product.name}
          {!quick && <span className="note">　{store.name}</span>}
          {quick && product.unit === '100g' && <span className="note">　/100g</span>}
        </span>
        {sub && <span className="note">{sub}</span>}
      </button>
      {quick ? (
        <QuickPriceInput ref={ref} store={store} product={product} price={price} onNext={onNext} />
      ) : (
        <span className="price-row-amount">{price ? formatPrice(price, product) : '—'}</span>
      )}
    </li>
  );
});

export default PriceRow;
