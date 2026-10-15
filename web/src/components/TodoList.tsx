import { useState } from 'react';
import type { NewTodo, Priority, Todo } from '../types';
import styles from './TodoList.module.css';

const PRIORITY_LABEL = { high: '高', normal: '中', low: '低' } as const;

export interface TodoListProps {
  todos: Todo[];
  title?: string;
  /** 完了ボタンを押したときに呼ばれる。未指定なら見るだけ */
  onComplete?: (id: string) => void | Promise<void>;
  /** 追加フォームから送信したときに呼ばれる。未指定ならフォームを出さない */
  onAdd?: (todo: NewTodo) => void | Promise<void>;
}

// 本体: props を受け取ってコールバックを呼ぶだけ。Salesforce や埋め込みのことは知らない
export function TodoList({ todos, title = 'ToDo', onComplete, onAdd }: TodoListProps) {
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<NewTodo>({ title: '', priority: 'normal', dueDate: '' });
  const [adding, setAdding] = useState(false);

  // <form onSubmit> は使わない。lightning-ui-embedding の iframe は sandbox に allow-forms が無く、
  // フォーム送信（submit イベント）自体が発火しないため、クリックと Enter キーで送る
  const add = async () => {
    const t = draft.title.trim();
    if (!onAdd || !t) return;
    setAdding(true);
    try {
      await onAdd({ title: t, priority: draft.priority, dueDate: draft.dueDate || undefined });
      setDraft({ title: '', priority: 'normal', dueDate: '' });
    } finally {
      setAdding(false);
    }
  };

  const complete = async (id: string) => {
    if (!onComplete) return;
    setPending((s) => new Set(s).add(id));
    try {
      await onComplete(id);
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };

  const open = todos.filter((t) => !t.done);

  return (
    <section className={styles.list}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.count}>{open.length} 件</span>
      </header>
      {onAdd && (
        <div className={styles.form} role="group" aria-label="ToDo を追加">
          <input
            className={styles.input}
            placeholder="ToDo を追加"
            value={draft.title}
            maxLength={255}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) add();
            }}
          />
          <select
            className={styles.select}
            aria-label="優先度"
            value={draft.priority}
            onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}
          >
            <option value="high">高</option>
            <option value="normal">中</option>
            <option value="low">低</option>
          </select>
          <input
            className={styles.select}
            type="date"
            aria-label="期日"
            value={draft.dueDate}
            onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
          />
          <button className={styles.button} type="button" disabled={adding || !draft.title.trim()} onClick={add}>
            {adding ? '追加中…' : '追加'}
          </button>
        </div>
      )}
      {todos.length === 0 ? (
        <p className={styles.empty}>ToDo はありません 🎉</p>
      ) : (
        <ul className={styles.items}>
          {todos.map((t) => (
            <li key={t.id} className={`${styles.item} ${t.done ? styles.done : ''}`}>
              {t.priority && (
                <span className={`${styles.badge} ${styles[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
              )}
              <span className={styles.text}>{t.title}</span>
              {t.dueDate && <time className={styles.due}>{t.dueDate}</time>}
              {onComplete && !t.done && (
                <button className={styles.button} disabled={pending.has(t.id)} onClick={() => complete(t.id)}>
                  {pending.has(t.id) ? '更新中…' : '完了'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
