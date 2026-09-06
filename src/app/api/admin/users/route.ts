import { NextResponse } from \'next/server\';
import { createClient } from \'@supabase/supabase-js\';

async function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.COZE_SUPABASE_URL || \'\';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY || \'\';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || \'\';
  return { url, anonKey, serviceRoleKey };
}

export async function GET(request: Request) {
  try {
    const { url, serviceRoleKey, anonKey } = await getSupabaseConfig();

    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: \'Supabase 配置缺失\' }, { status: 500 });
    }

    const authHeader = request.headers.get(\'x-session\');
    if (!authHeader) {
      return NextResponse.json({ error: \'未授权\' }, { status: 401 });
    }

    const supabase = createClient(url, serviceRoleKey);

    // Verify admin by checking session
    const { data: { user: adminUser }, error: adminErr } = await supabase.auth.getUser(authHeader);
    if (adminErr || !adminUser?.user_metadata?.is_admin) {
      return NextResponse.json({ error: \'无管理员权限\' }, { status: 403 });
    }

    // Get all users from admin API
    const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
    if (usersErr) {
      return NextResponse.json({ error: \'获取用户列表失败\' }, { status: 500 });
    }

    const pendingUsers = usersData.users
      .filter((u: any) => {
        const meta = u.user_metadata || u.raw_user_meta_data || {};
        return meta.approved !== true && meta.is_admin !== true;
      })
      .map((u: any) => ({
        user_id: u.id,
        username: u.email?.replace(\'@expense.app\', \'\') || \'unknown\',
        approved: (u.user_metadata || u.raw_user_meta_data || {})?.approved || false,
        is_admin: (u.user_metadata || u.raw_user_meta_data || {})?.is_admin || false,
        created_at: u.created_at,
      }));

    return NextResponse.json({ users: pendingUsers });
  } catch (err) {
    console.error(\'[Admin Users API] Error:\', err);
    return NextResponse.json({ error: \'服务器错误\' }, { status: 500 });
  }
}
