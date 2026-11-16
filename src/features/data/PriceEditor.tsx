// 値段の編集：通常の値段・税込／税抜・曜日セール・更新日
import { useState } from 'react';
import { useRows } from '../../data/hooks.ts';
import type { Price, Product, SalePrice, Store, TaxMode } from '../../domain/types.ts';
import Sheet from '../../ui/Sheet.tsx';
import SearchPicker from '../../ui/SearchPicker.tsx';
import TaxToggle from '../../ui/TaxToggle.tsx';
import { deletePrice, parseAmount, savePrice, saveSales } from './actions.ts';
import { formatDate, WEEKDAYS, yen } from './filters.ts';

type Props = {
  storeId: string | null;
  productId: string | null;
  onClose: () => void;
  onEditProduct: (id: string) => void;
  onEditStore: (id: string) => void;
};

/** 店・商品が決まるまで選ばせ、決まったら中身を出す */
export default function PriceEditor(props: Props) {
  const stores = useRows('stores');
  const products = useRows('products');
  const [storeId, setStoreId] = useState(props.storeId ?? '');
  const [productId, setProductId] = useState(props.productId ?? '');
  if (!stores || !products) return null;
  const store = stores.find((s) => s.id === storeId);
  const product = products.find((p) => p.id === productId);
  const choosing = !props.storeId || !props.productId;

  return (
    <Sheet
      title={choosing ? '値段を足す' : `${product?.name ?? ''}（${store?.name ?? ''}）`}
      onClose={props.onClose}
      formId={store && product ? 'price-form' : undefined}
    >
      {choosing && (
        <div className="form-grid">
          <label>
            店
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <option value="">選ぶ</option>
              {[...stores].sort((a, b) => a.sort_order - b.sort_order).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <SearchPicker
            label="商品" value={productId} onChange={setProductId}
            options={[...products].sort((a, b) => a.name.localeCompare(b.name, 'ja'))}
          />
          {stores.length === 0 && <p className="note">先に「＋」から店を足してください</p>}
          {(!store || !product) && <p className="note">店と商品を選ぶと、値段を入れられます</p>}
        </div>
      )}
      {store && product && (
        <PriceForm key={`${store.id}:${product.id}`} store={store} product={product} {...props} />
      )}
    </Sheet>
  );
}

type SaleDraft = { weekday: number; text: string; tax_mode: TaxMode };

function PriceForm({ store, product, onClose, onEditProduct, onEditStore }: Props & { store: Store; product: Product }) {
  const prices = useRows('prices');
  const allSales = useRows('sale_prices');
  if (!prices || !allSales) return null;
  const price = prices.find((p) => p.store_id === store.id && p.product_id === product.id) ?? null;
  const sales = allSales.filter((s) => s.store_id === store.id && s.product_id === product.id);
  return (
    <PriceFormInner
      store={store} product={product} price={price} sales={sales}
      onClose={onClose} onEditProduct={onEditProduct} onEditStore={onEditStore}
    />
  );
}

function PriceFormInner({ store, product, price, sales, onClose, onEditProduct, onEditStore }: {
  store: Store; product: Product;
  price: Price | null;
  sales: SalePrice[];
  onClose: () => void; onEditProduct: (id: string) => void; onEditStore: (id: string) => void;
}) {
  const [text, setText] = useState(price ? String(price.amount) : '');
  // 新しく入れるときは店の前回の選択。今ある値段はその値段の選択のまま出す（違う意味に見せないため）
  const [mode, setMode] = useState<TaxMode>(price?.tax_mode ?? store.default_tax_mode);
  const [drafts, setDrafts] = useState<SaleDraft[]>(
    [...sales].sort((a, b) => a.weekday - b.weekday).map((s) => ({ weekday: s.weekday, text: String(s.amount), tax_mode: s.tax_mode })),
  );
  const [error, setError] = useState('');
  const amount = parseAmount(text);
  const unit = product.unit === '100g' ? '/100g' : '';
  const used = new Set(drafts.map((d) => d.weekday));
  const nextDay = [2, 3, 4, 5, 6, 0, 1].find((d) => !used.has(d));

  const update = (i: number, patch: Partial<SaleDraft>) =>
    setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const save = async () => {
    if (amount === null) {
      setError('通常の値段を、1 以上の整数で入れてください');
      return;
    }
    const saleInputs = [];
    for (const d of drafts) {
      const a = parseAmount(d.text);
      if (a === null) {
        setError(`${WEEKDAYS[d.weekday]}曜のセールの値段を、1 以上の整数で入れてください`);
        return;
      }
      saleInputs.push({ weekday: d.weekday, amount: a, tax_mode: d.tax_mode });
    }
    await savePrice(store, product, amount, mode);
    await saveSales(store, product, saleInputs);
    onClose();
  };

  const remove = async () => {
    if (!price || !window.confirm('この値段を消しますか（曜日セールも消えます）')) return;
    await deletePrice(price, sales);
    onClose();
  };

  return (
    <form id="price-form" className="form-grid" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <label>
        通常の値段{unit && `（${unit}）`}
        <span className="amount-line">
          <input
            type="text" inputMode="numeric" aria-label="通常の値段" value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <TaxToggle value={mode} onChange={setMode} />
        </span>
      </label>
      {mode === 'excluded' && amount !== null && (
        <p className="note">→ 税込 {yen({ amount, tax_mode: 'excluded' }, product)}円</p>
      )}
      <p className="note">更新日：{price ? formatDate(price.price_updated_at) : '未登録'}</p>

      <h3>曜日セール</h3>
      {drafts.map((d, i) => {
        const a = parseAmount(d.text);
        return (
          <div className="sale-line" key={i}>
            <span className="weekday-buttons" role="group" aria-label="曜日">
              {WEEKDAYS.map((w, day) => (
                <button
                  key={day} type="button" aria-pressed={day === d.weekday}
                  disabled={day !== d.weekday && used.has(day)}
                  onClick={() => update(i, { weekday: day })}
                >
                  {w}
                </button>
              ))}
            </span>
            <input
              type="text" inputMode="numeric" aria-label={`${WEEKDAYS[d.weekday]}曜のセールの値段`} value={d.text}
              onChange={(e) => update(i, { text: e.target.value })}
            />
            <TaxToggle value={d.tax_mode} onChange={(m) => { update(i, { tax_mode: m }); setMode(m); }} label="セールの税込・税抜" />
            <button type="button" className="plain" onClick={() => setDrafts((ds) => ds.filter((_, j) => j !== i))}>外す</button>
            {d.tax_mode === 'excluded' && a !== null && (
              <span className="note">→ 税込 {yen({ amount: a, tax_mode: 'excluded' }, product)}円</span>
            )}
          </div>
        );
      })}
      <button
        type="button"
        disabled={amount === null || nextDay === undefined}
        onClick={() => nextDay !== undefined && setDrafts((ds) => [...ds, { weekday: nextDay, text: '', tax_mode: mode }])}
      >
        曜日セールを足す
      </button>
      {amount === null && <p className="note">通常の値段を入れると、曜日セールを足せます</p>}

      {error && <p className="error">{error}</p>}
      <div className="row">
        <button type="button" className="plain" onClick={() => onEditProduct(product.id)}>商品を編集</button>
        <button type="button" className="plain" onClick={() => onEditStore(store.id)}>店を編集</button>
        {price && <button type="button" className="plain danger" onClick={remove}>値段を消す</button>}
      </div>
    </form>
  );
}
