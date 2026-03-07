'use client';

import './login.css';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || '';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        setError('Email ou mot de passe incorrect');
        return;
      }
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('syndic_token', data.token);
      storage.setItem('syndic_user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch {
      setError('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell" style={s.shell}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logo}>Syndic<span style={{ color: '#c8b8e8' }}>Pro</span></div>
        <div style={s.logoSub}>by Mizane AI</div>

        {/* Heading */}
        <h1 style={s.heading}>Bon retour</h1>
        <p style={s.sub}>Gérez vos immeubles. Récupérez vos charges.</p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@syndicpro.ma"
              required
              style={s.input}
              autoComplete="email"
            />
          </div>

          <div style={s.field}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={s.label}>Mot de passe</label>
              <Link href="/forgot-password" style={s.forgotLink}>Mot de passe oublié ?</Link>
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
            <span style={s.checkboxLabel}>Se souvenir de moi</span>
          </label>

          {error && <div style={s.error}>{error}</div>}

          <button type="submit" disabled={loading} style={s.btn}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div style={s.footer}>
          Pas encore de compte ?{' '}
          <a href="#" style={s.footerLink} onClick={e => { e.preventDefault(); }}>Contactez-nous</a>
        </div>
      </div>
    </div>
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
    background: '#1a1410',
    border: '1px solid rgba(200,184,232,0.1)',
    borderRadius: 24,
    padding: '48px 44px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
  },
  logo: {
    fontFamily: "'Cormorant Garamond', serif",
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
    fontFamily: "'Cormorant Garamond', serif",
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
    color: '#c8b8e8',
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
    accentColor: '#7b5ea7',
    cursor: 'pointer',
    flexShrink: 0,
  },
  checkboxLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 300,
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
    background: 'linear-gradient(135deg,#7b5ea7,#9b6bc0)',
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
    color: '#c8b8e8',
    textDecoration: 'none',
  },
};
