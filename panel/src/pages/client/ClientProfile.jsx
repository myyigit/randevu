import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function ClientProfile() {
  const { profile, user, signOut } = useAuth();
  const [tab, setTab] = useState('info');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  async function changePassword() {
    if (!newPw || newPw.length < 8) {
      setMsg({ type: 'error', text: 'Şifre en az 8 karakter olmalı.' }); return;
    }
    if (newPw !== confirmPw) {
      setMsg({ type: 'error', text: 'Şifreler eşleşmiyor.' }); return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      setMsg({ type: 'error', text: error.message });
    } else {
      // must_change_password bayrağını kaldır
      await supabase.from('users').update({ must_change_password: false }).eq('id', user.id);
      setMsg({ type: 'success', text: '✅ Şifren başarıyla güncellendi!' });
      setNewPw(''); setConfirmPw('');
    }
    setPwLoading(false);
  }

  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 100 }}>
      {/* Avatar */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px',
          background: 'linear-gradient(135deg, var(--primary), var(--info))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, fontWeight: 700, color: '#fff',
        }}>
          {initials}
        </div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{profile?.name}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{profile?.email}</div>
      </div>

      {/* Sekmeler */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 4 }}>
        <button className={`btn btn-sm ${tab === 'info' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setTab('info')}>
          👤 Bilgilerim
        </button>
        <button className={`btn btn-sm ${tab === 'password' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setTab('password')}>
          🔒 Şifre
        </button>
      </div>

      {/* Bilgiler */}
      {tab === 'info' && (
        <div className="card" style={{ padding: 'var(--space-lg)' }}>
          {[
            { label: 'Ad Soyad', value: profile?.name, icon: '👤' },
            { label: 'E-posta', value: profile?.email, icon: '✉️' },
            { label: 'Telefon', value: profile?.phone || 'Eklenmemiş', icon: '📱' },
            { label: 'Üyelik', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('tr-TR') : '-', icon: '📅' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 20, width: 28 }}>{row.icon}</span>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{row.label}</div>
                <div style={{ fontWeight: 500, marginTop: 2 }}>{row.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Şifre Değiştir */}
      {tab === 'password' && (
        <div className="card" style={{ padding: 'var(--space-lg)' }}>
          {msg && (
            <div style={{
              background: msg.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
              color: msg.type === 'error' ? 'var(--danger)' : 'var(--success)',
              padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: 14,
            }}>
              {msg.text}
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Yeni Şifre</label>
            <input
              type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="En az 8 karakter"
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Şifre Tekrar</label>
            <input
              type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              placeholder="Şifrenizi tekrar girin"
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={changePassword}
            disabled={pwLoading || !newPw || !confirmPw}
            style={{ width: '100%', padding: '14px' }}
          >
            {pwLoading ? '⏳ Güncelleniyor...' : '🔒 Şifremi Güncelle'}
          </button>
        </div>
      )}

      {/* Çıkış */}
      <button
        className="btn btn-ghost"
        onClick={signOut}
        style={{ width: '100%', marginTop: 16, color: 'var(--danger)', border: '1px solid var(--border)' }}
      >
        🚪 Çıkış Yap
      </button>
    </div>
  );
}
