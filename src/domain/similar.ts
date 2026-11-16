// 似た名前の商品を探す（2つ登録してしまわないように）

/** 比べるための形：前後の空白を除き、半角カナ→全角（NFKC）、カタカナ→ひらがな、英字は小文字 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .toLowerCase();
}

/** 入れた名前を含む商品と、入れた名前に含まれる商品。元の並びのまま返す */
export function similarNames(input: string, names: string[]): string[] {
  const q = normalizeName(input);
  if (!q) return [];
  return names.filter((n) => {
    const m = normalizeName(n);
    return m.includes(q) || q.includes(m);
  });
}
