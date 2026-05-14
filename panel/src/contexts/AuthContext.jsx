import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isDemoMode } from '../lib/supabase';

const AuthContext = createContext({});

// Demo mod profili
const DEMO_PROFILE = {
  id: 'demo-dietitian-001',
  name: 'Dr. Ayşe Kaya',
  email: 'ayse@dietsync.com',
  role: 'dietitian',
  dietitians: { clinic_name: 'DietSync Kliniği', license_no: 'DYT-2024-001' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(isDemoMode ? { id: DEMO_PROFILE.id } : null);
  const [profile, setProfile] = useState(isDemoMode ? DEMO_PROFILE : null);
  const [loading, setLoading] = useState(!isDemoMode);
  const [applicationStatus, setApplicationStatus] = useState(null); // 'pending' | 'approved' | 'rejected' | null

  useEffect(() => {
    if (isDemoMode) return;

    // 5 saniye timeout — Supabase yanıt vermezse login göster
    const timeout = setTimeout(() => setLoading(false), 5000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeout);
        if (session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id);
        }
        setLoading(false);
      })
      .catch(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
          await checkApplicationStatus(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setApplicationStatus(null);
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const [impersonatedDietitian, setImpersonatedDietitian] = useState(null);

  // Başvuru durumunu kontrol et (henüz users tablosunda olmayan pending applicants için)
  async function checkApplicationStatus(userId) {
    try {
      const { data } = await supabase
        .from('dietitian_applications')
        .select('status')
        .eq('auth_user_id', userId)
        .maybeSingle();
      if (data) setApplicationStatus(data.status);
    } catch { /* başvuru yoksa null kalır */ }
  }

  // Aktif ID, impersonate ediliyorsa onun ID'si, değilse kullanıcının kendi ID'sidir
  const activeDietitianId = impersonatedDietitian?.id || user?.id;

  async function fetchProfile(userId) {
    if (isDemoMode) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, dietitians(*), must_change_password')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
      } else {
        // users tablosunda kayıt yok — auth bilgilerinden fallback
        console.warn('Profil bulunamadı, fallback profil kullanılıyor:', error?.message);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setProfile({
          id: userId,
          name: authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'Kullanıcı',
          email: authUser?.email,
          role: 'dietitian',
        });
      }
    } catch (err) {
      console.error('Profil çekme hatası:', err);
      setProfile({ id: userId, name: 'Kullanıcı', role: 'dietitian' });
    }
  }

  async function signIn(email, password) {
    if (isDemoMode) {
      setUser({ id: DEMO_PROFILE.id });
      setProfile(DEMO_PROFILE);
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password, metadata) {
    if (isDemoMode) return;
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: metadata },
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (!isDemoMode) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setImpersonatedDietitian(null);
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      isAuthenticated: !!user,
      isDietitian: profile?.role === 'dietitian',
      isSuperadmin: profile?.role === 'superadmin',
      impersonatedDietitian,
      setImpersonatedDietitian,
      activeDietitianId,
      applicationStatus,
      isDemoMode,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
