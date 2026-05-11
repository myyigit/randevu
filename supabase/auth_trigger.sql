-- ============================================================
-- Supabase Auth → users tablosu otomatik senkronizasyon
-- Bu script'i Supabase SQL Editor'de çalıştırın
-- ============================================================

-- 1) Auth trigger: Yeni kullanıcı kaydolunca otomatik users + dietitians/clients kaydı
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- users tablosuna ekle
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'dietitian')
  );

  -- Eğer diyetisyen ise dietitians tablosuna da ekle
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'dietitian') = 'dietitian' THEN
    INSERT INTO public.dietitians (id)
    VALUES (NEW.id);
  END IF;

  -- Eğer danışan ise clients tablosuna ekle
  IF NEW.raw_user_meta_data->>'role' = 'client' THEN
    INSERT INTO public.clients (id, dietitian_id)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'dietitian_id')::UUID
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı bağla
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2) Mevcut auth kullanıcılarını users tablosuna ekle
-- (Eğer daha önce Auth'tan kullanıcı oluşturduysanız ve
--  users tablosunda karşılığı yoksa bu çalıştırılmalı)
-- ============================================================
INSERT INTO public.users (id, email, name, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  'dietitian'::user_role
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL;

-- Mevcut diyetisyenleri dietitians tablosuna ekle
INSERT INTO public.dietitians (id)
SELECT u.id
FROM public.users u
LEFT JOIN public.dietitians d ON d.id = u.id
WHERE u.role = 'dietitian' AND d.id IS NULL;
