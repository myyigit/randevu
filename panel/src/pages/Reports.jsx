import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useAuth } from '../contexts/useAuth';
import { supabase, isDemoMode } from '../lib/supabase';

const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function Reports() {
  const { activeDietitianId, isDemoMode: authDemo } = useAuth();
  const isDemo = isDemoMode || authDemo || !activeDietitianId;

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month'); // week | month | year
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [mealLogs, setMealLogs] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  // ── Veri Çekme ──
  useEffect(() => {
    function getDateRange() {
      const now = new Date();
      const to = now.toISOString();
      let from;
      if (period === 'week') {
        from = new Date(now.getTime() - 7 * 86400000).toISOString();
      } else if (period === 'month') {
        from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
      } else {
        from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString();
      }
      return { from, to };
    }

    function loadDemoData() {
      setClients([
        { id: '1', name: 'Fatma Kaya', goal: 'weight_loss', weight: 72 },
        { id: '2', name: 'Ali Mert', goal: 'muscle_gain', weight: 85 },
        { id: '3', name: 'Zeynep Arslan', goal: 'weight_loss', weight: 61 },
        { id: '4', name: 'Burak Tekin', goal: 'weight_loss', weight: 94 },
      ]);
      setAppointments([
        { status: 'confirmed', type: 'in_person', scheduled_at: '2026-05-10T09:00' },
        { status: 'confirmed', type: 'online', scheduled_at: '2026-05-11T10:00' },
        { status: 'done', type: 'in_person', scheduled_at: '2026-05-12T14:00' },
        { status: 'cancelled', type: 'online', scheduled_at: '2026-05-13T09:00' },
        { status: 'done', type: 'in_person', scheduled_at: '2026-05-14T11:00' },
        { status: 'pending', type: 'online', scheduled_at: '2026-05-15T09:30' },
        { status: 'confirmed', type: 'in_person', scheduled_at: '2026-05-16T14:00' },
      ]);
      setMealLogs([
        { meal_type: 'breakfast', logged_at: '2026-05-10T08:00', dietitian_feedback: 'İyi' },
        { meal_type: 'lunch', logged_at: '2026-05-10T12:00', dietitian_feedback: null },
        { meal_type: 'dinner', logged_at: '2026-05-10T19:00', dietitian_feedback: null },
        { meal_type: 'snack', logged_at: '2026-05-11T16:00', dietitian_feedback: 'Harika' },
        { meal_type: 'breakfast', logged_at: '2026-05-12T08:30', dietitian_feedback: null },
        { meal_type: 'lunch', logged_at: '2026-05-12T13:00', dietitian_feedback: null },
      ]);
      setMeasurements([
        { weight_kg: 72, body_fat_pct: 28, measured_at: '2026-05-01' },
        { weight_kg: 71.5, body_fat_pct: 27.5, measured_at: '2026-05-08' },
        { weight_kg: 71, body_fat_pct: 27, measured_at: '2026-05-15' },
      ]);
      setLoading(false);
    }

    async function fetchClients() {
      const { data } = await supabase
        .from('clients')
        .select('id, goal, users(name), measurements(weight_kg)')
        .eq('dietitian_id', activeDietitianId);
      if (data) setClients(data.map(c => ({
        id: c.id, name: c.users?.name || 'İsimsiz', goal: c.goal,
        weight: c.measurements?.[0]?.weight_kg || 0,
      })));
    }

    async function fetchAppointments() {
      const { from } = getDateRange();
      const { data } = await supabase
        .from('appointments')
        .select('status, type, scheduled_at')
        .eq('dietitian_id', activeDietitianId)
        .gte('scheduled_at', from)
        .order('scheduled_at', { ascending: true });
      if (data) setAppointments(data);
    }

    async function fetchMealLogs() {
      const { from } = getDateRange();
      const { data } = await supabase
        .from('meal_logs')
        .select('meal_type, logged_at, dietitian_feedback, clients!inner(dietitian_id)')
        .eq('clients.dietitian_id', activeDietitianId)
        .gte('logged_at', from);
      if (data) setMealLogs(data);
    }

    async function fetchMeasurements() {
      const { from } = getDateRange();
      const { data } = await supabase
        .from('measurements')
        .select('weight_kg, body_fat_pct, measured_at, clients!inner(dietitian_id)')
        .eq('clients.dietitian_id', activeDietitianId)
        .gte('measured_at', from)
        .order('measured_at', { ascending: true });
      if (data) setMeasurements(data);
    }

    if (isDemo) {
      setTimeout(() => loadDemoData(), 0);
      return;
    }
    
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchClients(), fetchAppointments(), fetchMealLogs(), fetchMeasurements()]);
      setLoading(false);
    };
    
    load();
  }, [activeDietitianId, period, isDemo]);

  // ── Hesaplamalar ──
  const apptStats = useMemo(() => {
    const confirmed = appointments.filter(a => a.status === 'confirmed').length;
    const done = appointments.filter(a => a.status === 'done').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    const pending = appointments.filter(a => a.status === 'pending').length;
    return { total: appointments.length, confirmed, done, cancelled, pending };
  }, [appointments]);

  const apptTypeData = useMemo(() => {
    const inPerson = appointments.filter(a => a.type === 'in_person').length;
    const online = appointments.filter(a => a.type === 'online').length;
    return [
      { name: 'Yüz Yüze', value: inPerson, color: '#6366F1' },
      { name: 'Online', value: online, color: '#22C55E' },
    ].filter(d => d.value > 0);
  }, [appointments]);

  const apptStatusData = useMemo(() => [
    { name: 'Tamamlandı', value: apptStats.done, color: '#22C55E' },
    { name: 'Onaylı', value: apptStats.confirmed, color: '#6366F1' },
    { name: 'Bekleyen', value: apptStats.pending, color: '#F59E0B' },
    { name: 'İptal', value: apptStats.cancelled, color: '#EF4444' },
  ].filter(d => d.value > 0), [apptStats]);

  const mealTypeData = useMemo(() => {
    const counts = {};
    mealLogs.forEach(m => { counts[m.meal_type] = (counts[m.meal_type] || 0) + 1; });
    const labels = { breakfast: 'Kahvaltı', lunch: 'Öğle', dinner: 'Akşam', snack: 'Ara Öğün' };
    return Object.entries(counts).map(([key, val], i) => ({
      name: labels[key] || key, value: val, color: COLORS[i % COLORS.length],
    }));
  }, [mealLogs]);

  const feedbackRate = useMemo(() => {
    if (mealLogs.length === 0) return 0;
    const withFeedback = mealLogs.filter(m => m.dietitian_feedback).length;
    return Math.round((withFeedback / mealLogs.length) * 100);
  }, [mealLogs]);

  const goalData = useMemo(() => {
    const counts = {};
    const labels = { weight_loss: 'Kilo Verme', muscle_gain: 'Kas Kazanımı', maintenance: 'Koruma' };
    clients.forEach(c => { const g = labels[c.goal] || c.goal || 'Belirtilmemiş'; counts[g] = (counts[g] || 0) + 1; });
    return Object.entries(counts).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  }, [clients]);

  const weightTrend = useMemo(() => {
    return measurements.map(m => ({
      date: new Date(m.measured_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
      kilo: m.weight_kg,
      yağ: m.body_fat_pct,
    }));
  }, [measurements]);

  const weeklyApptChart = useMemo(() => {
    const days = {};
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    dayNames.forEach(d => { days[d] = 0; });
    appointments.forEach(a => {
      const d = new Date(a.scheduled_at);
      days[dayNames[d.getDay()]] = (days[dayNames[d.getDay()]] || 0) + 1;
    });
    return ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => ({ gün: d, randevu: days[d] || 0 }));
  }, [appointments]);

  // ── Yazdır ──
  function handlePrint() {
    window.print();
  }

  const periodLabels = { week: 'Son 7 Gün', month: 'Son 1 Ay', year: 'Son 1 Yıl' };

  const cardStyle = { background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' };
  const cardHeaderStyle = { padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const cardBodyStyle = { padding: 20 };

  if (loading) return <div className="animate-in" style={{ textAlign: 'center', padding: 60 }}><div style={{ fontSize: 32 }}>📊</div><p style={{ color: 'var(--text-muted)' }}>Rapor verileri yükleniyor...</p></div>;

  return (
    <div className="animate-in">
      {/* Üst Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h3 style={{ margin: 0 }}>📊 {periodLabels[period]} Raporu</h3>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>
            {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="tabs">
            {['week', 'month', 'year'].map(p => (
              <button key={p} className={`tab ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
                {p === 'week' ? '7 Gün' : p === 'month' ? '1 Ay' : '1 Yıl'}
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>🖨️ Yazdır</button>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{clients.length}</div>
          <div className="stat-label">Toplam Danışan</div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{apptStats.total}</div>
          <div className="stat-label">Randevu</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">🍽️</div>
          <div className="stat-value">{mealLogs.length}</div>
          <div className="stat-label">Öğün Kaydı</div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-value">%{feedbackRate}</div>
          <div className="stat-label">Geri Bildirim Oranı</div>
        </div>
      </div>

      {/* Grafikler - Satır 1 */}
      <div className="report-grid-2-1">
        {/* Haftalık Randevu Dağılımı */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}><h3 style={{ margin: 0, fontSize: 15 }}>📅 Günlere Göre Randevular</h3></div>
          <div style={cardBodyStyle}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyApptChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="gün" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9' }} />
                <Bar dataKey="randevu" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Randevu Durum Dağılımı */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}><h3 style={{ margin: 0, fontSize: 15 }}>📊 Randevu Durumları</h3></div>
          <div style={cardBodyStyle}>
            {apptStatusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={apptStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                      {apptStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {apptStatusData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                      {d.name}: {d.value}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Veri yok</div>
            )}
          </div>
        </div>
      </div>

      {/* Grafikler - Satır 2 */}
      <div className="report-grid-3">
        {/* Randevu Türü */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}><h3 style={{ margin: 0, fontSize: 15 }}>🏥 Randevu Türü</h3></div>
          <div style={cardBodyStyle}>
            {apptTypeData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={apptTypeData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={4}>
                      {apptTypeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 12 }}>
                  {apptTypeData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                      {d.name}: {d.value}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Veri yok</div>
            )}
          </div>
        </div>

        {/* Öğün Dağılımı */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}><h3 style={{ margin: 0, fontSize: 15 }}>🍽️ Öğün Dağılımı</h3></div>
          <div style={cardBodyStyle}>
            {mealTypeData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={mealTypeData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={4}>
                      {mealTypeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 12, flexWrap: 'wrap' }}>
                  {mealTypeData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                      {d.name}: {d.value}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Veri yok</div>
            )}
          </div>
        </div>

        {/* Danışan Hedefleri */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}><h3 style={{ margin: 0, fontSize: 15 }}>🎯 Danışan Hedefleri</h3></div>
          <div style={cardBodyStyle}>
            {goalData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={goalData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={4}>
                      {goalData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 12, flexWrap: 'wrap' }}>
                  {goalData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                      {d.name}: {d.value}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Veri yok</div>
            )}
          </div>
        </div>
      </div>

      {/* Kilo Trendi */}
      {weightTrend.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={cardHeaderStyle}><h3 style={{ margin: 0, fontSize: 15 }}>⚖️ Genel Kilo Trendi (Tüm Danışanlar)</h3></div>
          <div style={cardBodyStyle}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weightTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F1F5F9' }} />
                <Line type="monotone" dataKey="kilo" stroke="#6366F1" strokeWidth={2} dot={{ fill: '#6366F1', r: 4 }} />
                <Line type="monotone" dataKey="yağ" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 3, background: '#6366F1', display: 'inline-block', borderRadius: 2 }} /> Kilo (kg)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 3, background: '#F59E0B', display: 'inline-block', borderRadius: 2 }} /> Vücut Yağ (%)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Danışan Listesi Tablosu */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: 15 }}>👥 Danışan Özet Tablosu</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{clients.length} danışan</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="risk-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Danışan</th>
                <th>Hedef</th>
                <th>Kilo</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => {
                const goalLabels = { weight_loss: 'Kilo Verme', muscle_gain: 'Kas Kazanımı', maintenance: 'Koruma' };
                return (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td>{goalLabels[c.goal] || c.goal || '-'}</td>
                    <td>{c.weight ? c.weight + ' kg' : '-'}</td>
                  </tr>
                );
              })}
              {clients.length === 0 && (
                <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Kayıtlı danışan yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print başlık */}
      <div className="print-header" style={{ display: 'none' }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>📊 DietSync — {periodLabels[period]} Raporu</h1>
        <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 13 }}>
          Oluşturulma: {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
        <hr style={{ border: 'none', borderTop: '2px solid #E2E8F0', margin: '12px 0' }} />
      </div>

      {/* Print stili */}
      <style>{`
        .report-grid-2-1 {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .report-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        @media (max-width: 900px) {
          .report-grid-2-1, .report-grid-3 {
            grid-template-columns: 1fr !important;
          }
        }
        @media print {
          /* Gizle */
          .sidebar, .topbar, .notif-btn, .tabs, .btn,
          .topbar-right, .app-layout > .impersonation-banner { display: none !important; }

          /* Print başlık göster */
          .print-header { display: block !important; margin-bottom: 16px; }

          /* Layout düzelt */
          html, body { background: white !important; color: black !important; font-size: 12px !important; }
          .app-layout, .app-layout-inner { display: block !important; }
          .main-content { margin: 0 !important; padding: 0 !important; width: 100% !important; }
          .page-content { padding: 0 !important; }

          /* Stat kartları */
          .stats-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 8px !important;
            margin-bottom: 16px !important;
          }
          .stat-card {
            padding: 12px !important;
            border: 1px solid #CBD5E1 !important;
            background: #F8FAFC !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Grafik grid'leri: 2 sütun */
          .report-grid-2-1 { grid-template-columns: 1fr 1fr !important; }
          .report-grid-3 { grid-template-columns: 1fr 1fr 1fr !important; }

          /* Sayfa kırılması ve recharts ortalama */
          .recharts-wrapper { page-break-inside: avoid; margin: 0 auto !important; width: 100% !important; }
          .recharts-surface { width: 100% !important; }
          .recharts-responsive-container { display: flex !important; justify-content: center !important; width: 100% !important; }

          /* Renkleri koru */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          /* Tablo */
          .risk-table th { background: #F1F5F9 !important; }
          .risk-table td, .risk-table th { border: 1px solid #CBD5E1 !important; padding: 8px !important; }
        }
      `}</style>
    </div>
  );
}
