import type { Todo } from './types';

// Vercel のページで表示するデモデータ（架空の内容）
export const demoTodos: Todo[] = [
  { id: 'demo-1', title: '週次ミーティングの議事録をまとめる', done: false, priority: 'high', dueDate: '2026-10-16' },
  { id: 'demo-2', title: '新しいダッシュボードのレイアウト案を作る', done: false, priority: 'normal', dueDate: '2026-10-20' },
  { id: 'demo-3', title: 'チームのランチ会の店を決める', done: false, priority: 'low' },
];
