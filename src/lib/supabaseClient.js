import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://wkbkcjbtvzfbjkbovpac.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_lAzAQBZuUMir2UkL3DPlZw_xcr9Stdu";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
