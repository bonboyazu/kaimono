import type { ReactNode } from 'react';

/** 画面の上に重ねる入力の画面 */
export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="plain" onClick={onClose}>閉じる</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
