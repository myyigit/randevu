-- Trigger'ı Güncelleyelim: 'pending_dietitian' rolüyle gelen kayıtları atla
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Eğer kayıt olan kişi 'pending_dietitian' ise (başvuru aşamasındaysa), 
  -- users tablosuna eklemeyi atla. (Onaylanınca admin RPC fonksiyonu ekleyecek)
  IF NEW.raw_user_meta_data->>'role' = 'pending_dietitian' THEN
    RETURN NEW;
  END IF;

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
