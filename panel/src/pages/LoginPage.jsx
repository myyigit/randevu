import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage({ onRegister }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'E-posta veya şifre hatalı'
        : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card animate-in">
        <div className="login-logo">
          <div className="logo-icon" style={{width: 56, height: 56, fontSize: 28, borderRadius: 16}}>🥗</div>
          <h1 style={{fontSize: 28, marginTop: 12}}>DietSync</h1>
          <p style={{color: 'var(--text-secondary)', marginTop: 4}}>Diyetisyen Paneli</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              ⚠️ {error}
            </div>
          )}

          <div className="login-field">
            <label>E-posta</label>
            <div className="login-input-wrapper">
              <span>✉️</span>
              <input
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="login-field">
            <label>Şifre</label>
            <div className="login-input-wrapper">
              <span>🔒</span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={loading}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        {/* Kayıt Ol */}
        {onRegister && (
          <div style={{
            marginTop: 20, paddingTop: 20,
            borderTop: '1px solid var(--border)',
            textAlign: 'center',
          }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: 13 }}>
              Sisteme dahil olmak isteyen diyetisyenler için:
            </p>
            <button
              onClick={onRegister}
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              📋 Diyetisyen Başvurusu Yap
            </button>
          </div>
        )}

        <p className="login-footer">
          DietSync © 2026 · Profesyonel Diyet Yönetim Sistemi
        </p>
      </div>
    </div>
  );
}

