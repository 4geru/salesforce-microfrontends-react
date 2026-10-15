import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TodoList } from '../components/TodoList';
import { demoTodos } from '../demoTodos';
import type { NewTodo, Todo } from '../types';
import './main.css';

// [1] Vercel のページ: TodoList を普通の React 部品として import する（ビルド時の組み込み）
// Salesforce と同じ UI を触れるよう、追加・完了はこのページの中だけで動かす（保存はしない）
function App() {
  const [todos, setTodos] = useState<Todo[]>(demoTodos);

  const onAdd = (t: NewTodo) => setTodos((prev) => [{ id: crypto.randomUUID(), done: false, ...t }, ...prev]);
  const onComplete = (id: string) => setTodos((prev) => prev.filter((t) => t.id !== id));

  return (
    <main className="page">
      <header className="hero">
        <h1>Todo List Microfrontend</h1>
        <p>
          この ToDo リストは 1 つの React コンポーネントです。このページでは部品として直接読み込み、
          Salesforce では <code>lightning-ui-embedding</code> から iframe（<a href="/embed/">/embed/</a>）として読み込みます。
        </p>
        <p className="note">このページの ToDo はデモデータです。追加・完了はブラウザの中だけで動き、再読み込みすると元に戻ります。</p>
      </header>
      <TodoList title="デモの ToDo" todos={todos} onAdd={onAdd} onComplete={onComplete} />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
