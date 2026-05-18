import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { supabase, isDemoMode } from '../lib/supabase';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const MEAL_TYPES = [
  { key: 'breakfast', label: 'Kahvaltı', emoji: '🍳', time: '07:30 - 09:00' },
  { key: 'snack',     label: 'Ara Öğün', emoji: '🍎', time: '10:30 - 11:00' },
  { key: 'lunch',     label: 'Öğle',     emoji: '🥗', time: '12:30 - 13:30' },
  { key: 'dinner',    label: 'Akşam',    emoji: '🍗', time: '19:00 - 20:00' },
];
const STATUS_MAP = { active: '✅ Aktif', draft: '📝 Taslak', completed: '🔚 Bitti' };
const GOAL_LABELS = { weight_loss: 'Kilo Verme', muscle_gain: 'Kas Kazanımı', maintenance: 'Koruma' };

const DEMO_PLANS = [
  { id:'p1', client_name:'Fatma Kaya', client_id:'c1', client_initials:'FK', daily_kcal:1650,
    status:'active', goal:'Kilo Verme', created_at:'2026-04-15', protein_pct:30, carb_pct:45, fat_pct:25,
    days:{ 0:[{type:'breakfast',items:'Yulaf ezmesi, muz, ceviz'},{type:'lunch',items:'Tavuk salata'},{type:'dinner',items:'Izgara somon, brokoli'}] } },
  { id:'p2', client_name:'Ali Mert', client_id:'c2', client_initials:'AM', daily_kcal:2400,
    status:'draft', goal:'Kas Kazanımı', created_at:'2026-05-01', protein_pct:35, carb_pct:40, fat_pct:25, days:{} },
];

export default function DietPlans() {
  const { activeDietitianId, isDemoMode: authDemo } = useAuth();
  const isDemo = isDemoMode || authDemo || !activeDietitianId;

  const [plans, setPlans] = useState(isDemo ? DEMO_PLANS : []);
  const [clients, setClients] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [toast, setToast] = useState(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    client_id:'', title:'', daily_kcal:1800, protein_pct:30, carb_pct:45, fat_pct:25
  });

  // Edit meal
  const [editingMeal, setEditingMeal] = useState(null);
  const [mealText, setMealText] = useState('');

  function showMsg(msg, type='success') {
    setToast({msg,type}); setTimeout(()=>setToast(null), 3000);
  }

  // ── Fetch Plans ──
  useEffect(() => {
    if (isDemo) { setSelectedPlan(DEMO_PLANS[0]); return; }
    fetchPlans();
    fetchClients();
  }, [activeDietitianId]);

  async function fetchClients() {
    if (!activeDietitianId) return;
    const { data } = await supabase
      .from('clients')
      .select('id, users(name)')
      .eq('dietitian_id', activeDietitianId);
    if (data) setClients(data.map(c => ({ id: c.id, name: c.users?.name || 'İsimsiz' })));
  }

  async function fetchPlans() {
    if (!activeDietitianId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('diet_plans')
      .select(`*, clients(id, users(name)), meals(id, day_of_week, meal_type, meal_foods(amount_g, foods(name, kcal_per_100g)))`)
      .eq('dietitian_id', activeDietitianId)
      .order('created_at', { ascending: false });

    if (error) { console.warn('Plan fetch error:', error.message); setLoading(false); return; }
    if (data) {
      const mapped = data.map(p => ({
        id: p.id, client_id: p.client_id,
        client_name: p.clients?.users?.name || 'Bilinmiyor',
        client_initials: (p.clients?.users?.name || 'XX').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2),
        daily_kcal: p.daily_kcal, status: p.status, goal: p.title || '',
        created_at: p.created_at, protein_pct: 30, carb_pct: 45, fat_pct: 25,
        days: groupMeals(p.meals || []),
      }));
      setPlans(mapped);
      if (mapped.length > 0 && !selectedPlan) setSelectedPlan(mapped[0]);
    }
    setLoading(false);
  }

  function groupMeals(meals) {
    const g = {};
    meals.forEach(m => {
      const d = (m.day_of_week || 1) - 1;
      if (!g[d]) g[d] = [];
      const foods = (m.meal_foods || []).map(f => `${f.foods?.name||'?'} (${f.amount_g}g)`).join(', ');
      g[d].push({ type: m.meal_type, items: foods || 'Boş', kcal: (m.meal_foods||[]).reduce((s,f)=> s+(f.foods?.kcal_per_100g||0)*(f.amount_g||0)/100, 0) });
    });
    return g;
  }

  // ── Create Plan ──
  async function handleCreate(status) {
    if (!createForm.client_id) { showMsg('Danışan seçin!', 'error'); return; }
    if (isDemo) {
      const newP = { id: 'p'+Date.now(), client_id: createForm.client_id, client_name: clients.find(c=>c.id===createForm.client_id)?.name||'?',
        client_initials: 'XX', daily_kcal: createForm.daily_kcal, status, goal: createForm.title||'Plan',
        created_at: new Date().toISOString(), protein_pct: createForm.protein_pct, carb_pct: createForm.carb_pct, fat_pct: createForm.fat_pct, days:{} };
      setPlans(prev => [newP, ...prev]); setSelectedPlan(newP); setViewMode('detail');
      showMsg('✅ Plan oluşturuldu!'); return;
    }
    try {
      const { data: planId, error } = await supabase.rpc('create_diet_plan', {
        p_client_id: createForm.client_id,
        p_dietitian_id: activeDietitianId,
        p_title: createForm.title || `${createForm.daily_kcal} kcal Plan`,
        p_daily_kcal: parseInt(createForm.daily_kcal),
        p_status: status,
      });
      if (error) throw error;
      showMsg('✅ Plan oluşturuldu!');
      await fetchPlans();
      setViewMode('list');
    } catch(e) { showMsg('Hata: '+e.message, 'error'); }
  }

  // ── Delete Plan ──
  async function handleDelete(planId) {
    if (!confirm('Bu planı silmek istediğinize emin misiniz?')) return;
    if (isDemo) {
      setPlans(prev => prev.filter(p => p.id !== planId));
      if (selectedPlan?.id === planId) setSelectedPlan(null);
      showMsg('🗑️ Plan silindi.'); return;
    }
    try {
      const { error } = await supabase.rpc('delete_diet_plan', { p_plan_id: planId });
      if (error) throw error;
      setPlans(prev => prev.filter(p => p.id !== planId));
      if (selectedPlan?.id === planId) setSelectedPlan(null);
      showMsg('🗑️ Plan silindi.');
    } catch(e) { showMsg('Silinemedi: '+e.message, 'error'); }
  }

  // ── Toggle Status ──
  async function toggleStatus(plan) {
    const next = plan.status === 'active' ? 'draft' : 'active';
    if (isDemo) {
      setPlans(prev => prev.map(p => p.id===plan.id ? {...p, status:next} : p));
      if (selectedPlan?.id===plan.id) setSelectedPlan({...plan, status:next});
      showMsg(next==='active' ? '✅ Aktif edildi' : '📝 Taslağa çevrildi'); return;
    }
    try {
      const { error } = await supabase.rpc('update_plan_status', { p_plan_id: plan.id, p_status: next });
      if (error) throw error;
      setPlans(prev => prev.map(p => p.id===plan.id ? {...p, status:next} : p));
      if (selectedPlan?.id===plan.id) setSelectedPlan({...plan, status:next});
      showMsg(next==='active' ? '✅ Aktif edildi' : '📝 Taslağa çevrildi');
    } catch(e) { showMsg('Hata: '+e.message, 'error'); }
  }

  // ── Save Meal Text (local for now — meals tablosuna yazılır) ──
  function saveMealLocal() {
    if (!editingMeal) return;
    const { planId, dayIdx, mealKey } = editingMeal;
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const days = { ...p.days };
      if (!days[dayIdx]) days[dayIdx] = [];
      const existing = days[dayIdx].findIndex(m => m.type === mealKey);
      if (existing >= 0) days[dayIdx][existing] = { ...days[dayIdx][existing], items: mealText };
      else days[dayIdx] = [...days[dayIdx], { type: mealKey, items: mealText, kcal: 0 }];
      return { ...p, days };
    }));
    if (selectedPlan?.id === editingMeal.planId) {
      setSelectedPlan(prev => {
        const days = { ...prev.days };
        if (!days[editingMeal.dayIdx]) days[editingMeal.dayIdx] = [];
        const ex = days[editingMeal.dayIdx].findIndex(m => m.type === editingMeal.mealKey);
        if (ex >= 0) days[editingMeal.dayIdx][ex] = { ...days[editingMeal.dayIdx][ex], items: mealText };
        else days[editingMeal.dayIdx] = [...days[editingMeal.dayIdx], { type: editingMeal.mealKey, items: mealText, kcal: 0 }];
        return { ...prev, days };
      });
    }
    setEditingMeal(null);
    showMsg('💾 Öğün kaydedildi!');
  }

  if (loading) return <div className="animate-in" style={{textAlign:'center',padding:60}}><div style={{fontSize:32}}>⏳</div><p style={{color:'var(--text-muted)'}}>Planlar yükleniyor...</p></div>;

  const inputStyle = { background:'none', border:'none', color:'var(--text)', fontSize:14, width:'100%', outline:'none' };

  return (
    <div className="animate-in">
      {/* Toast */}
      {toast && <div style={{ position:'fixed',bottom:24,right:24,zIndex:2000, background:toast.type==='error'?'var(--danger)':'var(--success)',
        color:'white',padding:'12px 20px',borderRadius:'var(--radius-md)',boxShadow:'0 8px 24px rgba(0,0,0,0.3)',fontSize:14,fontWeight:600,animation:'fadeIn .2s ease' }}>{toast.msg}</div>}

      {/* Meal Edit Modal */}
      {editingMeal && (
        <div className="modal-overlay" onClick={()=>setEditingMeal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500}}>
            <div className="modal-header"><h3>✏️ Öğün Düzenle — {MEAL_TYPES.find(m=>m.key===editingMeal.mealKey)?.label} ({DAYS[editingMeal.dayIdx]})</h3>
              <button className="modal-close" onClick={()=>setEditingMeal(null)}>✕</button></div>
            <div className="modal-body">
              <div className="login-field"><label>Besinler</label>
                <textarea value={mealText} onChange={e=>setMealText(e.target.value)}
                  placeholder="Örn: 2 yumurta, tam buğday ekmek, domates, peynir..."
                  style={{...inputStyle, background:'var(--bg-tertiary)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:12, minHeight:100, resize:'vertical'}} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setEditingMeal(null)}>İptal</button>
              <button className="btn btn-primary" onClick={saveMealLocal}>💾 Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'var(--space-xl)'}}>
        <div style={{display:'flex',gap:8}}>
          <button className={`btn ${viewMode==='list'?'btn-primary':'btn-ghost'}`} onClick={()=>setViewMode('list')}>📋 Plan Listesi</button>
          <button className={`btn ${viewMode==='detail'?'btn-primary':'btn-ghost'}`} onClick={()=>setViewMode('detail')} disabled={!selectedPlan}>📅 Haftalık Görünüm</button>
        </div>
        <button className="btn btn-primary" onClick={()=>{setViewMode('create'); setCreateForm({client_id:'',title:'',daily_kcal:1800,protein_pct:30,carb_pct:45,fat_pct:25});}}>+ Yeni Plan Oluştur</button>
      </div>

      {/* ── LIST VIEW ── */}
      {viewMode==='list' && (
        <div style={{display:'grid',gap:'var(--space-lg)'}}>
          {plans.map(plan => (
            <div key={plan.id} className="card" style={{cursor:'pointer',transition:'var(--transition)'}}>
              <div className="card-body" style={{display:'flex',alignItems:'center',gap:'var(--space-xl)'}}>
                <div className="client-avatar" style={{width:48,height:48,fontSize:18}} onClick={()=>{setSelectedPlan(plan);setViewMode('detail');}}>{plan.client_initials}</div>
                <div style={{flex:1,cursor:'pointer'}} onClick={()=>{setSelectedPlan(plan);setViewMode('detail');}}>
                  <div style={{fontWeight:700,fontSize:16}}>{plan.client_name}</div>
                  <div style={{fontSize:13,color:'var(--text-secondary)',marginTop:2}}>{plan.goal} · {plan.daily_kcal} kcal/gün</div>
                </div>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <div style={{textAlign:'center'}}><div style={{fontSize:11,color:'var(--text-muted)'}}>Protein</div><div style={{fontWeight:700,color:'#22C55E'}}>{plan.protein_pct}%</div></div>
                  <div style={{textAlign:'center'}}><div style={{fontSize:11,color:'var(--text-muted)'}}>Karb</div><div style={{fontWeight:700,color:'#3B82F6'}}>{plan.carb_pct}%</div></div>
                  <div style={{textAlign:'center'}}><div style={{fontSize:11,color:'var(--text-muted)'}}>Yağ</div><div style={{fontWeight:700,color:'#F59E0B'}}>{plan.fat_pct}%</div></div>
                </div>
                <button className={`appt-status ${plan.status==='active'?'confirmed':'pending'}`} onClick={e=>{e.stopPropagation();toggleStatus(plan);}} style={{cursor:'pointer',border:'none'}}>
                  {STATUS_MAP[plan.status]||plan.status}
                </button>
                <button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={e=>{e.stopPropagation();handleDelete(plan.id);}}>🗑️</button>
              </div>
            </div>
          ))}
          {plans.length===0 && <div style={{textAlign:'center',padding:60}}><div style={{fontSize:48,marginBottom:16}}>🍽️</div><h3>Henüz diyet planı yok</h3><p style={{color:'var(--text-muted)'}}>İlk planınızı oluşturun</p></div>}
        </div>
      )}

      {/* ── DETAIL VIEW ── */}
      {viewMode==='detail' && selectedPlan && (
        <>
          <div className="card" style={{marginBottom:'var(--space-lg)'}}>
            <div className="card-body" style={{display:'flex',alignItems:'center',gap:'var(--space-xl)'}}>
              <div className="client-detail-avatar">{selectedPlan.client_initials}</div>
              <div style={{flex:1}}><h3 style={{margin:0}}>{selectedPlan.client_name}</h3><div style={{color:'var(--text-secondary)',fontSize:13}}>{selectedPlan.goal}</div></div>
              <div style={{display:'flex',gap:16}}>
                <div style={{textAlign:'center',padding:'8px 16px',background:'var(--primary-glow)',borderRadius:'var(--radius-md)'}}>
                  <div style={{fontSize:20,fontWeight:800,color:'var(--primary)'}}>{selectedPlan.daily_kcal}</div><div style={{fontSize:11,color:'var(--text-muted)'}}>kcal/gün</div></div>
                <div style={{textAlign:'center',padding:'8px 16px',background:'rgba(34,197,94,0.1)',borderRadius:'var(--radius-md)'}}>
                  <div style={{fontSize:20,fontWeight:800,color:'#22C55E'}}>{selectedPlan.protein_pct}%</div><div style={{fontSize:11,color:'var(--text-muted)'}}>Protein</div></div>
                <div style={{textAlign:'center',padding:'8px 16px',background:'rgba(59,130,246,0.1)',borderRadius:'var(--radius-md)'}}>
                  <div style={{fontSize:20,fontWeight:800,color:'#3B82F6'}}>{selectedPlan.carb_pct}%</div><div style={{fontSize:11,color:'var(--text-muted)'}}>Karb</div></div>
                <div style={{textAlign:'center',padding:'8px 16px',background:'rgba(245,158,11,0.1)',borderRadius:'var(--radius-md)'}}>
                  <div style={{fontSize:20,fontWeight:800,color:'#F59E0B'}}>{selectedPlan.fat_pct}%</div><div style={{fontSize:11,color:'var(--text-muted)'}}>Yağ</div></div>
              </div>
              <button className={`btn ${selectedPlan.status==='active'?'btn-ghost':'btn-primary'}`} onClick={()=>toggleStatus(selectedPlan)}>
                {selectedPlan.status==='active' ? '📝 Taslağa Çevir' : '✅ Aktif Yap'}
              </button>
            </div>
          </div>

          <div className="tabs" style={{marginBottom:'var(--space-lg)'}}>
            {DAYS.map((day,i) => <button key={i} className={`tab ${selectedDay===i?'active':''}`} onClick={()=>setSelectedDay(i)}>{day}</button>)}
          </div>

          <div style={{display:'grid',gap:'var(--space-md)'}}>
            {MEAL_TYPES.map(mt => {
              const dayMeals = selectedPlan.days?.[selectedDay] || [];
              const meal = dayMeals.find(m => m.type === mt.key);
              return (
                <div key={mt.key} className="card">
                  <div className="card-body" style={{display:'flex',alignItems:'center',gap:'var(--space-lg)'}}>
                    <div style={{fontSize:28,width:44,textAlign:'center'}}>{mt.emoji}</div>
                    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:15}}>{mt.label}</div><div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{mt.time}</div></div>
                    <div style={{flex:2,fontSize:14,color:meal?'var(--text)':'var(--text-muted)',fontStyle:meal?'normal':'italic'}}>
                      {meal ? meal.items : 'Henüz planlanmadı'}
                    </div>
                    {meal?.kcal > 0 && <div style={{fontWeight:700,fontSize:14,color:'var(--primary)'}}>{Math.round(meal.kcal)} kcal</div>}
                    <button className="btn btn-ghost btn-sm" onClick={()=>{
                      setEditingMeal({ planId:selectedPlan.id, dayIdx:selectedDay, mealKey:mt.key });
                      setMealText(meal?.items || '');
                    }}>✏️</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── CREATE VIEW ── */}
      {viewMode==='create' && (
        <div className="card">
          <div className="card-header"><h3>🆕 Yeni Diyet Planı</h3></div>
          <div className="card-body">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'var(--space-lg)'}}>
              <div className="login-field"><label>Danışan</label>
                <div className="login-input-wrapper"><span>👤</span>
                  <select value={createForm.client_id} onChange={e=>setCreateForm(f=>({...f,client_id:e.target.value}))} style={inputStyle}>
                    <option value="">Danışan seçin...</option>
                    {(isDemo ? [{id:'c1',name:'Fatma Kaya'},{id:'c2',name:'Ali Mert'}] : clients).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div></div>
              <div className="login-field"><label>Plan Adı</label>
                <div className="login-input-wrapper"><span>📋</span>
                  <input value={createForm.title} onChange={e=>setCreateForm(f=>({...f,title:e.target.value}))} placeholder="Örn: Kilo Verme Programı" style={inputStyle}/></div></div>
              <div className="login-field"><label>Günlük Kalori (kcal)</label>
                <div className="login-input-wrapper"><span>🔥</span>
                  <input type="number" value={createForm.daily_kcal} onChange={e=>setCreateForm(f=>({...f,daily_kcal:e.target.value}))} style={inputStyle}/></div></div>
              <div className="login-field"><label>Protein %</label>
                <div className="login-input-wrapper"><span>🥩</span>
                  <input type="number" value={createForm.protein_pct} onChange={e=>setCreateForm(f=>({...f,protein_pct:e.target.value}))} style={inputStyle}/></div></div>
              <div className="login-field"><label>Karbonhidrat %</label>
                <div className="login-input-wrapper"><span>🍚</span>
                  <input type="number" value={createForm.carb_pct} onChange={e=>setCreateForm(f=>({...f,carb_pct:e.target.value}))} style={inputStyle}/></div></div>
              <div className="login-field"><label>Yağ %</label>
                <div className="login-input-wrapper"><span>🥑</span>
                  <input type="number" value={createForm.fat_pct} onChange={e=>setCreateForm(f=>({...f,fat_pct:e.target.value}))} style={inputStyle}/></div></div>
            </div>
            <div style={{display:'flex',gap:12,justifyContent:'flex-end',marginTop:'var(--space-xl)'}}>
              <button className="btn btn-ghost" onClick={()=>setViewMode('list')}>İptal</button>
              <button className="btn btn-primary" onClick={()=>handleCreate('draft')}>📝 Taslak Kaydet</button>
              <button className="btn btn-primary" style={{background:'var(--success)'}} onClick={()=>handleCreate('active')}>✅ Aktif Olarak Başlat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
