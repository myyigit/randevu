import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../contexts/useAuth';
import { useClients, useMealLogs, useMeasurements, useDietPlans } from '../hooks/useSupabase';
import { supabase, isDemoMode } from '../lib/supabase';
import { ClientFormModal, MeasurementModal, ConfirmDeleteModal } from '../components/ClientModals';

// ── Demo verisi ──────────────────────────────────────────────────────────────
const DEMO_CLIENTS = [
  { id:'1', name:'Fatma Kaya',   initials:'FK', weight:72, trend:'up',     change:'+2.1', goal:'Kilo Verme',   lastLog:'2 saat önce', email:'fatma@demo.com', gender:'female', activity_level:'moderate' },
  { id:'2', name:'Ali Mert',     initials:'AM', weight:85, trend:'stable', change:'0',    goal:'Kas Kazanımı', lastLog:'3 gün önce',  email:'ali@demo.com',   gender:'male',   activity_level:'active' },
  { id:'3', name:'Zeynep Arslan',initials:'ZA', weight:61, trend:'down',   change:'-1.3', goal:'Kilo Verme',   lastLog:'5 saat önce', email:'zeynep@demo.com',gender:'female', activity_level:'light' },
  { id:'4', name:'Burak Tekin',  initials:'BT', weight:94, trend:'down',   change:'-0.8', goal:'Kilo Verme',   lastLog:'1 gün önce',  email:'burak@demo.com', gender:'male',   activity_level:'sedentary' },
];
const DEMO_WEIGHT = [
  {date:'May 1',weight:74},{date:'May 8',weight:73.2},{date:'May 15',weight:72.8},
  {date:'May 22',weight:71.5},{date:'Haz 1',weight:71.0},{date:'Haz 8',weight:70.2},{date:'Haz 15',weight:72.1},
];
const DEMO_MACROS = [
  {name:'Protein',value:30,color:'#22C55E'},
  {name:'Karbonhidrat',value:45,color:'#3B82F6'},
  {name:'Yağ',value:25,color:'#F59E0B'},
];
const DEMO_LOGS = [
  {id:1,meal_type:'breakfast',logged_at:'2026-05-05T08:12:00',note:'Yulaf ezmesi + muz',dietitian_feedback:'Harika!'},
  {id:2,meal_type:'lunch',logged_at:'2026-05-05T13:45:00',note:'Tavuk salata',dietitian_feedback:null},
  {id:3,meal_type:'snack',logged_at:'2026-05-05T16:00:00',note:'Elma + 10 badem',dietitian_feedback:null},
  {id:4,meal_type:'dinner',logged_at:'2026-05-05T19:30:00',note:'Izgara tavuk + sebze',dietitian_feedback:null},
];
const DEMO_MEASUREMENTS = [
  {measured_at:'2026-07-15',weight_kg:72.1,body_fat_pct:28.5,muscle_kg:26.1,waist_cm:78},
  {measured_at:'2026-07-08',weight_kg:70.2,body_fat_pct:27.8,muscle_kg:26.3,waist_cm:77},
  {measured_at:'2026-07-01',weight_kg:71.0,body_fat_pct:28.1,muscle_kg:26.0,waist_cm:78},
];

const mealEmojis  = {breakfast:'🍳',lunch:'🥗',dinner:'🍗',snack:'🍎'};
const mealLabels  = {breakfast:'Kahvaltı',lunch:'Öğle',dinner:'Akşam',snack:'Ara Öğün'};
const goalLabels  = {weight_loss:'Kilo Verme',muscle_gain:'Kas Kazanımı',maintenance:'Koruma'};
const activityLabels = {sedentary:'Hareketsiz',light:'Hafif Aktif',moderate:'Orta Aktif',active:'Aktif',very_active:'Çok Aktif'};

export default function Clients() {
  const { activeDietitianId, isDemoMode: authDemo } = useAuth();
  const isDemo = isDemoMode || authDemo || !activeDietitianId;

  // ── Liste state ────────────────────────────────────────────────────────────
  const { clients: realClients, loading: cLoading } = useClients(isDemo ? null : activeDietitianId);
  const [localClients, setLocalClients] = useState(null); // override için
  const clientList = localClients ?? (isDemo ? DEMO_CLIENTS : (cLoading ? [] : realClients));

  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab]           = useState('overview');
  const [search, setSearch]                 = useState('');
  const [toast, setToast]                   = useState(null);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [showAdd, setShowAdd]         = useState(false);
  const [editClient, setEditClient]   = useState(null);
  const [deleteClient, setDeleteClient] = useState(null);
  const [showMeasure, setShowMeasure] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);

  // ── Seçili danışan hookları ────────────────────────────────────────────────
  const { logs: realLogs, loading: logsLoading } = useMealLogs(isDemo ? null : selectedClient?.id);
  const { measurements: realMeasurements }        = useMeasurements(isDemo ? null : selectedClient?.id);
  const [localMeasurements, setLocalMeasurements] = useState(null);
  const { activePlan }                            = useDietPlans(isDemo ? null : selectedClient?.id);

  const mealLogs    = isDemo ? DEMO_LOGS : realLogs;
  const measurements = localMeasurements ?? (isDemo ? DEMO_MEASUREMENTS : realMeasurements);
  const weightData  = measurements.slice().reverse().map(m => ({
    date: new Date(m.measured_at).toLocaleDateString('tr-TR', {day:'numeric',month:'short'}),
    weight: m.weight_kg,
  }));

  useEffect(() => {
    if (clientList.length > 0 && !selectedClient) setSelectedClient(clientList[0]);
  }, [clientList.length]);

  // ── Mesaj helper ──────────────────────────────────────────────────────────
  function showMsg(msg, type='success') {
    setToast({msg,type});
    setTimeout(() => setToast(null), 3000);
  }

  // ── CRUD: Danışan Ekle ────────────────────────────────────────────────────
  async function handleAdd(form) {
    const initials = form.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);

    if (!isDemo) {
      try {
        const { data: newId, error } = await supabase.rpc('add_client', {
          p_dietitian_id: activeDietitianId,
          p_name: form.name,
          p_email: form.email || null,
          p_phone: form.phone || null,
          p_goal: form.goal || 'weight_loss',
          p_gender: form.gender || null,
          p_birth_date: form.birth_date || null,
          p_activity_level: form.activity_level || 'sedentary',
          p_medical_notes: form.medical_notes || null,
        });

        if (error) throw error;

        const newClient = {
          id: newId, name: form.name, email: form.email,
          initials, weight: 0, trend: 'stable', change: '0',
          goal: goalLabels[form.goal] || form.goal,
          gender: form.gender, activity_level: form.activity_level, lastLog: 'Henüz yok',
        };
        setLocalClients(prev => [...(prev ?? clientList), newClient]);
        setSelectedClient(newClient);
        setShowAdd(false);
        showMsg('✅ Danışan başarıyla eklendi!');
        return;
      } catch (e) {
        showMsg('Danışan eklenemedi: ' + e.message, 'error');
        return;
      }
    }

    // Demo modu
    const newClient = {
      id: String(Date.now()), name: form.name, email: form.email,
      initials, weight: 0, trend: 'stable', change: '0',
      goal: goalLabels[form.goal] || form.goal,
      gender: form.gender, activity_level: form.activity_level, lastLog: 'Henüz yok',
    };
    setLocalClients(prev => [...(prev ?? clientList), newClient]);
    setSelectedClient(newClient);
    setShowAdd(false);
    showMsg('✅ Danışan başarıyla eklendi!');
  }

  // ── CRUD: Danışan Güncelle ────────────────────────────────────────────────
  async function handleEdit(form) {
    if (!isDemo) {
      try {
        const { error } = await supabase.rpc('update_client', {
          p_client_id: editClient.id,
          p_name: form.name,
          p_email: form.email || null,
          p_phone: form.phone || null,
          p_goal: form.goal || null,
          p_gender: form.gender || null,
          p_birth_date: form.birth_date || null,
          p_activity_level: form.activity_level || null,
          p_medical_notes: form.medical_notes || null,
        });
        if (error) throw error;
      } catch (e) {
        showMsg('Güncelleme hatası: ' + e.message, 'error');
        return;
      }
    }
    const updated = { ...editClient, name: form.name, email: form.email,
      initials: form.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2),
      goal: goalLabels[form.goal] || form.goal, gender: form.gender,
      activity_level: form.activity_level };
    setLocalClients(prev => (prev ?? clientList).map(c => c.id === editClient.id ? updated : c));
    setSelectedClient(updated);
    setEditClient(null);
    showMsg('✅ Danışan güncellendi!');
  }

  // ── CRUD: Danışan Sil ─────────────────────────────────────────────────────
  async function handleDelete() {
    const id = deleteClient.id;
    if (!isDemo) {
      try {
        const { error } = await supabase.rpc('delete_client', { p_client_id: id });
        if (error) throw error;
      } catch (e) {
        showMsg('Silinemedi: ' + e.message, 'error');
        setDeleteClient(null);
        return;
      }
    }
    const newList = (localClients ?? clientList).filter(c => c.id !== id);
    setLocalClients(newList);
    setSelectedClient(newList[0] ?? null);
    setDeleteClient(null);
    showMsg('🗑️ Danışan silindi.');
  }

  // ── CRUD: Ölçüm Ekle ─────────────────────────────────────────────────────
  async function handleMeasurement(form) {
    const entry = { measured_at: form.measured_at, weight_kg: parseFloat(form.weight_kg),
      body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
      muscle_kg: form.muscle_kg ? parseFloat(form.muscle_kg) : null,
      waist_cm: form.waist_cm ? parseFloat(form.waist_cm) : null };
    if (!isDemo) {
      try {
        const { error } = await supabase.rpc('add_measurement', {
          p_client_id: selectedClient.id,
          p_weight_kg: entry.weight_kg,
          p_body_fat_pct: entry.body_fat_pct,
          p_muscle_mass_kg: entry.muscle_kg,
          p_waist_cm: entry.waist_cm,
          p_measured_at: entry.measured_at,
        });
        if (error) throw error;
      } catch (e) {
        showMsg('Ölçüm eklenemedi: ' + e.message, 'error');
        return;
      }
    }
    setLocalMeasurements([entry, ...(measurements)]);
    setShowMeasure(false);
    showMsg('📏 Ölçüm kaydedildi!');
  }

  // ── CRUD: Şifre Sıfırla ──────────────────────────────────────────────────
  async function handleResetPassword() {
    if (!selectedClient?.id) return;
    if (!window.confirm(`${selectedClient.name} adlı danışanın şifresi 12345678 olarak sıfırlanacak. Onaylıyor musunuz?`)) return;
    setResettingPw(true);
    try {
      const { error } = await supabase.rpc('reset_client_password', { p_client_id: selectedClient.id });
      if (error) throw error;
      showMsg('🔑 Şifre 12345678 olarak sıfırlandı. Danışan ilk girişte değiştirmek zorunda kalacak.');
    } catch (e) {
      showMsg('Sıfırlama hatası: ' + e.message, 'error');
    } finally {
      setResettingPw(false);
    }
  }


  const filtered = clientList.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  function handleGenerateReport() {
    if (!selectedClient) return;
    const c = selectedClient;
    const m = measurements;
    const logs = mealLogs;

    const latestWeight = m.length > 0 ? m[0].weight_kg : '-';
    const latestFat = m.length > 0 ? (m[0].body_fat_pct || '-') : '-';
    const latestWaist = m.length > 0 ? (m[0].waist_cm || '-') : '-';

    const mealRows = logs.slice(0, 20).map(log =>
      `<tr>
        <td>${new Date(log.logged_at).toLocaleDateString('tr-TR')}</td>
        <td>${mealLabels[log.meal_type] || log.meal_type}</td>
        <td>${log.note || '-'}</td>
        <td>${log.dietitian_feedback || '-'}</td>
      </tr>`
    ).join('');

    const measureRows = m.map(row =>
      `<tr>
        <td>${new Date(row.measured_at).toLocaleDateString('tr-TR')}</td>
        <td>${row.weight_kg} kg</td>
        <td>${row.body_fat_pct || '-'}%</td>
        <td>${row.muscle_kg || '-'} kg</td>
        <td>${row.waist_cm || '-'} cm</td>
      </tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>DietSync - ${c.name} Raporu</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 32px; color: #1e293b; }
  h1 { color: #22c55e; border-bottom: 2px solid #22c55e; padding-bottom: 8px; }
  h2 { color: #334155; margin-top: 32px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 13px; }
  th { background: #f1f5f9; font-weight: 600; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
  .info-item { background: #f8fafc; padding: 10px 14px; border-radius: 6px; }
  .info-label { font-size: 11px; color: #64748b; text-transform: uppercase; }
  .info-value { font-size: 15px; font-weight: 600; margin-top: 2px; }
  .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  @media print { body { padding: 0; } }
</style>
</head><body>
<h1>DietSync - Daniasan Raporu</h1>
<p style="color:#64748b">Olusturulma: ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

<h2>Daniasan Bilgileri</h2>
<div class="info-grid">
  <div class="info-item"><div class="info-label">Ad Soyad</div><div class="info-value">${c.name}</div></div>
  <div class="info-item"><div class="info-label">E-posta</div><div class="info-value">${c.email || '-'}</div></div>
  <div class="info-item"><div class="info-label">Hedef</div><div class="info-value">${c.goal || '-'}</div></div>
  <div class="info-item"><div class="info-label">Aktivite</div><div class="info-value">${activityLabels[c.activity_level] || '-'}</div></div>
  <div class="info-item"><div class="info-label">Son Kilo</div><div class="info-value">${latestWeight} kg</div></div>
  <div class="info-item"><div class="info-label">Vuc. Yag</div><div class="info-value">${latestFat}%</div></div>
</div>

<h2>Olcum Gecmisi</h2>
${measureRows ? `<table><thead><tr><th>Tarih</th><th>Kilo</th><th>Yag %</th><th>Kas</th><th>Bel</th></tr></thead><tbody>${measureRows}</tbody></table>` : '<p style="color:#94a3b8">Henuz olcum kaydı yok.</p>'}

<h2>Son Ogun Kayitlari</h2>
${mealRows ? `<table><thead><tr><th>Tarih</th><th>Ogun</th><th>Detay</th><th>Geri Bildirim</th></tr></thead><tbody>${mealRows}</tbody></table>` : '<p style="color:#94a3b8">Henuz ogun kaydı yok.</p>'}

<div class="footer">DietSync Profesyonel Diyet Yonetim Sistemi &copy; ${new Date().getFullYear()}</div>
</body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  }

  return (
    <div className="split-view">

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed',bottom:24,right:24,zIndex:2000,
          background: toast.type==='error' ? 'var(--danger)' : 'var(--success)',
          color:'white',padding:'12px 20px',borderRadius:'var(--radius-md)',
          boxShadow:'0 8px 24px rgba(0,0,0,0.3)',fontSize:14,fontWeight:600,animation:'fadeIn .2s ease' }}>
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {showAdd     && <ClientFormModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {editClient  && <ClientFormModal onClose={() => setEditClient(null)} onSave={handleEdit} initial={editClient} />}
      {deleteClient && <ConfirmDeleteModal name={deleteClient.name} onConfirm={handleDelete} onCancel={() => setDeleteClient(null)} />}
      {showMeasure && <MeasurementModal onClose={() => setShowMeasure(false)} onSave={handleMeasurement} />}

      {/* ── Sol Panel ─────────────────────────────────────────────────────── */}
      <div className="client-list-panel">
        <div className="client-list-header">
          <div className="client-list-search">
            <span>🔍</span>
            <input type="text" placeholder="Danışan ara..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="client-list-items">
          {filtered.map(c => (
            <div key={c.id}
              className={`client-list-item ${selectedClient?.id === c.id ? 'active' : ''}`}
              onClick={() => { setSelectedClient(c); setActiveTab('overview'); setLocalMeasurements(null); }}>
              <div className="client-avatar">{c.initials}</div>
              <div className="client-meta">
                <div className="name">{c.name}</div>
                <div className="detail">{c.weight ? c.weight + 'kg · ' : ''}{c.goal}</div>
              </div>
              <span className={`client-weight-tag ${c.trend}`}>
                {c.trend==='up'?'↑':c.trend==='down'?'↓':'→'} {c.change}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding:24, textAlign:'center', color:'var(--text-muted)', fontSize:14 }}>
              {search ? 'Danışan bulunamadı' : 'Henüz danışan yok'}
            </div>
          )}
          <div style={{ padding:'var(--space-lg)', textAlign:'center' }}>
            <button className="btn btn-primary" style={{ width:'100%' }} onClick={() => setShowAdd(true)}>
              + Yeni Danışan
            </button>
          </div>
        </div>
      </div>

      {/* ── Sağ Panel ─────────────────────────────────────────────────────── */}
      {selectedClient && (
        <div className="client-detail-panel animate-in" key={selectedClient.id}>

          {/* Header */}
          <div className="client-detail-header">
            <div className="client-detail-profile">
              <div className="client-detail-avatar">{selectedClient.initials}</div>
              <div>
                <div className="client-detail-name">{selectedClient.name}</div>
                <div className="client-detail-sub">
                  {selectedClient.goal} · {activityLabels[selectedClient.activity_level] || ''} · Son log: {selectedClient.lastLog || 'Bilgi yok'}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button className="btn btn-ghost" onClick={() => setEditClient(selectedClient)}>✏️ Düzenle</button>
              <button className="btn btn-ghost" style={{ color:'var(--danger)' }} onClick={() => setDeleteClient(selectedClient)}>🗑️ Sil</button>
              <button
                className="btn btn-ghost"
                style={{ color:'var(--warning, #f59e0b)' }}
                onClick={handleResetPassword}
                disabled={resettingPw || isDemo}
                title="Şifreyi 12345678 olarak sıfırla"
              >
                {resettingPw ? '⏳' : '🔑'} Şifre Sıfırla
              </button>
              <button className="btn btn-primary" onClick={handleGenerateReport}>&#x1F4C4; Rapor</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {['overview','measurements','plan','logs'].map(t => (
              <button key={t} className={`tab ${activeTab===t?'active':''}`} onClick={() => setActiveTab(t)}>
                {t==='overview'?'Genel Bakış':t==='measurements'?'Ölçümler':t==='plan'?'Diyet Planı':'Öğün Günlüğü'}
              </button>
            ))}
          </div>

          {/* ── Genel Bakış ─────────────────────────────────────────────── */}
          {activeTab==='overview' && (
            <>
              <div className="detail-grid">
                <div className="card">
                  <div className="card-header"><h3>📈 Kilo Grafiği</h3></div>
                  <div className="card-body">
                    {weightData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={weightData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                          <YAxis stroke="#64748B" fontSize={11} domain={['dataMin - 1','dataMax + 1']} />
                          <Tooltip contentStyle={{ background:'#1E293B',border:'1px solid #334155',borderRadius:8,color:'#F1F5F9' }} />
                          <Line type="monotone" dataKey="weight" stroke="#22C55E" strokeWidth={3} dot={{ fill:'#22C55E',strokeWidth:0,r:4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ textAlign:'center',padding:24 }}>
                        <p style={{ color:'var(--text-muted)',marginBottom:12 }}>Henüz ölçüm yok</p>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowMeasure(true)}>+ İlk Ölçümü Ekle</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header"><h3>🥧 Makro Dağılımı</h3></div>
                  <div className="card-body" style={{ display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={DEMO_MACROS} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={4}>
                          {DEMO_MACROS.map((e,i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background:'#1E293B',border:'1px solid #334155',borderRadius:8,color:'#F1F5F9' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                      {DEMO_MACROS.map(m => (
                        <div key={m.name} style={{ display:'flex',alignItems:'center',gap:8,fontSize:13 }}>
                          <span style={{ width:10,height:10,borderRadius:'50%',background:m.color,display:'inline-block' }} />
                          {m.name}: {m.value}%
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3>🍽️ Son Öğün Logları</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('logs')}>Tüm Geçmişi Gör</button>
                </div>
                <div className="card-body no-padding">
                  {mealLogs.slice(0,4).map(log => (
                    <div key={log.id} className="meal-timeline-item">
                      <span className="meal-type-icon">{mealEmojis[log.meal_type]||'🍽️'}</span>
                      <div className="meal-photo">📷</div>
                      <div className="meal-info">
                        <div className="meal-label">{mealLabels[log.meal_type]||log.meal_type} — {log.note||'Açıklama yok'}</div>
                        <div className="meal-time-detail">{new Date(log.logged_at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</div>
                      </div>
                      {log.dietitian_feedback
                        ? <span className="appt-status confirmed">✅ Onaylı</span>
                        : <button className="btn btn-primary btn-sm">💬 Yorum</button>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Ölçümler ────────────────────────────────────────────────── */}
          {activeTab==='measurements' && (
            <div className="card">
              <div className="card-header">
                <h3>📏 Ölçüm Geçmişi</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowMeasure(true)}>+ Yeni Ölçüm</button>
              </div>
              <div className="card-body no-padding">
                {measurements.length > 0 ? (
                  <table className="risk-table">
                    <thead><tr><th>Tarih</th><th>Kilo</th><th>Yağ %</th><th>Kas (kg)</th><th>Bel (cm)</th><th>BMI</th></tr></thead>
                    <tbody>
                      {measurements.map((m,i) => (
                        <tr key={i}>
                          <td>{new Date(m.measured_at).toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'})}</td>
                          <td><strong>{m.weight_kg}</strong></td>
                          <td>{m.body_fat_pct||'-'}</td>
                          <td>{m.muscle_kg||'-'}</td>
                          <td>{m.waist_cm||'-'}</td>
                          <td>{m.weight_kg ? (m.weight_kg/((170/100)**2)).toFixed(1) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign:'center',padding:32 }}>
                    <p style={{ color:'var(--text-muted)',marginBottom:12 }}>Henüz ölçüm kaydı yok</p>
                    <button className="btn btn-primary" onClick={() => setShowMeasure(true)}>+ İlk Ölçümü Ekle</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Diyet Planı ─────────────────────────────────────────────── */}
          {activeTab==='plan' && (
            <div className="card">
              <div className="card-header"><h3>🍽️ Aktif Diyet Planı</h3><button className="btn btn-primary btn-sm">✏️ Düzenle</button></div>
              <div className="card-body">
                {activePlan ? (
                  <div style={{ marginBottom:16,padding:12,background:'var(--primary-glow)',borderRadius:'var(--radius-md)',fontSize:13 }}>
                    <strong>Günlük Hedef:</strong> {activePlan.daily_kcal} kcal
                  </div>
                ) : (
                  <div style={{ textAlign:'center',padding:24 }}>
                    <p style={{ color:'var(--text-muted)',marginBottom:12 }}>Aktif diyet planı yok</p>
                    <button className="btn btn-primary">+ Yeni Plan Oluştur</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Öğün Günlüğü ────────────────────────────────────────────── */}
          {activeTab==='logs' && (
            <div className="card">
              <div className="card-header"><h3>📸 Tüm Öğün Günlüğü</h3></div>
              <div className="card-body no-padding">
                {logsLoading && <div style={{ padding:24,textAlign:'center',color:'var(--text-muted)' }}>⏳ Yükleniyor...</div>}
                {mealLogs.map(log => (
                  <div key={log.id} className="meal-timeline-item">
                    <span className="meal-type-icon">{mealEmojis[log.meal_type]||'🍽️'}</span>
                    <div className="meal-photo">📷</div>
                    <div className="meal-info">
                      <div className="meal-label">{mealLabels[log.meal_type]||log.meal_type} — {log.note||'Açıklama yok'}</div>
                      <div className="meal-time-detail">{new Date(log.logged_at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm">💬 Yorum</button>
                  </div>
                ))}
                {!logsLoading && mealLogs.length===0 && (
                  <div style={{ padding:24,textAlign:'center',color:'var(--text-muted)' }}>Öğün kaydı yok</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Danışan yoksa */}
      {!selectedClient && clientList.length===0 && (
        <div className="client-detail-panel" style={{ display:'flex',alignItems:'center',justifyContent:'center' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:48,marginBottom:16 }}>👥</div>
            <h3>Henüz danışan yok</h3>
            <p style={{ color:'var(--text-muted)',marginBottom:16 }}>İlk danışanınızı ekleyerek başlayın</p>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Yeni Danışan Ekle</button>
          </div>
        </div>
      )}
    </div>
  );
}
