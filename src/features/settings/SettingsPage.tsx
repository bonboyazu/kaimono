import { useAuth } from '../../data/auth.ts';
import { db } from '../../data/db.ts';
import { countStatus } from '../../data/sync/engine.ts';
import Header from '../../ui/Header.tsx';
import NotificationSettings from './NotificationSettings.tsx';
import StoreSetting from './StoreSetting.tsx';
import WeekdaySetting from './WeekdaySetting.tsx';

export default function SettingsPage() {
  const { user, auth } = useAuth();

  const logout = async () => {
    const { pending, failed } = await countStatus(db);
    const n = pending + failed;
    const message =
      n > 0 ? `反映していない操作が ${n} 件あります。ログアウトすると失われます` : 'ログアウトしますか';
    if (!window.confirm(message)) return;
    await auth.signOut();
    // 端末の写しを消す（次に入る人のため）
    await Promise.all(db.tables.map((t) => t.clear()));
  };

  return (
    <>
      <Header title="設定" />
      <main className="page">
        <WeekdaySetting />
        <StoreSetting />
        <NotificationSettings />
        <section className="card">
          <h2>ログイン中</h2>
          <p>{user?.email}</p>
          <button type="button" onClick={logout}>ログアウト</button>
        </section>
      </main>
    </>
  );
}
