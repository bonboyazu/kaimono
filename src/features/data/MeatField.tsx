// 名前の欄の横に「肉」のボタン。種類 → 部位 → カットを押すと、組み立てた名前を渡す
import { useState, type ReactNode } from 'react';
import { MEAT_CUTS, MEAT_KINDS, meatName, meatParts, needsCut, type MeatKind } from '../../domain/meat.ts';

export default function MeatField({ children, onPick }: { children: ReactNode; onPick: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="meat-field">
      <div className="meat-row">
        {children}
        <button type="button" className="meat-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>肉</button>
      </div>
      {open && <MeatPanel onPick={(name) => { onPick(name); setOpen(false); }} />}
    </div>
  );
}

function Chips({ label, options, value, onPick }: {
  label: string; options: readonly string[]; value: string | null; onPick: (v: string) => void;
}) {
  return (
    <div className="meat-step">
      <span className="note">{label}</span>
      <div className="chips" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={o === value} onClick={() => onPick(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}

function MeatPanel({ onPick }: { onPick: (name: string) => void }) {
  const [kind, setKind] = useState<MeatKind | null>(null);
  const [part, setPart] = useState<string | null>(null);

  const pickKind = (k: string) => {
    const next = k as MeatKind;
    // 合いびきは部位が1つだけなので、すぐ決まる
    if (next === '合いびき') return onPick(meatName(next, 'ひき肉', null));
    setKind(next);
    setPart(null);
  };
  const pickPart = (p: string) => {
    if (!kind) return;
    if (!needsCut(kind, p)) return onPick(meatName(kind, p, null));
    setPart(p);
  };

  return (
    <div className="meat-panel">
      <Chips label="種類" options={MEAT_KINDS} value={kind} onPick={pickKind} />
      {kind && <Chips label="部位" options={meatParts(kind)} value={part} onPick={pickPart} />}
      {kind && part && <Chips label="カット" options={MEAT_CUTS} value={null} onPick={(c) => onPick(meatName(kind, part, c))} />}
    </div>
  );
}
