'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useLanguage, LangToggle } from '@/lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || '';

// Internal plan IDs — never translated (used for logic)
const PLAN1 = 'Essentiel';
const PLAN2 = 'Professionnel';
const PLAN3 = 'Cabinet';
const PLAN4 = 'Grand Compte';

type ModalState = {
  open: boolean;
  plan: string | null;
};

export default function LandingPage() {
  const { t, lang } = useLanguage();
  const [modal, setModal] = useState<ModalState>({ open: false, plan: null });
  const [modalName, setModalName] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalPhone, setModalPhone] = useState('');
  const [modalBuildings, setModalBuildings] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(false);
  const [modalError, setModalError] = useState('');

  const [ctaEmail, setCtaEmail] = useState('');
  const [ctaLoading, setCtaLoading] = useState(false);
  const [ctaSuccess, setCtaSuccess] = useState(false);
  const [ctaError, setCtaError] = useState('');

  const modalNameRef = useRef<HTMLInputElement>(null);

  // Map internal plan ID → translated display name
  const planDisplayName = (plan: string | null) => plan
    ? ({ [PLAN1]: t('tier1_name'), [PLAN2]: t('tier2_name'), [PLAN3]: t('tier3_name'), [PLAN4]: t('tier4_name') }[plan] || plan)
    : null;

  function openModal(plan: string | null) {
    setModal({ open: true, plan });
    setModalName('');
    setModalEmail('');
    setModalPhone('');
    setModalBuildings(plan === PLAN1 ? '1' : plan === PLAN2 ? '5' : plan === PLAN3 ? '15' : plan === PLAN4 ? '30' : '');
    setModalSuccess(false);
    setModalError('');
    setModalLoading(false);
    setTimeout(() => modalNameRef.current?.focus(), 100);
  }

  function closeModal() {
    setModal({ open: false, plan: null });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = modal.open ? 'hidden' : '';
  }, [modal.open]);

  async function submitModal() {
    if (!modalEmail || !modalEmail.includes('@')) {
      setModalError(t('modal_email_invalid'));
      return;
    }
    setModalError('');
    setModalLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modalName, email: modalEmail, phone: modalPhone, buildings: modalBuildings || null, plan: modal.plan }),
      });
      const data = await res.json();
      if (res.ok || res.status === 200) {
        setModalSuccess(true);
      } else {
        setModalError(data.error || t('modal_error_generic'));
      }
    } catch {
      setModalError(t('modal_server_error'));
    } finally {
      setModalLoading(false);
    }
  }

  async function submitCta() {
    if (!ctaEmail || !ctaEmail.includes('@')) {
      setCtaError(t('modal_email_invalid'));
      return;
    }
    setCtaError('');
    setCtaLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ctaEmail }),
      });
      const data = await res.json();
      if (res.ok || res.status === 200) {
        setCtaSuccess(true);
      } else {
        setCtaError(data.error || t('cta_error'));
      }
    } catch {
      setCtaError(t('cta_server_error'));
    } finally {
      setCtaLoading(false);
    }
  }

  return (
    <>
      {/* NAV */}
      <nav>
        <div className="nav-brand">
          <Image src="/logo_only.png" width={36} height={36} alt="Orvane" className="rounded-md" />
          <div className="nav-brand-text">
            <div className="nav-logo">orvane</div>
            <div className="nav-sub">by Mizane AI</div>
          </div>
        </div>
        <ul className="nav-links">
          <li><a href="#features">{t('nav_features')}</a></li>
          <li><a href="#managed">{t('nav_approach')}</a></li>
          <li><a href="#pricing">{t('nav_pricing')}</a></li>
          <li><a href="#team">{t('nav_team')}</a></li>
          <li><a href="/login" className="nav-ghost">{t('nav_login')}</a></li>
          <li><a href="#contact" className="nav-cta" onClick={(e) => { e.preventDefault(); openModal(null); }}>{t('nav_demo')}</a></li>
          <li><LangToggle /></li>
        </ul>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-eyebrow">{t('hero_eyebrow')}</div>
          <h1>{t('hero_h1_1')}<br /><em>{t('hero_h1_em')}</em></h1>
          <p className="hero-sub">{t('hero_sub')}</p>
          <p className="hero-tagline">{t('hero_tagline')}</p>
          <div className="hero-btns">
            <button className="btn-primary" onClick={() => openModal(null)}>{t('hero_cta')}</button>
            <a href="#features" className="btn-secondary">{t('hero_explore')}</a>
          </div>
        </div>
        <div className="mockups">
          {/* Syndic dashboard phone */}
          <div className="phone">
            <div className="phone-notch" />
            <div className="screen-dash">
              <div className="dash-header">
                <div className="dh-eyebrow">{t('mock_collected')}</div>
                <div className="dh-amount">12 450 MAD</div>
                <div className="dh-sub">{t('mock_on')}</div>
              </div>
              <div className="dash-stats">
                <div className="ds-card"><div className="ds-label">{t('mock_buildings')}</div><div className="ds-val">3</div><div className="ds-sub">{t('mock_managed')}</div></div>
                <div className="ds-card"><div className="ds-label">{t('mock_unpaid')}</div><div className="ds-val" style={{ color: '#f87171' }}>6</div><div className="ds-sub">{t('mock_month')}</div></div>
              </div>
              <div className="dash-stitle">{t('mock_residents')}</div>
              {[
                { init: 'K', color: '#7b5ea7', name: 'Karim Benali', unit: 'A3 · Al Andalous', paid: true },
                { init: 'F', color: '#e8906a', name: 'Fatima Idrissi', unit: 'B1 · Al Andalous', paid: false },
                { init: 'O', color: '#34d399', name: 'Omar Tazi', unit: 'C2 · Résid. Safae', paid: true },
                { init: 'N', color: '#f87171', name: 'Nadia Cherkaoui', unit: 'A1 · Al Andalous', paid: false },
              ].map((r) => (
                <div key={r.name} className="dash-row">
                  <div className="dr-av" style={{ background: r.color }}>{r.init}</div>
                  <div><div className="dr-name">{r.name}</div><div className="dr-unit">{r.unit}</div></div>
                  <div className={`dr-status ${r.paid ? 'paid' : 'unpaid'}`}>{r.paid ? t('mock_paid') : t('mock_unpaid_status')}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Resident portal phone */}
          <div className="phone" style={{ transform: 'translateY(-22px)' }}>
            <div className="phone-notch" />
            <div className="screen-portal">
              <div className="portal-hdr">
                <div className="ph-bldg">Résidence Al Andalous</div>
                <div className="ph-name">Nadia Cherkaoui</div>
                <span className="ph-unit">{t('portal_apt')} A1</span>
              </div>
              <div className="portal-balance">
                <div className="pb-label">{t('mock_due')}</div>
                <div className="pb-amount">350 MAD</div>
                <div className="pb-due">{t('mock_deadline')}</div>
              </div>
              <button className="portal-paybtn">{t('mock_pay_now')}</button>
              <div className="portal-htitle">{t('mock_history')}</div>
              {[
                { key: '1', month: t('mock_hist1_month'), date: `${t('mock_paid_on')} 05/02` },
                { key: '2', month: t('mock_hist2_month'), date: `${t('mock_paid_on')} 07/01` },
                { key: '3', month: t('mock_hist3_month'), date: `${t('mock_paid_on')} 11/12` },
              ].map((h) => (
                <div key={h.key} className="ph-item">
                  <div><div className="phi-month">{h.month}</div><div className="phi-date">{h.date}</div></div>
                  <div className="phi-status paid">✓ 350 MAD</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM BAND */}
      <section className="problem-band">
        <div className="pb-inner">
          <div className="pb-label">{t('problem_label')}</div>
          <h2 className="pb-title">{t('problem_h2_1')}<br /><em>{t('problem_h2_em')}</em> {t('problem_h2_2')}</h2>
          <div className="problems">
            {[
              { num: '01', title: t('p1_title'), desc: t('p1_desc') },
              { num: '02', title: t('p2_title'), desc: t('p2_desc') },
              { num: '03', title: t('p3_title'), desc: t('p3_desc') },
            ].map((p) => (
              <div key={p.num} className="problem">
                <div className="problem-num">{p.num}</div>
                <div className="problem-title">{p.title}</div>
                <p className="problem-desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="stats">
        {[
          { num: '90', suf: '%', label: t('stat1_label') },
          { num: '3', suf: t('stat2_suf'), label: t('stat2_label') },
          { num: '0', suf: '', label: t('stat3_label') },
          { num: '4', suf: t('stat4_suf'), label: t('stat4_label') },
        ].map((s) => (
          <div key={s.label} className="stat">
            <div className="stat-num">{s.num}<em>{s.suf}</em></div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="section-label">{t('feat_label')}</div>
        <h2 className="section-title">{t('feat_h2_1')} <em>{t('feat_h2_em')}</em></h2>
        <div className="features-grid">
          {[
            { icon: '💳', title: t('f1_title'), desc: t('f1_desc') },
            { icon: '💬', title: t('f2_title'), desc: t('f2_desc') },
            { icon: '📊', title: t('f3_title'), desc: t('f3_desc') },
            { icon: '🏢', title: t('f4_title'), desc: t('f4_desc') },
            { icon: '📱', title: t('f5_title'), desc: t('f5_desc') },
            { icon: '📋', title: t('f6_title'), desc: t('f6_desc') },
          ].map((f) => (
            <div key={f.title} className="feat-card">
              <div className="feat-icon">{f.icon}</div>
              <div className="feat-title">{f.title}</div>
              <p className="feat-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FULLY MANAGED */}
      <section className="managed" id="managed">
        <div className="managed-inner">
          <div>
            <div className="section-label">{t('managed_label')}</div>
            <h2 className="section-title">{t('managed_h2_1')}<br /><em>{t('managed_h2_em1')}<br />{t('managed_h2_em2')}</em></h2>
            <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.75, fontWeight: 300, marginBottom: 36 }}>
              {t('managed_desc')}
            </p>
            <div className="timeline">
              {[
                { n: '1', week: t('tl1_week'), title: t('tl1_title'), desc: t('tl1_desc') },
                { n: '2', week: t('tl2_week'), title: t('tl2_title'), desc: t('tl2_desc') },
                { n: '3', week: t('tl3_week'), title: t('tl3_title'), desc: t('tl3_desc') },
                { n: '∞', week: t('tl4_week'), title: t('tl4_title'), desc: t('tl4_desc') },
              ].map((item) => (
                <div key={item.n} className="tl-item">
                  <div className="tl-dot">{item.n}</div>
                  <div>
                    <div className="tl-week">{item.week}</div>
                    <div className="tl-title">{item.title}</div>
                    <p className="tl-desc">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="managed-callout">
            <div className="mc-badge">{t('mc_badge')}</div>
            <div className="mc-title">{t('mc_title1')}<br /><em>{t('mc_title2')}</em></div>
            <div className="mc-quote">
              &ldquo;{t('mc_quote')}&rdquo;
            </div>
            <ul className="mc-list">
              {[t('mc_li1'), t('mc_li2'), t('mc_li3'), t('mc_li4'), t('mc_li5')].map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* ROI */}
      <section className="roi">
        <div className="roi-inner">
          <div>
            <div className="roi-label">{t('roi_label')}</div>
            <h2 className="roi-title">{t('roi_h2_1')}<br /><em>{t('roi_h2_em')}</em></h2>
            <p className="roi-desc">{t('roi_desc')}</p>
          </div>
          <div className="roi-card">
            <div className="roi-scenario">{t('roi_scenario')}</div>
            {[
              { label: t('roi_r1'), val: '50 000 MAD', cls: '' },
              { label: t('roi_r2'), val: '72%', cls: 'amber' },
              { label: t('roi_r3'), val: '~14 000 MAD', cls: '' },
              { label: t('roi_r4'), val: '+9 000 MAD/mois', cls: 'green' },
              { label: t('roi_r5'), val: '+1 600 MAD/mois', cls: 'green' },
              { label: t('roi_r6'), val: '2 400 MAD/mois', cls: '' },
            ].map((r) => (
              <div key={r.label} className="roi-row">
                <span className="roi-row-label">{r.label}</span>
                <span className={`roi-row-val ${r.cls}`}>{r.val}</span>
              </div>
            ))}
            <div className="roi-total">
              <div className="roi-total-label">{t('roi_total_label')}</div>
              <div className="roi-total-num">+8 200 MAD</div>
              <div className="roi-total-sub">{t('roi_total_sub')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="pricing">
        <div className="section-label">{t('pricing_label')}</div>
        <h2 className="section-title">{t('pricing_h2_1')} <em>{t('pricing_h2_em')}</em></h2>
        <div className="pricing-cards">
          {/* Essentiel */}
          <div className="p-card">
            <div className="p-tier">{t('tier1_name')}</div>
            <div className="p-price"><sup>MAD</sup>990<sub>/mois</sub></div>
            <div className="p-buildings">{t('tier1_buildings')}</div>
            <div className="p-divider" />
            <ul className="p-features">
              <li>{t('tier1_f1')}</li>
              <li>{t('tier1_f2')}</li>
              <li>{t('tier1_f3')}</li>
              <li>{t('tier1_f4')}</li>
              <li className="na">{t('tier1_na1')}</li>
              <li className="na">{t('tier1_na3')}</li>
            </ul>
            <div className="p-setup">{t('pricing_setup')} 5 000 MAD (unique)</div>
            <button className="p-btn" onClick={() => openModal(PLAN1)}>{t('btn_start')}</button>
          </div>
          {/* Professionnel */}
          <div className="p-card featured">
            <div className="p-badge">{t('pricing_popular')}</div>
            <div className="p-tier">{t('tier2_name')}</div>
            <div className="p-price"><sup>MAD</sup>2 400<sub>/mois</sub></div>
            <div className="p-buildings">{t('tier2_buildings')}</div>
            <div className="p-divider" />
            <ul className="p-features">
              <li>{t('tier2_f1')}</li>
              <li>{t('tier2_f2')}</li>
              <li>{t('tier2_f4')}</li>
              <li>{t('tier2_f5')}</li>
              <li>{t('tier2_f6')}</li>
              <li>{t('tier2_f7')}</li>
            </ul>
            <div className="p-setup">{t('pricing_setup')} 10 000 MAD (unique)</div>
            <button className="p-btn" onClick={() => openModal(PLAN2)}>{t('btn_start')}</button>
          </div>
          {/* Cabinet */}
          <div className="p-card">
            <div className="p-tier">{t('tier3_name')}</div>
            <div className="p-price"><sup>MAD</sup>5 500<sub>/mois</sub></div>
            <div className="p-buildings">{t('tier3_buildings')}</div>
            <div className="p-divider" />
            <ul className="p-features">
              <li>{t('tier3_f1')}</li>
              <li>{t('tier3_f2')}</li>
              <li>{t('tier3_f3')}</li>
              <li>{t('tier3_f4')}</li>
              <li>{t('tier3_f5')}</li>
              <li>{t('tier3_f6')}</li>
              <li>{t('tier3_f7')}</li>
            </ul>
            <div className="p-setup">{t('pricing_setup')} 20 000 MAD (unique)</div>
            <button className="p-btn" onClick={() => openModal(PLAN3)}>{t('btn_contact_team')}</button>
          </div>
          {/* Grand Compte */}
          <div className="p-card">
            <div className="p-tier">{t('tier4_name')}</div>
            <div className="p-price" style={{ fontSize: 26, lineHeight: 1.4, paddingTop: 8 }}>Sur<br />mesure</div>
            <div className="p-buildings">{t('tier4_buildings')}</div>
            <div className="p-divider" />
            <ul className="p-features">
              <li>{t('tier4_f1')}</li>
              <li>{t('tier4_f2')}</li>
              <li>{t('tier4_f3')}</li>
              <li>{t('tier4_f4')}</li>
              <li>{t('tier4_f5')}</li>
              <li>{t('tier4_f6')}</li>
              <li>{t('tier4_f7')}</li>
            </ul>
            <div className="p-setup" style={{ opacity: 0 }}>—</div>
            <button className="p-btn" onClick={() => openModal(PLAN4)}>{t('btn_contact_us')}</button>
          </div>
        </div>
        <div className="pricing-note">{t('pricing_note')} <a href="#contact">{t('pricing_annual')}</a></div>
      </section>

      {/* TEAM */}
      <section className="team" id="team">
        <div className="section-label">{t('team_label')}</div>
        <h2 className="section-title">{t('team_h2_1')}<br /><em>{t('team_h2_em')}</em></h2>
        <div className="team-grid">
          {[
            { init: 'I', grad: 'linear-gradient(135deg,#7b5ea7,#9b6bc0)', name: 'Imad Ikani', role: t('m1_role'), desc: t('m1_desc') },
            { init: 'A', grad: 'linear-gradient(135deg,#e8906a,#f0b090)', name: 'Asmaa Ikani', role: t('m2_role'), desc: t('m2_desc') },
            { init: 'J', grad: 'linear-gradient(135deg,#34d399,#10b981)', name: 'Jihane Ouzane', role: t('m3_role'), desc: t('m3_desc') },
            { init: 'S', grad: 'linear-gradient(135deg,#f87171,#e85555)', name: 'Sara Ikani', role: t('m4_role'), desc: t('m4_desc') },
          ].map((m) => (
            <div key={m.name} className="team-card">
              <div className="team-avatar" style={{ background: m.grad }}>{m.init}</div>
              <div className="team-name">{m.name}</div>
              <div className="team-role">{m.role}</div>
              <p className="team-desc">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="cta-wrap" id="contact">
        <div className="cta">
          <h2>{t('cta_h2')}</h2>
          <p>{t('cta_p')}</p>
          {ctaSuccess ? (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, padding: '14px 28px' }}>
                <span style={{ fontSize: 20 }}>✓</span>
                <span style={{ color: 'white', fontSize: 15 }}>{t('cta_received')}</span>
              </div>
            </div>
          ) : (
            <div className="cta-form" style={{ position: 'relative', zIndex: 1 }}>
              <input
                className="cta-input"
                type="email"
                placeholder={t('cta_placeholder')}
                value={ctaEmail}
                onChange={(e) => setCtaEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitCta()}
              />
              <button className="cta-btn" onClick={submitCta} disabled={ctaLoading}>
                {ctaLoading ? t('cta_sending') : t('cta_btn')}
              </button>
            </div>
          )}
          {ctaError && <p style={{ color: 'rgba(255,180,180,0.9)', fontSize: 13, marginTop: 10, position: 'relative', zIndex: 1 }}>{ctaError}</p>}
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="footer-brand">
          <div className="footer-logo">Orvane</div>
          <div className="footer-by">{t('footer_by')}</div>
        </div>
        <div className="footer-copy">{t('footer_copy')}</div>
        <div className="footer-links">
          <a href="#">{t('footer_privacy')}</a>
          <a href="#">{t('footer_terms')}</a>
          <a href="#">{t('footer_contact')}</a>
        </div>
      </footer>

      {/* DEMO MODAL */}
      {modal.open && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-box">
            <button className="modal-close" onClick={closeModal}>×</button>
            {modalSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>✓</div>
                <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 30, fontWeight: 300, color: '#1a1410', marginBottom: 10 }}>{t('modal_success_h3')}</h3>
                <p style={{ fontSize: 14, color: '#8a7a6e', lineHeight: 1.7, fontWeight: 300 }}>{t('modal_success_p')}</p>
                <button onClick={closeModal} style={{ marginTop: 24, padding: '12px 32px', background: '#1a1410', color: 'white', border: 'none', borderRadius: 100, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{t('close')}</button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 11, color: '#7b5ea7', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>{t('modal_label')}</p>
                <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 32, fontWeight: 300, color: '#1a1410', marginBottom: 6, lineHeight: 1.1 }}>
                  {modal.plan ? `${t('modal_plan_prefix')} ${planDisplayName(modal.plan)}` : t('modal_h3_start')}
                </h3>
                <p style={{ fontSize: 13, color: '#8a7a6e', marginBottom: 28, fontWeight: 300 }}>
                  {t('modal_sub')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: t('modal_name'), id: 'name', type: 'text', placeholder: 'Ex. Hassan Benali', value: modalName, set: setModalName },
                    { label: t('modal_email'), id: 'email', type: 'email', placeholder: 'vous@exemple.ma', value: modalEmail, set: setModalEmail },
                    { label: t('modal_phone'), id: 'phone', type: 'tel', placeholder: '+212 6 XX XX XX XX', value: modalPhone, set: setModalPhone },
                  ].map((field) => (
                    <div key={field.id}>
                      <label className="modal-label">{field.label}</label>
                      <input
                        ref={field.id === 'name' ? modalNameRef : undefined}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={field.value}
                        onChange={(e) => field.set(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && field.id === 'email' && submitModal()}
                        className="modal-input"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="modal-label">{t('modal_buildings')}</label>
                    <select className="modal-input" value={modalBuildings} onChange={(e) => setModalBuildings(e.target.value)} style={{ appearance: 'none', cursor: 'pointer' }}>
                      <option value="">{t('modal_select')}</option>
                      <option value="1">{t('modal_b1')}</option>
                      <option value="5">{t('modal_b2')}</option>
                      <option value="15">{t('modal_b3')}</option>
                      <option value="30">{t('modal_b4')}</option>
                    </select>
                  </div>
                </div>
                {modalError && <p style={{ color: '#f87171', fontSize: 13, marginTop: 12 }}>{modalError}</p>}
                <button className="modal-submit" onClick={submitModal} disabled={modalLoading}>
                  {modalLoading ? t('modal_submitting') : t('modal_submit')}
                </button>
                <p style={{ textAlign: 'center', fontSize: 11, color: '#8a7a6e', marginTop: 12 }}>{t('modal_no_commitment')}</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
