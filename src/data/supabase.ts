import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** 15秒で返ってこない通信は打ち切る（iPhone が裏に回ったあと、通信が終わらないことがある） */
const FETCH_TIMEOUT_MS = 15_000;
const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};

/** 必要になったときに作る（テストでは作らない） */
export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    if (!url || !key) throw new Error('VITE_SUPABASE_URL と VITE_SUPABASE_PUBLISHABLE_KEY がありません');
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      global: { fetch: fetchWithTimeout },
    });
  }
  return client;
}
