'use client';

import './login.css';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage, LangToggle } from '@/lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || '';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const resetSuccess = searchParams.get('reset') === 'success';

  useEffect(() => {
    const token = localStorage.getItem('syndic_token') || sessionStorage.getItem('syndic_token');
    if (!token) { setChecking(false); return; }
    const raw = localStorage.getItem('syndic_user') || sessionStorage.getItem('syndic_user');
    const user = raw ? JSON.parse(raw) : null;
    router.replace(user?.role === 'ADMIN' ? '/admin' : '/dashboard');
    // Don't setChecking(false) — we're navigating away
  }, []);

  if (checking) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t('login_error'));
        return;
      }
      if (remember) {
        localStorage.setItem('syndic_token', data.token);
        localStorage.setItem('syndic_user', JSON.stringify(data.user));
        sessionStorage.removeItem('syndic_token');
        sessionStorage.removeItem('syndic_user');
      } else {
        sessionStorage.setItem('syndic_token', data.token);
        sessionStorage.setItem('syndic_user', JSON.stringify(data.user));
        localStorage.removeItem('syndic_token');
        localStorage.removeItem('syndic_user');
      }
      router.push(data.user?.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch {
      setError(t('login_error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell" style={s.shell}>
      <div style={s.card}>
        {/* Logo + lang toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
          <div style={s.logo}>Orvane</div>
          <LangToggle style={{ marginTop: 4 }} />
        </div>
        <div style={s.logoSub}>by Mizane AI</div>

        {/* Heading */}
        <h1 style={s.heading}>{t('login_title')}</h1>
        <p style={s.sub}>{t('login_sub')}</p>

        {resetSuccess && (
          <div style={s.successBanner}>
            ✓ Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>{t('login_email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@orvane.com"
              required
              style={s.input}
              autoComplete="email"
            />
          </div>

          <div style={s.field}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={s.label}>{t('login_password')}</label>
              <Link href="/forgot-password" style={s.forgotLink}>{t('login_forgot')}</Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={s.input}
              autoComplete="current-password"
            />
          </div>

          <label style={s.checkboxRow}>
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              style={s.checkbox}
            />
            <span style={s.checkboxLabel}>{t('login_remember')}</span>
          </label>

          {error && <div style={s.error}>{error}</div>}

          <button type="submit" disabled={loading} style={s.btn}>
            {loading ? t('login_loading') : t('login_submit')}
          </button>
        </form>

        <div style={s.footer}>
          {t('login_no_account')}{' '}
          <a href="#" style={s.footerLink} onClick={e => { e.preventDefault(); }}>{t('login_contact')}</a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontFamily: "'DM Sans', sans-serif",
    padding: '24px',
  },
  card: {
    background: '#1d1a2e',
    border: '1px solid rgba(196,181,244,0.12)',
    borderRadius: 24,
    padding: '48px 44px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
  },
  logo: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 26,
    fontWeight: 600,
    color: 'white',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  logoSub: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 36,
  },
  heading: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 36,
    fontWeight: 300,
    color: 'white',
    margin: '0 0 8px',
    lineHeight: 1,
  },
  sub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: 300,
    margin: '0 0 32px',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    display: 'block',
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: 'white',
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  forgotLink: {
    fontSize: 11,
    color: '#c4b5f4',
    textDecoration: 'none',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    marginBottom: 24,
  },
  checkbox: {
    width: 15,
    height: 15,
    accentColor: '#7c5cbf',
    cursor: 'pointer',
    flexShrink: 0,
  },
  checkboxLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 300,
  },
  successBanner: {
    background: 'rgba(52,211,153,0.1)',
    border: '1px solid rgba(52,211,153,0.25)',
    color: '#34d399',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
  },
  error: {
    background: 'rgba(248,113,113,0.12)',
    border: '1px solid rgba(248,113,113,0.25)',
    color: '#f87171',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
  },
  btn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg,#7c5cbf,#9b70e0)',
    border: 'none',
    borderRadius: 12,
    color: 'white',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'opacity 0.2s',
    marginBottom: 0,
  },
  footer: {
    marginTop: 28,
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
  footerLink: {
    color: '#c4b5f4',
    textDecoration: 'none',
  },
};
