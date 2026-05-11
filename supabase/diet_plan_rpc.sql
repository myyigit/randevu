-- Diyet Planı RPC Fonksiyonları
-- Supabase SQL Editor'de çalıştırın

-- 1) Plan Oluştur
CREATE OR REPLACE FUNCTION public.create_diet_plan(
  p_client_id UUID, p_dietitian_id UUID, p_title VARCHAR,
  p_daily_kcal INT DEFAULT 1800, p_status VARCHAR DEFAULT 'draft',
  p_start_date DATE DEFAULT CURRENT_DATE, p_end_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  IF auth.uid() != p_dietitian_id AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Yetkisiz';
  END IF;
  v_id := gen_random_uuid();
  INSERT INTO diet_plans (id, client_id, dietitian_id, title, daily_kcal, status, start_date, end_date)
  VALUES (v_id, p_client_id, p_dietitian_id, p_title, p_daily_kcal, p_status::plan_status, p_start_date, p_end_date);
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Plan Sil
CREATE OR REPLACE FUNCTION public.delete_diet_plan(p_plan_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM diet_plans WHERE id = p_plan_id AND dietitian_id = auth.uid())
    AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Yetkisiz';
  END IF;
  DELETE FROM diet_plans WHERE id = p_plan_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Plan Durumu Güncelle
CREATE OR REPLACE FUNCTION public.update_plan_status(p_plan_id UUID, p_status VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM diet_plans WHERE id = p_plan_id AND dietitian_id = auth.uid())
    AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Yetkisiz';
  END IF;
  UPDATE diet_plans SET status = p_status::plan_status, updated_at = NOW() WHERE id = p_plan_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Öğün Ekle/Güncelle (basit metin olarak)
CREATE OR REPLACE FUNCTION public.upsert_meal(
  p_plan_id UUID, p_day INT, p_meal_type VARCHAR, p_description TEXT DEFAULT ''
)
RETURNS UUID AS $$
DECLARE v_id UUID; v_existing UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM diet_plans WHERE id = p_plan_id AND dietitian_id = auth.uid())
    AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Yetkisiz';
  END IF;
  SELECT id INTO v_existing FROM meals WHERE diet_plan_id = p_plan_id AND day_of_week = p_day AND meal_type = p_meal_type::meal_type LIMIT 1;
  IF v_existing IS NOT NULL THEN
    UPDATE meals SET order_index = order_index WHERE id = v_existing;
    RETURN v_existing;
  ELSE
    v_id := gen_random_uuid();
    INSERT INTO meals (id, diet_plan_id, day_of_week, meal_type) VALUES (v_id, p_plan_id, p_day, p_meal_type::meal_type);
    RETURN v_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
