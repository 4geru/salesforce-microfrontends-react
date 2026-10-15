export interface MemoRow {
  id: string;
  account_id: string;
  body: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

// 画面に出す形（書いた人の名前と、自分の付箋かどうかを足したもの）
export interface Memo extends MemoRow {
  authorName: string;
  mine: boolean;
}
