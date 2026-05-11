import { useState } from 'react';
import { supabase } from '../lib/supabase';

const CITIES = [
  'Adana','Ankara','Antalya','Bursa','Diyarbakır','Eskişehir','Gaziantep',
  'İstanbul','İzmir','Kayseri','Kocaeli','Konya','Malatya','Mersin',
  'Samsun','Trabzon','Van','Şanlıurfa','Diğer'
];

const SPECIALIZATIONS = [
  'Obezite ve Kilo Yönetimi',
  'Sporcu Beslenmesi',
  'Çocuk Beslenmesi',
  'Diyabet Diyeti',
  'Kalp Sağlığı Beslenmesi',
  'Gebelik Beslenmesi',
  'Kanser Beslenmesi',
  'Yaşlı Beslenmesi',
  'Veganizm / Bitkisel Beslenme',
  'Yeme Bozuklukları',
  'Genel Klinik Beslenme',
];

export default function RegisterPage({ onBackToLogin }) {
  const [step, setStep] = useState(1); // 1: Kişisel, 2: Mesleki, 3: Şifre & Gönder
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    city: '', password: '', confirmPassword: '',
    license_no: '', clinic_name: '', specialization: '',
    experience_years: '', bio: '',
  });

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (form.password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    try {
      // Form verilerini temizle
      const safeEmail = form.email.trim();
      const safeName = form.name.trim();

      // 1. Supabase Auth kaydı
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: safeEmail,
        password: form.password,
        options: {
          data: { name: safeName, role: 'pending_dietitian' },
        },
      });

      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error('Kullanıcı oluşturulamadı.');

      // 2. Başvuru kaydı (users tablosuna değil, uygulamalar tablosuna)
      const { error: appError } = await supabase
        .from('dietitian_applications')
        .insert({
          auth_user_id: userId,
          name: safeName,
          email: safeEmail,
          phone: form.phone?.trim() || null,
          city: form.city || null,
          license_no: form.license_no || null,
          clinic_name: form.clinic_name || null,
          specialization: form.specialization || null,
          experience_years: form.experience_years ? parseInt(form.experience_years) : 0,
          bio: form.bio || null,
          status: 'pending',
        });

      if (appError) throw appError;

      setSuccess(true);
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('Bu e-posta adresiyle zaten bir hesap mevcut.');
      } else {
        setError('Başvuru gönderilemedi: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="login-container">
        <div className="login-card animate-in" style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📬</div>
          <h2 style={{ marginBottom: 12, fontSize: 22 }}>Başvurunuz Alındı!</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
            Başvurunuz sistem yöneticisine iletildi. En kısa sürede incelenip
            e-posta ile bilgilendirileceksiniz.
          </p>
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
            padding: 16, marginBottom: 24, fontSize: 13, color: 'var(--text-secondary)',
            borderLeft: '3px solid var(--warning)'
          }}>
            ⏳ Onay süreci genellikle 1-2 iş günü içinde tamamlanmaktadır.
          </div>
          <button className="btn btn-ghost" onClick={onBackToLogin} style={{ width: '100%' }}>
            ← Giriş Sayfasına Dön
          </button>
        </div>
      </div>
    );
  }

  const inputStyle = {
    background: 'none', border: 'none', color: 'var(--text)',
    fontSize: 14, width: '100%', outline: 'none', fontFamily: 'inherit',
  };
  const fieldStyle = { marginBottom: 14 };
  const labelStyle = { display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 };
  const wrapperStyle = {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '10px 14px',
  };

  return (
    <div className="login-container" style={{ overflowY: 'auto', alignItems: 'flex-start', paddingTop: 32, paddingBottom: 32 }}>
      <div className="login-card animate-in" style={{ maxWidth: 560, width: '100%' }}>

        {/* Header */}
        <div className="login-logo" style={{ marginBottom: 8 }}>
          <div className="logo-icon" style={{ width: 48, height: 48, fontSize: 24, borderRadius: 14, margin: '0 auto' }}>🥗</div>
          <h1 style={{ fontSize: 24, marginTop: 10 }}>DietSync</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 2, fontSize: 14 }}>Diyetisyen Başvurusu</p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28 }}>
          {['Kişisel Bilgiler', 'Mesleki Bilgiler', 'Hesap Oluştur'].map((label, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 3,
                background: step > i ? 'var(--primary)' : step === i + 1 ? 'var(--primary)' : 'var(--border)',
                marginBottom: 6, borderRadius: 2, transition: 'background 0.3s'
              }} />
              <span style={{
                fontSize: 11, color: step === i + 1 ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: step === i + 1 ? 600 : 400
              }}>{label}</span>
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16,
            color: '#fca5a5', fontSize: 13
          }}>⚠️ {error}</div>
        )}

        <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); setStep(s => s + 1); setError(''); }}>

          {/* STEP 1: Kişisel */}
          {step === 1 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Ad Soyad *</label>
                  <div style={wrapperStyle}>
                    <span>👤</span>
                    <input style={inputStyle} placeholder="Dr. Ali Yılmaz" value={form.name}
                      onChange={e => set('name', e.target.value)} required />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>E-posta *</label>
                  <div style={wrapperStyle}>
                    <span>✉️</span>
                    <input style={inputStyle} type="email" placeholder="ali@klinik.com" value={form.email}
                      onChange={e => set('email', e.target.value)} required />
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Telefon *</label>
                  <div style={wrapperStyle}>
                    <span>📞</span>
                    <input style={inputStyle} placeholder="0532 000 0000" value={form.phone}
                      onChange={e => set('phone', e.target.value)} required />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Şehir *</label>
                  <div style={wrapperStyle}>
                    <span>📍</span>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.city}
                      onChange={e => set('city', e.target.value)} required>
                      <option value="">Seçin...</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Mesleki */}
          {step === 2 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Lisans / Diploma No *</label>
                  <div style={wrapperStyle}>
                    <span>📋</span>
                    <input style={inputStyle} placeholder="DYT-2020-XXXX" value={form.license_no}
                      onChange={e => set('license_no', e.target.value)} required />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Klinik / Kurum Adı</label>
                  <div style={wrapperStyle}>
                    <span>🏥</span>
                    <input style={inputStyle} placeholder="Özel Klinik Adı" value={form.clinic_name}
                      onChange={e => set('clinic_name', e.target.value)} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Uzmanlık Alanı *</label>
                  <div style={wrapperStyle}>
                    <span>🎯</span>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.specialization}
                      onChange={e => set('specialization', e.target.value)} required>
                      <option value="">Seçin...</option>
                      {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Deneyim (Yıl) *</label>
                  <div style={wrapperStyle}>
                    <span>📅</span>
                    <input style={inputStyle} type="number" min="0" max="50" placeholder="5" value={form.experience_years}
                      onChange={e => set('experience_years', e.target.value)} required />
                  </div>
                </div>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Hakkımda / Kısa Tanıtım</label>
                <div style={{ ...wrapperStyle, alignItems: 'flex-start' }}>
                  <span style={{ marginTop: 2 }}>✍️</span>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80, lineHeight: 1.6 }}
                    placeholder="Kendinizi ve yaklaşımınızı kısaca anlatın..."
                    value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Hesap */}
          {step === 3 && (
            <div>
              <div style={{
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 16,
                marginBottom: 20, borderLeft: '3px solid var(--primary)'
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>📝 Başvuru Özeti</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                  <span>👤 {form.name}</span>
                  <span>✉️ {form.email}</span>
                  <span>📞 {form.phone}</span>
                  <span>📍 {form.city}</span>
                  <span>📋 {form.license_no}</span>
                  <span>🎯 {form.specialization}</span>
                </div>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Şifre * (min. 8 karakter)</label>
                <div style={wrapperStyle}>
                  <span>🔒</span>
                  <input style={inputStyle} type="password" placeholder="••••••••" value={form.password}
                    onChange={e => set('password', e.target.value)} required minLength={8} />
                </div>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Şifre Tekrar *</label>
                <div style={wrapperStyle}>
                  <span>🔒</span>
                  <input style={inputStyle} type="password" placeholder="••••••••" value={form.confirmPassword}
                    onChange={e => set('confirmPassword', e.target.value)} required />
                </div>
              </div>
              <div style={{
                fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6,
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 16
              }}>
                ⚠️ Başvurunuz sistem yöneticisi tarafından incelendikten sonra aktif olacaktır. 
                Onay süreci genellikle 1-2 iş günü içinde tamamlanır.
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {step > 1 && (
              <button type="button" className="btn btn-ghost" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>
                ← Geri
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 2 }}
            >
              {loading ? 'Gönderiliyor...' :
               step === 1 ? 'Devam →' :
               step === 2 ? 'Devam →' :
               '📬 Başvuruyu Gönder'}
            </button>
          </div>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          Zaten hesabınız var mı?{' '}
          <button onClick={onBackToLogin} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
            Giriş Yapın
          </button>
        </div>
      </div>
    </div>
  );
}
