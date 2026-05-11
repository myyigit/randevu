import { Router, Request, Response } from 'express';
import axios from 'axios';
import { supabaseAdmin } from '../lib/supabase';

export const notificationRouter = Router();

// WhatsApp mesaj gönder
async function sendWhatsApp(phone: string, message: string) {
  try {
    await axios.post(
      'https://waba.360dialog.io/v1/messages',
      {
        to: phone,
        type: 'text',
        text: { body: message },
      },
      {
        headers: { 'D360-API-KEY': process.env.WA_API_KEY! },
      }
    );
    return true;
  } catch (error) {
    console.error('WhatsApp Error:', error);
    return false;
  }
}

// Telegram mesaj gönder
async function sendTelegram(chatId: string, message: string) {
  try {
    await axios.post(
      `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }
    );
    return true;
  } catch (error) {
    console.error('Telegram Error:', error);
    return false;
  }
}

// SMS gönder (Twilio)
async function sendSMS(phone: string, message: string) {
  try {
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_NUMBER,
      to: phone,
    });
    return true;
  } catch (error) {
    console.error('SMS Error:', error);
    return false;
  }
}

// Kullanıcıya tercih ettiği kanaldan mesaj gönder
async function sendToUser(userId: string, message: string) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('phone, preferred_channel, telegram_chat_id')
    .eq('id', userId)
    .single();

  if (!user) return false;

  switch (user.preferred_channel) {
    case 'whatsapp':
      return sendWhatsApp(user.phone!, message);
    case 'telegram':
      return sendTelegram(user.telegram_chat_id!, message);
    case 'sms':
      return sendSMS(user.phone!, message);
    default:
      // push_only — Supabase Realtime + in-app notification
      return true;
  }
}

// POST /api/notifications/send — Bildirim gönder
notificationRouter.post('/send', async (req: Request, res: Response) => {
  try {
    const { userId, type, title, body } = req.body;

    // In-app bildirim oluştur
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body,
    });

    // Harici kanal ile gönder
    const sent = await sendToUser(userId, `${title}\n${body}`);

    res.json({ success: true, externalSent: sent });
  } catch (error) {
    console.error('Notification Error:', error);
    res.status(500).json({ error: 'Bildirim gönderilemedi' });
  }
});

// POST /api/notifications/appointment-reminder — Randevu hatırlatması
notificationRouter.post('/appointment-reminder', async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.body;

    const { data: appt } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        clients!inner(id, users:id(name, phone, preferred_channel, telegram_chat_id)),
        dietitians!inner(id, users:id(name))
      `)
      .eq('id', appointmentId)
      .single();

    if (!appt) {
      return res.status(404).json({ error: 'Randevu bulunamadı' });
    }

    const scheduledDate = new Date(appt.scheduled_at);
    const message = `📅 Randevu Hatırlatması\n${scheduledDate.toLocaleDateString('tr-TR')} saat ${scheduledDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}\nDiyetisyeniniz sizi bekliyor!`;

    const sent = await sendToUser(appt.client_id, message);

    // Log kaydı
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('preferred_channel')
      .eq('id', appt.client_id)
      .single();

    await supabaseAdmin.from('reminder_logs').insert({
      appointment_id: appointmentId,
      channel: user?.preferred_channel === 'push_only' ? 'push' : user?.preferred_channel || 'push',
    });

    res.json({ success: true, sent });
  } catch (error) {
    console.error('Reminder Error:', error);
    res.status(500).json({ error: 'Hatırlatma gönderilemedi' });
  }
});

export { sendToUser };
