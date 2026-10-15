import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getViewSDK } from '@salesforce/platform-sdk/view';
import type { UiState } from '@salesforce/platform-sdk/core';
import { TodoList } from '../components/TodoList';
import type { NewTodo, Todo } from '../types';
import './embed.css';

// ホスト LWC が lightning-ui-embedding の props に入れてくる値。
// 配列を props に入れるとホストが ui-state を返せなくなるため、ToDo は JSON 文字列で受け取る
interface TodoUiState extends UiState {
  props: { todosJson?: string; title?: string };
}

function parseTodos(json?: string): Todo[] {
  try {
    return json ? (JSON.parse(json) as Todo[]) : [];
  } catch {
    return [];
  }
}

// ホストへ返すイベント名。LWC 側では ontodocomplete / ontodoadd で受け取る
const COMPLETE_EVENT = 'todocomplete';
const ADD_EVENT = 'todoadd';

// [2] Salesforce 用の入口: SDK で props を受け取り、TodoList に渡すだけの薄い層
function EmbeddedTodoList() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [props, setProps] = useState<TodoUiState['props']>({});

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    const apply = (state: TodoUiState) => {
      setProps(state.props ?? {});
      // ホストが渡すスタイル（CSS 変数）をそのまま反映し、Salesforce の見た目に寄せる
      for (const [k, v] of Object.entries(state.styles?.variables ?? {})) {
        document.documentElement.style.setProperty(k, v);
      }
    };
    getViewSDK().then(
      (sdk) => {
        if (cancelled) return;
        const ui = sdk.getUiState?.<TodoUiState>();
        if (!ui) return setConnected(false); // 埋め込まれていない
        setConnected(true);
        apply(ui.state);
        unsubscribe = ui.subscribe(apply);
      },
      () => !cancelled && setConnected(false),
    );
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const onComplete = async (id: string) => {
    const sdk = await getViewSDK();
    sdk.dispatchEvent?.(new CustomEvent(COMPLETE_EVENT, { detail: { id }, bubbles: true }));
  };

  const onAdd = async (todo: NewTodo) => {
    const sdk = await getViewSDK();
    sdk.dispatchEvent?.(new CustomEvent(ADD_EVENT, { detail: todo, bubbles: true }));
  };

  if (connected === null) return <p className="status">Salesforce と接続中…</p>;
  if (!connected) return <p className="status">このページは Salesforce の中で表示するための入口です。</p>;
  return <TodoList title={props.title ?? 'ToDo'} todos={parseTodos(props.todosJson)} onComplete={onComplete} onAdd={onAdd} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EmbeddedTodoList />
  </StrictMode>,
);
