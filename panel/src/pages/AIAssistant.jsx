import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const QUICK_ACTIONS = [
  { icon: '📊', label: 'Haftalık Rapor', prompt: 'Tüm danışanlarımın son haftalık performans özetini çıkar' },
  { icon: '🍽️', label: 'Plan Önerisi', prompt: 'Kilo vermek isteyen 70kg kadın için 1600 kcal günlük diyet planı oluştur' },
  { icon: '📸', label: 'Öğün Analizi', prompt: 'Yulaf ezmesi, muz ve ceviz içeren bir kahvaltının besin değerlerini analiz et' },
  { icon: '⚠️', label: 'Risk Analizi', prompt: 'Son 7 günde öğün kaydı düzenli girmeyen danışanları listele' },
  { icon: '💊', label: 'Takviye Önerisi', prompt: 'Demir eksikliği olan danışan için takviye ve beslenme önerileri ver' },
  { icon: '🏋️', label: 'Egzersiz + Beslenme', prompt: 'Günlük 30 dakika yürüyüş yapan biri için uygun atıştırmalık önerileri' },
];

const DEMO_MESSAGES = [
  { role: 'assistant', content: 'Merhaba! 🥗 Ben DietSync AI asistanınız. Diyet planı oluşturma, besin analizi, danışan raporlama ve daha fazlasında size yardımcı olabilirim.\n\nNe ile başlamak istersiniz?' },
];

export default function AIAssistant() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  async function sendMessage(text) {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // API'ye gönder (eğer backend çalışıyorsa)
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          dietitianName: profile?.name || 'Diyetisyen',
          history: messages.slice(-6),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        throw new Error('API yanıt vermedi');
      }
    } catch {
      // Offline demo yanıt
      const demoReplies = [
        `📊 **${profile?.name || 'Diyetisyen'} Bey/Hanım**, talebinizi aldım.\n\nBu özellik backend API çalışır durumdayken tam performansla yanıt verecek. Şu an demo moddayız.\n\n**İpucu:** \`npm run dev\` ile API'yi başlatarak gerçek AI yanıtları alabilirsiniz.`,
        `🍽️ İşte önerdiğim plan:\n\n**Kahvaltı (350 kcal):** Yulaf ezmesi, muz, 5 badem\n**Ara Öğün (150 kcal):** Yeşil elma, 2 ceviz\n**Öğle (450 kcal):** Tavuk ızgara, bulgur pilavı, mevsim salata\n**Ara Öğün (100 kcal):** Havuç çubukları, humus\n**Akşam (400 kcal):** Somon ızgara, brokoli, kinoa\n\n*Toplam: ~1450 kcal · Protein: 32% · Karb: 43% · Yağ: 25%*`,
        `✅ Analiz tamamlandı.\n\n| Besin | Miktar | Kalori |\n|-------|--------|--------|\n| Yulaf ezmesi | 50g | 189 kcal |\n| Muz | 1 adet | 105 kcal |\n| Ceviz | 5 adet | 65 kcal |\n\n**Toplam: 359 kcal** · Protein: 10g · Karb: 58g · Yağ: 11g\n\nBu kahvaltı dengeli bir seçim. Protein oranını artırmak için 1 yumurta veya Yunan yoğurdu eklenebilir.`,
      ];
      setMessages(prev => [...prev, { role: 'assistant', content: demoReplies[Math.floor(Math.random() * demoReplies.length)] }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-in" style={{display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)'}}>
      {/* Quick Actions */}
      <div style={{display: 'flex', gap: 8, marginBottom: 'var(--space-lg)', flexWrap: 'wrap'}}>
        {QUICK_ACTIONS.map(qa => (
          <button key={qa.label} className="btn btn-ghost btn-sm" onClick={() => sendMessage(qa.prompt)} style={{fontSize: 12}}>
            {qa.icon} {qa.label}
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div className="card" style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
        <div ref={chatRef} style={{flex: 1, overflowY: 'auto', padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)'}}>
          {messages.map((msg, i) => (
            <div key={i} style={{display: 'flex', gap: 12, alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '75%'}}>
              {msg.role === 'assistant' && (
                <div style={{width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--info))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0}}>🤖</div>
              )}
              <div style={{
                background: msg.role === 'user' ? 'var(--primary)' : 'var(--surface)',
                color: msg.role === 'user' ? 'white' : 'var(--text)',
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{display: 'flex', gap: 12, alignSelf: 'flex-start'}}>
              <div style={{width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--info))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18}}>🤖</div>
              <div style={{background: 'var(--surface)', border: '1px solid var(--border)', padding: '12px 20px', borderRadius: '16px 16px 16px 4px', fontSize: 14}}>
                <span className="pulse" style={{display: 'inline-block'}}>⏳ Düşünüyorum...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{padding: 'var(--space-lg)', borderTop: '1px solid var(--border)', display: 'flex', gap: 'var(--space-md)'}}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && sendMessage(input)}
            placeholder="Plan oluştur, besin analiz et, rapor iste..."
            style={{flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--text)', fontSize: 14, outline: 'none'}}
            disabled={loading}
          />
          <button className="btn btn-primary" onClick={() => sendMessage(input)} disabled={loading || !input.trim()} style={{padding: '12px 24px'}}>
            📤 Gönder
          </button>
        </div>
      </div>
    </div>
  );
}
