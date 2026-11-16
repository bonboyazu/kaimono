// いつ push・pull するかの制御
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, MAX_ATTEMPTS, type LocalDb } from '../db.ts';
import type { Remote } from '../remote.ts';
import { onWrite } from './mutate.ts';
import { push } from './push.ts';
import { pull } from './pull.ts';

export async function countStatus(local: LocalDb): Promise<{ pending: number; failed: number }> {
  const all = await local.outbox.toArray();
  const failed = all.filter((e) => e.attempts >= MAX_ATTEMPTS).length;
  return { pending: all.length - failed, failed };
}

const INTERVAL_MS = 60_000;

/** 1回分：送ってから読む。同時に2つ動かさない */
export function makeRunner(local: LocalDb, remote: Remote) {
  let running: Promise<void> | null = null;
  let again = false;
  const once = async () => {
    try {
      const ok = await push(local, remote);
      if (ok) await pull(local, remote);
    } catch (err) {
      console.warn('同期に失敗しました', err);
    }
  };
  const run = (): Promise<void> => {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      do {
        again = false;
        await once();
      } while (again);
      running = null;
    })();
    return running;
  };
  return run;
}

/** 止める関数を返す。realtime は subscribe に渡す（ログイン後に supabase と結ぶ） */
export function startSync(remote: Remote, subscribe?: () => () => void, local: LocalDb = db): () => void {
  const run = makeRunner(local, remote);
  let timer: ReturnType<typeof setInterval> | null = null;

  const startTimer = () => {
    if (!timer) timer = setInterval(run, INTERVAL_MS);
  };
  const stopTimer = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      run();
      startTimer();
    } else {
      stopTimer();
    }
  };

  window.addEventListener('online', run);
  document.addEventListener('visibilitychange', onVisibility);
  const offWrite = onWrite(() => void run());
  const unsubscribe = subscribe?.();
  run();
  if (document.visibilityState === 'visible') startTimer();

  return () => {
    window.removeEventListener('online', run);
    document.removeEventListener('visibilitychange', onVisibility);
    offWrite();
    unsubscribe?.();
    stopTimer();
  };
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function useSyncStatus(): { pending: number; failed: number; online: boolean } {
  const counts = useLiveQuery(() => countStatus(db), [], { pending: 0, failed: 0 });
  const online = useOnline();
  return { ...counts, online };
}
