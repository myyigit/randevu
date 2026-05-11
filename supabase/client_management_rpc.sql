-- ============================================================
-- Danışan Yönetimi RPC Fonksiyonları
-- Supabase SQL Editor'e yapıştırıp çalıştırın
-- ============================================================

-- 1) Danışan Ekleme — users + clients tablosunu tek seferde dolduran
CREATE OR REPLACE FUNCTION public.add_client(
  p_dietitian_id UUID,
  p_name VARCHAR,
  p_email VARCHAR DEFAULT NULL,
  p_phone VARCHAR DEFAULT NULL,
  p_goal VARCHAR DEFAULT 'weight_loss',
  p_gender VARCHAR DEFAULT NULL,
  p_birth_date DATE DEFAULT NULL,
  p_activity_level VARCHAR DEFAULT 'sedentary',
  p_medical_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_email VARCHAR;
BEGIN
  -- Yetki: Diyetisyen kendine ekleyebilir, superadmin herkese ekleyebilir
  IF auth.uid() != p_dietitian_id AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Yetkisiz erişim';
  END IF;

  v_user_id := gen_random_uuid();
  v_email := COALESCE(NULLIF(TRIM(p_email), ''), v_user_id::text || '@noemail.local');

  -- 1. users tablosu
  INSERT INTO public.users (id, name, email, phone, role)
  VALUES (v_user_id, p_name, v_email, p_phone, 'client');

  -- 2. clients tablosu
  INSERT INTO public.clients (id, dietitian_id, goal, gender, birth_date, activity_level, medical_notes)
  VALUES (
    v_user_id,
    p_dietitian_id,
    p_goal::client_goal,
    CASE WHEN p_gender IS NOT NULL THEN p_gender::gender_type ELSE NULL END,
    p_birth_date,
    p_activity_level::activity_level,
    p_medical_notes
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2) Ölçüm Ekleme — diyetisyen/superadmin yetkisi kontrollü
CREATE OR REPLACE FUNCTION public.add_measurement(
  p_client_id UUID,
  p_weight_kg DECIMAL,
  p_body_fat_pct DECIMAL DEFAULT NULL,
  p_muscle_mass_kg DECIMAL DEFAULT NULL,
  p_waist_cm DECIMAL DEFAULT NULL,
  p_measured_at DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Yetki: Danışanın diyetisyeni mi veya superadmin mi?
  IF NOT EXISTS (
    SELECT 1 FROM clients
    WHERE id = p_client_id AND dietitian_id = auth.uid()
  ) AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Yetkisiz erişim';
  END IF;

  v_id := gen_random_uuid();

  INSERT INTO public.measurements (id, client_id, weight_kg, body_fat_pct, muscle_mass_kg, waist_cm, measured_at)
  VALUES (v_id, p_client_id, p_weight_kg, p_body_fat_pct, p_muscle_mass_kg, p_waist_cm, p_measured_at);

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3) Danışan Silme — users cascade ile clients de silinir
CREATE OR REPLACE FUNCTION public.delete_client(p_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Yetki kontrolü
  IF NOT EXISTS (
    SELECT 1 FROM clients
    WHERE id = p_client_id AND dietitian_id = auth.uid()
  ) AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Yetkisiz erişim';
  END IF;

  -- users'ı silince cascade ile clients de silinir
  DELETE FROM public.users WHERE id = p_client_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4) Danışan Güncelleme
CREATE OR REPLACE FUNCTION public.update_client(
  p_client_id UUID,
  p_name VARCHAR DEFAULT NULL,
  p_email VARCHAR DEFAULT NULL,
  p_phone VARCHAR DEFAULT NULL,
  p_goal VARCHAR DEFAULT NULL,
  p_gender VARCHAR DEFAULT NULL,
  p_birth_date DATE DEFAULT NULL,
  p_activity_level VARCHAR DEFAULT NULL,
  p_medical_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Yetki kontrolü
  IF NOT EXISTS (
    SELECT 1 FROM clients
    WHERE id = p_client_id AND dietitian_id = auth.uid()
  ) AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Yetkisiz erişim';
  END IF;

  -- users tablosu güncelle
  UPDATE public.users SET
    name = COALESCE(p_name, name),
    email = COALESCE(NULLIF(TRIM(p_email), ''), email),
    phone = COALESCE(p_phone, phone)
  WHERE id = p_client_id;

  -- clients tablosu güncelle
  UPDATE public.clients SET
    goal = COALESCE(p_goal::client_goal, goal),
    gender = CASE WHEN p_gender IS NOT NULL THEN p_gender::gender_type ELSE gender END,
    birth_date = COALESCE(p_birth_date, birth_date),
    activity_level = COALESCE(p_activity_level::activity_level, activity_level),
    medical_notes = COALESCE(p_medical_notes, medical_notes)
  WHERE id = p_client_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5) Diyetisyen kendi danışanlarının user bilgilerini okuyabilsin
-- (useClients hook'u JOIN ile users tablosundan name/email çekiyor)
DO $$
BEGIN
  -- Diyetisyen kendi danışanlarının users kaydını görebilsin
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Dietitians can view client users' AND tablename='users') THEN
    CREATE POLICY "Dietitians can view client users"
      ON users FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM clients
          WHERE clients.id = users.id
          AND clients.dietitian_id = auth.uid()
        )
      );
  END IF;
END $$;
