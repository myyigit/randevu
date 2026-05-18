import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Appointments from './pages/Appointments';
import DietPlans from './pages/DietPlans';
import AIAssistant from './pages/AIAssistant';
import MealLogs from './pages/MealLogs';
import SuperadminDashboard from './pages/SuperadminDashboard';
import RegisterPage from './pages/RegisterPage';
import PendingApproval from './pages/PendingApproval';
import ClientHome from './pages/client/ClientHome';
import ClientMealLog from './pages/client/ClientMealLog';
import ClientWater from './pages/client/ClientWater';
import ClientAppointments from './pages/client/ClientAppointments';
import ClientProfile from './pages/client/ClientProfile';
import ChangePassword from './pages/client/ChangePassword';
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
        <div className="logo-icon">DS</div>
        <h1>DietSync</h1>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">&#x1F4CA;</span>
          Dashboard
        </NavLink>
        <NavLink to="/clients" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">&#x1F465;</span>
          Dan&#x131;&#x15F;anlar
        </NavLink>
        <NavLink to="/appointments" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">&#x1F4C5;</span>
          Randevular
        </NavLink>
        <NavLink to="/diet-plans" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">&#x1F37D;</span>
          Diyet Planlar&#x131;
        </NavLink>
        <NavLink to="/meal-logs" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">&#x1F4F8;</span>
          Besin G&#xFC;nl&#xFC;&#x11F;&#xFC;
        </NavLink>
        <NavLink to="/reports" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">&#x1F4C4;</span>
          Raporlar
        </NavLink>
        <NavLink to="/ai-assistant" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">&#x1F916;</span>
          AI Asistan
        </NavLink>
      </nav>

      <div className="sidebar-user" onClick={signOut} style={{cursor: 'pointer'}} title="Cikis yap">
        <div className="user-avatar">{initials}</div>
        <div className="user-info">
          <div className="user-name">{activeProfile?.name || 'Yukleniyor...'}</div>
          <div className="user-role">{impersonatedDietitian ? 'Yonetilen Hesap' : 'Diyetisyen'}</div>
        </div>
        <span style={{color: 'var(--text-muted)', fontSize: 14}}>&#x1F6AA;</span>
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
          <span>&#x1F50D;</span>
          <input type="text" placeholder="Danışan, plan, besin ara..." />
        </div>
        <button className="notif-btn">
          &#x1F514;
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
      <div>Şimdi <strong>{impersonatedDietitian.name}</strong> adlı diyetisyenin hesabındasınız. Yapılan işlemler bu hesaba kaydedilir.</div>
      <button onClick={() => setImpersonatedDietitian(null)} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
        Süper Admin Paneline Dön
      </button>
    </div>
  );
}

// Client Portal Layout
function ClientPortal() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const NAV = [
    { to: '/client',              icon: '\uD83C\uDFE0', label: 'Ana Sayfa' },
    { to: '/client/meal',         icon: '\uD83E\uDD57', label: 'Ogün Ekle' },
    { to: '/client/water',        icon: '\uD83D\uDCA7', label: 'Su' },
    { to: '/client/appointments', icon: '\uD83D\uDCC5', label: 'Randevular' },
    { to: '/client/profile',      icon: '\uD83D\uDC64', label: 'Profil' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="logo-icon" style={{ width: 32, height: 32, fontSize: 14, borderRadius: 8 }}>DS</div>
          <strong>DietSync</strong>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{profile?.name?.split(' ')[0]}</div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 520, margin: '0 auto' }}>
        <Routes>
          <Route path="/client"              element={<ClientHome />} />
          <Route path="/client/meal"         element={<ClientMealLog />} />
          <Route path="/client/water"        element={<ClientWater />} />
          <Route path="/client/appointments" element={<ClientAppointments />} />
          <Route path="/client/profile"      element={<ClientProfile />} />
          <Route path="*"                    element={<ClientHome />} />
        </Routes>
      </div>

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-around', padding: '8px 0 12px',
        zIndex: 100,
      }}>
        {NAV.map(item => {
          const isActive = location.pathname === item.to;
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: 10, fontWeight: isActive ? 700 : 400,
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.15s', padding: '4px 12px',
              }}
            >
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>
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
          <div className="logo-icon" style={{width: 56, height: 56, fontSize: 28, borderRadius: 16, margin: '0 auto 16px'}}>DS</div>
          <p style={{color: 'var(--text-secondary)'}}>Yukleniyor...</p>
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

  if (applicationStatus === 'pending' || applicationStatus === 'rejected') {
    return <PendingApproval status={applicationStatus} />;
  }

  // Danışan: zorunlu şifre değiştirme
  if (profile?.role === 'client' && profile?.must_change_password) {
    return <ChangePassword />;
  }

  // Danışan portalı
  if (profile?.role === 'client') {
    return <ClientPortal />;
  }

  if (isDietitian && profile?.dietitians?.is_active === false && !isSuperadmin) {
    return (
      <div className="login-container">
        <div style={{textAlign: 'center', background: 'var(--surface)', padding: 48, borderRadius: 'var(--radius-lg)'}}>
          <div style={{fontSize: 48, marginBottom: 16}}>&#x1F512;</div>
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
            <div className="logo-icon" style={{ width: 32, height: 32, fontSize: 16, borderRadius: 8 }}>DS</div>
            <strong style={{ fontSize: 18 }}>DietSync Superadmin</strong>
          </div>
          <button className="btn btn-ghost" onClick={signOut}>Çıkış Yap</button>
        </div>
        <SuperadminDashboard />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <ImpersonationBanner />
      <div className="app-layout-inner">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={
              <>
                <TopBar title="Gösterge Paneli" subtitle={new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
                <div className="page-content"><Dashboard /></div>
              </>
            } />
            <Route path="/clients" element={
              <>
                <TopBar title="Danışanlar" subtitle="Danışan listesi ve detayları" />
                <div className="page-content" style={{padding: 0}}><Clients /></div>
              </>
            } />
            <Route path="/appointments" element={
              <>
                <TopBar title="Randevular" subtitle="Randevu yönetimi ve risk analizi" />
                <div className="page-content"><Appointments /></div>
              </>
            } />
            <Route path="/diet-plans" element={
              <>
                <TopBar title="Diyet Planları" subtitle="Plan oluşturma ve yönetimi" />
                <div className="page-content"><DietPlans /></div>
              </>
            } />
            <Route path="/meal-logs" element={
              <>
                <TopBar title="Besin Günlüğü" subtitle="Danışan öğün kayıtları ve su takibi" />
                <div className="page-content"><MealLogs /></div>
              </>
            } />
            <Route path="/ai-assistant" element={
              <>
                <TopBar title="AI Asistan" subtitle="Akıllı beslenme asistanınız" />
                <div className="page-content"><AIAssistant /></div>
              </>
            } />
            <Route path="*" element={
              <>
                <TopBar title="Yapım Aşamasında" />
                <div className="page-content">
                  <div className="empty-state">
                    <div className="empty-icon">&#x1F6A7;</div>
                    <h3>Bu sayfa henuz hazirlaniyor</h3>
                    <p>Yakinda burada harika seyler olacak!</p>
                  </div>
                </div>
              </>
            } />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
