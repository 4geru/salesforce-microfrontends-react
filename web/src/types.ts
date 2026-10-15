// ホストに依存しない ToDo の形。Salesforce の Task への変換はホスト LWC 側で行う
export type Priority = 'high' | 'normal' | 'low';

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  priority?: Priority;
  dueDate?: string; // YYYY-MM-DD
}

// 追加フォームから送る値（id はホスト側で採番される）
export interface NewTodo {
  title: string;
  priority: Priority;
  dueDate?: string;
}
