-- ============================================================
-- DietSync — Danışan Auth Kaydı & Portalı İçin RPC Fonksiyonlar
-- Bu dosyayı Supabase SQL Editor'e yapıştırıp çalıştırın.
-- ============================================================

-- 1. users tablosuna ilk-giriş şifre değiştirme zorunluluğu ekle
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- ============================================================
-- 2. Danışanı Auth + DB'ye birlikte kayıt eden RPC
--    (service_role yetkisiyle çalışır — güvenli)
-- ============================================================
CREATE OR REPLACE FUNCTION create_client_with_auth(
  p_dietitian_id  UUID,
  p_name          TEXT,
  p_email         TEXT,
  p_phone         TEXT    DEFAULT NULL,
  p_goal          TEXT    DEFAULT 'weight_loss',
  p_gender        TEXT    DEFAULT NULL,
  p_birth_date    DATE    DEFAULT NULL,
  p_activity_level TEXT   DEFAULT 'sedentary',
  p_medical_notes TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id  UUID;
  v_user_id       UUID;
BEGIN
  -- 1. Supabase Auth'da kullanıcı oluştur (12345678 geçici şifre)
  v_auth_user_id := (
    SELECT id FROM auth.users WHERE email = p_email LIMIT 1
  );

  IF v_auth_user_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, role, aud, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      p_email,
      crypt('12345678', gen_salt('bf')),
      NOW(),
      'authenticated',
      'authenticated',
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('name', p_name),
      FALSE,
      '', '', '', ''
    )
    RETURNING id INTO v_auth_user_id;
  END IF;

  -- 2. users tablosuna kayıt ekle (role = 'client')
  INSERT INTO users (id, email, name, phone, role, must_change_password)
  VALUES (v_auth_user_id, p_email, p_name, p_phone, 'client', TRUE)
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, phone = EXCLUDED.phone
  RETURNING id INTO v_user_id;

  -- 3. clients tablosuna profil ekle
  INSERT INTO clients (
    id, dietitian_id, birth_date, gender, activity_level, medical_notes, goal
  ) VALUES (
    v_user_id, p_dietitian_id, p_birth_date,
    p_gender::gender_type, p_activity_level::activity_level,
    p_medical_notes, p_goal::client_goal
  )
  ON CONFLICT (id) DO UPDATE
    SET dietitian_id = EXCLUDED.dietitian_id;

  RETURN v_user_id;
END;
$$;

-- ============================================================
-- 3. Danışan öğün kaydı ekle (RLS bypass olmadan da çalışır
--    çünkü client kendi kaydını oluşturuyor)
-- ============================================================
CREATE OR REPLACE FUNCTION add_meal_log(
  p_client_id  UUID,
  p_meal_type  TEXT,
  p_note       TEXT    DEFAULT NULL,
  p_mood       TEXT    DEFAULT NULL,
  p_photo_url  TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Yalnızca kendi kaydını ekleyebilsin
  IF auth.uid() != p_client_id THEN
    RAISE EXCEPTION 'Yetkisiz işlem';
  END IF;

  INSERT INTO meal_logs (client_id, meal_type, note, mood, photo_url, logged_at)
  VALUES (
    p_client_id, p_meal_type::meal_type, p_note,
    CASE WHEN p_mood IS NOT NULL THEN p_mood::mood_type ELSE NULL END,
    p_photo_url, NOW()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ============================================================
-- 4. Danışan su kaydı ekle
-- ============================================================
CREATE OR REPLACE FUNCTION add_water_log(
  p_client_id UUID,
  p_amount_ml INT DEFAULT 250
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() != p_client_id THEN
    RAISE EXCEPTION 'Yetkisiz işlem';
  END IF;

  INSERT INTO water_logs (client_id, amount_ml, logged_at)
  VALUES (p_client_id, p_amount_ml, NOW())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ============================================================
-- 5. İzinler
-- ============================================================
GRANT EXECUTE ON FUNCTION create_client_with_auth TO authenticated;
GRANT EXECUTE ON FUNCTION add_meal_log TO authenticated;
GRANT EXECUTE ON FUNCTION add_water_log TO authenticated;
