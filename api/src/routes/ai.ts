import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { supabaseAdmin } from '../lib/supabase';

export const aiRouter = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/ai/chat — Serbest metin diyet asistanı
aiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { clientId, message, imageUrl } = req.body;

    // Danışan bağlamını al
    const context = await buildContext(clientId);

    const systemPrompt = `
      Sen DietSync AI asistanısın. Bir diyetisyen asistanı olarak danışana yardım ediyorsun.
      
      Danışan bilgileri:
      - Aktif plan: ${context.planTitle || 'Plan yok'}
      - Günlük hedef: ${context.dailyKcal} kcal
      - Bugün tüketilen: ${context.consumedKcal} kcal
      - Kalan: ${context.remainingKcal} kcal
      - Sevmediği yiyecekler: ${JSON.stringify(context.dislikes)}
      
      Kurallar:
      - Plana uygun öner
      - Kalori sınırı aşılıyorsa uyar
      - Somut porsiyon miktarları ver
      - %70 emin değilsen "Diyetisyeninize danışmanızı öneririm" de
      - Türkçe, sıcak ve motive edici ton kullan
      - Kısa ve net yanıtla
    `;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (imageUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message || 'Bu yemeği analiz et' },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: message });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';
    const confidence = imageUrl ? 0.75 : 0.85;
    const shouldForward = confidence < 0.7;

    // Chat logunu kaydet
    await supabaseAdmin.from('ai_chat_logs').insert({
      client_id: clientId,
      user_message: message,
      ai_response: aiResponse,
      image_url: imageUrl || null,
      confidence,
      forwarded_to_dietitian: shouldForward,
    });

    res.json({
      response: aiResponse,
      confidence,
      forwarded: shouldForward,
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: 'AI yanıt üretilemedi' });
  }
});

// POST /api/ai/analyze-photo — Yemek fotoğrafı analizi
aiRouter.post('/analyze-photo', async (req: Request, res: Response) => {
  try {
    const { clientId, imageUrl } = req.body;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Bir yemek fotoğrafını analiz et. JSON formatında yanıt ver:
            { "name": "yemek adı", "estimatedKcal": 350, "protein_g": 25, "carbs_g": 30, "fat_g": 15, "confidence": 0.8 }
            Türkçe yemek adı kullan.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Bu yemeği analiz et' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');

    res.json({ analysis });
  } catch (error) {
    console.error('Photo Analysis Error:', error);
    res.status(500).json({ error: 'Fotoğraf analiz edilemedi' });
  }
});

// POST /api/ai/weekly-report — Haftalık AI analiz
aiRouter.post('/weekly-report', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.body;

    const { data: logs } = await supabaseAdmin
      .from('meal_logs')
      .select('*')
      .eq('client_id', clientId)
      .gte('logged_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('logged_at', { ascending: false });

    const { data: measurements } = await supabaseAdmin
      .from('measurements')
      .select('*')
      .eq('client_id', clientId)
      .order('measured_at', { ascending: false })
      .limit(4);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Bir diyetisyen asistanı olarak haftalık analiz yap. Türkçe, kısa ve net.',
        },
        {
          role: 'user',
          content: `Son 7 gün öğün logları: ${JSON.stringify(logs || [])}
          Ölçümler: ${JSON.stringify(measurements || [])}
          
          Analiz et:
          1. Öğün düzeni nasıl?
          2. Protein/karb/yağ dengesi
          3. Kilo trendi
          4. 3 somut öneri`,
        },
      ],
      max_tokens: 600,
    });

    res.json({
      report: completion.choices[0]?.message?.content,
      logsCount: logs?.length || 0,
    });
  } catch (error) {
    console.error('Weekly Report Error:', error);
    res.status(500).json({ error: 'Rapor oluşturulamadı' });
  }
});

// Yardımcı: Danışan bağlamını derle
async function buildContext(clientId: string) {
  const { data: plan } = await supabaseAdmin
    .from('diet_plans')
    .select('title, daily_kcal')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .single();

  const today = new Date().toISOString().split('T')[0];
  const { data: todayLogs } = await supabaseAdmin
    .from('meal_logs')
    .select('ai_analysis')
    .eq('client_id', clientId)
    .gte('logged_at', today);

  const consumedKcal = (todayLogs || []).reduce((sum, log) => {
    return sum + (log.ai_analysis?.estimatedKcal || 0);
  }, 0);

  const { data: aiProfile } = await supabaseAdmin
    .from('client_ai_profile')
    .select('disliked_foods')
    .eq('client_id', clientId)
    .single();

  return {
    planTitle: plan?.title,
    dailyKcal: plan?.daily_kcal || 2000,
    consumedKcal,
    remainingKcal: (plan?.daily_kcal || 2000) - consumedKcal,
    dislikes: aiProfile?.disliked_foods || [],
  };
}
