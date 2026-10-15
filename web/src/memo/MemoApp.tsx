import { LoginPanel } from './LoginPanel';
import { MemoBoard } from './MemoBoard';
import { supabase } from './supabaseClient';
import { useAccountMemos } from './useAccountMemos';
import { useSession } from './useSession';
import styles from './MemoApp.module.css';

// 本体: 取引先 ID を受け取るだけ。Salesforce の中か Vercel かは知らない
export function MemoApp({ accountId }: { accountId: string }) {
  const { session, userId, member, displayName, signIn, signOut } = useSession();
  const { memos, error, add, update, remove } = useAccountMemos(accountId, userId, member === 'member');

  let content;
  if (!supabase) content = <p className={styles.error}>Supabase の接続先が設定されていません（VITE_SUPABASE_ANON_KEY）。</p>;
  else if (session === undefined) content = <p className={styles.muted}>読み込み中…</p>;
  else if (!session) content = <LoginPanel onSignIn={signIn} />;
  else if (member === 'unknown') content = <p className={styles.muted}>確認中…</p>;
  else if (member === 'not-member') content = <p className={styles.error}>このメモを使う権限がありません。管理者にメンバー登録を依頼してください。</p>;
  else content = <MemoBoard memos={memos} onAdd={add} onUpdate={update} onDelete={remove} />;

  return (
    <section className={styles.app}>
      <header className={styles.header}>
        <h2 className={styles.title}>📝 取引先メモ</h2>
        {session && (
          <span className={styles.user}>
            {displayName || session.user.email}
            <button type="button" className={styles.link} onClick={signOut}>ログアウト</button>
          </span>
        )}
      </header>
      {error && <p className={styles.error}>{error}</p>}
      {content}
    </section>
  );
}
