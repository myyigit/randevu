import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const MEAL_TYPE_LABELS = {
  breakfast: '🌅 Kahvaltı',
  lunch: '☀️ Öğle',
  dinner: '🌙 Akşam',
  snack: '🍎 Ara Öğün',
};

const MOOD_LABELS = {
  great: { label: 'Harika', emoji: '😄', color: '#22c55e' },
  good: { label: 'İyi', emoji: '🙂', color: '#84cc16' },
  neutral: { label: 'Normal', emoji: '😐', color: '#eab308' },
  bad: { label: 'Kötü', emoji: '😕', color: '#f97316' },
  terrible: { label: 'Berbat', emoji: '😞', color: '#ef4444' },
};

export default function MealLogs() {
  const { activeDietitianId } = useAuth();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('all');
  const [mealLogs, setMealLogs] = useState([]);
  const [waterLogs, setWaterLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMeal, setFilterMeal] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [feedbackModal, setFeedbackModal] = useState(null); // {log, text}
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [view, setView] = useState('logs'); // 'logs' | 'water'

  useEffect(() => {
    if (activeDietitianId) fetchClients();
  }, [activeDietitianId]);

  useEffect(() => {
    if (activeDietitianId) {
      fetchMealLogs();
      fetchWaterLogs();
    }
  }, [activeDietitianId, selectedClient, filterMeal, filterDate]);

  async function fetchClients() {
    const { data } = await supabase
      .from('clients')
      .select('id, users(name)')
      .eq('dietitian_id', activeDietitianId)
      .order('id');
    if (data) setClients(data);
  }

  async function fetchMealLogs() {
    setLoading(true);
    let query = supabase
      .from('meal_logs')
      .select(`
        id, logged_at, meal_type, photo_url, note, mood,
        ai_analysis, dietitian_feedback, feedback_at,
        clients!inner(id, dietitian_id, users(name))
      `)
      .eq('clients.dietitian_id', activeDietitianId)
      .order('logged_at', { ascending: false })
      .limit(100);

    if (selectedClient !== 'all') query = query.eq('client_id', selectedClient);
    if (filterMeal !== 'all') query = query.eq('meal_type', filterMeal);
    if (filterDate) {
      const start = new Date(filterDate);
      const end = new Date(filterDate);
      end.setDate(end.getDate() + 1);
      query = query.gte('logged_at', start.toISOString()).lt('logged_at', end.toISOString());
    }

    const { data, error } = await query;
    if (!error) setMealLogs(data || []);
    setLoading(false);
  }

  async function fetchWaterLogs() {
    let query = supabase
      .from('water_logs')
      .select(`
        id, logged_at, amount_ml,
        clients!inner(id, dietitian_id, users(name))
      `)
      .eq('clients.dietitian_id', activeDietitianId)
      .order('logged_at', { ascending: false })
      .limit(200);

    if (selectedClient !== 'all') query = query.eq('client_id', selectedClient);
    if (filterDate) {
      const start = new Date(filterDate);
      const end = new Date(filterDate);
      end.setDate(end.getDate() + 1);
      query = query.gte('logged_at', start.toISOString()).lt('logged_at', end.toISOString());
    }

    const { data, error } = await query;
    if (!error) setWaterLogs(data || []);
  }

  async function saveFeedback() {
    if (!feedbackModal) return;
    setSavingFeedback(true);
    const { error } = await supabase
      .from('meal_logs')
      .update({
        dietitian_feedback: feedbackModal.text,
        feedback_at: new Date().toISOString(),
      })
      .eq('id', feedbackModal.log.id);

    if (!error) {
      setMealLogs(prev => prev.map(l =>
        l.id === feedbackModal.log.id
          ? { ...l, dietitian_feedback: feedbackModal.text, feedback_at: new Date().toISOString() }
          : l
      ));
      setFeedbackModal(null);
    }
    setSavingFeedback(false);
  }

  // Su istatistikleri: günlük toplam
  const waterByClient = waterLogs.reduce((acc, w) => {
    const name = w.clients?.users?.name || 'Bilinmiyor';
    if (!acc[name]) acc[name] = 0;
    acc[name] += w.amount_ml;
    return acc;
  }, {});

  const totalWater = waterLogs.reduce((sum, w) => sum + (w.amount_ml || 0), 0);

  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="animate-in">
      {/* Üst Filtreler */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Görünüm Seçici */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 4 }}>
          <button
            className={`btn btn-sm ${view === 'logs' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('logs')}
          >📸 Öğün Kayıtları</button>
          <button
            className={`btn btn-sm ${view === 'water' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('water')}
          >💧 Su Takibi</button>
        </div>

        {/* Danışan Filtresi */}
        <select
          value={selectedClient}
          onChange={e => setSelectedClient(e.target.value)}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 14 }}
        >
          <option value="all">👥 Tüm Danışanlar</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.users?.name}</option>
          ))}
        </select>

        {/* Öğün Tipi Filtresi (sadece log görünümünde) */}
        {view === 'logs' && (
          <select
            value={filterMeal}
            onChange={e => setFilterMeal(e.target.value)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 14 }}
          >
            <option value="all">🍽️ Tüm Öğünler</option>
            <option value="breakfast">🌅 Kahvaltı</option>
            <option value="lunch">☀️ Öğle</option>
            <option value="dinner">🌙 Akşam</option>
            <option value="snack">🍎 Ara Öğün</option>
          </select>
        )}

        {/* Tarih Filtresi */}
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 14 }}
        />
        {filterDate && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilterDate('')}>✕ Tarihi Temizle</button>
        )}
      </div>

      {/* İstatistik Kartları */}
      {view === 'logs' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {Object.entries(MEAL_TYPE_LABELS).map(([type, label]) => {
            const count = mealLogs.filter(l => l.meal_type === type).length;
            return (
              <div key={type} className="card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>{label.split(' ')[0]}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>{count}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label.split(' ').slice(1).join(' ')}</div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'water' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 4 }}>💧</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>{(totalWater / 1000).toFixed(1)}L</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Toplam Su</div>
          </div>
          <div className="card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 4 }}>🧮</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>{waterLogs.length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Toplam Kayıt</div>
          </div>
          <div className="card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 4 }}>👥</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)' }}>{Object.keys(waterByClient).length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aktif Danışan</div>
          </div>
        </div>
      )}

      {/* Öğün Kayıtları */}
      {view === 'logs' && (
        <div className="card">
          {loading ? (
            <div className="empty-state"><div className="empty-icon">⏳</div><h3>Yükleniyor...</h3></div>
          ) : mealLogs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📸</div>
              <h3>Öğün kaydı bulunamadı</h3>
              <p>Danışanlarınız henüz öğün kaydı oluşturmamış.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Danışan', 'Öğün', 'Tarih & Saat', 'Not', 'Ruh Hali', 'Geri Bildirim', 'İşlem'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mealLogs.map(log => {
                  const mood = log.mood ? MOOD_LABELS[log.mood] : null;
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 500 }}>{log.clients?.users?.name || '-'}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: 'var(--surface)', padding: '4px 10px', borderRadius: 20, fontSize: 13 }}>
                          {MEAL_TYPE_LABELS[log.meal_type] || log.meal_type}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {formatDate(log.logged_at)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, maxWidth: 200 }}>
                        {log.photo_url && (
                          <a href={log.photo_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', marginRight: 8 }}>📷</a>
                        )}
                        <span style={{ color: 'var(--text-secondary)' }}>{log.note || '—'}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {mood ? (
                          <span title={mood.label} style={{ fontSize: 20 }}>{mood.emoji}</span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, maxWidth: 180 }}>
                        {log.dietitian_feedback ? (
                          <div>
                            <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                              ✅ {log.dietitian_feedback}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(log.feedback_at)}</div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Henüz yok</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => setFeedbackModal({ log, text: log.dietitian_feedback || '' })}
                        >
                          ✏️ Geri Bildirim
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Su Takip Tablosu */}
      {view === 'water' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Danışan bazlı özet */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Danışan Bazlı Su Tüketimi</div>
            {Object.keys(waterByClient).length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-icon">💧</div>
                <h3>Su kaydı yok</h3>
              </div>
            ) : (
              <div style={{ padding: '12px 0' }}>
                {Object.entries(waterByClient)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, ml]) => {
                    const pct = Math.min(100, (ml / 2500) * 100);
                    return (
                      <div key={name} style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 500 }}>{name}</span>
                          <span style={{ color: ml >= 2000 ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                            {(ml / 1000).toFixed(1)}L / 2.5L
                          </span>
                        </div>
                        <div style={{ height: 8, background: 'var(--surface)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: ml >= 2500 ? 'var(--success)' : ml >= 1500 ? '#3b82f6' : 'var(--warning)',
                            borderRadius: 4,
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Son Su Kayıtları */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Son Kayıtlar</div>
            {waterLogs.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-icon">💧</div>
                <h3>Kayıt yok</h3>
              </div>
            ) : (
              <div style={{ overflowY: 'auto', maxHeight: 400 }}>
                {waterLogs.slice(0, 30).map(w => (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{w.clients?.users?.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(w.logged_at)}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#3b82f6', fontSize: 15 }}>💧 {w.amount_ml} ml</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Geri Bildirim Modalı */}
      {feedbackModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)',
        }}>
          <div className="card" style={{ width: 480, padding: 'var(--space-xl)' }}>
            <h3 style={{ marginBottom: 4 }}>✏️ Diyetisyen Geri Bildirimi</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
              {feedbackModal.log.clients?.users?.name} — {MEAL_TYPE_LABELS[feedbackModal.log.meal_type]} — {formatDate(feedbackModal.log.logged_at)}
            </p>

            {feedbackModal.log.note && (
              <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 16, fontSize: 13 }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Danışan notu:</div>
                <div>{feedbackModal.log.note}</div>
              </div>
            )}

            <textarea
              value={feedbackModal.text}
              onChange={e => setFeedbackModal(prev => ({ ...prev, text: e.target.value }))}
              placeholder="Öğün hakkında geri bildiriminizi yazın..."
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box', background: 'var(--bg-secondary)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                padding: 12, color: 'var(--text)', fontSize: 14, resize: 'vertical', outline: 'none', marginBottom: 16,
              }}
            />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setFeedbackModal(null)} disabled={savingFeedback}>İptal</button>
              <button className="btn btn-primary" onClick={saveFeedback} disabled={savingFeedback || !feedbackModal.text.trim()}>
                {savingFeedback ? '⏳ Kaydediliyor...' : '✅ Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
