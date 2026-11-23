// 名前の欄の中の右はしに、× と肉のアイコン。肉を押すと欄のすぐ下で、種類 → 部位 → カットを1段ずつ選ぶ
import { useRef, useState, type ReactNode } from 'react';
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

function ClearIcon() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="currentColor" />
      <path d="M6.8 6.8l6.4 6.4M13.2 6.8l-6.4 6.4" stroke="var(--color-surface)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * children は名前の欄（input）。欄の中の右はしに × と肉のアイコンを重ねる
 * onChange：× と肉の組み立てで欄を変えるとき。onMeat：肉の組み立てで変えたときだけ（単位を 100gあたりにするなど）
 */
export default function MeatField({ value, onChange, onMeat, children }: {
  value: string; onChange: (v: string) => void; onMeat?: (v: string) => void; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const setByMeat = (v: string) => {
    onChange(v);
    onMeat?.(v);
  };
  return (
    <div className="meat-field">
      <div className={`name-box${value ? ' has-value' : ''}`} ref={box}>
        {children}
        {value && (
          <button
            type="button" className="clear-btn" aria-label="欄を空にする"
            onClick={() => { onChange(''); box.current?.querySelector('input')?.focus(); }}
          >
            <ClearIcon />
          </button>
        )}
        <button
          type="button" className="meat-btn" aria-label="肉の名前を組み立てる" aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <MeatIcon />
        </button>
      </div>
      {open && <MeatPanel onName={setByMeat} onDone={() => setOpen(false)} />}
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

/** 押すたびに欄へ名前を入れる。カットを押すか、カットのない部位を押すと閉じる。途中でやめてもよい */
function MeatPanel({ onName, onDone }: { onName: (name: string) => void; onDone: () => void }) {
  const [kind, setKind] = useState<MeatKind | null>(null);
  const [part, setPart] = useState<string | null>(null);

  const pickKind = (k: string) => {
    const next = k as MeatKind;
    setKind(next);
    setPart(null);
    onName(meatName(next));
  };
  const pickPart = (p: string) => {
    if (!kind) return;
    onName(meatName(kind, p));
    if (needsCut(kind, p)) setPart(p);
    else onDone();
  };
  const pickCut = (c: string) => {
    if (!kind || !part) return;
    onName(meatName(kind, part, c));
    onDone();
  };

  const step = !kind ? '種類' : !part ? (kind === 'ひき肉' ? '肉' : '部位') : 'カット';
  return (
    <div className="meat-panel">
      <div className="meat-crumbs">
        {kind && (
          <button type="button" aria-label={`種類を選び直す（${kind}）`} onClick={() => { setKind(null); setPart(null); onName(''); }}>
            {kind}
          </button>
        )}
        {kind && <span aria-hidden="true">›</span>}
        {kind && part && (
          <button type="button" aria-label={`部位を選び直す（${part}）`} onClick={() => { setPart(null); onName(meatName(kind)); }}>
            {part}
          </button>
        )}
        {part && <span aria-hidden="true">›</span>}
        <span className="note">{step}を選ぶ{step === 'カット' ? '（なくてもよい）' : ''}</span>
      </div>
      {!kind && <Grid label="種類" options={MEAT_KINDS} wide onPick={pickKind} />}
      {kind && !part && <Grid label="部位" options={meatParts(kind)} onPick={pickPart} />}
      {kind && part && <Grid label="カット" options={MEAT_CUTS} onPick={pickCut} />}
    </div>
  );
}
