// 店を選んでいるときの、行の値段の欄。確定で保存し、次の行の欄に移る
// 量あたりの商品は、量と値段の2つの欄。量で確定すると値段の欄に移る
import { forwardRef, useEffect, useRef, useState, type FocusEvent, type ForwardedRef } from 'react';
import { sizeUnitOf } from '../../domain/size.ts';
import type { Price, Product, Store } from '../../domain/types.ts';
import { parseAmount, savePrice } from './actions.ts';
import { yen } from './filters.ts';

type Props = { store: Store; product: Product; price: Price | null; onNext: () => void };

const QuickPriceInput = forwardRef<HTMLInputElement, Props>(function QuickPriceInput(
  { store, product, price, onNext },
  ref,
) {
  const unit = sizeUnitOf(product.unit);
  const saved = price ? String(price.amount) : '';
  const savedSize = price?.size ? String(price.size) : '';
  const [text, setText] = useState(saved);
  const [sizeText, setSizeText] = useState(savedSize);
  const [error, setError] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const focused = useRef(false);
  const sent = useRef<string | null>(null); // Enter のあとの blur で2回送らないため
  const priceInput = useRef<HTMLInputElement | null>(null);
  const sizeInput = useRef<HTMLInputElement | null>(null);
  const mode = price?.tax_mode ?? store.default_tax_mode;

  useEffect(() => {
    sent.current = null;
    if (!focused.current) {
      setText(saved);
      setSizeText(savedSize);
    }
  }, [saved, savedSize]);

  const changed = () => text.trim() !== saved || (!!unit && sizeText.trim() !== savedSize);

  const commit = async () => {
    const t = text.trim();
    const st = sizeText.trim();
    const key = `${st}|${t}`;
    if (!changed() || key === sent.current) return;
    if (t === '' && !saved) return; // 量だけ打ったところ。値段を打つまで待つ
    if (t === '') {
      setText(saved); // 空にしても消さない。消すのは編集の画面から
      if (!unit) return; // 量あたりの商品は、量だけ直したことにする
    }
    const amount = parseAmount(t === '' ? saved : t);
    if (amount === null) {
      setError(true);
      setText(saved);
      return;
    }
    setError(false);
    let size: number | null = null;
    if (unit) {
      size = parseAmount(st);
      if (size === null) {
        setSizeError(true); // 量がないと比べられないので保存しない
        return;
      }
      setSizeError(false);
    }
    sent.current = key;
    await savePrice(store, product, { amount, tax_mode: mode, size });
  };

  /** 同じ行のもう1つの欄に移るときは保存しない */
  const leavesRow = (e: FocusEvent<HTMLInputElement>) =>
    e.relatedTarget !== priceInput.current && e.relatedTarget !== sizeInput.current;

  const parsed = parseAmount(text);
  const priceField = (
    <input
      ref={(el) => {
        priceInput.current = el;
        if (!unit) assign(ref, el);
      }}
      type="text"
      inputMode="numeric"
      enterKeyHint="next"
      className={unit ? 'price-in' : undefined}
      aria-label={`${product.name}の値段`}
      aria-invalid={error || undefined}
      value={text}
      placeholder="—"
      onFocus={() => (focused.current = true)}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          void commit();
          onNext();
        }
      }}
      onBlur={(e) => {
        focused.current = false;
        if (!leavesRow(e)) return;
        const moved = changed();
        void commit();
        // キーボードの「完了」で閉じたとき（ほかの欄やボタンに移っていない）も、次の欄に移る
        if (e.relatedTarget === null && e.nativeEvent instanceof globalThis.FocusEvent && moved) onNext();
      }}
    />
  );
  return (
    <span className={unit ? 'quick-price size' : 'quick-price'}>
      {unit && (
        <>
          <input
            ref={(el) => {
              sizeInput.current = el;
              assign(ref, el);
            }}
            type="text"
            inputMode="numeric"
            enterKeyHint="next"
            className="size-in"
            aria-label={`${product.name}の量`}
            aria-invalid={sizeError || undefined}
            value={sizeText}
            placeholder="量"
            onFocus={() => (focused.current = true)}
            onChange={(e) => setSizeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                priceInput.current?.focus();
              }
            }}
            onBlur={(e) => {
              focused.current = false;
              if (leavesRow(e)) void commit();
            }}
          />
          <span>{unit.label}</span>
        </>
      )}
      {priceField}
      <span className="note">{mode === 'included' ? '税込' : '税抜'}</span>
      {mode === 'excluded' && parsed !== null && (
        <span className="note">→ 税込 {yen({ amount: parsed, tax_mode: mode }, product)}円</span>
      )}
    </span>
  );
});

function assign<T>(ref: ForwardedRef<T>, el: T | null) {
  if (typeof ref === 'function') ref(el);
  else if (ref) ref.current = el;
}

export default QuickPriceInput;
