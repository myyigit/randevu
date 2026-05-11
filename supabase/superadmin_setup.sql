-- =====================================================================
-- Superadmin Kurulum SQL'i
-- Supabase SQL Editor'e yapıştırıp çalıştırın
-- =====================================================================

-- 1. user_role ENUM'ına 'superadmin' ekle (zaten eklenmişse hata vermez)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';

-- 2. dietitians tablosuna is_active kolonu ekle
ALTER TABLE public.dietitians ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 3. is_superadmin() yardımcı fonksiyonu
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. RLS Politikaları — Superadmin tüm tablolara erişebilir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Superadmins can view clients' AND tablename='clients') THEN
    CREATE POLICY "Superadmins can view clients" ON clients FOR ALL USING (is_superadmin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Superadmins can manage appointments' AND tablename='appointments') THEN
    CREATE POLICY "Superadmins can manage appointments" ON appointments FOR ALL USING (is_superadmin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Superadmins can manage measurements' AND tablename='measurements') THEN
    CREATE POLICY "Superadmins can manage measurements" ON measurements FOR ALL USING (is_superadmin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Superadmins can manage meal logs' AND tablename='meal_logs') THEN
    CREATE POLICY "Superadmins can manage meal logs" ON meal_logs FOR ALL USING (is_superadmin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Superadmins can manage diet plans' AND tablename='diet_plans') THEN
    CREATE POLICY "Superadmins can manage diet plans" ON diet_plans FOR ALL USING (is_superadmin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Superadmins can view users' AND tablename='users') THEN
    CREATE POLICY "Superadmins can view users" ON users FOR SELECT USING (is_superadmin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Superadmins can update users' AND tablename='users') THEN
    CREATE POLICY "Superadmins can update users" ON users FOR UPDATE USING (is_superadmin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Superadmins can manage dietitians' AND tablename='dietitians') THEN
    CREATE POLICY "Superadmins can manage dietitians" ON dietitians FOR ALL USING (is_superadmin());
  END IF;
END $$;

-- 5. Diyetisyen istatistik fonksiyonu
CREATE OR REPLACE FUNCTION get_dietitian_stats()
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  email VARCHAR,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  client_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    u.name,
    u.email,
    d.is_active,
    d.created_at,
    COUNT(c.id) as client_count
  FROM dietitians d
  JOIN users u ON u.id = d.id
  LEFT JOIN clients c ON c.dietitian_id = d.id
  GROUP BY d.id, u.name, u.email, d.is_active, d.created_at
  ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- Bir kullanıcıyı Superadmin yapmak için:
-- (email adresini kendi superadmin kullanıcınızın mailiyle değiştirin)
-- =====================================================================
-- UPDATE users SET role = 'superadmin' WHERE email = 'admin@dietsync.com';

-- =====================================================================
-- Örnek: Mevcut kullanıcıyı geçici olarak superadmin yap (test için):
-- =====================================================================
-- UPDATE users SET role = 'superadmin' WHERE id = auth.uid();
