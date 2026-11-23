// 名前の欄の中の右はしに、肉のアイコン。押すと欄のすぐ下で、種類 → 部位 → カットを1段ずつ選ぶ
import { useState, type ReactNode } from 'react';
import { MEAT_CUTS, MEAT_KINDS, meatName, meatParts, needsCut, type MeatKind } from '../../domain/meat.ts';

/** Tabler Icons の meat（MIT License, https://tabler.io/icons） */
function MeatIcon() {
  return (
    <svg
      viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <path d="M13.62 8.382l1.966 -1.967a2 2 0 1 1 3.414 -1.415a2 2 0 1 1 -1.413 3.414l-1.82 1.821" />
      <path d="M5.904 18.596c2.733 2.734 5.9 4 7.07 2.829c1.172 -1.172 -.094 -4.338 -2.828 -7.071c-2.733 -2.734 -5.9 -4 -7.07 -2.829c-1.172 1.172 .094 4.338 2.828 7.071z" />
      <path d="M7.5 16l1 1" />
      <path d="M12.975 21.425c3.905 -3.906 4.855 -9.288 2.121 -12.021c-2.733 -2.734 -8.115 -1.784 -12.02 2.121" />
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
