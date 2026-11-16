import { useState } from 'react';
import { pushEnv, sendTestPush, subscribePush } from '../../data/push.ts';

type Env = { standalone: boolean; supported: boolean };

export default function NotificationSettings({ env = pushEnv() }: { env?: Env }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<{ ok: boolean; message?: string }>, okText: string) => {
    setBusy(true);
    setMessage('');
    try {
      const r = await fn();
      setMessage(r.ok ? (r.message ?? okText) : (r.message ?? ''));
    } catch (err) {
      setMessage(`うまくいきませんでした（${err instanceof Error ? err.message : String(err)}）`);
    } finally {
      setBusy(false);
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
        <div className="row">
          <button type="button" className="primary" disabled={busy} onClick={() => run(subscribePush, '通知を受け取る設定にしました')}>
            通知を受け取る
          </button>
          <button type="button" disabled={busy} onClick={() => run(sendTestPush, '送りました')}>
            試しの通知を送る
          </button>
        </div>
      )}
      {message && <p className="note" role="status">{message}</p>}
    </section>
  );
}
