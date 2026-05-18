-- ============================================================
-- DietSync — Diyetisyen Şifre Sıfırlama RPC (Süperadmin)
-- Bu dosyayı Supabase SQL Editor'e yapıştırıp çalıştırın.
-- ============================================================

CREATE OR REPLACE FUNCTION reset_dietitian_password(p_dietitian_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sadece süperadmin bu işlemi yapabilir
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Yetkisiz işlem: Sadece süperadmin şifre sıfırlayabilir.';
  END IF;

  -- Hedef kullanıcının diyetisyen olduğunu doğrula
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_dietitian_id AND role = 'dietitian'
  ) THEN
    RAISE EXCEPTION 'Geçersiz diyetisyen ID.';
  END IF;

  -- Auth şifresini 12345678 yap
  UPDATE auth.users
  SET encrypted_password = crypt('12345678', gen_salt('bf')),
      updated_at = NOW()
  WHERE id = p_dietitian_id;

  -- Zorunlu şifre değiştirme bayrağını aktif et
  UPDATE users
  SET must_change_password = TRUE
  WHERE id = p_dietitian_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_dietitian_password TO authenticated;
