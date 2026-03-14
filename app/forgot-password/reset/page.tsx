'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || '';

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const e = sessionStorage.getItem('reset_email') || '';
    const c = sessionStorage.getItem('reset_code') || '';
    if (!e || !c) { router.replace('/forgot-password'); return; }
    setEmail(e);
    setCode(c);
  }, []);

  function getStrength(pw: string): { score: number; label: string; color: string } {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score, label: t('fp_reset_strength_weak'), color: '#f87171' };
    if (score <= 3) return { score, label: t('fp_reset_strength_medium'), color: '#fbbf24' };
    return { score, label: t('fp_reset_strength_strong'), color: '#34d399' };
  }

  const strength = getStrength(newPassword);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError(t('fp_reset_mismatch')); return; }
    if (newPassword.length < 8) { setError(t('fp_reset_min_chars')); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t('fp_reset_error_server')); return; }
      sessionStorage.removeItem('reset_email');
      sessionStorage.removeItem('reset_method');
      sessionStorage.removeItem('reset_code');
      router.push('/login?reset=success');
    } catch {
      setError(t('fp_reset_error_network'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.shell}>
      <div style={s.card}>
        <div style={s.logo}>orvane</div>
        <div style={s.logoSub}>by Orvane Labs</div>

        <h1 style={s.heading}>{t('fp_reset_title')}</h1>
        <p style={s.sub}>{t('fp_reset_sub')}</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>{t('fp_reset_new_pw')}</label>
            <div style={s.inputWrap}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={s.input}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowNew(v => !v)} style={s.eyeBtn}>
                {showNew ? '🙈' : '👁'}
              </button>
            </div>
            {newPassword && (
              <div style={s.strengthRow}>
                <div style={s.strengthBar}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      style={{
                        ...s.strengthSeg,
                        background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.08)',
                      }}
                    />
                  ))}
                </div>
                <span style={{ ...s.strengthLabel, color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          <div style={s.field}>
            <label style={s.label}>{t('fp_reset_confirm_pw')}</label>
            <div style={s.inputWrap}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  ...s.input,
                  ...(confirmPassword && confirmPassword !== newPassword
                    ? { borderColor: 'rgba(248,113,113,0.5)' }
                    : confirmPassword && confirmPassword === newPassword
                    ? { borderColor: 'rgba(52,211,153,0.5)' }
                    : {}),
                }}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} style={s.eyeBtn}>
                {showConfirm ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && <div style={s.error}>{error}</div>}

          <button type="submit" disabled={loading} style={{ ...s.btn, ...(loading ? s.btnLoading : {}) }}>
            {loading ? t('fp_reset_submitting') : t('fp_reset_submit')}
          </button>
        </form>
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
  form: { display: 'flex', flexDirection: 'column', gap: 0 },
  field: { marginBottom: 20 },
  label: {
    display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6,
  },
  inputWrap: { position: 'relative' },
  input: {
    width: '100%', padding: '12px 44px 12px 14px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: 'white', fontSize: 14,
    fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0,
  },
  strengthRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 },
  strengthBar: { display: 'flex', gap: 4, flex: 1 },
  strengthSeg: { height: 3, flex: 1, borderRadius: 2, transition: 'background 0.2s' },
  strengthLabel: { fontSize: 11, fontWeight: 500, minWidth: 36 },
  error: {
    background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)',
    color: '#f87171', borderRadius: 10, padding: '10px 14px', fontSize: 13,
    marginBottom: 16,
  },
  btn: {
    width: '100%', padding: '14px', background: 'linear-gradient(135deg,#7c5cbf,#9b70e0)',
    border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'opacity 0.2s',
  },
  btnLoading: { opacity: 0.6, cursor: 'not-allowed' },
};
