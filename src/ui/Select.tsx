// セレクトボックスの代わり。iPhone の標準の選択は狭くて押しにくいので使わない
// ボタンを押すと、横いっぱい・1行 44px 以上の一覧が下に開く
import { useEffect, useRef, useState } from 'react';

type Option = { value: string; label: string };

export default function Select({ label, value, options, onChange, placeholder = '選ぶ' }: {
  label: string; value: string; options: Option[]; onChange: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div className="select" ref={box}>
      <button
        type="button" className="select-button" aria-label={label} aria-haspopup="listbox" aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{current?.label ?? placeholder}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="select-list" role="listbox" aria-label={label}>
          {options.map((o) => (
            <li
              key={o.value} role="option" aria-selected={o.value === value} tabIndex={0}
              onClick={() => { onChange(o.value); setOpen(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { onChange(o.value); setOpen(false); } }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
