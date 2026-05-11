-- ============================================================
-- Diyetisyen Başvuru Sistemi — SQL
-- Supabase SQL Editor'e yapıştırıp çalıştırın
-- ============================================================

-- Başvuru tablosu
CREATE TABLE IF NOT EXISTS public.dietitian_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  license_no VARCHAR(100),
  clinic_name VARCHAR(255),
  city VARCHAR(100),
  bio TEXT,
  experience_years INT DEFAULT 0,
  specialization VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID
);

-- RLS
ALTER TABLE public.dietitian_applications ENABLE ROW LEVEL SECURITY;

-- Başvuran kendi başvurusunu görebilir
CREATE POLICY "Applicant can view own application"
  ON dietitian_applications FOR SELECT
  USING (auth_user_id = auth.uid());

-- Başvuran kendi başvurusunu ekleyebilir
CREATE POLICY "Applicant can insert own application"
  ON dietitian_applications FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

-- Superadmin her şeyi görebilir ve güncelleyebilir
CREATE POLICY "Superadmin can manage applications"
  ON dietitian_applications FOR ALL
  USING (is_superadmin());

-- Index
CREATE INDEX IF NOT EXISTS idx_applications_status ON dietitian_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_auth_user ON dietitian_applications(auth_user_id);

-- ============================================================
-- Auth trigger güncelleme: Kayıt olan kullanıcı pending olsun
-- register sayfasında meta_data'da role='pending_dietitian' geçeceğiz
-- Bu sayede users tablosuna role='client' değil doğru değer yazılır
-- ============================================================
-- NOT: Kayıt formu supabase.auth.signUp sırasında
-- { data: { role: 'pending_dietitian' } } göndermeyecek.
-- users tablosuna ekleme yapılmayacak (trigger'ı bypass edeceğiz)
-- Bunun yerine applicant doğrudan dietitian_applications tablosuna
-- insert yapar, users tablosuna admin onayında eklenecek.
