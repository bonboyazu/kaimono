// 通知の宛先を作って保存する。電波があるときに直接サーバーを読み書きする
import { getSupabase } from './supabase.ts';

const ENDPOINT_KEY = 'kaimono:push-endpoint';
const ON_KEY = 'kaimono:push-on';

/** この端末で通知をオンにしているか */
export function pushOn(): boolean {
  try {
    if (Notification.permission !== 'granted') return false;
    const v = localStorage.getItem(ON_KEY);
    // スイッチを作る前に「通知を受け取る」を押した端末は、オンとみなす
    return v === null ? localStorage.getItem(ENDPOINT_KEY) !== null : v === '1';
  } catch {
    return false;
  }
}

function setPushOn(on: boolean) {
  try {
    localStorage.setItem(ON_KEY, on ? '1' : '0');
  } catch {
    // 残せなくても続ける
  }
}

export function pushEnv() {
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true;
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  return { standalone, supported };
}

export function savedEndpoint(): string | null {
  try {
    return localStorage.getItem(ENDPOINT_KEY);
  } catch {
    return null;
  }
}

function base64UrlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** ボタンを押した処理の中で呼ぶ（iOS の決まり） */
export async function subscribePush(): Promise<{ ok: true } | { ok: false; message: string }> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, message: '通知が許可されていません。iPhone の設定 → 通知 → 買い物 で許可してください' };
  }
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!key) return { ok: false, message: '通知の鍵が設定されていません' };
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) }));
  const json = sub.toJSON();
  const { error } = await getSupabase()
    .from('push_subscriptions')
    .upsert(
      { endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth, enabled: true },
      { onConflict: 'endpoint' },
    );
  if (error) return { ok: false, message: `保存できませんでした（${error.message}）` };
  try {
    localStorage.setItem(ENDPOINT_KEY, sub.endpoint);
  } catch {
    // 残せなくても続ける
  }
  setPushOn(true);
  return { ok: true };
}

/** 通知を止める。宛先は残し、送らない印を付ける */
export async function disablePush(): Promise<{ ok: true } | { ok: false; message: string }> {
  const endpoint = savedEndpoint();
  if (endpoint) {
    const { error } = await getSupabase().from('push_subscriptions').update({ enabled: false }).eq('endpoint', endpoint);
    if (error) return { ok: false, message: `止められませんでした（${error.message}）` };
  }
  setPushOn(false);
  return { ok: true };
}

export async function sendTestPush(): Promise<{ ok: boolean; message: string }> {
  const endpoint = savedEndpoint();
  if (!endpoint) return { ok: false, message: '先に通知をオンにしてください' };
  const { error } = await getSupabase().functions.invoke('send-test-push', { body: { endpoint } });
  if (error) return { ok: false, message: `送れませんでした（${error.message}）` };
  return { ok: true, message: '送りました。数秒で届きます' };
}
