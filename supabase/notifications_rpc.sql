-- ============================================================
-- DietSync — Bildirimler & Uyarilar Tablosu + Otomatik Uyari Fonksiyonlari
-- Supabase SQL Editor'e yapistirip calistirin.
-- ============================================================

-- 1. Notifications tablosu
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notif_type DEFAULT 'alert',
  title TEXT NOT NULL,
  message TEXT,
  icon TEXT DEFAULT 'bell',
  is_read BOOLEAN DEFAULT FALSE,
  related_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- 2. Diyetisyenler icin uyari olusturan fonksiyon
-- Bu fonksiyonu periyodik olarak (cron veya uygulama icinden) cagirabilirsiniz.
CREATE OR REPLACE FUNCTION generate_dietitian_alerts(p_dietitian_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  -- A) 3+ gundur ogun kaydı yapmamis danisanlar
  FOR r IN
    SELECT c.id AS client_id, u.name
    FROM clients c
    JOIN users u ON u.id = c.id
    LEFT JOIN (
      SELECT client_id, MAX(logged_at) AS last_log
      FROM meal_logs GROUP BY client_id
    ) ml ON ml.client_id = c.id
    WHERE c.dietitian_id = p_dietitian_id
      AND (ml.last_log IS NULL OR ml.last_log < NOW() - INTERVAL '3 days')
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = p_dietitian_id
          AND n.related_client_id = c.id
          AND n.type = 'alert'
          AND n.title LIKE '%ogun kaydı yok%'
          AND n.created_at > NOW() - INTERVAL '1 day'
      )
  LOOP
    INSERT INTO notifications (user_id, type, title, message, icon, related_client_id)
    VALUES (
      p_dietitian_id, 'alert',
      r.name || ' - ogun kaydı yok',
      r.name || ' son 3+ gundur ogun kaydi yapmamis.',
      'warning',
      r.client_id
    );
    v_count := v_count + 1;
  END LOOP;

  -- B) 5+ gundur su hedefini karsilamamis danisanlar
  FOR r IN
    SELECT c.id AS client_id, u.name
    FROM clients c
    JOIN users u ON u.id = c.id
    LEFT JOIN (
      SELECT client_id, SUM(amount_ml) AS total_ml
      FROM water_logs
      WHERE logged_at > NOW() - INTERVAL '5 days'
      GROUP BY client_id
    ) wl ON wl.client_id = c.id
    WHERE c.dietitian_id = p_dietitian_id
      AND (wl.total_ml IS NULL OR wl.total_ml < 2500)
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = p_dietitian_id
          AND n.related_client_id = c.id
          AND n.type = 'alert'
          AND n.title LIKE '%su hedefi%'
          AND n.created_at > NOW() - INTERVAL '1 day'
      )
  LOOP
    INSERT INTO notifications (user_id, type, title, message, icon, related_client_id)
    VALUES (
      p_dietitian_id, 'alert',
      r.name || ' - su hedefi karsilanmiyor',
      r.name || ' son 5 gundur su hedefini karsilamamis.',
      'water',
      r.client_id
    );
    v_count := v_count + 1;
  END LOOP;

  -- C) Son 1 haftada 2+ kg alan danisanlar
  FOR r IN
    SELECT c.id AS client_id, u.name,
           m_new.weight_kg - m_old.weight_kg AS weight_diff
    FROM clients c
    JOIN users u ON u.id = c.id
    JOIN LATERAL (
      SELECT weight_kg FROM measurements
      WHERE client_id = c.id ORDER BY measured_at DESC LIMIT 1
    ) m_new ON TRUE
    JOIN LATERAL (
      SELECT weight_kg FROM measurements
      WHERE client_id = c.id AND measured_at < NOW() - INTERVAL '7 days'
      ORDER BY measured_at DESC LIMIT 1
    ) m_old ON TRUE
    WHERE c.dietitian_id = p_dietitian_id
      AND m_new.weight_kg - m_old.weight_kg >= 2
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = p_dietitian_id
          AND n.related_client_id = c.id
          AND n.type = 'alert'
          AND n.title LIKE '%kilo alimi%'
          AND n.created_at > NOW() - INTERVAL '1 day'
      )
  LOOP
    INSERT INTO notifications (user_id, type, title, message, icon, related_client_id)
    VALUES (
      p_dietitian_id, 'alert',
      r.name || ' - kilo alimi uyarisi',
      r.name || ' son 1 haftada +' || ROUND(r.weight_diff::numeric, 1) || ' kg aldi.',
      'scale',
      r.client_id
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_dietitian_alerts TO authenticated;

-- 3. RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (TRUE);
