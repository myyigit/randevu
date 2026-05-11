import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function SuperadminDashboard() {
  const { setImpersonatedDietitian, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dietitians'); // 'dietitians' | 'applications'
  const [dietitians, setDietitians] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === 'dietitians') {
        const { data, error } = await supabase.rpc('get_dietitian_stats');
        if (error) throw error;
        setDietitians(data || []);
      } else {
        const { data, error } = await supabase
          .from('dietitian_applications')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setApplications(data || []);
      }
    } catch (err) {
      console.error('Veri çekilemedi:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id, currentStatus) {
    try {
      const { error } = await supabase
        .from('dietitians')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      setDietitians(prev => prev.map(d => d.id === id ? { ...d, is_active: !currentStatus } : d));
      showToast(currentStatus ? 'Diyetisyen pasife alındı.' : 'Diyetisyen aktifleştirildi.');
    } catch (err) {
      showToast('Güncelleme hatası: ' + err.message, 'error');
    }
  }

  async function handleApplication(app, newStatus) {
    try {
      if (newStatus === 'approved') {
        // RPC kullanarak onaylama ve tabloları doldurma işlemini yap
        const { error: rpcErr } = await supabase.rpc('approve_dietitian_application', {
          app_id: app.id,
          admin_id: currentUser.id
        });
        
        if (rpcErr) throw rpcErr;
        
        showToast('Başvuru onaylandı! Diyetisyen hesabı oluşturuldu.');
        
        // Listeleri güncelle
        fetchData();
      } else {
        // Reddetme işlemi için sadece application durumunu güncelle
        const { error: updateErr } = await supabase
          .from('dietitian_applications')
          .update({
            status: newStatus,
            reviewed_at: new Date().toISOString(),
            reviewed_by: currentUser.id
          })
          .eq('id', app.id);
        
        if (updateErr) throw updateErr;
        
        setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: newStatus } : a));
        showToast('Başvuru reddedildi.');
      }
    } catch (err) {
      showToast('İşlem hatası: ' + err.message, 'error');
    }
  }

  function handleImpersonate(dietitian) {
    setImpersonatedDietitian(dietitian);
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
          background: toast.type === 'error' ? 'var(--danger)' : 'var(--success)',
          color: 'white', padding: '12px 20px', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)', fontSize: 14, fontWeight: 600, animation: 'fadeIn .2s ease'
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24 }}>Süper Admin Paneli</h2>
          <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)' }}>Sistemi ve başvuruları yönetin</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        <button
          className={`btn ${activeTab === 'dietitians' ? '' : 'btn-ghost'}`}
          style={activeTab === 'dietitians' ? { borderBottom: '2px solid var(--primary)', borderRadius: '6px 6px 0 0', background: 'var(--surface)' } : {}}
          onClick={() => setActiveTab('dietitians')}
        >
          🧑‍⚕️ Aktif Diyetisyenler
        </button>
        <button
          className={`btn ${activeTab === 'applications' ? '' : 'btn-ghost'}`}
          style={activeTab === 'applications' ? { borderBottom: '2px solid var(--primary)', borderRadius: '6px 6px 0 0', background: 'var(--surface)' } : {}}
          onClick={() => setActiveTab('applications')}
        >
          📬 Başvurular
          {applications.filter(a => a.status === 'pending').length > 0 && (
            <span style={{ background: 'var(--warning)', color: '#000', padding: '2px 6px', borderRadius: 10, fontSize: 11, marginLeft: 8 }}>
              {applications.filter(a => a.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {error && <div style={{ padding: 16, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 8, marginBottom: 24 }}>Hata: {error}</div>}

      <div className="card">
        <div className="card-body no-padding">
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Yükleniyor...</div>
          ) : activeTab === 'dietitians' ? (
            // Diyetisyen Tablosu
            <table className="risk-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 16 }}>Diyetisyen</th>
                  <th style={{ padding: 16 }}>Danışan Sayısı</th>
                  <th style={{ padding: 16 }}>Kayıt Tarihi</th>
                  <th style={{ padding: 16 }}>Durum</th>
                  <th style={{ padding: 16, textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {dietitians.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 16 }}>
                      <div style={{ fontWeight: 600 }}>{d.name || 'İsimsiz'}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{d.email}</div>
                    </td>
                    <td style={{ padding: 16, fontSize: 18, fontWeight: 600 }}>{d.client_count}</td>
                    <td style={{ padding: 16 }}>{new Date(d.created_at).toLocaleDateString('tr-TR')}</td>
                    <td style={{ padding: 16 }}>
                      <span className={`appt-status ${d.is_active ? 'confirmed' : 'cancelled'}`}>
                        {d.is_active ? '✅ Aktif' : '❌ Pasif'}
                      </span>
                    </td>
                    <td style={{ padding: 16, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(d.id, d.is_active)}>
                          {d.is_active ? 'Pasife Al' : 'Aktifleştir'}
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => handleImpersonate(d)} disabled={!d.is_active}>
                          Giriş Yap ➡️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {dietitians.length === 0 && (
                  <tr><td colSpan="5" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Kayıtlı diyetisyen bulunamadı.</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            // Başvuru Tablosu
            <table className="risk-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 16 }}>Aday Bilgileri</th>
                  <th style={{ padding: 16 }}>Mesleki Detaylar</th>
                  <th style={{ padding: 16 }}>Başvuru Tarihi</th>
                  <th style={{ padding: 16 }}>Durum</th>
                  <th style={{ padding: 16, textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 16 }}>
                      <div style={{ fontWeight: 600 }}>{app.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{app.email}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📞 {app.phone} • 📍 {app.city}</div>
                    </td>
                    <td style={{ padding: 16 }}>
                      <div style={{ fontSize: 13 }}><strong>Lisans:</strong> {app.license_no}</div>
                      <div style={{ fontSize: 13 }}><strong>Uzmanlık:</strong> {app.specialization} ({app.experience_years} Yıl)</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{app.clinic_name}</div>
                    </td>
                    <td style={{ padding: 16, fontSize: 13 }}>{new Date(app.created_at).toLocaleDateString('tr-TR')}</td>
                    <td style={{ padding: 16 }}>
                      {app.status === 'pending' && <span className="appt-status pending">⏳ Bekliyor</span>}
                      {app.status === 'approved' && <span className="appt-status confirmed">✅ Onaylandı</span>}
                      {app.status === 'rejected' && <span className="appt-status cancelled">❌ Reddedildi</span>}
                    </td>
                    <td style={{ padding: 16, textAlign: 'right' }}>
                      {app.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleApplication(app, 'rejected')}>
                            Reddet
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={() => handleApplication(app, 'approved')}>
                            Onayla
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {applications.length === 0 && (
                  <tr><td colSpan="5" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Henüz başvuru yok.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

