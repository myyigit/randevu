import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Gerçek Supabase verisini çeken hooklar

export function useClients(dietitianId) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dietitianId) return;

    async function fetch() {
      const { data } = await supabase
        .from('clients')
        .select(`
          *,
          users (name, email, phone, avatar_url),
          measurements (weight_kg, body_fat_pct, measured_at)
        `)
        .eq('dietitian_id', dietitianId)
        .order('created_at', { ascending: false });

      if (data) {
        const mapped = data.map(c => {
          const sorted = (c.measurements || []).sort(
            (a, b) => new Date(b.measured_at) - new Date(a.measured_at)
          );
          const latest = sorted[0];
          const prev = sorted[1];
          const change = latest && prev ? (latest.weight_kg - prev.weight_kg).toFixed(1) : '0';
          const trend = parseFloat(change) > 0 ? 'up' : parseFloat(change) < 0 ? 'down' : 'stable';

          return {
            id: c.id,
            name: c.users?.name || 'İsimsiz',
            email: c.users?.email,
            initials: (c.users?.name || 'XX').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
            weight: latest?.weight_kg || 0,
            bodyFat: latest?.body_fat_pct,
            trend,
            change: (parseFloat(change) > 0 ? '+' : '') + change,
            goal: c.goal === 'weight_loss' ? 'Kilo Verme' : c.goal === 'muscle_gain' ? 'Kas Kazanımı' : 'Koruma',
            gender: c.gender,
            birthDate: c.birth_date,
            activityLevel: c.activity_level,
            medicalNotes: c.medical_notes,
          };
        });
        setClients(mapped);
      }
      setLoading(false);
    }

    fetch();

    // Realtime subscription
    const channel = supabase
      .channel('clients-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'measurements' }, () => {
        fetch(); // Ölçüm değişince yeniden çek
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dietitianId]);

  return { clients, loading };
}

export function useAppointments(dietitianId, dateRange) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dietitianId) return;

    async function fetch() {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          clients!inner (
            id,
            users:id (name, phone)
          )
        `)
        .eq('dietitian_id', dietitianId)
        .order('scheduled_at', { ascending: true });

      if (dateRange?.from) {
        query = query.gte('scheduled_at', dateRange.from);
      }
      if (dateRange?.to) {
        query = query.lte('scheduled_at', dateRange.to);
      }

      const { data } = await query;

      if (data) {
        setAppointments(data.map(a => ({
          id: a.id,
          client: a.clients?.users?.name || 'Bilinmiyor',
          clientId: a.client_id,
          initials: (a.clients?.users?.name || 'XX').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          date: a.scheduled_at?.split('T')[0],
          time: new Date(a.scheduled_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          type: a.type,
          status: a.status,
          duration: a.duration_min,
          notes: a.notes,
        })));
      }
      setLoading(false);
    }

    fetch();

    // Realtime
    const channel = supabase
      .channel('appointments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dietitianId, dateRange?.from, dateRange?.to]);

  return { appointments, loading };
}

export function useMealLogs(clientId) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;

    async function fetch() {
      const { data } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('logged_at', { ascending: false })
        .limit(20);

      if (data) setLogs(data);
      setLoading(false);
    }

    fetch();

    const channel = supabase
      .channel('meal-logs-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'meal_logs',
        filter: `client_id=eq.${clientId}`,
      }, (payload) => {
        setLogs(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clientId]);

  return { logs, loading };
}

export function useDashboardStats(dietitianId) {
  const [stats, setStats] = useState({
    todayAppointments: 0,
    activeClients: 0,
    pendingLogs: 0,
    criticalAlerts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dietitianId) return;

    async function fetch() {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      // Bugünkü randevular
      const { count: todayAppts } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('dietitian_id', dietitianId)
        .gte('scheduled_at', today)
        .lt('scheduled_at', tomorrow);

      // Aktif danışanlar
      const { count: activeClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('dietitian_id', dietitianId);

      // Bekleyen öğün logları (feedback yok)
      const { count: pendingLogs } = await supabase
        .from('meal_logs')
        .select('*, clients!inner(dietitian_id)', { count: 'exact', head: true })
        .is('dietitian_feedback', null)
        .eq('clients.dietitian_id', dietitianId);

      // Okunmamış bildirimler
      const { count: unread } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', dietitianId)
        .eq('is_read', false);

      setStats({
        todayAppointments: todayAppts || 0,
        activeClients: activeClients || 0,
        pendingLogs: pendingLogs || 0,
        criticalAlerts: unread || 0,
      });
      setLoading(false);
    }

    fetch();
  }, [dietitianId]);

  return { stats, loading };
}

export function useMeasurements(clientId) {
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;

    async function fetch() {
      const { data } = await supabase
        .from('measurements')
        .select('*')
        .eq('client_id', clientId)
        .order('measured_at', { ascending: false })
        .limit(12);

      if (data) setMeasurements(data);
      setLoading(false);
    }

    fetch();
  }, [clientId]);

  return { measurements, loading };
}

export function useDietPlans(clientId) {
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;

    async function fetch() {
      const { data } = await supabase
        .from('diet_plans')
        .select(`
          *,
          meals (
            *,
            meal_foods (
              *,
              foods (name, kcal_per_100g, protein_g, carbs_g, fat_g)
            )
          )
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (data) {
        setPlans(data);
        setActivePlan(data.find(p => p.status === 'active') || null);
      }
      setLoading(false);
    }

    fetch();
  }, [clientId]);

  return { plans, activePlan, loading };
}
