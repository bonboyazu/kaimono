// 名前の欄の中の右はしに、肉のアイコン。押すと欄のすぐ下で、種類 → 部位 → カットを1段ずつ選ぶ
import { useState, type ReactNode } from 'react';
import { MEAT_CUTS, MEAT_KINDS, meatName, meatParts, needsCut, type MeatKind } from '../../domain/meat.ts';

function MeatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <ellipse cx="15" cy="9" rx="6.6" ry="5.1" transform="rotate(-45 15 9)" fill="currentColor" />
      <path d="M12.4 7.8c.9-1.4 2.5-2.2 4-2.2" stroke="var(--meat-shine)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M10.6 13.4 6.6 17.4" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="4.9" cy="17.3" r="2" fill="currentColor" />
      <circle cx="6.7" cy="19.1" r="2" fill="currentColor" />
    </svg>
  );
}

/** children は名前の欄（input）。アイコンは欄の中に重ねる */
export default function MeatField({ children, onPick }: { children: ReactNode; onPick: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="meat-field">
      <div className="name-box">
        {children}
        <button
          type="button" className="meat-btn" aria-label="肉の名前を組み立てる" aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <MeatIcon />
        </button>
      </div>
      {open && <MeatPanel onPick={(name) => { onPick(name); setOpen(false); }} />}
    </div>
  );
}

function Grid({ label, options, wide, onPick }: {
  label: string; options: readonly string[]; wide?: boolean; onPick: (v: string) => void;
}) {
  return (
    <div className={`meat-grid${wide ? ' wide' : ''}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onPick(o)}>{o}</button>
      ))}
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

  const step = !kind ? '種類' : !part ? '部位' : 'カット';
  return (
    <div className="meat-panel">
      <div className="meat-crumbs">
        {kind && <button type="button" aria-label={`種類を選び直す（${kind}）`} onClick={() => { setKind(null); setPart(null); }}>{kind}</button>}
        {kind && <span aria-hidden="true">›</span>}
        {part && <button type="button" aria-label={`部位を選び直す（${part}）`} onClick={() => setPart(null)}>{part}</button>}
        {part && <span aria-hidden="true">›</span>}
        <span className="note">{step}を選ぶ</span>
      </div>
      {kind && <p className="meat-preview">{meatName(kind, part ?? '', null)}…</p>}
      {step === '種類' && <Grid label="種類" options={MEAT_KINDS} wide onPick={pickKind} />}
      {step === '部位' && kind && <Grid label="部位" options={meatParts(kind)} onPick={pickPart} />}
      {step === 'カット' && kind && part && (
        <Grid label="カット" options={MEAT_CUTS} onPick={(c) => onPick(meatName(kind, part, c))} />
      )}
    </div>
  );
}
