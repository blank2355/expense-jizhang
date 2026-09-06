-- =============================================
-- 修复记账软件数据库：建表 + RLS 策略
-- 直接复制到 Supabase SQL Editor 运行
-- =============================================

-- 1. 创建 profiles 表（如果不存在）
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  approved BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 2. 创建 trips 表（如果不存在）
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT '\''active'\'',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 3. 创建 records 表（如果不存在）
CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT '\''CNY'\'',
  category TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '\''daily'\'',
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  merchant TEXT,
  payment_method TEXT,
  note TEXT,
  record_date DATE NOT NULL,
  record_time TIME,
  reimbursable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 4. 为所有表启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- 5. profiles 策略
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true));

-- 6. trips 策略
DROP POLICY IF EXISTS "Users can view own trips" ON trips;
DROP POLICY IF EXISTS "Users can insert own trips" ON trips;
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON trips;
CREATE POLICY "Users can view own trips" ON trips FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own trips" ON trips FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own trips" ON trips FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own trips" ON trips FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 7. records 策略
DROP POLICY IF EXISTS "Users can view own records" ON records;
DROP POLICY IF EXISTS "Users can insert own records" ON records;
DROP POLICY IF EXISTS "Users can update own records" ON records;
DROP POLICY IF EXISTS "Users can delete own records" ON records;
CREATE POLICY "Users can view own records" ON records FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own records" ON records FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own records" ON records FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own records" ON records FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 8. 创建函数：用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, approved, is_admin)
  VALUES (
    NEW.id,
    split_part(NEW.email, '\''@'\'', 1),
    COALESCE(NEW.raw_user_meta_data->>'approved', '\''false'\'')::boolean,
    COALESCE(NEW.raw_user_meta_data->>'is_admin', '\''false'\'')::boolean
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT '\''Database fix applied successfully!'\'' AS status;
