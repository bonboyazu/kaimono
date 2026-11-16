// 新しい版の確認と、引っ張って更新したときの読み直し
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

/** 新しい版があれば入れてから、なければそのまま読み直す（データもそろえ直す） */
export async function refreshApp(reload: () => void = () => window.location.reload()): Promise<void> {
  await checkForUpdate();
  const incoming = registration?.installing ?? registration?.waiting;
  if (!incoming) {
    reload();
    return;
  }
  // 新しい版が動き出すと、registerSW が読み直す。念のため3秒で読み直す
  setTimeout(reload, 3000);
}
