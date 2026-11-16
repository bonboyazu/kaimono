import { useState, type FormEvent } from 'react';
import type { AuthApi } from '../../data/auth.ts';

export default function LoginPage({ auth }: { auth: AuthApi }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { ok } = await auth.signIn(email.trim(), password);
      if (!ok) setError('メールアドレスかパスワードが違います');
    } catch {
      setError('ログインできませんでした。電波を確かめてください');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <h1>買い物</h1>
      <form onSubmit={submit}>
        <label>
          メールアドレス
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          パスワード
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="primary" disabled={busy}>ログイン</button>
      </form>
    </main>
  );
}
