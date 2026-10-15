import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import type { Memo, MemoRow } from './types';

const byCreated = (a: MemoRow, b: MemoRow) => a.created_at.localeCompare(b.created_at);

// 1 つの取引先の付箋: 読み込み・追加・編集・削除と、Realtime による他の人の変更の反映
export function useAccountMemos(accountId: string, userId: string | undefined, enabled: boolean) {
  const [rows, setRows] = useState<MemoRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // 同じ id があれば置き換え、無ければ足す（自分の操作の結果と Realtime の通知が二重にならないように）
  const upsert = useCallback((row: MemoRow) => {
    setRows((prev) => [...prev.filter((r) => r.id !== row.id), row].sort(byCreated));
  }, []);
  const drop = useCallback((id: string) => setRows((prev) => prev.filter((r) => r.id !== id)), []);

  useEffect(() => {
    if (!supabase || !enabled || !accountId) return;
    const sb = supabase;
    let cancelled = false;
    setError(null);

    sb.from('memo_members')
      .select('user_id, display_name')
      .then(({ data }) => !cancelled && setNames(Object.fromEntries((data ?? []).map((m) => [m.user_id, m.display_name]))));
    sb.from('account_memos')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at')
      .then(({ data, error: e }) => {
        if (cancelled) return;
        if (e) setError('付箋を読み込めませんでした。再読み込みしてください');
        else setRows(data ?? []);
      });

    const channel = sb
      .channel(`account_memos:${accountId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'account_memos', filter: `account_id=eq.${accountId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') drop((payload.old as MemoRow).id);
          else upsert(payload.new as MemoRow);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [accountId, enabled, upsert, drop]);

  const add = async (body: string) => {
    if (!supabase) return;
    const { data, error: e } = await supabase.from('account_memos').insert({ account_id: accountId, body }).select().single();
    if (e) return setError('付箋を追加できませんでした');
    upsert(data);
  };
  const update = async (id: string, body: string) => {
    if (!supabase) return;
    const { data, error: e } = await supabase
      .from('account_memos')
      .update({ body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (e) return setError('付箋を保存できませんでした');
    upsert(data);
  };
  const remove = async (id: string) => {
    if (!supabase) return;
    const { error: e } = await supabase.from('account_memos').delete().eq('id', id);
    if (e) return setError('付箋を削除できませんでした');
    drop(id);
  };

  const memos: Memo[] = useMemo(
    () => rows.map((r) => ({ ...r, authorName: names[r.author_id] ?? '（不明）', mine: r.author_id === userId })),
    [rows, names, userId],
  );
  return { memos, error, add, update, remove };
}
