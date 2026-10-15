import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export type MemberState = 'unknown' | 'member' | 'not-member';

// ログイン状態と、ログインしたユーザーがメンバー表にいるか
export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [member, setMember] = useState<MemberState>('unknown');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (!supabase) return setSession(null);
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!supabase || !userId) {
      setMember('unknown');
      return;
    }
    supabase
      .from('memo_members')
      .select('display_name')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setMember(data ? 'member' : 'not-member');
        setDisplayName(data?.display_name ?? '');
      });
  }, [userId]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return '接続先が設定されていません';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? 'メールアドレスかパスワードが違います' : null;
  };
  const signOut = () => supabase?.auth.signOut();

  return { session, userId, member, displayName, signIn, signOut };
}
