import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client — backend-only, RLS bypass
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Kullanıcı tokeni ile client oluştur (RLS aktif)
export function createUserClient(accessToken: string) {
  return createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
