# DietSync

Diyetisyen ve danışanlar için entegre sağlık takip sistemi.

## Proje Yapısı

```
randevu/
├── api/          # Node.js + Express + TypeScript (AI, PDF, Bildirim)
├── panel/        # React + Vite (Diyetisyen Tablet Paneli)
├── mobile/       # React Native + Expo (Danışan Mobil Uygulaması)
└── supabase/     # Veritabanı şemaları ve migration'lar
```

## Teknoloji Stack

- **BaaS:** Supabase (Auth, PostgreSQL, Realtime, Storage)
- **API:** Node.js + Express + TypeScript
- **Panel:** React + Vite + Recharts
- **Mobile:** React Native (Expo)
- **AI:** OpenAI GPT-4o + Vision API
- **Mesajlaşma:** WhatsApp + Telegram + SMS

## Kurulum

### 1. Supabase
`supabase/schema.sql` dosyasını Supabase SQL Editor'e yapıştırıp çalıştırın.

### 2. API
```bash
cd api
npm install
cp .env.example .env
# .env dosyasını doldurun
npm run dev
```

### 3. Panel
```bash
cd panel
npm install
npm run dev
```

### 4. Mobile
```bash
cd mobile
npm install
npx expo start
```
