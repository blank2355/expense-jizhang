import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.COZE_SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';
  return { url, anonKey, serviceRoleKey };
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }

    const config = await getSupabaseConfig();

    if (!config.url || !config.serviceRoleKey) {
      return NextResponse.json({ error: '服务配置缺失' }, { status: 500 });
    }

    const supabase = createClient(config.url, config.serviceRoleKey);
    const email = \@expense.app\;

    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (!listError && existingUsers) {
      const existing = existingUsers.users.find((u: any) => u.email === email);
      if (existing) {
        await supabase.auth.admin.updateUserById(existing.id, {
          user_metadata: { approved: true, is_admin: true }
        });
        try {
          await supabase.from('profiles').upsert(
            { user_id: existing.id, username, approved: true, is_admin: true },
            { onConflict: 'user_id' }
          );
        } catch { /* profiles table may not exist yet */ }
        return NextResponse.json({ message: '已将现有用户设为管理员', userId: existing.id, username, email });
      }
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { approved: true, is_admin: true }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user) {
      try {
        await supabase.from('profiles').insert({ user_id: data.user.id, username, approved: true, is_admin: true });
      } catch { /* profiles table may not exist yet */ }
    }

    return NextResponse.json({ message: '管理员账号创建成功', userId: data.user?.id, username, email });
  } catch (err) {
    console.error('[Admin Create] Error:', err);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
