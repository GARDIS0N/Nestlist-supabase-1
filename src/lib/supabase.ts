import { createClient } from '@supabase/supabase-js';

export function sanitizeUrl(url: string): string {
  if (!url) return '';
  // Remove trailing slashes
  url = url.trim().replace(/\/+$/, '');
  // Remove /rest/v1 or any path
  url = url.replace(/\/rest\/v1.*$/, '');
  url = url.replace(/\/auth\/v1.*$/, '');
  // Ensure https://
  if (!url.startsWith('https://')) {
    url = 'https://' + url.replace(/^http:\/\//, '');
  }
  return url;
}

const SUPABASE_URL = sanitizeUrl(
  import.meta.env.VITE_SUPABASE_URL
  || 'https://wkbkcjbtvzfbjkbovpac.supabase.co'
);

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrYmtjamJ0dnpmYmprYm92cGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NzIyMjQsImV4cCI6MjA5ODM0ODIyNH0.pxuck5s1lLwy0lVWpBOKZGvWGbFHtDZ1SUs96WuZWt0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'nestlist-auth',
  },
});

export const isSupabaseConfigured = true;
export const IS_MOCK_SUPABASE = false;
export const SUPABASE_PROJECT_URL = SUPABASE_URL;

export const getSupabaseConfig = () => {
  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    isMock: false,
    isUsingStored: false,
  };
};

export const setSupabaseConfig = (url: string, key: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("NESTLIST_SUPABASE_URL", url);
    localStorage.setItem("NESTLIST_SUPABASE_ANON_KEY", key);
  }
};

export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    if (error && error.code !== 'PGRST116') {
      return { connected: false, error: error.message };
    }
    return { connected: true };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}

export const isSupabaseEnvMissing = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

export default supabase;
