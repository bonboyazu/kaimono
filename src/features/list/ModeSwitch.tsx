// 上の「リスト／提案」の切り替え。URL の ?mode=plan で持つ（通知から提案を開けるように）
import { useSearchParams } from 'react-router-dom';

export type Mode = 'list' | 'plan';

export function useMode(): [Mode, (m: Mode) => void] {
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get('mode') === 'plan' ? 'plan' : 'list';
  const set = (m: Mode) => setParams(m === 'plan' ? { mode: 'plan' } : {}, { replace: true });
  return [mode, set];
}

export default function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="mode-switch" role="group" aria-label="表示の切り替え">
      <button type="button" aria-pressed={mode === 'list'} onClick={() => onChange('list')}>リスト</button>
      <button type="button" aria-pressed={mode === 'plan'} onClick={() => onChange('plan')}>提案</button>
    </div>
  );
}
