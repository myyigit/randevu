import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Kahvaltı', icon: '🌅' },
  { value: 'lunch',     label: 'Öğle',     icon: '☀️' },
  { value: 'dinner',    label: 'Akşam',    icon: '🌙' },
  { value: 'snack',     label: 'Ara Öğün', icon: '🍎' },
];

const MOODS = [
  { value: 'great',   emoji: '😄', label: 'Harika' },
  { value: 'good',    emoji: '🙂', label: 'İyi' },
  { value: 'neutral', emoji: '😐', label: 'Normal' },
  { value: 'bad',     emoji: '😕', label: 'Kötü' },
  { value: 'terrible',emoji: '😞', label: 'Berbat' },
];

export default function ClientMealLog() {
  const { user } = useAuth();
  const [mealType, setMealType] = useState('');
  const [note, setNote] = useState('');
  const [mood, setMood] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!mealType) { setError('Lütfen öğün tipini seçin.'); return; }
    setSaving(true);
    setError('');

    const { error: err } = await supabase.rpc('add_meal_log', {
      p_client_id: user.id,
      p_meal_type: mealType,
      p_note: note || null,
      p_mood: mood || null,
    });

    setSaving(false);
    if (err) {
      setError('Kayıt sırasında hata: ' + err.message);
    } else {
      setSuccess(true);
      setMealType('');
      setNote('');
      setMood('');
      setTimeout(() => setSuccess(false), 3000);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 100 }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>🍽️ Öğün Kaydı</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Bugün ne yedin? Kaydedelim.</div>

      {success && (
        <div style={{
          background: 'var(--success)', color: '#fff', padding: '14px 20px',
          borderRadius: 'var(--radius-md)', marginBottom: 20, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          ✅ Öğün kaydedildi! Diyetisyenin görebilecek.
        </div>
      )}
      {error && (
        <div style={{
          background: 'var(--danger)', color: '#fff', padding: '14px 20px',
          borderRadius: 'var(--radius-md)', marginBottom: 20,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Öğün Tipi */}
      <div className="card" style={{ marginBottom: 16, padding: 'var(--space-lg)' }}>
        <div style={{ fontWeight: 600, marginBottom: 14 }}>Öğün Tipi</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {MEAL_TYPES.map(m => (
            <button
              key={m.value}
              onClick={() => setMealType(m.value)}
              style={{
                padding: '14px 12px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${mealType === m.value ? 'var(--primary)' : 'var(--border)'}`,
                background: mealType === m.value ? 'var(--primary-glow)' : 'var(--surface)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: mealType === m.value ? 700 : 400,
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 22 }}>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Not */}
      <div className="card" style={{ marginBottom: 16, padding: 'var(--space-lg)' }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>📝 Ne yedin?</div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Örn: Yulaf ezmesi, 1 muz, 5 ceviz..."
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: 12,
            color: 'var(--text)', fontSize: 14, resize: 'vertical', outline: 'none',
          }}
        />
      </div>

      {/* Ruh Hali */}
      <div className="card" style={{ marginBottom: 24, padding: 'var(--space-lg)' }}>
        <div style={{ fontWeight: 600, marginBottom: 14 }}>Nasıl hissediyorsun?</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {MOODS.map(m => (
            <button
              key={m.value}
              onClick={() => setMood(mood === m.value ? '' : m.value)}
              title={m.label}
              style={{
                width: 52, height: 52,
                borderRadius: '50%',
                border: `2px solid ${mood === m.value ? 'var(--primary)' : 'var(--border)'}`,
                background: mood === m.value ? 'var(--primary-glow)' : 'var(--surface)',
                fontSize: 26, cursor: 'pointer',
                transform: mood === m.value ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.15s',
              }}
            >
              {m.emoji}
            </button>
          ))}
        </div>
        {mood && (
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
            {MOODS.find(m => m.value === mood)?.label}
          </div>
        )}
      </div>

      {/* Kaydet */}
      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving || !mealType}
        style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 700 }}
      >
        {saving ? '⏳ Kaydediliyor...' : '✅ Öğünü Kaydet'}
      </button>
    </div>
  );
}
