// ログイン・ログアウト・今の利用者
import { createContext, useContext } from 'react';
import { getSupabase } from './supabase.ts';

export type AuthUser = { id: string; email: string };

export interface AuthApi {
  initialUser(): Promise<AuthUser | null>;
  onChange(fn: (user: AuthUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<{ ok: boolean }>;
  signOut(): Promise<void>;
}

// 電波がなくても、前に入った利用者が分かるように端末に残す
const LAST_USER_KEY = 'kaimono:last-user';

function remember(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(LAST_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(LAST_USER_KEY);
  } catch {
    // 端末に残せなくても動かす
  }
}

function lastUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(LAST_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

type SbUser = { id: string; email?: string | null } | null | undefined;
const toUser = (u: SbUser): AuthUser | null => (u ? { id: u.id, email: u.email ?? '' } : null);

export const supabaseAuth: AuthApi = {
  async initialUser() {
    try {
      const { data } = await getSupabase().auth.getSession();
      const user = toUser(data.session?.user);
      if (user) {
        remember(user);
        return user;
      }
      // 電波がないときは、残っているログイン情報で画面を出す
      return navigator.onLine ? null : lastUser();
    } catch {
      return lastUser();
    }
  },
  onChange(fn) {
    const { data } = getSupabase().auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const user = toUser(session?.user);
        remember(user);
        fn(user);
      } else if (event === 'SIGNED_OUT') {
        remember(null);
        fn(null);
      }
    });
    return () => data.subscription.unsubscribe();
  },
  async signIn(email, password) {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    return { ok: !error };
  },
  async signOut() {
    remember(null);
    await getSupabase().auth.signOut({ scope: 'local' });
  },
};

export const AuthContext = createContext<{ user: AuthUser | null; auth: AuthApi } | null>(null);

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('AuthContext がありません');
  return v;
}
