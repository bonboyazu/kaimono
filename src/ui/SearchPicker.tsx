// 文字で絞り込んで1つ選ぶ欄。選んだあとは名前と「変える」を出す
import { useState } from 'react';

type Option = { id: string; name: string };

export default function SearchPicker({ label, options, value, onChange, limit = 30 }: {
  label: string; options: Option[]; value: string; onChange: (id: string) => void; limit?: number;
}) {
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.id === value);
  if (selected) {
    return (
      <div className="picker">
        <span className="picker-label">{label}</span>
        <div className="picker-chosen">
          <span>{selected.name}</span>
          <button type="button" className="plain" onClick={() => { setQuery(''); onChange(''); }}>
            {label}を変える
          </button>
        </div>
      </div>
    );
  }
  const q = query.trim();
  const hits = options.filter((o) => o.name.includes(q));
  return (
    <div className="picker">
      <label className="picker-label">
        {label}
        <input type="search" placeholder={`${label}の名前で探す`} value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <ul className="picker-list" aria-label={`${label}の候補`}>
        {hits.slice(0, limit).map((o) => (
          <li key={o.id}><button type="button" onClick={() => onChange(o.id)}>{o.name}</button></li>
        ))}
        {hits.length > limit && <li className="note">ほか {hits.length - limit} 件。名前を打って絞り込む</li>}
        {hits.length === 0 && <li className="note">当てはまるものがありません</li>}
      </ul>
    </div>
  );
}
