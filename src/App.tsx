import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthContext, supabaseAuth, type AuthApi, type AuthUser } from './data/auth.ts';
import { db } from './data/db.ts';
import { supabaseRemote } from './data/remote.ts';
import { getSupabase } from './data/supabase.ts';
import { startSync } from './data/sync/engine.ts';
import { subscribeRealtime } from './data/sync/realtime.ts';
import DashboardPage from './features/dashboard/DashboardPage.tsx';
import DataPage from './features/data/DataPage.tsx';
import ListPage from './features/list/ListPage.tsx';
import LoginPage from './features/login/LoginPage.tsx';
import SettingsPage from './features/settings/SettingsPage.tsx';
import TabBar from './ui/TabBar.tsx';
import PullToRefresh from './ui/PullToRefresh.tsx';
import { refreshApp } from './data/appUpdate.ts';

const refresh = () => void refreshApp();

type Props = { auth?: AuthApi; withSync?: boolean };

export default function App({ auth = supabaseAuth, withSync = true }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    auth.initialUser().then((u) => {
      if (!alive) return;
      setUser(u);
      setReady(true);
    });
    const off = auth.onChange((u) => setUser(u));
    return () => {
      alive = false;
      off();
    };
  }, [auth]);

  const userId = user?.id;
  useEffect(() => {
    if (!withSync || !userId) return;
    const client = getSupabase();
    return startSync(supabaseRemote(client), () => subscribeRealtime(client, db));
  }, [withSync, userId]);

  if (!ready) return null;
  if (!user) return <LoginPage auth={auth} />;

  return (
    <AuthContext.Provider value={{ user, auth }}>
      <HashRouter>
        <div className="app">
          <PullToRefresh onRefresh={refresh} />
          <TabBar />
          <Routes>
            <Route path="/list" element={<ListPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/list" replace />} />
          </Routes>
        </div>
      </HashRouter>
    </AuthContext.Provider>
  );
}
