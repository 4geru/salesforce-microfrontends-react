// Supabase の接続先（project-supabase）。anon key は公開してよい値で、データは RLS で守る
export const SUPABASE_URL = 'https://xathcumdrtvxbepuugpc.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
