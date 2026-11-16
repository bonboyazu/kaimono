import type { TaxMode } from '../domain/types.ts';

export default function TaxToggle({ value, onChange, label = '税込・税抜' }: {
  value: TaxMode; onChange: (v: TaxMode) => void; label?: string;
}) {
  return (
    <span className="segmented" role="group" aria-label={label}>
      {(['included', 'excluded'] as const).map((m) => (
        <button key={m} type="button" aria-pressed={value === m} onClick={() => onChange(m)}>
          {m === 'included' ? '税込' : '税抜'}
        </button>
      ))}
    </span>
  );
}
