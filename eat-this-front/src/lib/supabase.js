import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Null when not configured (open / self-hosted mode) — auth UI hides itself.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
