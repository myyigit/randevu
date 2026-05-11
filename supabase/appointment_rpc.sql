-- Randevu RPC Fonksiyonları + RLS Yaması
-- Supabase SQL Editor'de çalıştırın

-- ═══════════════════════════════════════════
-- RLS: Superadmin desteği ekle
-- ═══════════════════════════════════════════
DROP POLICY IF EXISTS "Dietitians can manage appointments" ON public.appointments;
CREATE POLICY "Dietitians can manage appointments"
ON public.appointments FOR ALL
USING (auth.uid() = dietitian_id OR public.is_superadmin());

DROP POLICY IF EXISTS "Clients can view own appointments" ON public.appointments;
CREATE POLICY "Clients can view own appointments"
ON public.appointments FOR SELECT
USING (auth.uid() = client_id OR public.is_superadmin());

-- ═══════════════════════════════════════════
-- 1) Randevu Ekle
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.add_appointment(
  p_client_id UUID,
  p_dietitian_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_duration_min INT DEFAULT 30,
  p_type VARCHAR DEFAULT 'in_person',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  IF auth.uid() != p_dietitian_id AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Yetkisiz erişim';
  END IF;
  v_id := gen_random_uuid();
  INSERT INTO public.appointments (id, client_id, dietitian_id, scheduled_at, duration_min, type, status, notes)
  VALUES (v_id, p_client_id, p_dietitian_id, p_scheduled_at, p_duration_min, p_type::appt_type, 'pending', p_notes);
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════
-- 2) Randevu Durumu Güncelle
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_appointment_status(
  p_appt_id UUID,
  p_status VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM appointments WHERE id = p_appt_id AND dietitian_id = auth.uid()
  ) AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Yetkisiz erişim';
  END IF;
  UPDATE public.appointments SET status = p_status::appt_status, updated_at = NOW()
  WHERE id = p_appt_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════
-- 3) Randevu Sil
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.delete_appointment(p_appt_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM appointments WHERE id = p_appt_id AND dietitian_id = auth.uid()
  ) AND NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Yetkisiz erişim';
  END IF;
  DELETE FROM public.appointments WHERE id = p_appt_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
