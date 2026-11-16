import Sheet from '../../ui/Sheet.tsx';

export type AddKind = 'price' | 'product' | 'store';

export default function AddMenu({ onPick, onClose }: { onPick: (k: AddKind) => void; onClose: () => void }) {
  return (
    <Sheet title="何を足しますか" onClose={onClose}>
      <div className="form-grid">
        <button type="button" onClick={() => onPick('price')}>値段</button>
        <button type="button" onClick={() => onPick('product')}>商品</button>
        <button type="button" onClick={() => onPick('store')}>店</button>
      </div>
    </Sheet>
  );
}
