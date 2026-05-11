import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { sendToUser } from './notifications';

export const appointmentRouter = Router();

// GET /api/appointments/no-show-risks — Riskli danışan listesi
appointmentRouter.get('/no-show-risks', async (req: Request, res: Response) => {
  try {
    const { dietitianId } = req.query;

    // Gelecekteki randevuları al
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        clients!inner(id, users:id(name, phone))
      `)
      .eq('dietitian_id', dietitianId)
      .in('status', ['pending', 'confirmed'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });

    if (!appointments) {
      return res.json({ risks: [] });
    }

    // Her randevu için risk skoru hesapla
    const risks = await Promise.all(
      appointments.map(async (appt) => {
        const score = await calcNoShowRisk(appt.client_id);
        return {
          appointmentId: appt.id,
          clientId: appt.client_id,
          clientName: (appt as any).clients?.users?.name || 'Bilinmiyor',
          scheduledAt: appt.scheduled_at,
          status: appt.status,
          riskScore: score,
          riskLevel: score <= 30 ? 'low' : score <= 60 ? 'medium' : 'high',
        };
      })
    );

    // Riske göre sırala (yüksekten düşüğe)
    risks.sort((a, b) => b.riskScore - a.riskScore);

    res.json({ risks });
  } catch (error) {
    console.error('No-show risk Error:', error);
    res.status(500).json({ error: 'Risk hesaplanamadı' });
  }
});

// POST /api/appointments/:id/confirm — Randevu onayla
appointmentRouter.post('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await supabaseAdmin
      .from('appointments')
      .update({ status: 'confirmed' })
      .eq('id', id);

    // Hatırlatma logunu güncelle
    await supabaseAdmin
      .from('reminder_logs')
      .update({ action_taken: 'confirmed', action_at: new Date().toISOString() })
      .eq('appointment_id', id)
      .is('action_at', null);

    res.json({ success: true });
  } catch (error) {
    console.error('Confirm Error:', error);
    res.status(500).json({ error: 'Randevu onaylanamadı' });
  }
});

// POST /api/appointments/:id/reschedule — Randevu ertele
appointmentRouter.post('/:id/reschedule', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newScheduledAt } = req.body;

    // Mevcut randevuyu güncelle
    await supabaseAdmin
      .from('appointments')
      .update({
        scheduled_at: newScheduledAt,
        status: 'pending',
      })
      .eq('id', id);

    // Geçmişe kaydet
    const { data: appt } = await supabaseAdmin
      .from('appointments')
      .select('client_id, dietitian_id')
      .eq('id', id)
      .single();

    if (appt) {
      await supabaseAdmin.from('appointment_history').insert({
        client_id: appt.client_id,
        appointment_id: id,
        outcome: 'rescheduled',
      });

      // Diyetisyene bildir
      await sendToUser(appt.dietitian_id, `📅 Randevu ertelendi. Yeni tarih: ${new Date(newScheduledAt).toLocaleDateString('tr-TR')}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Reschedule Error:', error);
    res.status(500).json({ error: 'Randevu ertelenemedi' });
  }
});

// GET /api/appointments/available-slots — Müsait slotlar
appointmentRouter.get('/available-slots', async (req: Request, res: Response) => {
  try {
    const { dietitianId, date } = req.query;

    // Diyetisyenin çalışma saatlerini al
    const { data: dietitian } = await supabaseAdmin
      .from('dietitians')
      .select('working_hours')
      .eq('id', dietitianId)
      .single();

    // O gündeki mevcut randevuları al
    const dayStart = new Date(date as string);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date as string);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: existing } = await supabaseAdmin
      .from('appointments')
      .select('scheduled_at, duration_min')
      .eq('dietitian_id', dietitianId)
      .gte('scheduled_at', dayStart.toISOString())
      .lte('scheduled_at', dayEnd.toISOString())
      .neq('status', 'cancelled');

    // Basit slot üretimi (09:00 - 18:00, 30dk aralık)
    const slots: string[] = [];
    const existingTimes = (existing || []).map(e => new Date(e.scheduled_at).getHours() * 60 + new Date(e.scheduled_at).getMinutes());

    for (let hour = 9; hour < 18; hour++) {
      for (let min of [0, 30]) {
        const totalMin = hour * 60 + min;
        const isOccupied = existingTimes.some(t => Math.abs(t - totalMin) < 30);
        if (!isOccupied) {
          slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
        }
      }
    }

    res.json({ slots, date });
  } catch (error) {
    console.error('Slots Error:', error);
    res.status(500).json({ error: 'Slotlar alınamadı' });
  }
});

// No-show risk skoru hesapla
async function calcNoShowRisk(clientId: string): Promise<number> {
  let score = 0;

  // Geçmiş no-show oranı (%40 ağırlık)
  const { data: history } = await supabaseAdmin
    .from('appointment_history')
    .select('outcome')
    .eq('client_id', clientId);

  if (history && history.length > 0) {
    const noShows = history.filter(h => h.outcome === 'no_show').length;
    score += (noShows / history.length) * 40;
  }

  // Son 7 gün log aktivitesi (%20 ağırlık)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: logCount } = await supabaseAdmin
    .from('meal_logs')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .gte('logged_at', weekAgo);

  const logRate = Math.min((logCount || 0) / 7, 1);
  score += (1 - logRate) * 20;

  // Randevu onaylanmadıysa (+25)
  const { data: pendingAppts } = await supabaseAdmin
    .from('appointments')
    .select('status')
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .gte('scheduled_at', new Date().toISOString())
    .limit(1);

  if (pendingAppts && pendingAppts.length > 0) {
    score += 25;
  }

  // Son mesajdan bu yana gün sayısı (%15 ağırlık)
  const { data: lastLog } = await supabaseAdmin
    .from('meal_logs')
    .select('logged_at')
    .eq('client_id', clientId)
    .order('logged_at', { ascending: false })
    .limit(1);

  if (lastLog && lastLog.length > 0) {
    const daysSince = Math.floor(
      (Date.now() - new Date(lastLog[0].logged_at).getTime()) / (24 * 60 * 60 * 1000)
    );
    score += Math.min(daysSince * 3, 15);
  } else {
    score += 15;
  }

  return Math.min(Math.round(score), 100);
}
