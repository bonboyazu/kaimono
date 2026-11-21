import { useState } from 'react';
import { similarNames } from '../../domain/similar.ts';
import { useRow, useRows } from '../../data/hooks.ts';
import type { Product, Unit } from '../../domain/types.ts';
import Sheet from '../../ui/Sheet.tsx';
import { addProduct, deleteProduct, updateProduct } from './actions.ts';

/** id がなければ新しく足す */
export default function ProductEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const product = useRow('products', id ?? undefined);
  if (id && !product) return null;
  return <ProductForm key={id ?? 'new'} product={product ?? null} onClose={onClose} />;
}

function ProductForm({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const [name, setName] = useState(product?.name ?? '');
  const [unit, setUnit] = useState<Unit>(product?.unit ?? 'piece');
  const [taxRate, setTaxRate] = useState(product?.tax_rate ?? 8);
  const [error, setError] = useState('');
  const all = useRows('products');
  const similar = similarNames(name, (all ?? []).filter((p) => p.id !== product?.id).map((p) => p.name));

  const save = async () => {
    try {
      const input = { name, unit, tax_rate: taxRate };
      if (product) await updateProduct(product, input);
      else await addProduct(input);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async () => {
    if (!product) return;
    if (!window.confirm(`「${product.name}」を消しますか。この商品の値段も、一覧と提案に出なくなります`)) return;
    await deleteProduct(product);
    onClose();
  };

  return (
    <Sheet title={product ? '商品を編集' : '商品を足す'} onClose={onClose} formId="product-form">
      <form id="product-form" className="form-grid" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <label>
          名前
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {similar.length > 0 && (
          <div className="similar" role="note" aria-label="似た商品">
            <p>似た商品がもうあります。同じものなら、足さずにそちらを使ってください</p>
            <ul>
              {similar.slice(0, 10).map((n) => <li key={n}>{n}</li>)}
            </ul>
            {similar.length > 10 && <p className="note">ほか {similar.length - 10} 件</p>}
          </div>
        )}
        <fieldset>
          <legend>値段の単位</legend>
          <label className="radio"><input type="radio" checked={unit === 'piece'} onChange={() => setUnit('piece')} />1つあたり</label>
          <label className="radio"><input type="radio" checked={unit === '100g'} onChange={() => setUnit('100g')} />100gあたり</label>
          <label className="radio"><input type="radio" checked={unit === 'none'} onChange={() => setUnit('none')} />値段を入れない</label>
          {unit === 'none' && <p className="note">値段をくらべません。リストには入れられます</p>}
        </fieldset>
        <fieldset>
          <legend>税率</legend>
          <label className="radio"><input type="radio" checked={taxRate === 8} onChange={() => setTaxRate(8)} />食品（8%）</label>
          <label className="radio"><input type="radio" checked={taxRate === 10} onChange={() => setTaxRate(10)} />食品以外（10%）</label>
        </fieldset>
        {error && <p className="error">{error}</p>}
        {product && <button type="button" className="plain danger" onClick={remove}>この商品を消す</button>}
      </form>
    </Sheet>
  );
}
