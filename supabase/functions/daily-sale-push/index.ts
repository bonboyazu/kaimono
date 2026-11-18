// 毎朝のセールの通知。pg_cron が15分おきに secret key で呼ぶ
// 1. 日本時間の今日と今の時刻 → 2. 送る時刻になった宛先 → 3. 今日のセールでリストにある商品
// 4. 当たりがあれば送る。当たりがなくても今日は判定済みにする → 5. 404・410 の宛先は消す
import { withSupabase } from 'npm:@supabase/server@1';
import * as webpush from 'jsr:@negrel/webpush@0.5.0';
import { jstDate, jstTime } from '../_shared/domain/dates.ts';
import { isDue, notificationText, saleHitsForToday } from '../_shared/domain/notification.ts';
import { SETTINGS_ID } from '../_shared/domain/types.ts';
import type { ListItem, Price, Product, SalePrice, Settings, Store } from '../_shared/domain/types.ts';

type Sub = { id: string; endpoint: string; p256dh: string; auth: string; enabled: boolean; notify_time: string; last_sent_on: string | null };

async function appServer() {
  const keys = await webpush.importVapidKeys(JSON.parse(Deno.env.get('VAPID_KEYS_JSON')!), { extractable: false });
  return webpush.ApplicationServer.new({ contactInformation: Deno.env.get('VAPID_SUBJECT')!, vapidKeys: keys });
}

export default {
  fetch: withSupabase({ auth: 'secret' }, async (_req, ctx) => {
    const db = ctx.supabaseAdmin;
    const now = new Date();
    const today = jstDate(now);
    const nowTime = jstTime(now);

    const { data: subs, error: subErr } = await db
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, enabled, notify_time, last_sent_on');
    if (subErr) return Response.json({ error: subErr.message }, { status: 500 });
    const due = (subs as Sub[]).filter((s) => isDue(s, today, nowTime));
    if (due.length === 0) return Response.json({ today, nowTime, due: 0 });

    const read = async <T,>(table: string, filter?: (q: any) => any): Promise<T[]> => {
      let q = db.from(table).select('*').is('deleted_at', null);
      if (filter) q = filter(q);
      const { data, error } = await q;
      if (error) throw new Error(`${table}: ${error.message}`);
      return data as T[];
    };
    let hits;
    try {
      const [settings, stores, products, prices, sale_prices, items] = await Promise.all([
        read<Settings>('settings', (q) => q.eq('id', SETTINGS_ID)),
        read<Store>('stores'),
        read<Product>('products'),
        read<Price>('prices'),
        read<SalePrice>('sale_prices'),
        read<ListItem>('list_items', (q) => q.is('checked_at', null)),
      ]);
      hits = saleHitsForToday({
        today,
        available_weekdays: settings[0]?.available_weekdays ?? [],
        stores, products, prices, sale_prices, items,
      });
    } catch (err) {
      console.error('daily-sale-push: 読み込みに失敗', err);
      return Response.json({ error: String(err) }, { status: 500 });
    }

    // 送れた宛先・当たりがなかった宛先は、今日はもう判定しない。
    // 通信などで送れなかった宛先は残し、15分後にもう一度試す
    const done: string[] = [];
    const gone: string[] = [];
    if (hits.length === 0) {
      done.push(...due.map((s) => s.id));
    } else {
      const { title, body } = notificationText(hits);
      const payload = JSON.stringify({ title, body, url: '#/list' });
      const server = await appServer();
      await Promise.all(
        due.map(async (s) => {
          try {
            await server
              .subscribe({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } })
              .pushTextMessage(payload, {});
            done.push(s.id);
          } catch (err) {
            if (err instanceof webpush.PushMessageError && [404, 410].includes(err.response.status)) {
              gone.push(s.id);
            } else {
              console.error('daily-sale-push: 送れませんでした', s.id, String(err));
            }
          }
        }),
      );
    }

    if (done.length) {
      const { error } = await db.from('push_subscriptions').update({ last_sent_on: today }).in('id', done);
      if (error) console.error('daily-sale-push: last_sent_on を書けませんでした', error.message);
    }
    if (gone.length) {
      const { error } = await db.from('push_subscriptions').delete().in('id', gone);
      if (error) console.error('daily-sale-push: 古い宛先を消せませんでした', error.message);
    }
    return Response.json({ today, nowTime, due: due.length, hits: hits.length, sent: hits.length ? done.length : 0, gone: gone.length });
  }),
};
