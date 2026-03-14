'use client';

import './forgot.css';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || '';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<'EMAIL' | 'WHATSAPP' | null>(null);
  const [error, setError] = useState('');

  async function send(method: 'EMAIL' | 'WHATSAPP') {
    if (!email) { setError(t('forgot_email_required')); return; }
    setError('');
    setLoading(method);
    try {
      await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, method }),
      });
      sessionStorage.setItem('reset_email', email);
      sessionStorage.setItem('reset_method', method);
      router.push('/forgot-password/verify');
    } catch {
      setError(t('forgot_error_generic'));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={s.shell}>
      <div style={s.card}>
        <div style={s.logo}>orvane</div>
        <div style={s.logoSub}>by Orvane Labs</div>

        <h1 style={s.heading}>{t('forgot_title')}</h1>
        <p style={s.sub}>{t('forgot_sub')}</p>

        <div style={s.field}>
          <label style={s.label}>{t('forgot_email')}</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="vous@orvane.com"
            style={s.input}
            autoComplete="email"
            onKeyDown={e => e.key === 'Enter' && send('EMAIL')}
          />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <div style={s.btnRow}>
          <button
            onClick={() => send('EMAIL')}
            disabled={!!loading}
            style={{ ...s.btn, ...(loading === 'EMAIL' ? s.btnLoading : {}) }}
          >
            {loading === 'EMAIL' ? t('forgot_sending') : t('forgot_btn_email')}
          </button>
          <button
            onClick={() => send('WHATSAPP')}
            disabled={!!loading}
            style={{ ...s.btn, ...s.btnSecondary, ...(loading === 'WHATSAPP' ? s.btnLoading : {}) }}
          >
            {loading === 'WHATSAPP' ? t('forgot_sending') : t('forgot_btn_whatsapp')}
          </button>
        </div>

        <div style={s.footer}>
          <Link href="/login" style={s.footerLink}>{t('forgot_back')}</Link>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", padding: '24px',
    background: '#16131f',
  },
  card: {
    background: '#1d1a2e', border: '1px solid rgba(196,181,244,0.12)',
    borderRadius: 24, padding: '48px 44px', width: '100%', maxWidth: 420,
    boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
  },
  logo: {
    fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 600,
    color: '#e8e0ff', letterSpacing: 0.3, marginBottom: 2,
  },
  logoSub: {
    fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2,
    textTransform: 'uppercase', marginBottom: 36,
  },
  heading: {
    fontFamily: "'DM Sans', sans-serif", fontSize: 30, fontWeight: 300,
    color: 'white', margin: '0 0 8px', lineHeight: 1.15,
  },
  sub: {
    fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 300,
    margin: '0 0 28px', lineHeight: 1.6,
  },
  field: { marginBottom: 20 },
  label: {
    display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6,
  },
  input: {
    width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white',
    fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none',
    boxSizing: 'border-box',
  },
  error: {
    background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)',
    color: '#f87171', borderRadius: 10, padding: '10px 14px', fontSize: 13,
    marginBottom: 16,
  },
  btnRow: { display: 'flex', gap: 10, marginBottom: 0 },
  btn: {
    flex: 1, padding: '13px 8px', background: 'linear-gradient(135deg,#7c5cbf,#9b70e0)',
    border: 'none', borderRadius: 12, color: 'white', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'opacity 0.2s',
  },
  btnSecondary: {
    background: 'rgba(124,92,191,0.15)', border: '1px solid rgba(124,92,191,0.3)',
  },
  btnLoading: { opacity: 0.6, cursor: 'not-allowed' },
  footer: { marginTop: 24, textAlign: 'center' },
  footerLink: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' },
};
