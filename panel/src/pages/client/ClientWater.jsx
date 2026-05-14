import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const QUICK_AMOUNTS = [150, 250, 330, 500];

export default function ClientWater() {
  const { user } = useAuth();
  const [waterLogs, setWaterLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const GOAL = 2500;

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    supabase
      .from('water_logs')
      .select('*')
      .eq('client_id', userId)
      .gte('logged_at', today.toISOString())
      .lt('logged_at', tomorrow.toISOString())
      .order('logged_at', { ascending: false })
      .then(({ data }) => {
        setWaterLogs(data || []);
        setTotal((data || []).reduce((s, w) => s + w.amount_ml, 0));
        setLoading(false);
      });
  }, [user?.id]);

  async function addWater(ml) {
    setSaving(true);
    const { error } = await supabase.rpc('add_water_log', {
      p_client_id: user.id,
      p_amount_ml: ml,
    });
    if (!error) {
      const newEntry = { id: crypto.randomUUID(), amount_ml: ml, logged_at: new Date().toISOString() };
      setWaterLogs(prev => [newEntry, ...prev]);
      setTotal(prev => prev + ml);
    }
    setSaving(false);
  }

  async function deleteLog(id, ml) {
    const { error } = await supabase.from('water_logs').delete().eq('id', id);
    if (!error) {
      setWaterLogs(prev => prev.filter(w => w.id !== id));
      setTotal(prev => prev - ml);
    }
  }

  const pct = Math.min(100, (total / GOAL) * 100);
  const glasses = Math.round(total / 250);

  const getBarColor = () => {
    if (pct >= 100) return 'var(--success)';
    if (pct >= 60) return '#3b82f6';
    if (pct >= 30) return '#eab308';
    return '#ef4444';
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 100 }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>💧 Su Takibi</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Günlük 2.5L hedefin</div>

      {/* Büyük İlerleme */}
      <div className="card" style={{ marginBottom: 20, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>
          {pct >= 100 ? '🎉' : pct >= 60 ? '💧' : pct >= 30 ? '🫙' : '🏜️'}
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, color: getBarColor() }}>
          {(total / 1000).toFixed(1)}L
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
          {glasses} bardak · {GOAL - total > 0 ? `${((GOAL - total) / 1000).toFixed(1)}L kaldı` : 'Hedef tamamlandı! 🎉'}
        </div>

        <div style={{ height: 16, background: 'var(--surface)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: `linear-gradient(90deg, ${getBarColor()}, ${getBarColor()}aa)`,
            borderRadius: 99, transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>%{Math.round(pct)}</div>
      </div>

      {/* Hızlı Ekleme */}
      <div className="card" style={{ marginBottom: 16, padding: 'var(--space-lg)' }}>
        <div style={{ fontWeight: 600, marginBottom: 14 }}>Hızlı Ekle</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {QUICK_AMOUNTS.map(ml => (
            <button
              key={ml}
              onClick={() => addWater(ml)}
              disabled={saving}
              style={{
                padding: '16px 8px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                transition: 'background 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-glow)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
            >
              <span style={{ fontSize: 22 }}>💧</span>
              {ml} ml
            </button>
          ))}
        </div>
      </div>

      {/* Bugünkü Kayıtlar */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
          Bugünkü Kayıtlar
        </div>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>⏳</div>
        ) : waterLogs.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            Henüz kayıt yok
          </div>
        ) : (
          waterLogs.map(w => (
            <div key={w.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>💧</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{w.amount_ml} ml</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(w.logged_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteLog(w.id, w.amount_ml)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}
                title="Sil"
              >🗑️</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
