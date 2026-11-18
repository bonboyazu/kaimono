import { useState } from 'react';
import { disablePush, pushEnv, pushOn, sendTestPush, subscribePush } from '../../data/push.ts';

type Env = { standalone: boolean; supported: boolean };

export default function NotificationSettings({ env = pushEnv(), initialOn }: { env?: Env; initialOn?: boolean }) {
  const [on, setOn] = useState(() => initialOn ?? (env.supported && pushOn()));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<{ ok: boolean; message?: string }>, okText: string) => {
    setBusy(true);
    setMessage('');
    try {
      const r = await fn();
      setMessage(r.ok ? (r.message ?? okText) : (r.message ?? ''));
      return r.ok;
    } catch (err) {
      setMessage(`うまくいきませんでした（${err instanceof Error ? err.message : String(err)}）`);
      return false;
    } finally {
      setBusy(false);
    }
  };

  // iOS では、許可を求める処理を押した処理の中で呼ぶ
  const toggle = async () => {
    if (on) {
      if (await run(disablePush, '')) setOn(false);
    } else if (await run(subscribePush, '')) {
      setOn(true);
    }
  };

  return (
    <section className="card">
      <h2>通知</h2>
      {!env.standalone ? (
        <p className="note">ホーム画面に追加してから開いてください</p>
      ) : !env.supported ? (
        <p className="note">この端末では通知を使えません（iOS 16.4 以降が必要です）</p>
      ) : (
        <>
          <div className="toggle-row">
            <span id="push-label">通知を受け取る</span>
            <button
              type="button" role="switch" className="toggle" aria-checked={on} aria-labelledby="push-label"
              disabled={busy} onClick={() => void toggle()}
            />
          </div>
          {on && (
            <button type="button" disabled={busy} onClick={() => void run(sendTestPush, '送りました')}>
              試しの通知を送る
            </button>
          )}
        </>
      )}
      {message && <p className="note" role="status">{message}</p>}
    </section>
  );
}
