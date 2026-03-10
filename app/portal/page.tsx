'use client';

import './portal.css';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage, LangToggle } from '@/lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || '';

export default function PortalPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/portal/auth/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, channel }),
      });
      // Always show verify screen (don't reveal if phone exists)
      sessionStorage.setItem('portal_phone', phone);
      sessionStorage.setItem('portal_channel', channel);
      router.push('/portal/verify');
    } catch {
      setError(t('portal_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="portal-shell" style={s.shell}>
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
          <div style={s.logo}>Orvane</div>
          <LangToggle style={{ border: '1px solid rgba(123,94,167,0.2)' }} />
        </div>
        <div style={s.logoSub}>{t('portal_title')}</div>

        <h1 style={s.heading}>{t('portal_h1')}</h1>
        <p style={s.sub}>{t('portal_sub')}</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>{t('portal_phone_label')}</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+212 6 XX XX XX XX"
              required
              style={s.input}
              autoComplete="tel"
            />
          </div>

          <div style={s.channelRow}>
            <span style={s.channelLabel}>{t('portal_receive')}</span>
            <div style={s.channelBtns}>
              <button
                type="button"
                style={{ ...s.channelBtn, ...(channel === 'whatsapp' ? s.channelBtnActive : {}) }}
                onClick={() => setChannel('whatsapp')}
              >
                {t('portal_whatsapp')}
              </button>
              <button
                type="button"
                style={{ ...s.channelBtn, ...(channel === 'sms' ? s.channelBtnActive : {}) }}
                onClick={() => setChannel('sms')}
              >
                {t('portal_sms')}
              </button>
            </div>
          </div>

          {error && <div style={s.error}>{error}</div>}

          <button type="submit" disabled={loading} style={s.btn}>
            {loading ? t('portal_sending') : t('portal_send')}
          </button>
        </form>

        <p style={s.note}>{t('portal_note')}</p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 },
  card: { background: 'white', borderRadius: 24, padding: '48px 40px', width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(26,20,16,0.08)', border: '1px solid rgba(0,0,0,0.06)' },
  logo: { fontFamily: "'DM Sans', sans-serif", fontSize: 24, fontWeight: 600, color: '#1a1410', letterSpacing: 0.3, marginBottom: 2 },
  logoSub: { fontSize: 9, color: '#8a7a6e', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 32 },
  heading: { fontFamily: "'DM Sans', sans-serif", fontSize: 32, fontWeight: 300, color: '#1a1410', margin: '0 0 8px', lineHeight: 1 },
  sub: { fontSize: 13, color: '#8a7a6e', fontWeight: 300, margin: '0 0 28px', lineHeight: 1.6 },
  form: { display: 'flex', flexDirection: 'column' },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 10, color: '#4a3f35', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  input: { width: '100%', padding: '12px 14px', background: '#faf7f2', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 10, color: '#1a1410', fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' },
  channelRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  channelLabel: { fontSize: 12, color: '#8a7a6e' },
  channelBtns: { display: 'flex', gap: 8 },
  channelBtn: { background: 'transparent', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 100, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: '#4a3f35', fontFamily: "'DM Sans', sans-serif" },
  channelBtnActive: { background: 'rgba(124,92,191,0.08)', border: '1.5px solid #7c5cbf', color: '#7c5cbf' },
  error: { background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#dc2626', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 14 },
  btn: { width: '100%', padding: 14, background: 'linear-gradient(135deg,#7c5cbf,#9b70e0)', border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  note: { marginTop: 20, fontSize: 11, color: '#8a7a6e', textAlign: 'center', lineHeight: 1.6 },
};
