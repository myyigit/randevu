import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';

export const reportRouter = Router();

// GET /api/reports/:clientId — Danışan raporu (JSON)
reportRouter.get('/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    // Danışan bilgileri
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('*, users!inner(name, email)')
      .eq('id', clientId)
      .single();

    // Son ölçümler
    const { data: measurements } = await supabaseAdmin
      .from('measurements')
      .select('*')
      .eq('client_id', clientId)
      .order('measured_at', { ascending: false })
      .limit(10);

    // Aktif plan
    const { data: plan } = await supabaseAdmin
      .from('diet_plans')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .single();

    // Son 30 gün öğün logları
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: mealLogs } = await supabaseAdmin
      .from('meal_logs')
      .select('*')
      .eq('client_id', clientId)
      .gte('logged_at', thirtyDaysAgo)
      .order('logged_at', { ascending: false });

    // Su logları (son 30 gün)
    const { data: waterLogs } = await supabaseAdmin
      .from('water_logs')
      .select('*')
      .eq('client_id', clientId)
      .gte('logged_at', thirtyDaysAgo);

    // Rozetler
    const { data: achievements } = await supabaseAdmin
      .from('achievements')
      .select('*')
      .eq('client_id', clientId);

    res.json({
      client,
      measurements,
      activePlan: plan,
      mealLogs,
      waterLogs,
      achievements,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Report Error:', error);
    res.status(500).json({ error: 'Rapor oluşturulamadı' });
  }
});
