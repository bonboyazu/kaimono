import { useState } from 'react';
import { useRow } from '../../data/hooks.ts';
import type { Store, TaxMode } from '../../domain/types.ts';
import Sheet from '../../ui/Sheet.tsx';
import TaxToggle from '../../ui/TaxToggle.tsx';
import { addStore, deleteStore, updateStore } from './actions.ts';

/** id がなければ新しく足す。名前と、値段の書き方（税込・税抜）。優先順と扱いは設定で変える */
export default function StoreEditor({ id, onClose, onAdded }: {
  id: string | null; onClose: () => void; onAdded?: (id: string) => void;
}) {
  const store = useRow('stores', id ?? undefined);
  if (id && !store) return null;
  return <StoreForm key={id ?? 'new'} store={store ?? null} onClose={onClose} onAdded={onAdded} />;
}

function StoreForm({ store, onClose, onAdded }: { store: Store | null; onClose: () => void; onAdded?: (id: string) => void }) {
  const [name, setName] = useState(store?.name ?? '');
  const [taxMode, setTaxMode] = useState<TaxMode>(store?.default_tax_mode ?? 'included');
  const [error, setError] = useState('');

  const save = async () => {
    try {
      if (store) await updateStore(store, { name, default_tax_mode: taxMode });
      else {
        // onAdded?.(await addStore(...)) と書くと、onAdded がないとき addStore ごと飛ばされる
        const newId = await addStore(name, undefined, taxMode);
        onAdded?.(newId);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async () => {
    if (!store) return;
    if (!window.confirm(`「${store.name}」を消しますか。この店の値段も、一覧と提案に出なくなります`)) return;
    await deleteStore(store);
    onClose();
  };

  return (
    <Sheet title={store ? '店を編集' : '店を足す'} onClose={onClose} formId="store-form">
      <form id="store-form" className="form-grid" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <label>
          名前
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="field">
          <span>値段の書き方（値段を入れるときの初期値）</span>
          <TaxToggle value={taxMode} onChange={setTaxMode} label="値段の書き方" />
        </div>
        {error && <p className="error">{error}</p>}
        {store && <button type="button" className="plain danger" onClick={remove}>この店を消す</button>}
      </form>
    </Sheet>
  );
}
