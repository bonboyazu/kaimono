// データの書き出し：端末の写しの8つの表を、1つの JSON ファイルにして保存する（outbox と通知の宛先は入れない）
import { useState } from 'react';
import { db as defaultDb, type LocalDb } from '../../data/db.ts';
import { jstDate } from '../../domain/dates.ts';
import { SYNC_TABLES } from '../../domain/types.ts';

export async function buildExport(db: LocalDb, now: Date): Promise<{ filename: string; json: string }> {
  const tables: Record<string, unknown[]> = {};
  for (const t of SYNC_TABLES) tables[t] = await db.table(t).toArray();
  const json = JSON.stringify({ app: 'kaimono', exported_at: now.toISOString(), tables }, null, 2);
  return { filename: `kaimono-${jstDate(now).replaceAll('-', '')}.json`, json };
}

/** iPhone のホーム画面のアプリでは共有の画面から「ファイルに保存」する。使えないときはダウンロードにする */
async function save(filename: string, json: string): Promise<void> {
  const file = new File([json], filename, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function ExportButton() {
  const [message, setMessage] = useState('');
  const run = async () => {
    setMessage('');
    try {
      const { filename, json } = await buildExport(defaultDb, new Date());
      await save(filename, json);
    } catch (err) {
      setMessage(`書き出せませんでした（${err instanceof Error ? err.message : String(err)}）`);
    }
  };
  return (
    <section className="card">
      <h2>データの書き出し</h2>
      <p className="note">店・商品・値段・リストなどを、1つのファイルにして手元に残します</p>
      <button type="button" onClick={() => void run()}>書き出す</button>
      {message && <p className="note" role="status">{message}</p>}
    </section>
  );
}
