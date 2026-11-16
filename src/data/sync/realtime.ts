// 片方の操作を数秒でもう片方に出す
import type { SupabaseClient } from '@supabase/supabase-js';
import { SYNC_TABLES } from '../../domain/types.ts';
import type { LocalDb } from '../db.ts';
import { applyRemoteRow } from './pull.ts';

export function subscribeRealtime(client: SupabaseClient, local: LocalDb): () => void {
  let channel = client.channel('kaimono-sync');
  for (const table of SYNC_TABLES) {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => {
        const row = payload.new as Record<string, unknown> | undefined;
        if (row && row.id) void applyRemoteRow(local, table, row);
      },
    );
  }
  channel.subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
