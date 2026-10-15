import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoApp } from '../memo/MemoApp';
import './main.css';

const ACCOUNT_ID = /^[a-zA-Z0-9]{15,18}$/;

// Vercel 用の入口: URL の ?account= から取引先 ID を受け取り、Salesforce の中と同じ MemoApp を出す
function App() {
  const accountId = new URLSearchParams(location.search).get('account') ?? '';
  const [input, setInput] = useState('');
  const open = () => ACCOUNT_ID.test(input.trim()) && (location.search = `?account=${input.trim()}`);

  return (
    <main className="page wide">
      <header className="hero">
        <h1>取引先メモ Microfrontend</h1>
        <p>Salesforce の取引先ページに埋め込んでいるのと同じメモです。どちらで書いた付箋も、もう片方に即座に反映されます。</p>
      </header>
      {ACCOUNT_ID.test(accountId) ? (
        <>
          <p className="note">取引先 ID: <code>{accountId}</code>　<a href="/memo/">別の取引先を開く</a></p>
          <MemoApp accountId={accountId} />
        </>
      ) : (
        <p className="opener">
          <input placeholder="取引先 ID（001 で始まる 15 / 18 桁）" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && open()} />
          <button type="button" onClick={open} disabled={!ACCOUNT_ID.test(input.trim())}>開く</button>
        </p>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
