import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ||
  process.env.COZE_SUPABASE_URL || '';

const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ||
  process.env.COZE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Return a dummy client that will show auth form error
  console.warn('Supabase environment variables not configured');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
