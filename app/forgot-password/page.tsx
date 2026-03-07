'use client';

import './forgot.css';
import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="forgot-shell" style={s.shell}>
      <div style={s.card}>
        <div style={s.logo}>Syndic<span style={{ color: '#c8b8e8' }}>Pro</span></div>
        <div style={s.logoSub}>by Mizane AI</div>

        {submitted ? (
          <div style={s.successBox}>
            <div style={s.successIcon}>✓</div>
            <h2 style={s.successTitle}>Email envoyé</h2>
            <p style={s.successText}>
              Si un compte existe avec cet email, vous recevrez un lien de réinitialisation dans quelques minutes.
            </p>
            <Link href="/login" style={s.backLink}>← Retour à la connexion</Link>
          </div>
        ) : (
          <>
            <h1 style={s.heading}>Mot de passe oublié</h1>
            <p style={s.sub}>Entrez votre email et nous vous enverrons un lien de réinitialisation.</p>

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

              <button type="submit" style={s.btn}>
                Envoyer le lien de réinitialisation
              </button>
            </form>

            <div style={s.footer}>
              <Link href="/login" style={s.footerLink}>← Retour à la connexion</Link>
            </div>
          </>
        )}
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
    fontSize: 34,
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
    lineHeight: 1.6,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  field: {
    marginBottom: 20,
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
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
  },
  footerLink: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textDecoration: 'none',
  },
  successBox: {
    textAlign: 'center',
    paddingTop: 8,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'rgba(52,211,153,0.15)',
    border: '1px solid rgba(52,211,153,0.3)',
    color: '#34d399',
    fontSize: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  successTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 28,
    fontWeight: 300,
    color: 'white',
    margin: '0 0 12px',
  },
  successText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 1.7,
    fontWeight: 300,
    margin: '0 0 28px',
  },
  backLink: {
    fontSize: 13,
    color: '#c8b8e8',
    textDecoration: 'none',
  },
};
