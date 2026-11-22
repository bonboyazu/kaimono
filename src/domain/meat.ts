// 肉の名前を組み立てる：種類 ＋ 部位 ＋ カット（例：豚バラ薄切り）。名前を入れる道具で、商品の表は変えない

export const MEAT_KINDS = ['牛', '豚', '鶏', '合いびき'] as const;
export type MeatKind = (typeof MEAT_KINDS)[number];

const PARTS: Record<MeatKind, string[]> = {
  牛: ['肩ロース', 'ロース', 'サーロイン', 'バラ', 'もも', 'ヒレ', 'すね', 'こま', 'ひき肉'],
  豚: ['肩ロース', 'ロース', 'バラ', 'もも', 'ヒレ', 'こま', 'ひき肉'],
  鶏: ['もも', 'むね', 'ささみ', '手羽元', '手羽先', 'ひき肉'],
  合いびき: ['ひき肉'],
};

export const MEAT_CUTS = ['なし', 'かたまり', '薄切り', '切り落とし', '厚切り', 'ステーキ用', 'とんかつ用', 'しゃぶしゃぶ用', '角切り', '唐揚げ用'];

/** カットを選ばない部位 */
const NO_CUT = ['こま', 'ひき肉'];
/** 種類を名前に付けない部位（手羽は鶏しかない） */
const NO_KIND = ['手羽元', '手羽先'];

export const meatParts = (kind: MeatKind): string[] => PARTS[kind];

export const needsCut = (kind: MeatKind, part: string): boolean => kind !== '合いびき' && !NO_CUT.includes(part);

export function meatName(kind: MeatKind, part: string, cut: string | null): string {
  if (kind === '合いびき') return '合いびき肉';
  const head = NO_KIND.includes(part) ? part : `${kind}${part}`;
  return needsCut(kind, part) && cut && cut !== 'なし' ? `${head}${cut}` : head;
}

const ALL = new Set(
  MEAT_KINDS.flatMap((k) => PARTS[k].flatMap((p) => (needsCut(k, p) ? MEAT_CUTS.map((c) => meatName(k, p, c)) : [meatName(k, p, null)]))),
);

/** 組み合わせでできる名前か（足すときに 100gあたりにするため） */
export const isMeatName = (name: string): boolean => ALL.has(name.trim());
