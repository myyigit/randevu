-- ============================================================
-- DietSync — Danışan Şifre Sıfırlama RPC
-- Bu dosyayı Supabase SQL Editor'e yapıştırıp çalıştırın.
-- ============================================================

CREATE OR REPLACE FUNCTION reset_client_password(p_client_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sadece diyetisyenin kendi danışanını sıfırlayabilmesi için kontrol
  IF NOT EXISTS (
    SELECT 1 FROM clients c
    JOIN dietitians d ON d.id = c.dietitian_id
    JOIN users u ON u.id = d.id
    WHERE c.id = p_client_id AND u.id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Yetkisiz işlem';
  END IF;

  -- Auth şifresini 12345678 yap
  UPDATE auth.users
  SET encrypted_password = crypt('12345678', gen_salt('bf')),
      updated_at = NOW()
  WHERE id = p_client_id;

  -- Zorunlu değiştirme bayrağını aktif et
  UPDATE users
  SET must_change_password = TRUE
  WHERE id = p_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_client_password TO authenticated;
