-- ============================================================
-- Superadmin Başvuru Onaylama RPC (RLS Bypass İçin)
-- Supabase SQL Editor'e yapıştırıp çalıştırın
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_dietitian_application(app_id UUID, admin_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_auth_id UUID;
  v_name VARCHAR;
  v_email VARCHAR;
BEGIN
  -- Superadmin yetkisi kontrolü
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Yetkisiz erişim';
  END IF;

  -- Başvuruyu al
  SELECT auth_user_id, name, email 
  INTO v_auth_id, v_name, v_email
  FROM dietitian_applications 
  WHERE id = app_id;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Başvuru bulunamadı';
  END IF;

  -- 1) users tablosuna ekle (eğer yoksa)
  INSERT INTO public.users (id, name, email, role)
  VALUES (v_auth_id, v_name, v_email, 'dietitian')
  ON CONFLICT (id) DO UPDATE SET role = 'dietitian';

  -- 2) dietitians tablosuna ekle
  INSERT INTO public.dietitians (id, is_active)
  VALUES (v_auth_id, true)
  ON CONFLICT (id) DO UPDATE SET is_active = true;

  -- 3) auth.users raw_user_meta_data'sını güncelle (opsiyonel, role=dietitian yapmak için)
  -- NOT: Supabase'de public şemadan auth.users tablosunu doğrudan editleyemeyebilirsiniz, 
  -- ama trigger ile zaten hallettiysek users tablosu yeterli olur.

  -- 4) Başvuruyu onayla
  UPDATE dietitian_applications
  SET 
    status = 'approved',
    reviewed_at = NOW(),
    reviewed_by = admin_id
  WHERE id = app_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
