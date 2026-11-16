import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { LocalDb } from '../db.ts';
import { createRow, patchRow, type MutateContext } from './mutate.ts';
import { push } from './push.ts';
import { pull, applyRemoteRow } from './pull.ts';
import { countStatus, makeRunner } from './engine.ts';
import { FakeRemote } from './fakeRemote.ts';
import { priceId } from '../../domain/ids.ts';
import type { ListItem, Price, Store } from '../../domain/types.ts';

let n = 0;
let dbA: LocalDb;
let dbB: LocalDb;
let remote: FakeRemote;

const at = (hhmm: string) => `2026-11-15T${hhmm}:00.000Z`;
const ctx = (db: LocalDb, hhmm: string): MutateContext => ({ db, now: () => at(hhmm) });

const store = (id: string): Omit<Store, 'field_times' | 'deleted_at'> => ({
  id, name: 'A店', sort_order: 0, visit_mode: 'usual', default_tax_mode: 'included',
});
const item = (id: string): Omit<ListItem, 'field_times' | 'deleted_at'> => ({
  id, product_id: 'p1', memo: '', added_by: null, added_at: at('09:00'),
  checked_at: null, checked_by: null, bought_store_id: null, forced_store_id: null,
});
const price = (id: string, amount: number): Omit<Price, 'field_times' | 'deleted_at'> => ({
  id, store_id: 's1', product_id: 'p1', amount, tax_mode: 'included', price_updated_at: at('09:00'),
});

beforeEach(async () => {
  n += 1;
  dbA = new LocalDb(`a${n}`);
  dbB = new LocalDb(`b${n}`);
  remote = new FakeRemote();
});
afterEach(async () => {
  await dbA.delete();
  await dbB.delete();
});

describe('同期', () => {
  test('1. createRow で写しと outbox に入る', async () => {
    await createRow('stores', store('s1'), ctx(dbA, '10:00'));
    const row = await dbA.table('stores').get('s1');
    expect(row.name).toBe('A店');
    expect(row.field_times.name).toBe(at('10:00'));
    expect(await dbA.outbox.count()).toBe(1);
  });

  test('2. push でサーバーに行ができ、outbox が空になる', async () => {
    await createRow('stores', store('s1'), ctx(dbA, '10:00'));
    await push(dbA, remote);
    expect(remote.get('stores', 's1')?.name).toBe('A店');
    expect(await dbA.outbox.count()).toBe(0);
  });

  test('3. 通信の失敗では outbox が残り、やり直すと反映される', async () => {
    await createRow('stores', store('s1'), ctx(dbA, '10:00'));
    remote.offline = true;
    await push(dbA, remote);
    expect(await dbA.outbox.count()).toBe(1);
    expect(remote.get('stores', 's1')).toBeNull();
    remote.offline = false;
    await push(dbA, remote);
    expect(await dbA.outbox.count()).toBe(0);
    expect(remote.get('stores', 's1')?.name).toBe('A店');
  });

  test('4. 同じ create を2回送っても1行', async () => {
    await createRow('stores', store('s1'), ctx(dbA, '10:00'));
    await createRow('stores', store('s1'), ctx(dbA, '10:01'));
    await push(dbA, remote);
    expect(remote.tables.get('stores')?.size).toBe(1);
    expect(await dbA.outbox.count()).toBe(0);
  });

  test('5. 違う列の変更は両方残る', async () => {
    await createRow('list_items', item('i1'), ctx(dbA, '09:00'));
    await push(dbA, remote);
    await pull(dbB, remote);
    remote.offline = true;
    await patchRow('list_items', 'i1', { checked_at: at('10:00') }, ctx(dbA, '10:00'));
    await push(dbA, remote);
    remote.offline = false;
    await patchRow('list_items', 'i1', { memo: '300g' }, ctx(dbB, '10:01'));
    await push(dbB, remote);
    await push(dbA, remote);
    const s = remote.get('list_items', 'i1')!;
    expect(s.checked_at).toBe(at('10:00'));
    expect(s.memo).toBe('300g');
  });

  async function amountRace(aTime: string) {
    await createRow('prices', price('x1', 178), ctx(dbA, '09:00'));
    await push(dbA, remote);
    await pull(dbB, remote);
    remote.offline = true;
    await patchRow('prices', 'x1', { amount: 188 }, ctx(dbA, aTime));
    await push(dbA, remote);
    remote.offline = false;
    await patchRow('prices', 'x1', { amount: 190 }, ctx(dbB, '10:03'));
    await push(dbB, remote);
    await push(dbA, remote);
    return remote.get('prices', 'x1')!.amount;
  }

  test('6. あとから行った操作が勝つ（B が後）', async () => {
    expect(await amountRace('10:00')).toBe(190);
  });

  test('7. あとから行った操作が勝つ（A が後）', async () => {
    expect(await amountRace('10:04')).toBe(188);
  });

  test('8. 未送信の patch がある行を pull しても、写しは未送信の値', async () => {
    await createRow('list_items', item('i1'), ctx(dbA, '09:00'));
    await push(dbA, remote);
    remote.offline = true;
    await patchRow('list_items', 'i1', { memo: 'ローカル' }, ctx(dbA, '10:00'));
    remote.offline = false;
    await remote.updateRow('list_items', 'i1', { memo: 'サーバー' });
    await pull(dbA, remote);
    expect((await dbA.table('list_items').get('i1')).memo).toBe('ローカル');
  });

  test('9. pull は前回より新しい行だけを読む', async () => {
    await createRow('stores', store('s1'), ctx(dbA, '10:00'));
    await push(dbA, remote);
    await pull(dbB, remote);
    const first = remote.fetchSinceCalls.filter((c) => c.table === 'stores');
    expect(first.at(-1)?.cursor).toBeNull();
    await pull(dbB, remote);
    const second = remote.fetchSinceCalls.filter((c) => c.table === 'stores').at(-1);
    expect(second?.cursor).toBe(remote.get('stores', 's1')!.server_updated_at);
  });

  test('10. realtime で届いた行が写しに入る', async () => {
    await applyRemoteRow(dbB, 'stores', {
      ...store('s9'), field_times: {}, deleted_at: null, server_updated_at: at('11:00'),
    });
    expect((await dbB.table('stores').get('s9')).name).toBe('A店');
  });

  test('11. 2台が同じ店×商品の値段を電波なしで作っても1行にまとまる', async () => {
    const idA = await priceId('s1', 'p1');
    const idB = await priceId('s1', 'p1');
    expect(idA).toBe(idB);
    await createRow('prices', price(idA, 178), ctx(dbA, '10:00'));
    await createRow('prices', price(idB, 180), ctx(dbB, '10:02'));
    await push(dbA, remote);
    await push(dbB, remote);
    expect(remote.tables.get('prices')?.size).toBe(1);
    expect(remote.get('prices', idA)!.amount).toBe(180);
  });

  test('12. 4xx で3回失敗した操作は failed に数え、後ろの操作は送る', async () => {
    await createRow('stores', store('bad'), ctx(dbA, '10:00'));
    await createRow('stores', store('ok'), ctx(dbA, '10:01'));
    remote.rejectIds.add('bad');
    await push(dbA, remote);
    expect(remote.get('stores', 'ok')).not.toBeNull();
    await push(dbA, remote);
    await push(dbA, remote);
    await push(dbA, remote);
    expect(await countStatus(dbA)).toEqual({ pending: 0, failed: 1 });
  });

  test('13. 1回の同期が固まっても、時間が来たら次の同期が動く', async () => {
    await createRow('stores', store('s1'), ctx(dbA, '10:00'));
    let hang = true;
    const realFetchRow = remote.fetchRow.bind(remote);
    remote.fetchRow = (t, id) => (hang ? new Promise(() => undefined) : realFetchRow(t, id));
    const run = makeRunner(dbA, remote, 50);
    await run(); // 固まるが、50ms で手を離す
    expect(remote.get('stores', 's1')).toBeNull();
    hang = false;
    await run();
    expect(remote.get('stores', 's1')?.name).toBe('A店');
    expect(await dbA.outbox.count()).toBe(0);
  });
});
