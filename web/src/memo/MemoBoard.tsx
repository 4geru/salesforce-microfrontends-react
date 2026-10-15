import { useState } from 'react';
import type { Memo } from './types';
import styles from './MemoApp.module.css';

interface MemoBoardProps {
  memos: Memo[];
  onAdd: (body: string) => Promise<void>;
  onUpdate: (id: string, body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const isSubmitKey = (e: React.KeyboardEvent) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing;
const fmt = (iso: string) => new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// 付箋の一覧と入力欄。自分の付箋だけ編集・削除できる（最終的な制御は RLS）
export function MemoBoard({ memos, onAdd, onUpdate, onDelete }: MemoBoardProps) {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  const add = () => draft.trim() && run(async () => { await onAdd(draft.trim()); setDraft(''); });
  const save = () => editing?.body.trim() && run(async () => { await onUpdate(editing.id, editing.body.trim()); setEditing(null); });

  return (
    <div>
      <div className={styles.composer}>
        <textarea className={styles.textarea} rows={2} maxLength={2000} placeholder="付箋を書く（⌘ / Ctrl + Enter で追加）"
          value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => isSubmitKey(e) && add()} />
        <button className={styles.primary} type="button" disabled={busy || !draft.trim()} onClick={add}>追加</button>
      </div>
      {memos.length === 0 ? (
        <p className={styles.muted}>まだ付箋はありません。最初の 1 枚を書いてみましょう 📝</p>
      ) : (
        <ul className={styles.notes}>
          {memos.map((m) => (
            <li key={m.id} className={`${styles.note} ${m.mine ? styles.mine : ''}`}>
              {editing?.id === m.id ? (
                <>
                  <textarea className={styles.textarea} rows={3} maxLength={2000} autoFocus value={editing.body}
                    onChange={(e) => setEditing({ id: m.id, body: e.target.value })}
                    onKeyDown={(e) => (isSubmitKey(e) ? save() : e.key === 'Escape' && setEditing(null))} />
                  <div className={styles.actions}>
                    <button type="button" className={styles.primary} disabled={busy || !editing.body.trim()} onClick={save}>保存</button>
                    <button type="button" className={styles.link} onClick={() => setEditing(null)}>やめる</button>
                  </div>
                </>
              ) : (
                <>
                  <p className={styles.body}>{m.body}</p>
                  <div className={styles.meta}>
                    <span>{m.authorName}・{fmt(m.updated_at)}{m.updated_at !== m.created_at && '（編集済み）'}</span>
                    {m.mine && (
                      <span className={styles.actions}>
                        <button type="button" className={styles.link} onClick={() => setEditing({ id: m.id, body: m.body })}>編集</button>
                        <button type="button" className={styles.link} disabled={busy} onClick={() => run(() => onDelete(m.id))}>削除</button>
                      </span>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
