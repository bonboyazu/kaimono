// 新しい版の確認と、引っ張って更新したときの処理
import { syncNow } from './sync/engine.ts';

let registration: ServiceWorkerRegistration | undefined;

export function setRegistration(r: ServiceWorkerRegistration | undefined) {
  registration = r;
}

/** 新しい版があるかを確かめる。電波がないときは何もしない */
export async function checkForUpdate(): Promise<void> {
  try {
    await registration?.update();
  } catch {
    // 電波がない・サーバーに届かない
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * データをそろえ直し、新しい版を確かめる。画面は読み直さない
 * 新しい版が入ってきたときだけ、それを入れて読み直す（registerSW が読み直す。念のため3秒で読み直す）
 */
export async function refreshApp(
  reload: () => void = () => window.location.reload(),
  sync: () => Promise<void> = syncNow,
): Promise<void> {
  // くるくるが一瞬で消えると分かりにくいので、最低 0.6 秒は出す
  await Promise.all([checkForUpdate(), sync().catch(() => undefined), sleep(600)]);
  if (registration?.installing ?? registration?.waiting) {
    setTimeout(reload, 3000);
    await new Promise(() => undefined); // 読み直すまで、くるくるを出したままにする
  }
}
