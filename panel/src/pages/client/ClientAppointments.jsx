import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';

const STATUS_MAP = {
  pending:   { label: 'Bekliyor',  color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  confirmed: { label: 'Onaylandı', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  cancelled: { label: 'İptal',     color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  done:      { label: 'Tamamlandı',color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
};

export default function ClientAppointments() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');

  useEffect(() => {
    if (user?.id) fetchAppointments();
  }, [user?.id]);

  async function fetchAppointments() {
    const now = new Date().toISOString();
    const [upRes, pastRes] = await Promise.all([
      supabase.from('appointments')
        .select('*, dietitians(id, users(name, phone))')
        .eq('client_id', user.id)
        .gte('scheduled_at', now)
        .order('scheduled_at')
        .limit(20),
      supabase.from('appointments')
        .select('*, dietitians(id, users(name))')
        .eq('client_id', user.id)
        .lt('scheduled_at', now)
        .order('scheduled_at', { ascending: false })
        .limit(20),
    ]);
    setUpcoming(upRes.data || []);
    setPast(pastRes.data || []);
    setLoading(false);
  }

  const formatDate = (iso) => new Date(iso).toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const formatTime = (iso) => new Date(iso).toLocaleTimeString('tr-TR', {
    hour: '2-digit', minute: '2-digit',
  });

  const AppointmentCard = ({ appt }) => {
    const status = STATUS_MAP[appt.status] || STATUS_MAP.pending;
    return (
      <div className="card" style={{ marginBottom: 12, padding: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{formatDate(appt.scheduled_at)}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              🕐 {formatTime(appt.scheduled_at)} · {appt.duration_min} dakika
            </div>
          </div>
          <span style={{
            background: status.bg, color: status.color,
            padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          }}>
            {status.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
          <span>👤 {appt.dietitians?.users?.name || 'Diyetisyen'}</span>
          <span>{appt.type === 'online' ? '💻 Online' : '🏥 Yüz yüze'}</span>
        </div>
        {appt.notes && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            📝 {appt.notes}
          </div>
        )}
      </div>
    );
  };

  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 100 }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>📅 Randevularım</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>Diyetisyeninizle görüşmeleriniz</div>

      {/* Sekmeler */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 4 }}>
        <button
          className={`btn btn-sm ${tab === 'upcoming' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1 }}
          onClick={() => setTab('upcoming')}
        >
          Yaklaşan ({upcoming.length})
        </button>
        <button
          className={`btn btn-sm ${tab === 'past' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1 }}
          onClick={() => setTab('past')}
        >
          Geçmiş ({past.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>⏳ Yükleniyor...</div>
      ) : list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <div style={{ color: 'var(--text-muted)' }}>
            {tab === 'upcoming' ? 'Yaklaşan randevu yok' : 'Geçmiş randevu yok'}
          </div>
        </div>
      ) : (
        list.map(appt => <AppointmentCard key={appt.id} appt={appt} />)
      )}
    </div>
  );
}
