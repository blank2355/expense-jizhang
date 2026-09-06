import { createClient, SupabaseClient } from '@supabase/supabase-js';

let envLoaded = false;

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function loadEnv(): void {
  const url = process.env.SUPABASE_URL || process.env.COZE_SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY || '';
  if (url && anonKey) {
    envLoaded = true;
    return;
  }
  try {
    require('dotenv').config();
  } catch {
    // dotenv not installed
  }
  envLoaded = true;
}

function getSupabaseCredentials(): SupabaseCredentials {
  loadEnv();

  const url = process.env.SUPABASE_URL || process.env.COZE_SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY || '';

  if (!url) {
    throw new Error('SUPABASE_URL is not set');
  }
  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY is not set');
  }

  return { url, anonKey };
}

function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || undefined;
}

function getSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();

  let key: string;
  if (token) {
    key = anonKey;
  } else {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    key = serviceRoleKey ?? anonKey;
  }

  const globalOptions: Record<string, any> = {};
  if (token) {
    globalOptions.headers = { Authorization: \Bearer \ };
  }

  return createClient(url, key, {
    global: globalOptions,
    db: {
      timeout: 60000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { loadEnv, getSupabaseCredentials, getSupabaseServiceRoleKey, getSupabaseClient };
