import type { ReactNode } from 'react';

/** 画面の上に重ねる入力の画面 */
/** formId を渡すと、右上に「保存」を出す（下がキーボードで隠れても押せるように） */
export default function Sheet({ title, onClose, children, formId }: {
  title: string; onClose: () => void; children: ReactNode; formId?: string;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="plain" onClick={onClose}>閉じる</button>
          {formId && <button type="submit" form={formId} className="primary">保存</button>}
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
