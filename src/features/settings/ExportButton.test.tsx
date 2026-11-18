import { beforeEach, expect, test } from 'vitest';
import { db } from '../../data/db.ts';
import { createRow } from '../../data/sync/mutate.ts';
import { buildExport } from './ExportButton.tsx';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

test('8つの表を1つの JSON にする。outbox は入れない。名前は kaimono-YYYYMMDD.json（日本時間）', async () => {
  await createRow('stores', { id: 's1', name: 'A店', sort_order: 0, visit_mode: 'usual', default_tax_mode: 'included' });
  const { filename, json } = await buildExport(db, new Date('2026-11-19T16:00:00Z'));
  expect(filename).toBe('kaimono-20261120.json');
  const data = JSON.parse(json);
  expect(Object.keys(data.tables).sort()).toEqual(
    ['excluded_dates', 'list_items', 'prices', 'products', 'sale_prices', 'settings', 'store_overrides', 'stores'],
  );
  expect(data.tables.stores).toHaveLength(1);
  expect(data.tables.stores[0].name).toBe('A店');
  expect(data.exported_at).toBe('2026-11-19T16:00:00.000Z');
  expect(json).not.toContain('outbox');
});
