import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getViewSDK } from '@salesforce/platform-sdk/view';
import type { UiState } from '@salesforce/platform-sdk/core';
import { MemoApp } from '../memo/MemoApp';
import './embed.css';

// ホスト LWC が props に入れる値（文字列だけ）
interface MemoUiState extends UiState {
  props: { accountId?: string };
}

// Salesforce 用の入口: SDK で取引先 ID を受け取り、MemoApp に渡すだけ。ログインは MemoApp が Supabase に対して行う
function EmbeddedMemo() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [accountId, setAccountId] = useState('');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    getViewSDK().then(
      (sdk) => {
        if (cancelled) return;
        const ui = sdk.getUiState?.<MemoUiState>();
        if (!ui) return setConnected(false);
        setConnected(true);
        setAccountId(ui.state.props?.accountId ?? '');
        unsubscribe = ui.subscribe((next) => setAccountId(next.props?.accountId ?? ''));
      },
      () => !cancelled && setConnected(false),
    );
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  if (connected === null) return <p className="status">Salesforce と接続中…</p>;
  if (!connected) return <p className="status">このページは Salesforce の中で表示するための入口です。</p>;
  if (!accountId) return <p className="status">取引先を読み込み中…</p>;
  return <MemoApp accountId={accountId} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EmbeddedMemo />
  </StrictMode>,
);
