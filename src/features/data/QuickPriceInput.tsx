// 店を選んでいるときの、行の値段の欄。確定で保存し、次の行の欄に移る
import { forwardRef, useEffect, useRef, useState } from 'react';
import type { Price, Product, Store } from '../../domain/types.ts';
import { parseAmount, savePrice } from './actions.ts';
import { yen } from './filters.ts';

type Props = { store: Store; product: Product; price: Price | null; onNext: () => void };

const QuickPriceInput = forwardRef<HTMLInputElement, Props>(function QuickPriceInput(
  { store, product, price, onNext },
  ref,
) {
  const saved = price ? String(price.amount) : '';
  const [text, setText] = useState(saved);
  const [error, setError] = useState(false);
  const focused = useRef(false);
  const sent = useRef<string | null>(null); // Enter のあとの blur で2回送らないため
  const mode = price?.tax_mode ?? store.default_tax_mode;

  useEffect(() => {
    sent.current = null;
    if (!focused.current) setText(saved);
  }, [saved]);

  const commit = async () => {
    const t = text.trim();
    if (t === saved || t === sent.current) return;
    if (t === '') {
      setText(saved); // 空にしても消さない。消すのは編集の画面から
      return;
    }
    const amount = parseAmount(t);
    if (amount === null) {
      setError(true);
      setText(saved);
      return;
    }
    setError(false);
    sent.current = t;
    await savePrice(store, product, amount, mode);
  };

  const parsed = parseAmount(text);
  return (
    <span className="quick-price">
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        enterKeyHint="next"
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
          void commit();
          // キーボードの「完了」で閉じたとき（ほかの欄やボタンに移っていない）も、次の欄に移る
          if (e.relatedTarget === null && e.nativeEvent instanceof FocusEvent && text.trim() !== saved) onNext();
        }}
      />
      <span className="note">{mode === 'included' ? '税込' : '税抜'}</span>
      {mode === 'excluded' && parsed !== null && (
        <span className="note">→ 税込 {yen({ amount: parsed, tax_mode: mode }, product)}円</span>
      )}
    </span>
  );
});

export default QuickPriceInput;
