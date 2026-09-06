import { NextResponse } from 'next/server';

// Cache for env vars (refresh every 5 minutes)
let cachedEnvVars: { url: string; anonKey: string } | null = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
  const now = Date.now();
  if (cachedEnvVars && (now - cachedAt) < CACHE_TTL) {
    return NextResponse.json(cachedEnvVars);
  }

  const url = process.env.SUPABASE_URL || process.env.COZE_SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY || '';

  const config = { url, anonKey };

  if (url && anonKey) {
    cachedEnvVars = config;
    cachedAt = now;
  }

  return NextResponse.json(config);
}
