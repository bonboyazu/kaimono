// 値段を足すときの商品の欄。打つと候補が縦に並び、なければその場で足す。欄の中の肉のアイコンで名前を組み立てられる
import { useId, useState } from 'react';
import { isMeatName } from '../../domain/meat.ts';
import { normalizeName } from '../../domain/similar.ts';
import type { Product } from '../../domain/types.ts';
import { addProductByName } from './actions.ts';
import MeatField from './MeatField.tsx';

const LIMIT = 8;

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
  const hits = q ? options.filter((o) => o.name.includes(q)) : [];
  const same = q ? products.find((p) => normalizeName(p.name) === normalizeName(q)) : undefined;

  const create = async () => {
    try {
      onChange(await addProductByName(q));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="picker">
      <label className="picker-label" htmlFor={id}>商品</label>
      <MeatField value={query} onChange={(v) => { setQuery(v); setError(''); }}>
        <input
          id={id} type="search" placeholder="商品の名前で探す" value={query}
          onChange={(e) => { setQuery(e.target.value); setError(''); }}
        />
      </MeatField>
      {q && (
        <ul className="add-list" aria-label="商品の候補">
          {hits.slice(0, LIMIT).map((o) => (
            <li key={o.id}>
              <button type="button" aria-label={o.name} onClick={() => onChange(o.id)}>
                <span>{o.name}</span>
                <span className="note">{o.unit === '100g' ? '100gあたり' : '1つあたり'}</span>
              </button>
            </li>
          ))}
          {hits.length > LIMIT && <li className="note picker-more">ほか {hits.length - LIMIT} 件。名前を打って絞り込む</li>}
          {!same && (
            <li>
              <button type="button" className="add-new" aria-label={`“${q}”を足す`} onClick={() => void create()}>
                <span>＋ “{q}”を足す</span>
                <span className="note">{isMeatName(q) ? '100gあたり' : '1つあたり'}</span>
              </button>
            </li>
          )}
          {same?.unit === 'none' && <li className="note picker-more">「{same.name}」は値段を入れない商品です</li>}
        </ul>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
