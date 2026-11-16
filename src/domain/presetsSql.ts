// 0003_preset_products.sql の中身を作る（scripts/gen-preset-sql.ts から呼ぶ）
import { presetProductId } from './ids.ts';
import { PRESET_PRODUCTS } from './presets.ts';

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

export async function presetProductsSql(): Promise<string> {
  const rows = await Promise.all(
    PRESET_PRODUCTS.map(async (p) => `  (${q(await presetProductId(p.name))}, ${q(p.name)}, ${q(p.unit)}, ${p.tax_rate}, true)`),
  );
  return [
    '-- 最初から入っている商品。npm run gen:presets で src/domain/presets.ts から作る（手で直さない）',
    'insert into public.products (id, name, unit, tax_rate, is_preset) values',
    rows.join(',\n'),
    'on conflict (id) do nothing;',
    '',
  ].join('\n');
}
