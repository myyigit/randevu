import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { supabase, isDemoMode } from '../lib/supabase';

const DEMO_STATS = { todayAppointments: 8, activeClients: 42, pendingLogs: 28, criticalAlerts: 4 };
const DEMO_APPOINTMENTS = [
  { id: 1, time: '09:00', name: 'Fatma Kaya', type: 'Yüz yüze', status: 'confirmed', initials: 'FK' },
  { id: 2, time: '10:30', name: 'Ali Mert', type: 'Online', status: 'pending', initials: 'AM' },
  { id: 3, time: '14:00', name: 'Zeynep Arslan', type: 'Yüz yüze', status: 'confirmed', initials: 'ZA' },
  { id: 4, time: '15:30', name: 'Burak Tekin', type: 'Online', status: 'pending', initials: 'BT' },
];
const DEMO_ALERTS = [
  { id: 1, icon: '⚠️', text: 'Fatma K. son 1 haftada +2.1 kg aldı', bold: 'Fatma K.', time: '2 saat önce' },
  { id: 2, icon: '📵', text: 'Ali M. 3 gündür öğün kaydı yok', bold: 'Ali M.', time: '5 saat önce' },
  { id: 3, icon: '💧', text: 'Zeynep A. 5 gündür su hedefini karşılamıyor', bold: 'Zeynep A.', time: '1 gün önce' },
];
const DEMO_MEALS = [
  { id: 1, emoji: '🍳', client: 'Fatma K.', meal: 'Kahvaltı — Yulaf ezmesi + muz', time: '08:12', feedbackDone: false },
  { id: 2, emoji: '🥗', client: 'Ali M.', meal: 'Öğle — Tavuk salata', time: '13:45', feedbackDone: false },
  { id: 3, emoji: '🍎', client: 'Zeynep A.', meal: 'Ara Öğün — Elma + badem', time: '16:00', feedbackDone: true },
];
const mealEmojis = { breakfast: '🍳', lunch: '🥗', dinner: '🍗', snack: '🍎' };

// ─── Modal bileşeni ─────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: 32, minWidth: 420, maxWidth: 520, width: '90%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        animation: 'fadeIn .18s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Onay modalı ────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <Modal title="Onay" onClose={onCancel}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{message}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>İptal</button>
        <button className="btn btn-primary" style={{ background: 'var(--danger)' }} onClick={onConfirm}>Sil</button>
      </div>
    </Modal>
  );
}

// ─── Randevu Ekle Modalı ────────────────────────────────────────────────────
function AddAppointmentModal({ onClose, onSave, clients = [] }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ clientId: '', clientName: '', date: today, time: '09:00', type: 'in_person', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleClientSelect(e) {
    const id = e.target.value;
    const client = clients.find(c => c.id === id);
    set('clientId', id);
    set('clientName', client?.name || '');
  }

  const canSave = (form.clientId || form.clientName) && form.date && form.time;

  return (
    <Modal title="📅 Yeni Randevu" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="login-field">
          <label>Danışan</label>
          <div className="login-input-wrapper">
            <span>👤</span>
            {clients.length > 0 ? (
              <select value={form.clientId} onChange={handleClientSelect}
                style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 14, width: '100%', outline: 'none' }}>
                <option value="">— Danışan seçin —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <input type="text" placeholder="Danışan adı yazın" value={form.clientName}
                onChange={e => set('clientName', e.target.value)}
                style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 14, width: '100%', outline: 'none' }} />
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="login-field">
            <label>Tarih</label>
            <div className="login-input-wrapper">
              <span>📅</span>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 14, width: '100%', outline: 'none' }} />
            </div>
          </div>
          <div className="login-field">
            <label>Saat</label>
            <div className="login-input-wrapper">
              <span>🕐</span>
              <input type="time" value={form.time} onChange={e => set('time', e.target.value)}
                style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 14, width: '100%', outline: 'none' }} />
            </div>
          </div>
        </div>
        <div className="login-field">
          <label>Seans Türü</label>
          <div className="login-input-wrapper">
            <span>📍</span>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 14, width: '100%', outline: 'none' }}>
              <option value="in_person">Yüz yüze</option>
              <option value="online">Online</option>
            </select>
          </div>
        </div>
        <div className="login-field">
          <label>Notlar (isteğe bağlı)</label>
          <div className="login-input-wrapper">
            <span>📝</span>
            <input type="text" placeholder="Seans notları..." value={form.notes}
              onChange={e => set('notes', e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 14, width: '100%', outline: 'none' }} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
        <button className="btn btn-ghost" onClick={onClose}>İptal</button>
        <button className="btn btn-primary" onClick={() => onSave(form)} disabled={!canSave}>
          ✅ Randevu Oluştur
        </button>
      </div>
    </Modal>
  );
}

// ─── Yorum Modalı ───────────────────────────────────────────────────────────
function FeedbackModal({ meal, onClose, onSave }) {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(null);
  return (
    <Modal title="💬 Öğün Yorumu" onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 16, fontSize: 14 }}>
          <strong>{meal.client}</strong> — {meal.meal}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>🕐 {meal.time}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {['✅ Uygun', '⚠️ Dikkat', '❌ Uygunsuz'].map(r => (
            <button key={r} onClick={() => setRating(r)}
              className={`btn btn-sm ${rating === r ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flex: 1 }}>{r}</button>
          ))}
        </div>
        <div className="login-field">
          <label>Yorum</label>
          <div className="login-input-wrapper">
            <span>✍️</span>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
              placeholder="Danışana öğün hakkında geri bildirim yaz..."
              rows={3}
              style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 14, width: '100%', outline: 'none', resize: 'none', lineHeight: 1.6 }} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>İptal</button>
        <button className="btn btn-primary" onClick={() => onSave({ feedback, rating })} disabled={!feedback.trim()}>
          💬 Gönder
        </button>
      </div>
    </Modal>
  );
}

// ─── Ana Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { activeDietitianId, isDemoMode: authDemo } = useAuth();
  const isDemo = isDemoMode || authDemo || !activeDietitianId;

  const [stats, setStats] = useState(DEMO_STATS);
  const [appointments, setAppointments] = useState(DEMO_APPOINTMENTS);
  const [alerts, setAlerts] = useState(DEMO_ALERTS);
  const [meals, setMeals] = useState(DEMO_MEALS);
  const [clients, setClients] = useState([]);          // danışan listesi (modal için)
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Modal states
  const [showAddAppt, setShowAddAppt] = useState(false);
  const [deleteAppt, setDeleteAppt] = useState(null);   // appt obj
  const [feedbackMeal, setFeedbackMeal] = useState(null); // meal obj

  function getTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins + ' dk önce';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + ' saat önce';
    return Math.floor(hours / 24) + ' gün önce';
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchClients() {
    if (!activeDietitianId) return;
    const { data } = await supabase
      .from('clients')
      .select('id, users(name)')
      .eq('dietitian_id', activeDietitianId)
      .order('created_at', { ascending: false });
    if (data) setClients(data.map(c => ({ id: c.id, name: c.users?.name || 'İsimsiz' })));
  }

  async function fetchAlerts() {
    if (!activeDietitianId) return;
    try { await supabase.rpc('generate_dietitian_alerts', { p_dietitian_id: activeDietitianId }); } catch { /* ignore */ }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', activeDietitianId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data?.length) {
      setAlerts(data.map(n => ({
        id: n.id,
        icon: n.icon === 'warning' ? '\u26A0\uFE0F' : n.icon === 'water' ? '\uD83D\uDCA7' : n.icon === 'scale' ? '\u2696\uFE0F' : '\uD83D\uDD14',
        text: n.message || n.title,
        bold: n.title.split(' - ')[0],
        time: getTimeAgo(n.created_at),
      })));
      setStats(s => ({ ...s, criticalAlerts: data.length }));
    } else {
      setAlerts([]);
      setStats(s => ({ ...s, criticalAlerts: 0 }));
    }
  }

  async function fetchDashboardData() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const userId = activeDietitianId;

      const { data: apptData } = await supabase
        .from('appointments')
        .select('*, clients(id, users(name))')
        .eq('dietitian_id', userId)
        .gte('scheduled_at', today).lt('scheduled_at', tomorrow)
        .order('scheduled_at', { ascending: true });

      if (apptData?.length) {
        setAppointments(apptData.map(a => ({
          id: a.id,
          time: new Date(a.scheduled_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          name: a.clients?.users?.name || 'Bilinmiyor',
          type: a.type === 'in_person' ? 'Yüz yüze' : 'Online',
          status: a.status,
          initials: (a.clients?.users?.name || 'XX').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        })));
      }

      const { count: clientCount } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('dietitian_id', userId);
      const { count: pendingCount } = await supabase.from('meal_logs').select('*, clients!inner(dietitian_id)', { count: 'exact', head: true }).is('dietitian_feedback', null).eq('clients.dietitian_id', userId);
      const { count: alertCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false);

      setStats({ todayAppointments: apptData?.length || 0, activeClients: clientCount || 0, pendingLogs: pendingCount || 0, criticalAlerts: alertCount || 0 });

      const { data: mealData } = await supabase.from('meal_logs').select('*, clients!inner(dietitian_id, users(name))').eq('clients.dietitian_id', userId).order('logged_at', { ascending: false }).limit(6);
      if (mealData?.length) {
        setMeals(mealData.map(m => ({
          id: m.id,
          emoji: mealEmojis[m.meal_type] || '\uD83C\uDF7D',
          client: m.clients?.users?.name?.split(' ').map((n, i) => i === 0 ? n : n[0] + '.').join(' ') || '?',
          meal: (m.meal_type === 'breakfast' ? 'Kahvaltı' : m.meal_type === 'lunch' ? 'Öğle' : m.meal_type === 'dinner' ? 'Akşam' : 'Ara Öğün') + ' — ' + (m.note || 'Açıklama yok'),
          time: new Date(m.logged_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          feedbackDone: !!m.dietitian_feedback,
        })));
      }
    } catch (err) {
      console.error('Dashboard veri hatası:', err);
    }
  }

  useEffect(() => {
    if (isDemo) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchDashboardData(), fetchClients()]);
      if (!cancelled) await fetchAlerts();
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDietitianId]);

  // ── Randevu ekleme ──────────────────────────────────────────────────────
  async function handleAddAppointment(form) {
    const tzOffset = new Date().getTimezoneOffset();
    const tzSign = tzOffset > 0 ? '-' : '+';
    const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
    const tzMins = String(Math.abs(tzOffset) % 60).padStart(2, '0');
    const scheduledAt = `${form.date}T${form.time}:00${tzSign}${tzHours}:${tzMins}`;
    const displayName = form.clientName || clients.find(c => c.id === form.clientId)?.name || 'Danışan';
    const newAppt = {
      id: Date.now(), time: form.time, name: displayName,
      type: form.type === 'in_person' ? 'Yüz yüze' : 'Online', status: 'pending',
      initials: displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
    };

    if (!isDemo) {
      // client_id zorunlu — seçilmişse kullan, yoksa hata
      if (!form.clientId) {
        showToast('Lütfen listeden bir danışan seçin.', 'error');
        return;
      }
      const { error } = await supabase.from('appointments').insert({
        dietitian_id: activeDietitianId,
        client_id: form.clientId,
        scheduled_at: scheduledAt,
        type: form.type,
        status: 'pending',
        notes: form.notes || null,
        duration_min: 60,
      });
      if (error) { showToast('Randevu eklenemedi: ' + error.message, 'error'); return; }
    }

    setAppointments(prev => [...prev, newAppt].sort((a, b) => a.time.localeCompare(b.time)));
    setStats(s => ({ ...s, todayAppointments: s.todayAppointments + 1 }));
    setShowAddAppt(false);
    showToast('✅ Randevu başarıyla eklendi!');
  }

  // ── Randevu silme ───────────────────────────────────────────────────────
  async function handleDeleteAppointment() {
    const id = deleteAppt.id;
    const isRealId = typeof id === 'string' && id.length > 10; // UUID vs sayısal mock
    if (!isDemo && isRealId) {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) { showToast('Silinemedi: ' + error.message, 'error'); setDeleteAppt(null); return; }
    }
    setAppointments(prev => prev.filter(a => a.id !== id));
    setStats(s => ({ ...s, todayAppointments: Math.max(0, s.todayAppointments - 1) }));
    setDeleteAppt(null);
    showToast('🗑️ Randevu silindi.');
  }

  // ── Durum değiştirme ────────────────────────────────────────────────────
  async function handleStatusChange(apptId, newStatus) {
    if (!isDemo) {
      await supabase.from('appointments').update({ status: newStatus }).eq('id', apptId);
    }
    setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status: newStatus } : a));
    showToast(`Durum güncellendi: ${newStatus === 'confirmed' ? 'Onaylandı' : newStatus === 'done' ? 'Tamamlandı' : 'Bekliyor'}`);
  }

  // ── Öğün yorumu ─────────────────────────────────────────────────────────
  async function handleFeedback({ feedback, rating }) {
    const id = feedbackMeal.id;
    const text = `${rating || ''} ${feedback}`.trim();
    if (!isDemo) {
      await supabase.from('meal_logs').update({ dietitian_feedback: text }).eq('id', id);
    }
    setMeals(prev => prev.map(m => m.id === id ? { ...m, feedbackDone: true } : m));
    setStats(s => ({ ...s, pendingLogs: Math.max(0, s.pendingLogs - 1) }));
    setFeedbackMeal(null);
    showToast('💬 Yorum gönderildi!');
  }

  // ── Uyarı sil ───────────────────────────────────────────────────────────
  async function handleDismissAlert(alertId) {
    if (!isDemo) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', alertId);
    }
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    setStats(s => ({ ...s, criticalAlerts: Math.max(0, s.criticalAlerts - 1) }));
  }

  if (loading) {
    return <div className="animate-in" style={{ textAlign: 'center', padding: 60 }}><div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div><p style={{ color: 'var(--text-muted)' }}>Veriler yükleniyor...</p></div>;
  }

  const statusCycle = { pending: 'confirmed', confirmed: 'done', done: 'pending' };
  const statusLabel = { confirmed: '✅ Onaylı', pending: '⏳ Bekliyor', done: '✔️ Tamamlandı' };

  return (
    <div className="animate-in">
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

      {/* Modals */}
      {showAddAppt && <AddAppointmentModal onClose={() => setShowAddAppt(false)} onSave={handleAddAppointment} clients={clients} />}
      {deleteAppt && <ConfirmModal message={`"${deleteAppt.name}" adlı danışanın randevusu silinecek. Emin misiniz?`} onConfirm={handleDeleteAppointment} onCancel={() => setDeleteAppt(null)} />}
      {feedbackMeal && <FeedbackModal meal={feedbackMeal} onClose={() => setFeedbackMeal(null)} onSave={handleFeedback} />}

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card primary"><div className="stat-icon">📅</div><div className="stat-value">{stats.todayAppointments}</div><div className="stat-label">Bugünkü Randevu</div></div>
        <div className="stat-card info"><div className="stat-icon">👥</div><div className="stat-value">{stats.activeClients}</div><div className="stat-label">Aktif Danışan</div></div>
        <div className="stat-card warning"><div className="stat-icon">📸</div><div className="stat-value">{stats.pendingLogs}</div><div className="stat-label">Bekleyen Öğün Logu</div></div>
        <div className="stat-card danger"><div className="stat-icon">⚠️</div><div className="stat-value">{stats.criticalAlerts}</div><div className="stat-label">Kritik Uyarı</div></div>
      </div>

      <div className="dashboard-grid">
        {/* Bugünkü Randevular */}
        <div className="card">
          <div className="card-header">
            <h3>📅 Bugünkü Randevular</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddAppt(true)}>+ Ekle</button>
          </div>
          <div className="card-body no-padding">
            {appointments.length > 0 ? appointments.map(appt => (
              <div key={appt.id} className="appointment-item">
                <span className="appt-time">{appt.time}</span>
                <div className="appt-avatar">{appt.initials}</div>
                <div className="appt-info">
                  <div className="appt-name">{appt.name}</div>
                  <div className="appt-detail">{appt.type}</div>
                </div>
                {/* Durum badge — tıklayınca döngüsel değişim */}
                <button
                  className={`appt-status ${appt.status}`}
                  onClick={() => handleStatusChange(appt.id, statusCycle[appt.status])}
                  style={{ cursor: 'pointer', border: 'none', background: 'none' }}
                  title="Durumu değiştirmek için tıkla"
                >
                  {statusLabel[appt.status]}
                </button>
                {/* Sil butonu */}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setDeleteAppt(appt)}
                  title="Randevuyu sil"
                  style={{ color: 'var(--danger)', marginLeft: 4 }}
                >
                  🗑️
                </button>
              </div>
            )) : (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                📅 Bugün randevu yok
              </div>
            )}
          </div>
        </div>

        {/* Kritik Uyarılar */}
        <div className="card">
          <div className="card-header">
            <h3>🚨 Kritik Uyarılar</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setAlerts([])}>Tümünü Kapat</button>
          </div>
          <div className="card-body no-padding">
            {alerts.length > 0 ? alerts.map(alert => (
              <div key={alert.id} className="alert-item">
                <span className="alert-icon">{alert.icon}</span>
                <div className="alert-text">
                  {alert.bold
                    ? <><strong>{alert.bold}</strong> <span>{alert.text.replace(alert.bold, '')}</span></>
                    : <span>{alert.text}</span>}
                </div>
                <span className="alert-time">{alert.time}</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDismissAlert(alert.id)}
                  title="Uyarıyı kapat"
                  style={{ color: 'var(--text-muted)', marginLeft: 4 }}
                >✕</button>
              </div>
            )) : (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>✅ Aktif uyarı yok</div>
            )}
          </div>
        </div>

        {/* Son Öğün Yüklemeleri */}
        <div className="card">
          <div className="card-header">
            <h3>📸 Son Öğün Yüklemeleri</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {meals.filter(m => !m.feedbackDone).length} bekliyor
            </span>
          </div>
          <div className="card-body no-padding">
            {meals.length > 0 ? meals.map(photo => (
              <div key={photo.id} className="meal-timeline-item">
                <span className="meal-type-icon">{photo.emoji}</span>
                <div className="meal-photo">📷</div>
                <div className="meal-info">
                  <div className="meal-label">{photo.client} — {photo.meal}</div>
                  <div className="meal-time-detail">{photo.time}</div>
                </div>
                {photo.feedbackDone ? (
                  <span className="appt-status confirmed" style={{ fontSize: 12 }}>✅ Yanıtlandı</span>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => setFeedbackMeal(photo)}>
                    💬 Yorum
                  </button>
                )}
              </div>
            )) : (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>📸 Henüz öğün yüklemesi yok</div>
            )}
          </div>
        </div>

        {/* Haftalık Özet */}
        <div className="card">
          <div className="card-header"><h3>📊 Haftalık Özet</h3></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Toplam Danışan', value: stats.activeClients, bg: 'var(--primary-glow)' },
                { label: 'Bugün Randevu', value: stats.todayAppointments, bg: 'rgba(59,130,246,0.1)' },
                { label: 'İncelenmemiş Log', value: stats.pendingLogs, bg: 'rgba(245,158,11,0.1)' },
                { label: 'Uyarı', value: stats.criticalAlerts, bg: 'rgba(239,68,68,0.1)' },
              ].map(item => (
                <div key={item.label} style={{ background: item.bg, padding: 16, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
