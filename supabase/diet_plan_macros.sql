-- diet_plans tablosuna makro yuzdeleri ekleme
-- Supabase SQL Editor'de calistirin

ALTER TABLE diet_plans
  ADD COLUMN IF NOT EXISTS protein_pct INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS carb_pct INT DEFAULT 45,
  ADD COLUMN IF NOT EXISTS fat_pct INT DEFAULT 25;

-- Eski fonksiyonu kaldir (eski parametre listesi)
DROP FUNCTION IF EXISTS public.create_diet_plan(UUID, UUID, VARCHAR, INT, VARCHAR, DATE, DATE);

-- create_diet_plan fonksiyonunu makro destekli guncelle
CREATE OR REPLACE FUNCTION public.create_diet_plan(
  p_client_id UUID, p_dietitian_id UUID, p_title VARCHAR,
  p_daily_kcal INT DEFAULT 1800, p_status VARCHAR DEFAULT 'draft',
  p_start_date DATE DEFAULT CURRENT_DATE, p_end_date DATE DEFAULT NULL,
  p_protein_pct INT DEFAULT 30, p_carb_pct INT DEFAULT 45, p_fat_pct INT DEFAULT 25
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  IF auth.uid() != p_dietitian_id AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Yetkisiz';
  END IF;
  v_id := gen_random_uuid();
  INSERT INTO diet_plans (id, client_id, dietitian_id, title, daily_kcal, status, start_date, end_date, protein_pct, carb_pct, fat_pct)
  VALUES (v_id, p_client_id, p_dietitian_id, p_title, p_daily_kcal, p_status::plan_status, p_start_date, p_end_date, p_protein_pct, p_carb_pct, p_fat_pct);
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_diet_plan TO authenticated;
