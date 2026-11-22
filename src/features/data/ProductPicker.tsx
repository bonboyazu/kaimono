// 値段を足すときの商品の欄。打って絞り込み、なければその場で足す。「肉」で名前を組み立てられる
import { useId, useState } from 'react';
import { isMeatName } from '../../domain/meat.ts';
import { normalizeName } from '../../domain/similar.ts';
import type { Product } from '../../domain/types.ts';
import { addProduct } from './actions.ts';
import MeatField from './MeatField.tsx';

const LIMIT = 30;

export default function ProductPicker({ products, value, onChange }: {
  /** 消していない商品すべて（値段を入れない商品は候補に出さない） */
  products: Product[]; value: string; onChange: (id: string) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const options = products.filter((p) => p.unit !== 'none').sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  const selected = options.find((o) => o.id === value);
  if (selected) {
    return (
      <div className="picker">
        <span className="picker-label">商品</span>
        <div className="picker-chosen">
          <span>{selected.name}</span>
          <button type="button" className="plain" onClick={() => { setQuery(''); onChange(''); }}>商品を変える</button>
        </div>
      </div>
    );
  }
  const q = query.trim();
  const hits = options.filter((o) => o.name.includes(q));
  const same = q ? products.find((p) => normalizeName(p.name) === normalizeName(q)) : undefined;

  const create = async () => {
    try {
      onChange(await addProduct({ name: q, unit: isMeatName(q) ? '100g' : 'piece', tax_rate: 8 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="picker">
      <label className="picker-label" htmlFor={id}>商品</label>
      <MeatField onPick={(name) => { setQuery(name); setError(''); }}>
        <input
          id={id} type="search" placeholder="商品の名前で探す" value={query}
          onChange={(e) => { setQuery(e.target.value); setError(''); }}
        />
      </MeatField>
      <ul className="picker-list" aria-label="商品の候補">
        {hits.slice(0, LIMIT).map((o) => (
          <li key={o.id}><button type="button" onClick={() => onChange(o.id)}>{o.name}</button></li>
        ))}
        {hits.length > LIMIT && <li className="note">ほか {hits.length - LIMIT} 件。名前を打って絞り込む</li>}
        {q && !same && (
          <li><button type="button" className="add-new" onClick={() => void create()}>“{q}”を追加</button></li>
        )}
        {same?.unit === 'none' && <li className="note">「{same.name}」は値段を入れない商品です</li>}
        {hits.length === 0 && !q && <li className="note">当てはまるものがありません</li>}
      </ul>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
