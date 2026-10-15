import { useState } from 'react';
import styles from './MemoApp.module.css';

// メール + パスワードでログイン。iframe 内ではフォーム送信が発火しないので <form> は使わない
export function LoginPanel({ onSignIn }: { onSignIn: (email: string, password: string) => Promise<string | null> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !password || busy) return;
    setBusy(true);
    setError(await onSignIn(email, password));
    setBusy(false);
  };
  const onEnter = (e: React.KeyboardEvent) => e.key === 'Enter' && !e.nativeEvent.isComposing && submit();

  return (
    <div className={styles.login}>
      <p className={styles.muted}>メモを使うにはログインしてください。</p>
      <input className={styles.input} type="email" placeholder="メールアドレス" autoComplete="username"
        value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onEnter} />
      <input className={styles.input} type="password" placeholder="パスワード" autoComplete="current-password"
        value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={onEnter} />
      <button className={styles.primary} type="button" disabled={busy || !email || !password} onClick={submit}>
        {busy ? 'ログイン中…' : 'ログイン'}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
