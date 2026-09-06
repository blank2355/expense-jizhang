import { NextRequest, NextResponse } from 'next/server';

async function getEnvVar(key: string): Promise<string> {
  const envMap: Record<string, string> = {
    'SUPABASE_URL': process.env.SUPABASE_URL || '',
    'COZE_SUPABASE_URL': process.env.COZE_SUPABASE_URL || '',
    'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY || '',
    'COZE_SUPABASE_ANON_KEY': process.env.COZE_SUPABASE_ANON_KEY || '',
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    'COZE_SUPABASE_SERVICE_ROLE_KEY': process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '',
  };
  return envMap[key] || process.env[key] || '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetUserId, approved } = body;
    const accessToken = request.headers.get('x-session');

    if (!targetUserId || typeof approved !== 'boolean' || !accessToken) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const supabaseUrl = await getEnvVar('SUPABASE_URL');
    const anonKey = await getEnvVar('SUPABASE_ANON_KEY');
    const serviceRoleKey = await getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: '服务配置不完整' }, { status: 500 });
    }

    const userResponse = await fetch('/auth/v1/user', {
      headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + accessToken},
    });

    if (!userResponse.ok) {
      return NextResponse.json({ error: '用户验证失败' }, { status: 401 });
    }

    const userData = await userResponse.json();
    const isAdmin = userData.user_metadata?.is_admin === true || userData.raw_user_meta_data?.is_admin === true;
    if (!isAdmin) {
      return NextResponse.json({ error: '无管理员权限' }, { status: 403 });
    }

    const updateResponse = await fetch('/auth/v1/admin/users/', {
      method: 'PUT',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_metadata: { approved, is_admin: false }, raw_user_meta_data: { approved, is_admin: false } }),
    });

    if (!updateResponse.ok) {
      const errText = await updateResponse.text();
      console.error('[Admin API] Update user error:', errText);
      return NextResponse.json({ error: '更新用户状态失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin API] Error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
