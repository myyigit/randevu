import { useState, useEffect } from 'react';

function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-xl)',padding:32,width,maxWidth:'95%',boxShadow:'0 24px 64px rgba(0,0,0,0.4)',animation:'fadeIn .18s ease' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24 }}>
          <h3 style={{ margin:0,fontSize:18 }}>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize:18 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <div className="login-field">
      <label>{label}</label>
      <div className="login-input-wrapper"><span>{icon}</span>{children}</div>
    </div>
  );
}

const inputStyle = { background:'none',border:'none',color:'var(--text)',fontSize:14,width:'100%',outline:'none' };

// ── Danışan Ekle / Düzenle ──────────────────────────────────────────────────
export function ClientFormModal({ onClose, onSave, initial = null }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    birth_date: '', gender: 'female',
    goal: 'weight_loss', activity_level: 'moderate',
    medical_notes: '',
    ...initial,
  });
  const set = (k,v) => setForm(f => ({ ...f, [k]: v }));
  const isEdit = !!initial?.id;

  return (
    <Modal title={isEdit ? '✏️ Danışanı Düzenle' : '👤 Yeni Danışan'} onClose={onClose} width={540}>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <Field label="Ad Soyad" icon="👤">
            <input style={inputStyle} placeholder="Örn: Fatma Kaya" value={form.name} onChange={e=>set('name',e.target.value)} />
          </Field>
        </div>
        <Field label="E-posta" icon="📧">
          <input style={inputStyle} type="email" placeholder="ornek@mail.com" value={form.email} onChange={e=>set('email',e.target.value)} />
        </Field>
        <Field label="Telefon" icon="📱">
          <input style={inputStyle} placeholder="05XX XXX XX XX" value={form.phone} onChange={e=>set('phone',e.target.value)} />
        </Field>
        <Field label="Doğum Tarihi" icon="🎂">
          <input style={inputStyle} type="date" value={form.birth_date} onChange={e=>set('birth_date',e.target.value)} />
        </Field>
        <Field label="Cinsiyet" icon="⚤">
          <select style={inputStyle} value={form.gender} onChange={e=>set('gender',e.target.value)}>
            <option value="female">Kadın</option>
            <option value="male">Erkek</option>
          </select>
        </Field>
        <Field label="Hedef" icon="🎯">
          <select style={inputStyle} value={form.goal} onChange={e=>set('goal',e.target.value)}>
            <option value="weight_loss">Kilo Verme</option>
            <option value="muscle_gain">Kas Kazanımı</option>
            <option value="maintenance">Kilo Koruma</option>
          </select>
        </Field>
        <Field label="Aktivite Düzeyi" icon="🏃">
          <select style={inputStyle} value={form.activity_level} onChange={e=>set('activity_level',e.target.value)}>
            <option value="sedentary">Hareketsiz</option>
            <option value="light">Hafif Aktif</option>
            <option value="moderate">Orta Aktif</option>
            <option value="active">Aktif</option>
            <option value="very_active">Çok Aktif</option>
          </select>
        </Field>
        <div style={{ gridColumn:'1/-1' }}>
          <Field label="Tıbbi Notlar (isteğe bağlı)" icon="📋">
            <textarea style={{ ...inputStyle,resize:'none',lineHeight:1.6 }} rows={2}
              placeholder="Alerjiler, kronik hastalıklar..." value={form.medical_notes}
              onChange={e=>set('medical_notes',e.target.value)} />
          </Field>
        </div>
      </div>
      <div style={{ display:'flex',gap:12,justifyContent:'flex-end',marginTop:24 }}>
        <button className="btn btn-ghost" onClick={onClose}>İptal</button>
        <button className="btn btn-primary" disabled={!form.name.trim()} onClick={() => onSave(form)}>
          {isEdit ? '✅ Güncelle' : '✅ Danışan Ekle'}
        </button>
      </div>
    </Modal>
  );
}

// ── Ölçüm Ekle ──────────────────────────────────────────────────────────────
export function MeasurementModal({ onClose, onSave }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ measured_at: today, weight_kg:'', body_fat_pct:'', muscle_kg:'', waist_cm:'' });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <Modal title="📏 Yeni Ölçüm" onClose={onClose}>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <Field label="Tarih" icon="📅">
            <input style={inputStyle} type="date" value={form.measured_at} onChange={e=>set('measured_at',e.target.value)} />
          </Field>
        </div>
        <Field label="Kilo (kg)" icon="⚖️">
          <input style={inputStyle} type="number" step="0.1" placeholder="72.5" value={form.weight_kg} onChange={e=>set('weight_kg',e.target.value)} />
        </Field>
        <Field label="Yağ (%)" icon="📊">
          <input style={inputStyle} type="number" step="0.1" placeholder="28.5" value={form.body_fat_pct} onChange={e=>set('body_fat_pct',e.target.value)} />
        </Field>
        <Field label="Kas (kg)" icon="💪">
          <input style={inputStyle} type="number" step="0.1" placeholder="26.0" value={form.muscle_kg} onChange={e=>set('muscle_kg',e.target.value)} />
        </Field>
        <Field label="Bel (cm)" icon="📐">
          <input style={inputStyle} type="number" step="0.5" placeholder="78" value={form.waist_cm} onChange={e=>set('waist_cm',e.target.value)} />
        </Field>
      </div>
      <div style={{ display:'flex',gap:12,justifyContent:'flex-end',marginTop:24 }}>
        <button className="btn btn-ghost" onClick={onClose}>İptal</button>
        <button className="btn btn-primary" disabled={!form.weight_kg} onClick={() => onSave(form)}>✅ Kaydet</button>
      </div>
    </Modal>
  );
}

// ── Silme Onayı ─────────────────────────────────────────────────────────────
export function ConfirmDeleteModal({ name, onConfirm, onCancel }) {
  return (
    <Modal title="⚠️ Danışanı Sil" onClose={onCancel}>
      <p style={{ color:'var(--text-secondary)',marginBottom:8 }}>
        <strong>{name}</strong> adlı danışan ve tüm verisi (ölçümler, öğün logları, planlar) kalıcı olarak silinecek.
      </p>
      <p style={{ color:'var(--danger)',fontSize:13,marginBottom:24 }}>Bu işlem geri alınamaz!</p>
      <div style={{ display:'flex',gap:12,justifyContent:'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>İptal</button>
        <button className="btn btn-primary" style={{ background:'var(--danger)' }} onClick={onConfirm}>🗑️ Evet, Sil</button>
      </div>
    </Modal>
  );
}
