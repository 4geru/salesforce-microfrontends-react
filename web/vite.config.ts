import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 入口を 2 つ持つマルチページ構成
//   /        … Vercel のページ（TodoList を部品として直接 import）
//   /embed/  … Salesforce の lightning-ui-embedding から iframe で読み込まれる入口
//   /memo/ と /embed/memo/ … 取引先メモ（Vercel 用 / Salesforce 用）
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        embed: resolve(__dirname, 'embed/index.html'),
        memo: resolve(__dirname, 'memo/index.html'),
        embedMemo: resolve(__dirname, 'embed/memo/index.html'),
      },
    },
  },
});
