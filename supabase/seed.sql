-- ============================================================
-- DietSync — Test Verisi (Seed Data)
-- Schema oluşturulduktan sonra çalıştırın
-- ============================================================

-- NOT: Supabase Auth kullanıcıları auth.users tablosunda oluşturulur.
-- Bu seed data, auth ile oluşturulan kullanıcı ID'lerini kullanır.
-- Aşağıdaki UUID'leri kendi auth kullanıcılarınızla değiştirin.

-- Önce test besinlerini ekleyelim (auth gerektirmez)
INSERT INTO foods (id, name, kcal_per_100g, protein_g, carbs_g, fat_g, fiber_g, category) VALUES
  (uuid_generate_v4(), 'Yulaf ezmesi', 389, 16.9, 66.3, 6.9, 10.6, 'Tahıl'),
  (uuid_generate_v4(), 'Tavuk göğsü (ızgara)', 165, 31.0, 0, 3.6, 0, 'Protein'),
  (uuid_generate_v4(), 'Yumurta (haşlanmış)', 155, 13.0, 1.1, 11.0, 0, 'Protein'),
  (uuid_generate_v4(), 'Muz', 89, 1.1, 22.8, 0.3, 2.6, 'Meyve'),
  (uuid_generate_v4(), 'Elma', 52, 0.3, 13.8, 0.2, 2.4, 'Meyve'),
  (uuid_generate_v4(), 'Badem (10 adet)', 579, 21.2, 21.6, 49.9, 12.5, 'Kuruyemiş'),
  (uuid_generate_v4(), 'Yoğurt (tam yağlı)', 61, 3.5, 4.7, 3.3, 0, 'Süt Ürünü'),
  (uuid_generate_v4(), 'Roka salatası', 25, 2.6, 3.7, 0.7, 1.6, 'Sebze'),
  (uuid_generate_v4(), 'Ton balığı (konserve)', 116, 25.5, 0, 0.8, 0, 'Protein'),
  (uuid_generate_v4(), 'Tam buğday ekmeği', 247, 13.0, 41.0, 3.4, 7.0, 'Tahıl'),
  (uuid_generate_v4(), 'Zeytinyağı (1 yemek k.)', 884, 0, 0, 100, 0, 'Yağ'),
  (uuid_generate_v4(), 'Mercimek çorbası', 116, 9.0, 20.1, 0.4, 7.9, 'Çorba'),
  (uuid_generate_v4(), 'Bulgur pilavı', 342, 12.3, 75.9, 1.3, 18.3, 'Tahıl'),
  (uuid_generate_v4(), 'Brokoli (haşlanmış)', 35, 2.4, 7.2, 0.4, 3.3, 'Sebze'),
  (uuid_generate_v4(), 'Hindi göğsü', 135, 30.0, 0, 1.0, 0, 'Protein'),
  (uuid_generate_v4(), 'Nohut', 164, 8.9, 27.4, 2.6, 7.6, 'Baklagil'),
  (uuid_generate_v4(), 'Süzme peynir', 98, 11.0, 3.4, 4.3, 0, 'Süt Ürünü'),
  (uuid_generate_v4(), 'Granola', 471, 10.0, 64.0, 20.0, 7.0, 'Tahıl'),
  (uuid_generate_v4(), 'Avokado', 160, 2.0, 8.5, 14.7, 6.7, 'Meyve'),
  (uuid_generate_v4(), 'Somon (ızgara)', 208, 20.4, 0, 13.4, 0, 'Protein');
