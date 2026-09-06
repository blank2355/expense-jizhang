import { NextRequest, NextResponse } from \'next/server\';
import { createClient } from \'@supabase/supabase-js\';

async function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.COZE_SUPABASE_URL || \'\';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY || \'\';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || \'\';
  return { url, anonKey, serviceRoleKey };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetUserId, approved } = body;
    const accessToken = request.headers.get(\'x-session\');

    if (!targetUserId || typeof approved !== \'boolean\' || !accessToken) {
      return NextResponse.json({ error: \'缺少必要参数\' }, { status: 400 });
    }

    const { url, serviceRoleKey } = await getSupabaseConfig();
    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: \'服务配置不完整\' }, { status: 500 });
    }

    const supabase = createClient(url, serviceRoleKey);

    // Verify admin by checking session
    const { data: { user: adminUser }, error: adminErr } = await supabase.auth.getUser(accessToken);
    if (adminErr || !adminUser?.user_metadata?.is_admin) {
      return NextResponse.json({ error: \'无管理员权限\' }, { status: 403 });
    }

    // Update user metadata
    const { error: updateErr } = await supabase.auth.admin.updateUserById(targetUserId, {
      user_metadata: { approved, is_admin: false }
    });

    if (updateErr) {
      console.error(\'[Admin API] Update user error:\', updateErr);
      return NextResponse.json({ error: \'更新用户状态失败\' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(\'[Admin API] Error:\', err);
    return NextResponse.json({ error: \'服务器错误\' }, { status: 500 });
  }
}
