// id の決め方。2台が電波なしで同じものを作っても、同じ id になって1行にまとまるようにする

/** このアプリ用の名前空間。一度決めたら変えない */
export const APP_NAMESPACE = '04521222-b2bf-4832-9ea1-c400cd57fbd8';

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** RFC 4122 の uuid v5（SHA-1）。Web Crypto を使う */
export async function uuidv5(name: string, namespace: string = APP_NAMESPACE): Promise<string> {
  const ns = uuidToBytes(namespace);
  const nameBytes = new TextEncoder().encode(name);
  const data = new Uint8Array(ns.length + nameBytes.length);
  data.set(ns);
  data.set(nameBytes, ns.length);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', data));
  const bytes = hash.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

export const priceId = (storeId: string, productId: string) => uuidv5(`${storeId}:${productId}`);
export const salePriceId = (storeId: string, productId: string, weekday: number) =>
  uuidv5(`${storeId}:${productId}:${weekday}`);
export const excludedDateId = (date: string) => uuidv5(`date:${date}`);
export const storeOverrideId = (storeId: string) => uuidv5(`override:${storeId}`);
export const presetProductId = (name: string) => uuidv5(`preset:${name}`);

export function newId(): string {
  return crypto.randomUUID();
}
