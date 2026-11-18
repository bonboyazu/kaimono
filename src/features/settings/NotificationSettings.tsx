// 通知のオン・オフと時刻。iPhone ごとの設定なので、電波があるときにサーバーを直接読み書きする
import { useEffect, useState } from 'react';
import { disablePush, loadPushSetting, pushEnv, pushOn, setNotifyTime, subscribePush } from '../../data/push.ts';
import { useOnline } from '../../data/sync/engine.ts';
import Select from '../../ui/Select.tsx';

type Env = { standalone: boolean; supported: boolean; permission: NotificationPermission };
type Result = { ok: true; message?: string } | { ok: false; message: string };
export type PushApi = {
  load: () => Promise<{ enabled: boolean; notify_time: string } | null>;
  subscribe: () => Promise<Result>;
  disable: () => Promise<Result>;
  setTime: (time: string) => Promise<Result>;
};

const realApi: PushApi = { load: loadPushSetting, subscribe: subscribePush, disable: disablePush, setTime: setNotifyTime };

const DEFAULT_TIME = '08:00';
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = String((i % 4) * 15).padStart(2, '0');
  return { value: `${String(h).padStart(2, '0')}:${m}`, label: `${h}:${m}` };
});

export default function NotificationSettings({
  env = pushEnv(),
  api = realApi,
  online: onlineProp,
  initialOn,
}: { env?: Env; api?: PushApi; online?: boolean; initialOn?: boolean }) {
  const onlineNow = useOnline();
  const online = onlineProp ?? onlineNow;
  const [on, setOn] = useState(() => initialOn ?? (env.supported && pushOn()));
  const [time, setTime] = useState(DEFAULT_TIME);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const usable = env.standalone && env.supported;

  // 開いたとき、サーバーにあるこの iPhone の設定に合わせる
  useEffect(() => {
    if (!usable || !online || !on) return;
    let alive = true;
    api
      .load()
      .then((row) => {
        if (!alive) return;
        if (!row || !row.enabled) setOn(false);
        if (row) setTime(row.notify_time);
      })
      .catch(() => {
        // 読めなくても、手元の状態で出す
      });
    return () => {
      alive = false;
    };
    // 開いたときと電波が戻ったときだけ読む
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usable, online]);

  const run = async (fn: () => Promise<Result>) => {
    setBusy(true);
    setMessage('');
    try {
      const r = await fn();
      setMessage(r.message ?? '');
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
      if (await run(api.disable)) setOn(false);
    } else if (await run(api.subscribe)) {
      setOn(true);
      const row = await api.load().catch(() => null);
      if (row) setTime(row.notify_time);
    }
  };

  const changeTime = async (next: string) => {
    const before = time;
    setTime(next);
    if (!(await run(() => api.setTime(next)))) setTime(before);
  };

  return (
    <section className="card">
      <div className="toggle-row">
        <h2 id="push-label">通知</h2>
        {usable && (
          <button
            type="button" role="switch" className="toggle" aria-checked={on} aria-labelledby="push-label"
            disabled={busy || !online} onClick={() => void toggle()}
          />
        )}
      </div>
      {!env.standalone ? (
        <p className="note">ホーム画面に追加してから開いてください</p>
      ) : !env.supported ? (
        <p className="note">この端末では通知を使えません（iOS 16.4 以降が必要です）</p>
      ) : (
        <>
          {env.permission === 'denied' && (
            <p className="note">通知が止められています。iPhone の設定 → 通知 → 買い物 で「通知を許可」をオンにしてください</p>
          )}
          {on && (
            <div className="field">
              <span>リストの商品がセールの日に、この時刻に知らせる</span>
              {online ? (
                <Select label="通知の時刻" value={time} options={TIME_OPTIONS} onChange={(v) => void changeTime(v)} />
              ) : (
                <p>{TIME_OPTIONS.find((o) => o.value === time)?.label}</p>
              )}
            </div>
          )}
          {!online && <p className="note">電波があるときに変更できます</p>}
        </>
      )}
      {message && <p className="note" role="status">{message}</p>}
    </section>
  );
}
