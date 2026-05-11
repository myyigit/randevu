-- ============================================================
-- DietSync — Supabase Veritabanı Şeması
-- Bu dosyayı Supabase SQL Editor'e yapıştırıp çalıştırın.
-- ============================================================

-- ===================== EXTENSIONS =====================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================== ENUM TYPES =====================
CREATE TYPE user_role       AS ENUM ('dietitian', 'client');
CREATE TYPE gender_type     AS ENUM ('male', 'female', 'other');
CREATE TYPE activity_level  AS ENUM ('sedentary', 'light', 'moderate', 'active');
CREATE TYPE client_goal     AS ENUM ('weight_loss', 'muscle_gain', 'maintenance');
CREATE TYPE plan_status     AS ENUM ('draft', 'active', 'completed');
CREATE TYPE meal_type       AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE mood_type       AS ENUM ('great', 'good', 'neutral', 'bad', 'terrible');
CREATE TYPE appt_type       AS ENUM ('in_person', 'online');
CREATE TYPE appt_status     AS ENUM ('pending', 'confirmed', 'cancelled', 'done');
CREATE TYPE appt_outcome    AS ENUM ('attended', 'no_show', 'cancelled', 'rescheduled');
CREATE TYPE notif_type      AS ENUM ('meal_time', 'water', 'dietitian_msg', 'alert', 'appointment');
CREATE TYPE reminder_channel AS ENUM ('push', 'whatsapp', 'telegram', 'sms', 'email');
CREATE TYPE reminder_action AS ENUM ('confirmed', 'rescheduled', 'no_action', 'cancelled');
CREATE TYPE portion_tendency AS ENUM ('small', 'medium', 'large');
CREATE TYPE preferred_channel AS ENUM ('whatsapp', 'telegram', 'sms', 'push_only');

-- ===================== TABLES =====================

-- 1. KULLANICILAR
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'client',
  preferred_channel preferred_channel DEFAULT 'push_only',
  telegram_chat_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DİYETİSYEN PROFİLİ
CREATE TABLE dietitians (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  license_no VARCHAR(50),
  clinic_name VARCHAR(255),
  working_hours JSONB DEFAULT '{}',
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DANIŞAN PROFİLİ
CREATE TABLE clients (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  dietitian_id UUID REFERENCES dietitians(id) ON DELETE SET NULL,
  birth_date DATE,
  gender gender_type,
  height_cm DECIMAL(5,1),
  activity_level activity_level DEFAULT 'sedentary',
  medical_notes TEXT,
  goal client_goal DEFAULT 'weight_loss',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ÖLÇÜMLER
CREATE TABLE measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  weight_kg DECIMAL(5,1),
  body_fat_pct DECIMAL(4,1),
  muscle_mass_kg DECIMAL(5,1),
  waist_cm DECIMAL(5,1),
  bmi DECIMAL(4,1),
  notes TEXT
);

-- 5. BESİN VERİTABANI
CREATE TABLE foods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  kcal_per_100g DECIMAL(6,1),
  protein_g DECIMAL(5,1),
  carbs_g DECIMAL(5,1),
  fat_g DECIMAL(5,1),
  fiber_g DECIMAL(5,1),
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. DİYET PLANLARI
CREATE TABLE diet_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  dietitian_id UUID NOT NULL REFERENCES dietitians(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  start_date DATE,
  end_date DATE,
  daily_kcal INT,
  status plan_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ÖĞÜNLER (Plan içinde)
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diet_plan_id UUID NOT NULL REFERENCES diet_plans(id) ON DELETE CASCADE,
  day_of_week INT CHECK (day_of_week BETWEEN 1 AND 7),
  meal_type meal_type NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ÖĞÜN-YİYECEK İLİŞKİSİ
CREATE TABLE meal_foods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  amount_g DECIMAL(6,1),
  alternatives JSONB DEFAULT '[]'
);

-- 9. DANIŞAN ÖĞÜN KAYITLARI
CREATE TABLE meal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  meal_type meal_type NOT NULL,
  photo_url TEXT,
  note TEXT,
  mood mood_type,
  ai_analysis JSONB,
  dietitian_feedback TEXT,
  feedback_at TIMESTAMPTZ
);

-- 10. SU TAKİBİ
CREATE TABLE water_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  amount_ml INT DEFAULT 250
);

-- 11. DUYGU DURUMU
CREATE TABLE mood_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  mood mood_type NOT NULL,
  note TEXT
);

-- 12. BİLDİRİMLER
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notif_type NOT NULL,
  title VARCHAR(255),
  body TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. RANDEVULAR
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  dietitian_id UUID NOT NULL REFERENCES dietitians(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INT DEFAULT 30,
  type appt_type DEFAULT 'in_person',
  status appt_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. RANDEVU GEÇMİŞİ & RİSK
CREATE TABLE appointment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  outcome appt_outcome NOT NULL,
  no_show_risk_score INT,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. HATIRLATMA LOG
CREATE TABLE reminder_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  channel reminder_channel NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  action_taken reminder_action DEFAULT 'no_action',
  action_at TIMESTAMPTZ
);

-- 16. BAŞARI ROZETLERİ
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. AI KULLANICI HAFIZASI
CREATE TABLE client_ai_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID UNIQUE NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  preferred_foods JSONB DEFAULT '[]',
  disliked_foods JSONB DEFAULT '[]',
  meal_timing JSONB DEFAULT '{}',
  portion_tendency portion_tendency DEFAULT 'medium',
  compliance_score DECIMAL(5,2) DEFAULT 100.0,
  skip_pattern JSONB DEFAULT '{}',
  response_to_suggestions INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. AI CHAT GEÇMİŞİ
CREATE TABLE ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  ai_response TEXT,
  image_url TEXT,
  confidence DECIMAL(3,2),
  forwarded_to_dietitian BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================== INDEXES =====================
CREATE INDEX idx_clients_dietitian ON clients(dietitian_id);
CREATE INDEX idx_measurements_client ON measurements(client_id);
CREATE INDEX idx_measurements_date ON measurements(measured_at DESC);
CREATE INDEX idx_diet_plans_client ON diet_plans(client_id);
CREATE INDEX idx_diet_plans_status ON diet_plans(status);
CREATE INDEX idx_meals_plan ON meals(diet_plan_id);
CREATE INDEX idx_meal_logs_client ON meal_logs(client_id);
CREATE INDEX idx_meal_logs_date ON meal_logs(logged_at DESC);
CREATE INDEX idx_water_logs_client ON water_logs(client_id);
CREATE INDEX idx_water_logs_date ON water_logs(logged_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_dietitian ON appointments(dietitian_id);
CREATE INDEX idx_appointments_date ON appointments(scheduled_at);
CREATE INDEX idx_ai_chat_client ON ai_chat_logs(client_id);

-- ===================== ROW LEVEL SECURITY =====================

-- Tüm tablolarda RLS aktif
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietitians ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_ai_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_logs ENABLE ROW LEVEL SECURITY;

-- USERS: Herkes kendi profilini görebilir
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- DIETITIANS: Diyetisyen kendi profilini görebilir
CREATE POLICY "Dietitians can view own profile"
  ON dietitians FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Dietitians can update own profile"
  ON dietitians FOR UPDATE
  USING (auth.uid() = id);

-- CLIENTS: Danışan kendi profilini görebilir, diyetisyen danışanlarını görebilir
CREATE POLICY "Clients can view own profile"
  ON clients FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Dietitians can view their clients"
  ON clients FOR SELECT
  USING (auth.uid() = dietitian_id);

CREATE POLICY "Dietitians can insert clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = dietitian_id);

-- MEASUREMENTS: Danışan kendi ölçümlerini, diyetisyen danışanının ölçümlerini görebilir
CREATE POLICY "Clients can view own measurements"
  ON measurements FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Dietitians can view client measurements"
  ON measurements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = measurements.client_id
      AND clients.dietitian_id = auth.uid()
    )
  );

CREATE POLICY "Dietitians can insert measurements"
  ON measurements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = measurements.client_id
      AND clients.dietitian_id = auth.uid()
    )
  );

-- FOODS: Herkes okuyabilir
CREATE POLICY "Foods are readable by all authenticated"
  ON foods FOR SELECT
  USING (auth.role() = 'authenticated');

-- DIET PLANS: Danışan kendi planını, diyetisyen kendi oluşturduğu planları görebilir
CREATE POLICY "Clients can view own diet plans"
  ON diet_plans FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Dietitians can manage their diet plans"
  ON diet_plans FOR ALL
  USING (auth.uid() = dietitian_id);

-- MEALS: Plan erişimiyle aynı mantıkta
CREATE POLICY "Meals follow diet plan access"
  ON meals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM diet_plans
      WHERE diet_plans.id = meals.diet_plan_id
      AND (diet_plans.client_id = auth.uid() OR diet_plans.dietitian_id = auth.uid())
    )
  );

CREATE POLICY "Dietitians can manage meals"
  ON meals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM diet_plans
      WHERE diet_plans.id = meals.diet_plan_id
      AND diet_plans.dietitian_id = auth.uid()
    )
  );

-- MEAL FOODS: Meals ile aynı erişim
CREATE POLICY "Meal foods follow meal access"
  ON meal_foods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meals
      JOIN diet_plans ON diet_plans.id = meals.diet_plan_id
      WHERE meals.id = meal_foods.meal_id
      AND (diet_plans.client_id = auth.uid() OR diet_plans.dietitian_id = auth.uid())
    )
  );

-- MEAL LOGS: Danışan kendi loglarını, diyetisyen danışanının loglarını görebilir
CREATE POLICY "Clients can manage own meal logs"
  ON meal_logs FOR ALL
  USING (auth.uid() = client_id);

CREATE POLICY "Dietitians can view client meal logs"
  ON meal_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = meal_logs.client_id
      AND clients.dietitian_id = auth.uid()
    )
  );

CREATE POLICY "Dietitians can update meal logs feedback"
  ON meal_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = meal_logs.client_id
      AND clients.dietitian_id = auth.uid()
    )
  );

-- WATER LOGS
CREATE POLICY "Clients can manage own water logs"
  ON water_logs FOR ALL
  USING (auth.uid() = client_id);

CREATE POLICY "Dietitians can view client water logs"
  ON water_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = water_logs.client_id
      AND clients.dietitian_id = auth.uid()
    )
  );

-- MOOD LOGS
CREATE POLICY "Clients can manage own mood logs"
  ON mood_logs FOR ALL
  USING (auth.uid() = client_id);

CREATE POLICY "Dietitians can view client mood logs"
  ON mood_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = mood_logs.client_id
      AND clients.dietitian_id = auth.uid()
    )
  );

-- NOTIFICATIONS
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- APPOINTMENTS
CREATE POLICY "Clients can view own appointments"
  ON appointments FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Dietitians can manage appointments"
  ON appointments FOR ALL
  USING (auth.uid() = dietitian_id);

-- ACHIEVEMENTS
CREATE POLICY "Clients can view own achievements"
  ON achievements FOR SELECT
  USING (auth.uid() = client_id);

-- AI PROFILE
CREATE POLICY "Clients can view own AI profile"
  ON client_ai_profile FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Dietitians can view client AI profile"
  ON client_ai_profile FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_ai_profile.client_id
      AND clients.dietitian_id = auth.uid()
    )
  );

-- AI CHAT LOGS
CREATE POLICY "Clients can manage own chat logs"
  ON ai_chat_logs FOR ALL
  USING (auth.uid() = client_id);

CREATE POLICY "Dietitians can view client chat logs"
  ON ai_chat_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = ai_chat_logs.client_id
      AND clients.dietitian_id = auth.uid()
    )
  );

-- APPOINTMENT HISTORY (diyetisyen erişimi)
CREATE POLICY "Dietitians can manage appointment history"
  ON appointment_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = appointment_history.appointment_id
      AND appointments.dietitian_id = auth.uid()
    )
  );

-- REMINDER LOGS (diyetisyen erişimi)
CREATE POLICY "Dietitians can view reminder logs"
  ON reminder_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = reminder_logs.appointment_id
      AND appointments.dietitian_id = auth.uid()
    )
  );

-- ===================== UPDATED_AT TRİGGER =====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_diet_plans
  BEFORE UPDATE ON diet_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_appointments
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_ai_profile
  BEFORE UPDATE ON client_ai_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===================== REALTIME AKTİF =====================
-- Supabase'de Realtime'ı aktif etmek için tablolara publication ekliyoruz
ALTER PUBLICATION supabase_realtime ADD TABLE meal_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE water_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE mood_logs;
