// node scripts/gen-preset-sql.ts で supabase/migrations/0003_preset_products.sql を作る
import { writeFileSync } from 'node:fs';
import { presetProductsSql } from '../src/domain/presetsSql.ts';

writeFileSync(new URL('../supabase/migrations/0003_preset_products.sql', import.meta.url), await presetProductsSql());
console.log('0003_preset_products.sql を作りました');
