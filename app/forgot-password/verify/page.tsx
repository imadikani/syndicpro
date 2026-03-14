'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || '';
const CODE_LENGTH = 6;

export default function VerifyResetPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const e = sessionStorage.getItem('reset_email') || '';
    const m = sessionStorage.getItem('reset_method') || '';
    if (!e) { router.replace('/forgot-password'); return; }
    setEmail(e);
    setMethod(m);
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const verify = useCallback(async (code: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (data.valid) {
        sessionStorage.setItem('reset_code', code);
        router.push('/forgot-password/reset');
      } else {
        setError(data.error || 'Code invalide ou expiré.');
        setDigits(Array(CODE_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }, [email, router]);

  function handleDigit(idx: number, val: string) {
    const ch = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = ch;
    setDigits(next);
    if (ch && idx < CODE_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
    if (next.every(d => d) && ch) verify(next.join(''));
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (pasted.length === CODE_LENGTH) {
      const next = pasted.split('');
      setDigits(next);
      inputRefs.current[CODE_LENGTH - 1]?.focus();
      verify(pasted);
    }
  }

  async function resend() {
    setResending(true);
    try {
      await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, method }),
      });
      setResendCooldown(60);
      setDigits(Array(CODE_LENGTH).fill(''));
      setError('');
      inputRefs.current[0]?.focus();
    } catch {
      setError('Erreur lors du renvoi.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div style={s.shell}>
      <div style={s.card}>
        <div style={s.logo}>orvane</div>
        <div style={s.logoSub}>by Orvane Labs</div>

        <h1 style={s.heading}>Vérifier votre identité</h1>
        <p style={s.sub}>
          Entrez le code à 6 chiffres envoyé{method === 'WHATSAPP' ? ' sur WhatsApp' : ' à'}{' '}
          <span style={{ color: '#c4b5f4' }}>{email}</span>
        </p>

        <div style={s.codeRow} onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              style={{
                ...s.digitBox,
                ...(d ? s.digitFilled : {}),
                ...(loading ? s.digitDisabled : {}),
              }}
              disabled={loading}
            />
          ))}
        </div>

        {error && <div style={s.error}>{error}</div>}

        {loading && <div style={s.checking}>Vérification...</div>}

        <div style={s.resendRow}>
          {resendCooldown > 0 ? (
            <span style={s.resendCooldown}>Renvoyer dans {resendCooldown}s</span>
          ) : (
            <button onClick={resend} disabled={resending} style={s.resendBtn}>
              {resending ? 'Envoi...' : 'Renvoyer le code'}
            </button>
          )}
        </div>

        <div style={s.footer}>
          <Link href="/forgot-password" style={s.footerLink}>← Retour</Link>
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
  codeRow: {
    display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24,
  },
  digitBox: {
    width: 50, height: 58, textAlign: 'center', fontSize: 24, fontWeight: 600,
    color: 'white', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
    outline: 'none', fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color 0.15s',
  },
  digitFilled: {
    border: '1px solid rgba(124,92,191,0.6)',
    background: 'rgba(124,92,191,0.1)',
  },
  digitDisabled: { opacity: 0.5 },
  error: {
    background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)',
    color: '#f87171', borderRadius: 10, padding: '10px 14px', fontSize: 13,
    marginBottom: 16, textAlign: 'center',
  },
  checking: {
    textAlign: 'center', fontSize: 13, color: 'rgba(196,181,244,0.5)', marginBottom: 16,
  },
  resendRow: { textAlign: 'center', marginBottom: 0 },
  resendCooldown: { fontSize: 12, color: 'rgba(255,255,255,0.25)' },
  resendBtn: {
    background: 'none', border: 'none', color: '#c4b5f4', fontSize: 13,
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline',
    padding: 0,
  },
  footer: { marginTop: 24, textAlign: 'center' },
  footerLink: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' },
};
