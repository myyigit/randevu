import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function ChangePassword() {
  const { user, profile, signOut } = useAuth();
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPw.length < 8) {
      setError('Şifre en az 8 karakter olmalı.');
      return;
    }
    if (newPw !== confirmPw) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (newPw === '12345678') {
      setError('Geçici şifrenizden farklı bir şifre seçin.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // must_change_password bayrağını kaldır
    await supabase.from('users').update({ must_change_password: false }).eq('id', user.id);

    // Sayfayı yenileyerek tekrar profile yükle
    window.location.reload();
  }

  return (
    <div className="login-container">
      <div className="login-card animate-in">
        <div className="login-logo">
          <div className="logo-icon" style={{ width: 56, height: 56, fontSize: 28, borderRadius: 16 }}>🔒</div>
          <h1 style={{ fontSize: 24, marginTop: 12 }}>Şifrenizi Değiştirin</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>
            Merhaba <strong>{profile?.name?.split(' ')[0]}</strong>! İlk girişinizde şifrenizi değiştirmeniz gerekmektedir.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">⚠️ {error}</div>
          )}

          <div className="login-field">
            <label>Yeni Şifre</label>
            <div className="login-input-wrapper">
              <span>🔑</span>
              <input
                type="password"
                placeholder="En az 8 karakter"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="login-field">
            <label>Şifre Tekrar</label>
            <div className="login-input-wrapper">
              <span>🔑</span>
              <input
                type="password"
                placeholder="Şifrenizi tekrar girin"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={loading}
          >
            {loading ? 'Güncelleniyor...' : '✅ Şifremi Güncelle ve Giriş Yap'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            onClick={signOut}
            className="btn btn-ghost"
            style={{ fontSize: 13, color: 'var(--text-muted)' }}
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  );
}
