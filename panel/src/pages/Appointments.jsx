import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/useAuth';
import { supabase, isDemoMode } from '../lib/supabase';

const TIME_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'];
const STATUS_MAP = { pending:'⏳ Bekliyor', confirmed:'✅ Onaylı', cancelled:'❌ İptal', done:'✔️ Tamamlandı' };
const STATUS_FLOW = { pending:'confirmed', confirmed:'done', done:'done', cancelled:'cancelled' };

const DEMO = [
  { id:'1', client:'Fatma Kaya', initials:'FK', date:'2026-05-12', time:'09:00', type:'in_person', status:'confirmed', risk:12 },
  { id:'2', client:'Ali Mert', initials:'AM', date:'2026-05-12', time:'10:30', type:'online', status:'pending', risk:82 },
  { id:'3', client:'Zeynep Arslan', initials:'ZA', date:'2026-05-13', time:'14:00', type:'in_person', status:'confirmed', risk:22 },
  { id:'4', client:'Burak Tekin', initials:'BT', date:'2026-05-14', time:'09:00', type:'online', status:'pending', risk:55 },
];

export default function Appointments() {
  const { activeDietitianId, isDemoMode: authDemo } = useAuth();
  const isDemo = isDemoMode || authDemo || !activeDietitianId;

  const [appointments, setAppointments] = useState(isDemo ? DEMO : []);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState(null);

  // Create form
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ client_id:'', date: today, time:'09:00', type:'in_person', duration:30, notes:'' });

  function showMsg(msg, type='success') { setToast({msg,type}); setTimeout(()=>setToast(null),3000); }

  // ── Fetch ──
  useEffect(() => {
    if (isDemo) return;
    fetchAppointments();
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDietitianId]);

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('id, users(name)').eq('dietitian_id', activeDietitianId);
    if (data) setClients(data.map(c => ({ id: c.id, name: c.users?.name || 'İsimsiz' })));
  }

  async function fetchAppointments() {
    setLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('*, clients(id, users(name))')
      .eq('dietitian_id', activeDietitianId)
      .order('scheduled_at', { ascending: true });

    if (error) { console.warn('Appt fetch:', error.message); setLoading(false); return; }
    if (data) {
      setAppointments(data.map(a => {
        const dt = new Date(a.scheduled_at);
        const name = a.clients?.users?.name || 'İsimsiz';
        const localDate = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
        const localTime = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
        return {
          id: a.id, client_id: a.client_id, client: name,
          initials: name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2),
          date: localDate,
          time: localTime,
          type: a.type, status: a.status, risk: 0, notes: a.notes, duration: a.duration_min,
        };
      }));
    }
    setLoading(false);
  }

  // ── Add ──
  async function handleAdd() {
    if (!form.client_id) { showMsg('Danışan seçin!','error'); return; }
    const tzOffset = new Date().getTimezoneOffset();
    const tzSign = tzOffset > 0 ? '-' : '+';
    const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
    const tzMins = String(Math.abs(tzOffset) % 60).padStart(2, '0');
    const scheduledAt = `${form.date}T${form.time}:00${tzSign}${tzHours}:${tzMins}`;

    if (isDemo) {
      const cl = [{id:'d1',name:'Demo'}, ...clients].find(c=>c.id===form.client_id);
      const a = { id: 'd'+Date.now(), client: cl?.name||'?', client_id: form.client_id,
        initials: (cl?.name||'XX').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2),
        date: form.date, time: form.time, type: form.type, status:'pending', risk:0 };
      setAppointments(prev => [...prev, a]); setShowAdd(false); showMsg('✅ Randevu eklendi!'); return;
    }

    try {
      const { error } = await supabase.rpc('add_appointment', {
        p_client_id: form.client_id, p_dietitian_id: activeDietitianId,
        p_scheduled_at: scheduledAt, p_duration_min: parseInt(form.duration),
        p_type: form.type, p_notes: form.notes || null,
      });
      if (error) throw error;
      showMsg('✅ Randevu eklendi!');
      setShowAdd(false);
      fetchAppointments();
    } catch(e) { showMsg('Hata: '+e.message, 'error'); }
  }

  // ── Status toggle ──
  async function toggleStatus(appt, newStatus) {
    if (isDemo) {
      setAppointments(prev => prev.map(a => a.id===appt.id ? {...a, status: newStatus} : a));
      showMsg(STATUS_MAP[newStatus]); return;
    }
    try {
      const { error } = await supabase.rpc('update_appointment_status', { p_appt_id: appt.id, p_status: newStatus });
      if (error) throw error;
      setAppointments(prev => prev.map(a => a.id===appt.id ? {...a, status: newStatus} : a));
      showMsg(STATUS_MAP[newStatus]);
    } catch(e) { showMsg('Hata: '+e.message, 'error'); }
  }

  // ── Delete ──
  async function handleDelete(appt) {
    if (!confirm('Bu randevuyu silmek istediğinize emin misiniz?')) return;
    if (isDemo) { setAppointments(prev => prev.filter(a=>a.id!==appt.id)); showMsg('🗑️ Silindi'); return; }
    try {
      const { error } = await supabase.rpc('delete_appointment', { p_appt_id: appt.id });
      if (error) throw error;
      setAppointments(prev => prev.filter(a=>a.id!==appt.id));
      showMsg('🗑️ Silindi');
    } catch(e) { showMsg('Hata: '+e.message, 'error'); }
  }

  // ── Filters ──
  const filtered = useMemo(() => {
    if (filter === 'all') return appointments;
    if (filter === 'risky') return appointments.filter(a => a.risk > 50);
    return appointments.filter(a => a.status === filter);
  }, [appointments, filter]);

  const stats = useMemo(() => ({
    total: appointments.length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    pending: appointments.filter(a => a.status === 'pending').length,
    risky: appointments.filter(a => a.risk > 50).length,
  }), [appointments]);

  // ── Calendar helpers ──
  const calendarWeekStart = useMemo(() => {
    const d = new Date(); const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return d;
  }, []);

  const calendarDays = useMemo(() => {
    return Array.from({length:5}, (_,i) => {
      const d = new Date(calendarWeekStart);
      d.setDate(d.getDate() + i);
      return { label: d.toLocaleDateString('tr-TR',{weekday:'short',day:'numeric',month:'short'}), dateStr: d.toISOString().split('T')[0] };
    });
  }, [calendarWeekStart]);

  const getRiskBadge = (score) => {
    if (score <= 30) return { cls:'low', emoji:'🟢' };
    if (score <= 60) return { cls:'medium', emoji:'🟡' };
    return { cls:'high', emoji:'🔴' };
  };

  const inputStyle = { background:'none', border:'none', color:'var(--text)', fontSize:14, width:'100%', outline:'none' };

  if (loading) return <div className="animate-in" style={{textAlign:'center',padding:60}}><div style={{fontSize:32}}>⏳</div><p style={{color:'var(--text-muted)'}}>Randevular yükleniyor...</p></div>;

  return (
    <div className="animate-in">
      {/* Toast */}
      {toast && <div style={{position:'fixed',bottom:24,right:24,zIndex:2000,background:toast.type==='error'?'var(--danger)':'var(--success)',
        color:'white',padding:'12px 20px',borderRadius:'var(--radius-md)',boxShadow:'0 8px 24px rgba(0,0,0,0.3)',fontSize:14,fontWeight:600,animation:'fadeIn .2s ease'}}>{toast.msg}</div>}

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:520}}>
            <div className="modal-header"><h3>📅 Yeni Randevu</h3><button className="modal-close" onClick={()=>setShowAdd(false)}>✕</button></div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--space-md)'}}>
                <div className="login-field" style={{gridColumn:'1/-1'}}><label>Danışan</label>
                  <div className="login-input-wrapper"><span>👤</span>
                    <select value={form.client_id} onChange={e=>setForm(f=>({...f,client_id:e.target.value}))} style={inputStyle}>
                      <option value="">Danışan seçin...</option>
                      {(isDemo ? [{id:'d1',name:'Demo Danışan'}] : clients).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select></div></div>
                <div className="login-field"><label>Tarih</label>
                  <div className="login-input-wrapper"><span>📆</span>
                    <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={inputStyle}/></div></div>
                <div className="login-field"><label>Saat</label>
                  <div className="login-input-wrapper"><span>🕐</span>
                    <select value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} style={inputStyle}>
                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select></div></div>
                <div className="login-field"><label>Tür</label>
                  <div className="login-input-wrapper"><span>📍</span>
                    <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={inputStyle}>
                      <option value="in_person">🏥 Yüz yüze</option>
                      <option value="online">💻 Online</option>
                    </select></div></div>
                <div className="login-field"><label>Süre (dk)</label>
                  <div className="login-input-wrapper"><span>⏱️</span>
                    <input type="number" value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} style={inputStyle}/></div></div>
                <div className="login-field" style={{gridColumn:'1/-1'}}><label>Notlar</label>
                  <div className="login-input-wrapper"><span>📝</span>
                    <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="İsteğe bağlı..." style={inputStyle}/></div></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setShowAdd(false)}>İptal</button>
              <button className="btn btn-primary" onClick={handleAdd}>✅ Randevu Oluştur</button>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card primary"><div className="stat-icon">📅</div><div className="stat-value">{stats.total}</div><div className="stat-label">Toplam</div></div>
        <div className="stat-card info"><div className="stat-icon">✅</div><div className="stat-value">{stats.confirmed}</div><div className="stat-label">Onaylanan</div></div>
        <div className="stat-card warning"><div className="stat-icon">⏳</div><div className="stat-value">{stats.pending}</div><div className="stat-label">Bekleyen</div></div>
        <div className="stat-card danger"><div className="stat-icon">⚠️</div><div className="stat-value">{stats.risky}</div><div className="stat-label">Riskli</div></div>
      </div>

      {/* Filter & View Toggle */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div className="tabs">
          {[{key:'all',label:'Tümü'},{key:'confirmed',label:'✅ Onaylı'},{key:'pending',label:'⏳ Bekleyen'},{key:'risky',label:'⚠️ Riskli'}].map(f =>
            <button key={f.key} className={`tab ${filter===f.key?'active':''}`} onClick={()=>setFilter(f.key)}>{f.label}</button>
          )}
        </div>
        <div className="tabs">
          <button className={`tab ${view==='list'?'active':''}`} onClick={()=>setView('list')}>📋 Liste</button>
          <button className={`tab ${view==='calendar'?'active':''}`} onClick={()=>setView('calendar')}>📅 Takvim</button>
        </div>
      </div>

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="card">
          <div className="card-header">
            <h3>📋 Randevu Listesi</h3>
            <button className="btn btn-primary btn-sm" onClick={()=>{setShowAdd(true);setForm({client_id:'',date:today,time:'09:00',type:'in_person',duration:30,notes:''});}}>+ Yeni Randevu</button>
          </div>
          <div className="card-body no-padding">
            {filtered.length === 0 ? (
              <div style={{textAlign:'center',padding:40}}><div style={{fontSize:40,marginBottom:8}}>📅</div><p style={{color:'var(--text-muted)'}}>Randevu bulunamadı</p></div>
            ) : (
              <table className="risk-table">
                <thead><tr><th>Danışan</th><th>Tarih</th><th>Saat</th><th>Tür</th><th>Durum</th><th>No-Show Risk</th><th>Aksiyon</th></tr></thead>
                <tbody>
                  {filtered.map(appt => {
                    const rb = getRiskBadge(appt.risk);
                    return (
                      <tr key={appt.id}>
                        <td><div style={{display:'flex',alignItems:'center',gap:8}}><div className="appt-avatar" style={{width:30,height:30,fontSize:11}}>{appt.initials}</div><strong>{appt.client}</strong></div></td>
                        <td>{new Date(appt.date).toLocaleDateString('tr-TR',{weekday:'short',day:'numeric',month:'short'})}</td>
                        <td><span style={{color:'var(--primary)',fontWeight:600}}>{appt.time}</span></td>
                        <td>{appt.type==='in_person'?'🏥 Yüz yüze':'💻 Online'}</td>
                        <td>
                          <button className={`appt-status ${appt.status}`} style={{cursor:'pointer',border:'none'}}
                            onClick={()=>toggleStatus(appt, STATUS_FLOW[appt.status])}>
                            {STATUS_MAP[appt.status]}
                          </button>
                        </td>
                        <td><span className={`risk-badge ${rb.cls}`}>{rb.emoji} %{appt.risk}</span></td>
                        <td>
                          <div style={{display:'flex',gap:4}}>
                            {appt.status==='pending' && <button className="btn btn-ghost btn-sm" title="Onayla" onClick={()=>toggleStatus(appt,'confirmed')}>✅</button>}
                            {appt.status!=='cancelled' && <button className="btn btn-ghost btn-sm" title="İptal" onClick={()=>toggleStatus(appt,'cancelled')}>❌</button>}
                            <button className="btn btn-ghost btn-sm" title="Sil" style={{color:'var(--danger)'}} onClick={()=>handleDelete(appt)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === 'calendar' && (
        <div className="card">
          <div className="card-header">
            <h3>📅 Haftalık Takvim</h3>
            <button className="btn btn-primary btn-sm" onClick={()=>{setShowAdd(true);setForm({client_id:'',date:today,time:'09:00',type:'in_person',duration:30,notes:''});}}>+ Yeni Randevu</button>
          </div>
          <div className="card-body no-padding">
            <div style={{display:'grid',gridTemplateColumns:'60px repeat(5,1fr)',borderBottom:'1px solid var(--border)'}}>
              <div style={{padding:'8px 12px',fontSize:11,color:'var(--text-muted)',borderRight:'1px solid var(--border)'}}></div>
              {calendarDays.map(d => (
                <div key={d.dateStr} style={{padding:'8px 12px',fontSize:12,fontWeight:600,textAlign:'center',borderRight:'1px solid var(--border)',color:'var(--text-secondary)'}}>{d.label}</div>
              ))}
            </div>
            {TIME_SLOTS.map(slot => (
              <div key={slot} style={{display:'grid',gridTemplateColumns:'60px repeat(5,1fr)',borderBottom:'1px solid var(--border)'}}>
                <div style={{padding:'6px 8px',fontSize:11,color:'var(--text-muted)',borderRight:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center'}}>{slot}</div>
                {calendarDays.map(day => {
                  const appt = appointments.find(a => a.date === day.dateStr && a.time === slot);
                  return (
                    <div key={day.dateStr} style={{padding:4,borderRight:'1px solid var(--border)',minHeight:36}}>
                      {appt && (
                        <div style={{background:appt.status==='cancelled'?'rgba(239,68,68,0.15)':appt.status==='confirmed'?'var(--primary-glow)':'rgba(245,158,11,0.15)',
                          borderRadius:6,padding:'4px 8px',fontSize:11,fontWeight:600,
                          color:appt.status==='cancelled'?'var(--danger)':appt.status==='confirmed'?'var(--primary)':'var(--warning)',cursor:'pointer'}}
                          onClick={()=>{setFilter('all');setView('list');}}>
                          {appt.initials} · {appt.client.split(' ')[0]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
