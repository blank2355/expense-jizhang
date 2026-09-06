import { NextResponse } from 'next/server';

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

export async function GET(request: Request) {
  try {
    const supabaseUrl = await getEnvVar('SUPABASE_URL');
    const serviceRoleKey = await getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = await getEnvVar('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Supabase 配置缺失' }, { status: 500 });
    }

    const authHeader = request.headers.get('x-session');
    if (!authHeader) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const sessionRes = await fetch(\/auth/v1/user\, {
      headers: { 'apikey': anonKey, 'Authorization': \Bearer \ },
    });
    const sessionData = await sessionRes.json();
    const isAdmin = sessionData?.user_metadata?.is_admin === true;
    if (!isAdmin) {
      return NextResponse.json({ error: '无管理员权限' }, { status: 403 });
    }

    const usersRes = await fetch(\/auth/v1/admin/users\, {
      headers: { 'apikey': serviceRoleKey, 'Authorization': \Bearer \ },
    });
    const usersData = await usersRes.json();

    if (!usersData.users) {
      return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
    }

    const pendingUsers = usersData.users
      .filter((u: Record<string, unknown>) => {
        const meta = (u.user_metadata as Record<string, unknown>) || {};
        return meta.approved !== true && meta.is_admin !== true;
      })
      .map((u: Record<string, unknown>) => ({
        user_id: u.id,
        username: (u.email as string)?.replace('@expense.app', '') || 'unknown',
        approved: (u.user_metadata as Record<string, unknown>)?.approved || false,
        is_admin: (u.user_metadata as Record<string, unknown>)?.is_admin || false,
        created_at: u.created_at,
      }));

    return NextResponse.json({ users: pendingUsers });
  } catch (err) {
    console.error('[Admin Users API] Error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
