// 試しの通知を、押した端末に送る。
// - ログインした利用者：本文の endpoint の宛先（自分のものだけ）に送る
// - secret key の呼び出し（試しのタイマー）：呼ばれたことをログに残すだけ
import { withSupabase } from 'npm:@supabase/server@1';
import * as webpush from 'jsr:@negrel/webpush@0.5.0';

async function appServer() {
  const keys = await webpush.importVapidKeys(JSON.parse(Deno.env.get('VAPID_KEYS_JSON')!), {
    extractable: false,
  });
  return webpush.ApplicationServer.new({
    contactInformation: Deno.env.get('VAPID_SUBJECT')!,
    vapidKeys: keys,
  });
}

export default {
  fetch: withSupabase({ auth: ['user', 'secret'] }, async (req, ctx) => {
    if (ctx.authMode !== 'user') {
      console.log('send-test-push: タイマーから呼ばれました', new Date().toISOString());
      return Response.json({ ok: true, from: 'timer' });
    }

    const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
    if (!endpoint) return Response.json({ error: 'endpoint がありません' }, { status: 400 });

    // RLS で自分の宛先だけが見える
    const { data: sub, error } = await ctx.supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('endpoint', endpoint)
      .maybeSingle();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!sub) return Response.json({ error: '宛先が見つかりません' }, { status: 404 });

    const server = await appServer();
    const subscriber = server.subscribe({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    });
    try {
      await subscriber.pushTextMessage(
        JSON.stringify({ title: '試しの通知', body: '通知は届いています', url: '#/settings' }),
        {},
      );
    } catch (err) {
      if (err instanceof webpush.PushMessageError && err.isGone()) {
        await ctx.supabase.from('push_subscriptions').delete().eq('id', sub.id);
        return Response.json({ error: '宛先が古くなっていました。もう一度「通知を受け取る」を押してください' }, { status: 410 });
      }
      console.error('send-test-push', err);
      return Response.json({ error: String(err) }, { status: 502 });
    }
    return Response.json({ ok: true });
  }),
};
