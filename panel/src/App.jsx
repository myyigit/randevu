import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Appointments from './pages/Appointments';
import DietPlans from './pages/DietPlans';
import AIAssistant from './pages/AIAssistant';
import SuperadminDashboard from './pages/SuperadminDashboard';
import RegisterPage from './pages/RegisterPage';
import PendingApproval from './pages/PendingApproval';
import { useState } from 'react';
import './index.css';


function Sidebar() {
  const { profile, signOut, impersonatedDietitian } = useAuth();
  const activeProfile = impersonatedDietitian || profile;
  const initials = activeProfile?.name
    ? activeProfile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🥗</div>
        <h1>DietSync</h1>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📊</span>
          Dashboard
        </NavLink>
        <NavLink to="/clients" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">👥</span>
          Danışanlar
        </NavLink>
        <NavLink to="/appointments" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📅</span>
          Randevular
        </NavLink>
        <NavLink to="/diet-plans" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🍽️</span>
          Diyet Planları
        </NavLink>
        <NavLink to="/meal-logs" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📸</span>
          Besin Günlüğü
        </NavLink>
        <NavLink to="/reports" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📄</span>
          Raporlar
        </NavLink>
        <NavLink to="/ai-assistant" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🤖</span>
          AI Asistan
        </NavLink>
      </nav>

      <div className="sidebar-user" onClick={signOut} style={{cursor: 'pointer'}} title="Çıkış yap">
        <div className="user-avatar">{initials}</div>
        <div className="user-info">
          <div className="user-name">{activeProfile?.name || 'Yükleniyor...'}</div>
          <div className="user-role">{impersonatedDietitian ? 'Yönetilen Hesap' : 'Diyetisyen'}</div>
        </div>
        <span style={{color: 'var(--text-muted)', fontSize: 14}}>🚪</span>
      </div>
    </aside>
  );
}

function TopBar({ title, subtitle }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="topbar-right">
        <div className="search-box">
          <span>🔍</span>
          <input type="text" placeholder="Danışan, plan, besin ara..." />
        </div>
        <button className="notif-btn">
          🔔
          <span className="notif-badge">3</span>
        </button>
      </div>
    </div>
  );
}

function ImpersonationBanner() {
  const { impersonatedDietitian, setImpersonatedDietitian } = useAuth();
  if (!impersonatedDietitian) return null;

  return (
    <div style={{ background: '#f59e0b', color: '#fff', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500 }}>
      <div>⚠️ Şu anda <strong>{impersonatedDietitian.name}</strong> adlı diyetisyenin hesabındasınız. Yapılan işlemler bu hesaba kaydedilir.</div>
      <button onClick={() => setImpersonatedDietitian(null)} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
        Süper Admin Paneline Dön
      </button>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, loading, isSuperadmin, impersonatedDietitian, isDietitian, profile, signOut, applicationStatus } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <div className="login-container">
        <div style={{textAlign: 'center'}}>
          <div className="logo-icon" style={{width: 56, height: 56, fontSize: 28, borderRadius: 16, margin: '0 auto 16px'}}>🥗</div>
          <p style={{color: 'var(--text-secondary)'}}>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showRegister) {
      return <RegisterPage onBackToLogin={() => setShowRegister(false)} />;
    }
    return <LoginPage onRegister={() => setShowRegister(true)} />;
  }

  // Başvuru durumu kontrolü
  if (applicationStatus === 'pending' || applicationStatus === 'rejected') {
    return <PendingApproval status={applicationStatus} />;
  }

  // Aktif olmayan diyetisyeni engelle (Superadmin hariç)
  if (isDietitian && profile?.dietitians?.is_active === false && !isSuperadmin) {
    return (
      <div className="login-container">
        <div style={{textAlign: 'center', background: 'var(--surface)', padding: 48, borderRadius: 'var(--radius-lg)'}}>
          <div style={{fontSize: 48, marginBottom: 16}}>🔒</div>
          <h2 style={{marginBottom: 8}}>Hesabınız Pasife Alınmıştır</h2>
          <p style={{color: 'var(--text-secondary)', marginBottom: 24}}>Lütfen sistem yöneticisiyle iletişime geçin.</p>
          <button className="btn btn-primary" onClick={signOut}>Çıkış Yap</button>
        </div>
      </div>
    );
  }

  if (isSuperadmin && !impersonatedDietitian) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <div style={{ padding: '16px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="logo-icon" style={{ width: 32, height: 32, fontSize: 16, borderRadius: 8 }}>🥗</div>
            <strong style={{ fontSize: 18 }}>DietSync Superadmin</strong>
          </div>
          <button className="btn btn-ghost" onClick={signOut}>🚪 Çıkış Yap</button>
        </div>
        <SuperadminDashboard />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <ImpersonationBanner />
        <div className="app-layout-inner">
          <Sidebar />
          <div className="main-content">
            <Routes>
              <Route path="/" element={
                <>
                  <TopBar title="Dashboard" subtitle={new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
                  <div className="page-content">
                    <Dashboard />
                  </div>
                </>
              } />
              <Route path="/clients" element={
                <>
                  <TopBar title="Danışanlar" subtitle="Danışan listesi ve detayları" />
                  <div className="page-content" style={{padding: 0}}>
                    <Clients />
                  </div>
                </>
              } />
              <Route path="/appointments" element={
                <>
                  <TopBar title="Randevular" subtitle="Randevu yönetimi ve risk analizi" />
                  <div className="page-content">
                    <Appointments />
                  </div>
                </>
              } />
              <Route path="/diet-plans" element={
                <>
                  <TopBar title="Diyet Planları" subtitle="Plan oluşturma ve yönetimi" />
                  <div className="page-content">
                    <DietPlans />
                  </div>
                </>
              } />
              <Route path="/ai-assistant" element={
                <>
                  <TopBar title="AI Asistan" subtitle="Akıllı beslenme asistanınız" />
                  <div className="page-content">
                    <AIAssistant />
                  </div>
                </>
              } />
              <Route path="*" element={
                <>
                  <TopBar title="Yapım Aşamasında" />
                  <div className="page-content">
                    <div className="empty-state">
                      <div className="empty-icon">🚧</div>
                      <h3>Bu sayfa henüz hazırlanıyor</h3>
                      <p>Yakında burada harika şeyler olacak!</p>
                    </div>
                  </div>
                </>
              } />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
