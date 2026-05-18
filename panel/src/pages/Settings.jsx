import { useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import { supabase, isDemoMode } from '../lib/supabase';

export default function Settings() {
  const { profile, user } = useAuth();
  const isDemo = isDemoMode || !user;

  const [activeTab, setActiveTab] = useState('profile');
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  // Profil formu
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [clinicName, setClinicName] = useState(profile?.dietitians?.clinic_name || '');
  const [licenseNo, setLicenseNo] = useState(profile?.dietitians?.license_no || '');
  const [bio, setBio] = useState(profile?.dietitians?.bio || '');

  // Şifre formu
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSaveProfile() {
    if (!name.trim()) { showToast('Ad alanı boş bırakılamaz.', 'error'); return; }
    setSaving(true);
    try {
      // users tablosunu güncelle
      const { error: userErr } = await supabase
        .from('users')
        .update({ name: name.trim(), phone: phone.trim() || null })
        .eq('id', user.id);
      if (userErr) throw userErr;

      // dietitians tablosunu güncelle
      const { error: dietErr } = await supabase
        .from('dietitians')
        .update({
          clinic_name: clinicName.trim() || null,
          license_no: licenseNo.trim() || null,
          bio: bio.trim() || null,
        })
        .eq('id', user.id);
      if (dietErr) throw dietErr;

      showToast('Profil bilgileri güncellendi.');
    } catch (err) {
      showToast('Hata: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPw) { showToast('Mevcut şifrenizi girin.', 'error'); return; }
    if (newPw.length < 6) { showToast('Yeni şifre en az 6 karakter olmalı.', 'error'); return; }
    if (newPw !== confirmPw) { showToast('Şifreler eşleşmiyor.', 'error'); return; }
    setSaving(true);
    try {
      // Önce mevcut şifreyle doğrula
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPw,
      });
      if (signInErr) { showToast('Mevcut şifre hatalı.', 'error'); setSaving(false); return; }

      // Yeni şifreyi güncelle
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) throw updateErr;

      // must_change_password bayrağını kaldır
      await supabase.from('users').update({ must_change_password: false }).eq('id', user.id);

      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      showToast('Şifreniz başarıyla güncellendi.');
    } catch (err) {
      showToast('Hata: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    color: 'var(--text)',
    fontSize: 14,
    width: '100%',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 6,
  };

  return (
    <div className="animate-in" style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          background: toast.type === 'error' ? 'var(--danger)' : 'var(--success)',
          color: 'white', padding: '12px 20px', borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)', fontSize: 14, fontWeight: 600,
          animation: 'fadeIn .2s ease',
        }}>{toast.msg}</div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          &#x1F464; Profil Bilgileri
        </button>
        <button className={`tab ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>
          &#x1F512; Şifre Değiştir
        </button>
      </div>

      {/* ── Profil Bilgileri ── */}
      {activeTab === 'profile' && (
        <div className="card">
          <div className="card-header"><h3>&#x1F464; Profil Bilgileri</h3></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Ad Soyad</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  style={inputStyle} placeholder="Adınızı girin" disabled={isDemo} />
              </div>
              <div>
                <label style={labelStyle}>E-posta</label>
                <input type="email" value={profile?.email || ''} style={{ ...inputStyle, opacity: 0.6 }}
                  disabled title="E-posta değiştirilemez" />
              </div>
              <div>
                <label style={labelStyle}>Telefon</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  style={inputStyle} placeholder="0 5XX XXX XX XX" disabled={isDemo} />
              </div>
              <div>
                <label style={labelStyle}>Lisans No</label>
                <input type="text" value={licenseNo} onChange={e => setLicenseNo(e.target.value)}
                  style={inputStyle} placeholder="DYT-XXXX-XXX" disabled={isDemo} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Klinik Adı</label>
                <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)}
                  style={inputStyle} placeholder="Kliniğinizin adı" disabled={isDemo} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Hakkında</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)}
                  style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                  placeholder="Kendinizi kısaca tanıtın..." disabled={isDemo} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving || isDemo}>
                {saving ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Şifre Değiştir ── */}
      {activeTab === 'password' && (
        <div className="card">
          <div className="card-header"><h3>&#x1F512; Şifre Değiştir</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
              <div>
                <label style={labelStyle}>Mevcut Şifre</label>
                <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                  style={inputStyle} placeholder="Mevcut şifrenizi girin" disabled={isDemo} />
              </div>
              <div>
                <label style={labelStyle}>Yeni Şifre</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                  style={inputStyle} placeholder="En az 6 karakter" disabled={isDemo} />
              </div>
              <div>
                <label style={labelStyle}>Yeni Şifre (Tekrar)</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  style={inputStyle} placeholder="Yeni şifreyi tekrar girin" disabled={isDemo} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-primary" onClick={handleChangePassword} disabled={saving || isDemo}>
                {saving ? '⏳ Güncelleniyor...' : '🔐 Şifreyi Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hesap Bilgileri */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header"><h3>&#x2139;&#xFE0F; Hesap Bilgileri</h3></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
            <div style={{ color: 'var(--text-secondary)' }}>Hesap Türü</div>
            <div style={{ fontWeight: 600 }}>Diyetisyen</div>
            <div style={{ color: 'var(--text-secondary)' }}>Hesap ID</div>
            <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>{user?.id || '-'}</div>
            <div style={{ color: 'var(--text-secondary)' }}>Kayıt Tarihi</div>
            <div style={{ fontWeight: 600 }}>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('tr-TR') : '-'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
