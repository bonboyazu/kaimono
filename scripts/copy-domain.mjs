// src/domain を supabase/functions/_shared/domain に写す（関数をデプロイする前に使う）
// テストのファイルは写さない
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'src/domain');
const to = join(root, 'supabase/functions/_shared/domain');

rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
for (const name of readdirSync(from)) {
  if (!name.endsWith('.ts') || name.endsWith('.test.ts')) continue;
  cpSync(join(from, name), join(to, name));
}
console.log(`写しました：${to}`);
