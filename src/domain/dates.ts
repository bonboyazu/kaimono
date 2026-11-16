// 日本時間で判断する。日付は 'YYYY-MM-DD' の文字列で持つ

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function jstParts(now: Date): Date {
  return new Date(now.getTime() + JST_OFFSET_MS);
}

const pad = (n: number) => String(n).padStart(2, '0');

export function jstDate(now: Date): string {
  const d = jstParts(now);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function jstTime(now: Date): string {
  const d = jstParts(now);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** 0=日曜 〜 6=土曜 */
export function weekdayOf(date: string): number {
  return parse(date).getUTCDay();
}

export function addDays(date: string, n: number): string {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + n);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
