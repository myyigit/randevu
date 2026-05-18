import { useAuth } from '../contexts/useAuth';

export default function PendingApproval({ status = 'pending' }) {
  const { signOut, profile } = useAuth();

  const isRejected = status === 'rejected';

  return (
    <div className="login-container">
      <div className="login-card animate-in" style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>
          {isRejected ? '❌' : '⏳'}
        </div>

        <h2 style={{ marginBottom: 12, fontSize: 22 }}>
          {isRejected ? 'Başvurunuz Reddedildi' : 'Onay Bekleniyor'}
        </h2>

        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
          {isRejected
            ? 'Üzgünüz, başvurunuz sistem yöneticisi tarafından onaylanmadı. Daha fazla bilgi için yönetici ile iletişime geçebilirsiniz.'
            : 'Başvurunuz alındı ve inceleme aşamasındadır. Onaylandığında sisteme giriş yapabileceksiniz.'}
        </p>

        {!isRejected && (
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
            padding: 16, marginBottom: 24, textAlign: 'left'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Başvuru Gönderildi</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bilgileriniz alındı</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>⏳</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Yönetici İncelemesi</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>1-2 iş günü içinde</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.4 }}>
                <span style={{ fontSize: 20 }}>🚀</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Sisteme Erişim</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Onay sonrası aktif olur</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {profile?.email && (
          <div style={{
            fontSize: 13, color: 'var(--text-muted)', marginBottom: 20
          }}>
            📧 Bildirim e-postanız: <strong style={{ color: 'var(--text-secondary)' }}>{profile.email}</strong>
          </div>
        )}

        <button className="btn btn-ghost" onClick={signOut} style={{ width: '100%' }}>
          🚪 Çıkış Yap
        </button>
      </div>
    </div>
  );
}
