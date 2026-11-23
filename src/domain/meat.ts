// 肉の名前を組み立てる：種類 ＋ 部位 ＋ カット（例：豚バラ薄切り）。名前を入れる道具で、商品の表は変えない
// ひき肉は種類と同じ段に置き、牛・豚・鶏・合いびきから選ぶ（例：鶏ひき肉・合いびき肉）

export const MEAT_KINDS = ['牛', '豚', '鶏', 'ひき肉'] as const;
export type MeatKind = (typeof MEAT_KINDS)[number];

const PARTS: Record<MeatKind, string[]> = {
  牛: ['肩ロース', 'ロース', 'サーロイン', 'バラ', 'もも', 'ヒレ', 'すね', 'こま'],
  豚: ['肩ロース', 'ロース', 'バラ', 'もも', 'ヒレ', 'こま'],
  鶏: ['もも', 'むね', 'ささみ', '手羽元', '手羽先'],
  ひき肉: ['牛', '豚', '鶏', '合いびき'],
};

export const MEAT_CUTS = ['かたまり', '薄切り', '切り落とし', '厚切り', '角切り'];

/** 種類を名前に付けない部位（手羽は鶏しかない） */
const NO_KIND = ['手羽元', '手羽先'];

export const meatParts = (kind: MeatKind): string[] => PARTS[kind];

/** カットを選ぶ段を出すか。ひき肉とこまは出さない */
export const needsCut = (kind: MeatKind, part: string): boolean => kind !== 'ひき肉' && part !== 'こま';

/** 押したところまでの名前。部位・カットは途中でもよい（例：豚 → 豚バラ → 豚バラ薄切り） */
export function meatName(kind: MeatKind, part: string | null = null, cut: string | null = null): string {
  if (kind === 'ひき肉') {
    if (!part) return 'ひき肉';
    return part === '合いびき' ? '合いびき肉' : `${part}ひき肉`;
  }
  if (!part) return kind;
  const head = NO_KIND.includes(part) ? part : `${kind}${part}`;
  return cut && needsCut(kind, part) ? `${head}${cut}` : head;
}

const ALL = new Set(
  MEAT_KINDS.flatMap((k) =>
    PARTS[k].flatMap((p) => [meatName(k, p), ...(needsCut(k, p) ? MEAT_CUTS.map((c) => meatName(k, p, c)) : [])]),
  ),
);

/** 組み立てでできる商品の名前か（足すときに 100gあたりにするため）。種類だけ（「豚」）は入れない */
export const isMeatName = (name: string): boolean => ALL.has(name.trim());
