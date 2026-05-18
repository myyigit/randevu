import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';

export default function ClientHome() {
  const { user, profile } = useAuth();
  const [todayLogs, setTodayLogs] = useState([]);
  const [waterTotal, setWaterTotal] = useState(0);
  const [activePlan, setActivePlan] = useState(null);
  const [nextAppt, setNextAppt] = useState(null);
  const [loading, setLoading] = useState(true);

  const WATER_GOAL = 2500; // ml

  useEffect(() => {
    if (user?.id) fetchAll();
  }, [user?.id]);

  async function fetchAll() {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [logsRes, waterRes, planRes, apptRes] = await Promise.all([
      supabase.from('meal_logs').select('*').eq('client_id', user.id)
        .gte('logged_at', today.toISOString()).lt('logged_at', tomorrow.toISOString())
        .order('logged_at'),
      supabase.from('water_logs').select('amount_ml').eq('client_id', user.id)
        .gte('logged_at', today.toISOString()).lt('logged_at', tomorrow.toISOString()),
      supabase.from('diet_plans').select('*').eq('client_id', user.id).eq('status', 'active').maybeSingle(),
      supabase.from('appointments').select('*, dietitians(users(name))').eq('client_id', user.id)
        .gte('scheduled_at', new Date().toISOString()).eq('status', 'confirmed')
        .order('scheduled_at').limit(1).maybeSingle(),
    ]);

    setTodayLogs(logsRes.data || []);
    setWaterTotal((waterRes.data || []).reduce((s, w) => s + w.amount_ml, 0));
    setActivePlan(planRes.data);
    setNextAppt(apptRes.data);
    setLoading(false);
  }

  const mealsDone = todayLogs.length;
  const waterPct = Math.min(100, (waterTotal / WATER_GOAL) * 100);
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'İyi öğleden sonralar';
    return 'İyi akşamlar';
  };

  const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };
  const MEAL_LABELS = { breakfast: 'Kahvaltı', lunch: 'Öğle', dinner: 'Akşam', snack: 'Ara Öğün' };
  const MOOD_EMOJIS = { great: '😄', good: '🙂', neutral: '😐', bad: '😕', terrible: '😞' };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p style={{ color: 'var(--text-muted)' }}>Yükleniyor...</p>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 100 }}>
      {/* Selamlama */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{greeting()}, {profile?.name?.split(' ')[0]} 👋</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Su İlerleme */}
      <div className="card" style={{ marginBottom: 16, padding: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 600 }}>💧 Günlük Su</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: waterPct >= 100 ? 'var(--success)' : '#3b82f6' }}>
            {(waterTotal / 1000).toFixed(1)}L / 2.5L
          </div>
        </div>
        <div style={{ height: 12, background: 'var(--surface)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${waterPct}%`,
            background: waterPct >= 100 ? 'var(--success)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
            borderRadius: 8, transition: 'width 0.5s ease',
          }} />
        </div>
        {waterPct >= 100 && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--success)', textAlign: 'center' }}>
            🎉 Günlük hedefine ulaştın!
          </div>
        )}
      </div>

      {/* Bugün Öğünler */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600 }}>🍽️ Bugünkü Öğünler</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{mealsDone} kayıt</div>
        </div>
        {todayLogs.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🍽️</div>
            Bugün henüz öğün kaydı yok
          </div>
        ) : (
          <div>
            {todayLogs.map(log => (
              <div key={log.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 26 }}>{MEAL_ICONS[log.meal_type]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{MEAL_LABELS[log.meal_type]}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {new Date(log.logged_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    {log.note && ` · ${log.note}`}
                  </div>
                </div>
                {log.mood && <span style={{ fontSize: 20 }}>{MOOD_EMOJIS[log.mood]}</span>}
                {log.dietitian_feedback && (
                  <span style={{ background: 'var(--success)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 20 }}>✅ Yorum var</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aktif Diyet Planı */}
      {activePlan && (
        <div className="card" style={{ marginBottom: 16, padding: 'var(--space-lg)' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>📋 Aktif Diyet Planı</div>
          <div style={{ fontSize: 15, color: 'var(--primary)', fontWeight: 700 }}>{activePlan.title}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Günlük hedef: <strong>{activePlan.daily_kcal} kcal</strong>
            {activePlan.end_date && ` · Bitiş: ${new Date(activePlan.end_date).toLocaleDateString('tr-TR')}`}
          </div>
        </div>
      )}

      {/* Yaklaşan Randevu */}
      {nextAppt && (
        <div className="card" style={{ padding: 'var(--space-lg)', background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>📅 Yaklaşan Randevu</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {new Date(nextAppt.scheduled_at).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            🕐 {new Date(nextAppt.scheduled_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            {nextAppt.dietitians?.users?.name && ` · ${nextAppt.dietitians.users.name}`}
          </div>
        </div>
      )}
    </div>
  );
}
