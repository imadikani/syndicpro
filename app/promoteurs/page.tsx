'use client';

import './promoteurs.css';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage, LangToggle } from '@/lib/i18n';

export default function PromoteursPage() {
  const { t } = useLanguage();

  // ROI calculator state
  const [roiUnits, setRoiUnits] = useState(80);
  const [roiFee, setRoiFee] = useState(850000);
  const [roiRate, setRoiRate] = useState(75);

  // Contact form state
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cCompany, setCCompany] = useState('');
  const [cUnits, setCUnits] = useState('');
  const [cMsg, setCMsg] = useState('');
  const [cLoading, setCLoading] = useState(false);
  const [cSuccess, setCSuccess] = useState(false);
  const [cError, setCError] = useState('');

  // ROI calculations
  const totalProject = roiUnits * roiFee;
  const currentCollection = Math.round(totalProject * (roiRate / 100));
  const orvaneCollection = Math.round(totalProject * 0.98);
  const projectGain = orvaneCollection - currentCollection;

  async function submitContact() {
    if (!cEmail || !cEmail.includes('@')) {
      setCError(t('promo_contact_email_required'));
      return;
    }
    setCError('');
    setCLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cName,
          email: cEmail,
          message: `[Promoteur] Société: ${cCompany} | Lots: ${cUnits} | ${cMsg}`,
        }),
      });
      if (!res.ok) throw new Error();
      setCSuccess(true);
    } catch {
      setCError(t('promo_contact_error'));
    } finally {
      setCLoading(false);
    }
  }

  const fmt = (n: number) => n.toLocaleString('fr-MA');

  return (
    <>
      {/* ── NAV ── */}
      <nav>
        <Link href="/" className="nav-brand" style={{ textDecoration: 'none' }}>
          <Image src="/logo_only.png" width={42} height={36} alt="Orvane" className="rounded-md" />
          <div className="nav-brand-text">
            <div className="nav-logo">orvane</div>
            <div className="nav-sub">by Orvane Labs</div>
          </div>
        </Link>
        <ul className="nav-links">
          <li><a href="#features">{t('promo_nav_features')}</a></li>
          <li><a href="#pipeline">{t('promo_nav_pipeline')}</a></li>
          <li><a href="#pricing">{t('promo_nav_pricing')}</a></li>
          <li><a href="#contact">{t('promo_nav_contact')}</a></li>
          <li><Link href="/login" className="nav-ghost">{t('promo_nav_login')}</Link></li>
          <li><a href="#contact" className="nav-cta">{t('promo_nav_demo')}</a></li>
          <li><LangToggle /></li>
        </ul>
        <div className="nav-mobile-actions">
          <LangToggle />
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-eyebrow">{t('promo_hero_eyebrow')}</div>
          <h1>{t('promo_hero_h1_1')}<br /><em>{t('promo_hero_h1_em')}</em></h1>
          <p className="hero-sub">{t('promo_hero_sub')}</p>
          <div className="hero-btns">
            <a href="#contact" className="btn-primary">{t('promo_hero_cta')}</a>
            <a href="#features" className="btn-secondary">{t('promo_hero_explore')}</a>
          </div>
        </div>

        {/* Desktop dashboard preview */}
        <div className="promo-dash-preview">
          <div className="promo-dash-window">
            <div className="promo-dash-titlebar">
              <div className="promo-dash-dots">
                <span /><span /><span />
              </div>
              <div className="promo-dash-titlebar-text">Orvane — Espace promoteur</div>
            </div>
            <div className="promo-dash-body">
              {/* Top bar */}
              <div className="promo-dash-topbar">
                <div className="promo-dash-topbar-left">
                  <span className="promo-dash-logo">orvane</span>
                  <span className="promo-dash-tab active">Pipeline</span>
                  <span className="promo-dash-tab">Tranches</span>
                  <span className="promo-dash-tab">Livraisons</span>
                  <span className="promo-dash-tab">Handoff</span>
                </div>
                <div className="promo-dash-avatar">AD</div>
              </div>

              {/* KPI row */}
              <div className="promo-dash-kpis">
                <div className="promo-dash-kpi">
                  <div className="promo-dash-kpi-label">Lots totaux</div>
                  <div className="promo-dash-kpi-value">248</div>
                </div>
                <div className="promo-dash-kpi">
                  <div className="promo-dash-kpi-label">Vendus</div>
                  <div className="promo-dash-kpi-value" style={{ color: '#34d399' }}>189</div>
                </div>
                <div className="promo-dash-kpi">
                  <div className="promo-dash-kpi-label">Livrés</div>
                  <div className="promo-dash-kpi-value" style={{ color: '#c4b5f4' }}>124</div>
                </div>
                <div className="promo-dash-kpi">
                  <div className="promo-dash-kpi-label">Encaissement</div>
                  <div className="promo-dash-kpi-value" style={{ color: '#34d399' }}>92.4%</div>
                </div>
              </div>

              {/* Table */}
              <div className="promo-dash-table">
                <div className="promo-dash-table-head">
                  <span>Projet</span>
                  <span>Lots</span>
                  <span>Vendus</span>
                  <span>Livrés</span>
                  <span>Statut</span>
                </div>
                {[
                  { name: 'Résidence Al Firdaws', lots: 120, sold: 118, delivered: 112, status: 'Livraison', color: '#34d399' },
                  { name: 'Résidence Yasmine', lots: 64, sold: 52, delivered: 12, status: 'Construction', color: '#c4b5f4' },
                  { name: 'Résidence Nakhil', lots: 36, sold: 19, delivered: 0, status: 'Commercialisation', color: '#fbbf24' },
                  { name: 'Résidence Atlas', lots: 28, sold: 28, delivered: 28, status: 'Handoff syndic', color: '#60a5fa' },
                ].map((r, i) => (
                  <div key={i} className="promo-dash-table-row">
                    <span className="promo-dash-table-name">{r.name}</span>
                    <span>{r.lots}</span>
                    <span>
                      <span className="promo-dash-rate-bar">
                        <span style={{ width: `${Math.round(r.sold / r.lots * 100)}%`, background: '#34d399' }} />
                      </span>
                      <span style={{ color: '#34d399', fontSize: 11, marginLeft: 6 }}>{r.sold}/{r.lots}</span>
                    </span>
                    <span>
                      <span className="promo-dash-rate-bar">
                        <span style={{ width: `${Math.round(r.delivered / r.lots * 100)}%`, background: '#c4b5f4' }} />
                      </span>
                      <span style={{ color: '#c4b5f4', fontSize: 11, marginLeft: 6 }}>{r.delivered}/{r.lots}</span>
                    </span>
                    <span style={{ color: r.color, fontSize: 11 }}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="promo-stats">
        <div className="promo-stats-inner">
          {[
            { value: '8+', label: t('promo_stats_projects') },
            { value: '900+', label: t('promo_stats_units') },
            { value: '92%', label: t('promo_stats_collection') },
            { value: '60h', label: t('promo_stats_time') },
          ].map((s, i) => (
            <div key={i}>
              <div className="promo-stat-value">{s.value}</div>
              <div className="promo-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PAIN SECTION ── */}
      <section className="promo-pain">
        <div className="promo-section-inner">
          <div className="promo-section-label">{t('promo_pain_label')}</div>
          <h2 className="promo-section-title">{t('promo_pain_h2')}</h2>
          <div className="promo-pain-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="promo-pain-card">
                <h3>{t(`promo_pain${i}_title` as keyof typeof t)}</h3>
                <p>{t(`promo_pain${i}_desc` as keyof typeof t)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── METRICS STRIP ── */}
      <section className="promo-metrics">
        <div className="promo-section-inner">
          <div className="promo-section-label">{t('promo_metrics_label')}</div>
          <h2 className="promo-section-title">{t('promo_metrics_h2')}</h2>
          <div className="promo-stats-inner">
            {[1, 2, 3, 4].map(i => (
              <div key={i}>
                <div className="promo-stat-value">{t(`promo_metric${i}_value` as keyof typeof t)}</div>
                <div className="promo-stat-label">{t(`promo_metric${i}_label` as keyof typeof t)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="promo-features" id="features">
        <div className="promo-section-inner">
          <div className="promo-section-label">{t('promo_feat_label')}</div>
          <h2 className="promo-section-title">
            {t('promo_feat_h2_1')} <em>{t('promo_feat_h2_em')}</em>
          </h2>
          <div className="promo-feat-grid">
            {[
              { icon: '📋', n: 1 },
              { icon: '💰', n: 2 },
              { icon: '👤', n: 3 },
              { icon: '🔑', n: 4 },
              { icon: '📄', n: 5 },
              { icon: '🔄', n: 6 },
            ].map(({ icon, n }) => (
              <div key={n} className="promo-feat-card">
                <div className="icon">{icon}</div>
                <h3>{t(`promo_f${n}_title` as keyof typeof t)}</h3>
                <p>{t(`promo_f${n}_desc` as keyof typeof t)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PIPELINE ── */}
      <section className="promo-pipeline" id="pipeline">
        <div className="promo-section-inner">
          <div className="promo-section-label">{t('promo_pipeline_label')}</div>
          <h2 className="promo-section-title">{t('promo_pipeline_h2')}</h2>
          <div className="promo-pipe-steps">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="promo-pipe-step">
                <div className="promo-pipe-dot">{i}</div>
                {i < 5 && <div className="promo-pipe-line" />}
                <div>
                  <h4>{t(`promo_pipe${i}_title` as keyof typeof t)}</h4>
                  <p>{t(`promo_pipe${i}_desc` as keyof typeof t)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUYER PORTAL ── */}
      <section className="promo-buyer">
        <div className="promo-section-inner">
          <div className="promo-section-label">{t('promo_buyer_label')}</div>
          <h2 className="promo-section-title">{t('promo_buyer_h2')}</h2>
          <div className="promo-buyer-grid">
            <div className="promo-buyer-text">
              <p className="sub">{t('promo_buyer_sub')}</p>
              <div className="promo-buyer-checklist">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="promo-buyer-check">
                    <span className="check-icon">✓</span>
                    <span>{t(`promo_buyer_check${i}` as keyof typeof t)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="promo-buyer-mockup">
              <div className="promo-buyer-mockup-header">
                <span>Mon espace acquéreur</span>
                <span>Apt B-204</span>
              </div>
              <div className="promo-buyer-mockup-items">
                <div className="promo-buyer-mockup-item">
                  <span>Tranche 1 — Réservation</span>
                  <span style={{ color: '#34d399' }}>✓ Payée</span>
                </div>
                <div className="promo-buyer-mockup-item">
                  <span>Tranche 2 — Fondations</span>
                  <span style={{ color: '#34d399' }}>✓ Payée</span>
                </div>
                <div className="promo-buyer-mockup-item">
                  <span>Tranche 3 — Gros œuvre</span>
                  <span style={{ color: '#fbbf24' }}>En attente</span>
                </div>
                <div className="promo-buyer-mockup-item">
                  <span>Avancement construction</span>
                  <span style={{ color: '#c4b5f4' }}>68%</span>
                </div>
                <div className="promo-buyer-mockup-item">
                  <span>Livraison estimée</span>
                  <span>Sept 2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MANAGED APPROACH ── */}
      <section className="promo-managed">
        <div className="promo-section-inner">
          <div className="promo-section-label">{t('promo_managed_label')}</div>
          <h2 className="promo-section-title">{t('promo_managed_h2')}</h2>
          <div className="promo-managed-grid">
            <div className="promo-managed-text">
              <p className="sub">{t('promo_managed_sub')}</p>
              <p>{t('promo_managed_p1')}</p>
              <p>{t('promo_managed_p2')}</p>
            </div>
            <div className="promo-managed-callout">
              <h3>Orvane vous accompagne</h3>
              <div className="promo-managed-callout-items">
                {[
                  'Configuration du projet et import des lots',
                  'Formation de votre équipe commerciale',
                  'Suivi des tranches et relances acquéreurs',
                  'Coordination des livraisons et PV',
                  'Handoff syndic clé en main',
                ].map((item, i) => (
                  <div key={i} className="promo-managed-callout-item">
                    <div className="dot" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROI CALCULATOR ── */}
      <section className="promo-roi" id="roi">
        <div className="promo-section-inner">
          <div className="promo-section-label">{t('promo_roi_label')}</div>
          <h2 className="promo-section-title">{t('promo_roi_h2')}</h2>
          <div className="promo-roi-grid">
            <div className="promo-roi-inputs">
              <div className="promo-roi-field">
                <label>{t('promo_roi_units')}</label>
                <input
                  type="number"
                  value={roiUnits}
                  onChange={e => setRoiUnits(Number(e.target.value) || 0)}
                  min={1}
                />
              </div>
              <div className="promo-roi-field">
                <label>{t('promo_roi_fee')}</label>
                <input
                  type="number"
                  value={roiFee}
                  onChange={e => setRoiFee(Number(e.target.value) || 0)}
                  min={0}
                />
              </div>
              <div className="promo-roi-field">
                <label>{t('promo_roi_rate')} ({roiRate}%)</label>
                <input
                  type="range"
                  value={roiRate}
                  onChange={e => setRoiRate(Number(e.target.value))}
                  min={10}
                  max={90}
                  style={{ accentColor: 'var(--primary)' }}
                />
              </div>
            </div>
            <div className="promo-roi-result">
              <div className="promo-roi-row">
                <span className="promo-roi-row-label">{t('promo_roi_current')}</span>
                <span className="promo-roi-row-value">{fmt(currentCollection)} MAD</span>
              </div>
              <div className="promo-roi-row">
                <span className="promo-roi-row-label">{t('promo_roi_with')}</span>
                <span className="promo-roi-row-value">{fmt(orvaneCollection)} MAD</span>
              </div>
              <div className="promo-roi-row">
                <span className="promo-roi-row-label">{t('promo_roi_gain')}</span>
                <span className="promo-roi-row-value gain">+{fmt(projectGain)} MAD{t('promo_roi_per_month')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="promo-pricing" id="pricing">
        <div className="promo-section-inner">
          <div className="promo-section-label">{t('promo_pricing_label')}</div>
          <h2 className="promo-section-title">{t('promo_pricing_h2')}</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: -40, marginBottom: 48 }}>
            {t('promo_pricing_sub')}
          </p>
          <div className="promo-pricing-grid">
            {/* Starter */}
            <div className="promo-price-card">
              <h3>{t('promo_tier1_name')}</h3>
              <div className="desc">{t('promo_tier1_desc')}</div>
              <div className="price">{t('promo_tier1_price')}</div>
              <div className="unit">{t('promo_tier1_unit')}</div>
              <ul>
                <li>{t('promo_tier1_f1')}</li>
                <li>{t('promo_tier1_f2')}</li>
                <li>{t('promo_tier1_f3')}</li>
                <li>{t('promo_tier1_f4')}</li>
              </ul>
              <a href="#contact" className="promo-price-btn">{t('promo_pricing_cta')}</a>
            </div>

            {/* Growth — featured */}
            <div className="promo-price-card featured">
              <h3>{t('promo_tier2_name')}</h3>
              <div className="desc">{t('promo_tier2_desc')}</div>
              <div className="price">{t('promo_tier2_price')}</div>
              <div className="unit">{t('promo_tier2_unit')}</div>
              <ul>
                <li>{t('promo_tier2_f1')}</li>
                <li>{t('promo_tier2_f2')}</li>
                <li>{t('promo_tier2_f3')}</li>
                <li>{t('promo_tier2_f4')}</li>
                <li>{t('promo_tier2_f5')}</li>
              </ul>
              <a href="#contact" className="promo-price-btn">{t('promo_pricing_cta')}</a>
            </div>

            {/* Enterprise */}
            <div className="promo-price-card">
              <h3>{t('promo_tier3_name')}</h3>
              <div className="desc">{t('promo_tier3_desc')}</div>
              <div className="price">{t('promo_tier3_price')}</div>
              <div className="unit">{t('promo_tier3_unit')}</div>
              <ul>
                <li>{t('promo_tier3_f1')}</li>
                <li>{t('promo_tier3_f2')}</li>
                <li>{t('promo_tier3_f3')}</li>
                <li>{t('promo_tier3_f4')}</li>
                <li>{t('promo_tier3_f5')}</li>
              </ul>
              <a href="#contact" className="promo-price-btn">{t('promo_pricing_contact')}</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT FORM ── */}
      <section className="promo-contact" id="contact">
        <div className="promo-section-inner">
          <div className="promo-section-label">{t('promo_contact_label')}</div>
          <h2 className="promo-section-title">{t('promo_contact_h2')}</h2>
          <div className="promo-contact-grid">
            <div className="promo-contact-text">
              <p className="sub">{t('promo_contact_sub')}</p>
            </div>
            <div className="promo-contact-form">
              {cSuccess ? (
                <div className="promo-contact-success">{t('promo_contact_success')}</div>
              ) : (
                <>
                  <div>
                    <label>{t('promo_contact_name')}</label>
                    <input value={cName} onChange={e => setCName(e.target.value)} />
                  </div>
                  <div>
                    <label>{t('promo_contact_email')}</label>
                    <input type="email" value={cEmail} onChange={e => setCEmail(e.target.value)} required />
                  </div>
                  <div>
                    <label>{t('promo_contact_company')}</label>
                    <input value={cCompany} onChange={e => setCCompany(e.target.value)} />
                  </div>
                  <div>
                    <label>{t('promo_contact_units')}</label>
                    <input type="number" value={cUnits} onChange={e => setCUnits(e.target.value)} />
                  </div>
                  <div>
                    <label>{t('promo_contact_message')}</label>
                    <textarea value={cMsg} onChange={e => setCMsg(e.target.value)} />
                  </div>
                  {cError && <div className="promo-contact-error">{cError}</div>}
                  <button
                    className="promo-contact-submit"
                    onClick={submitContact}
                    disabled={cLoading}
                    style={cLoading ? { opacity: 0.6 } : {}}
                  >
                    {cLoading ? t('promo_contact_sending') : t('promo_contact_submit')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="promo-footer">
        <div className="promo-footer-brand">
          <div className="logo">Orvane</div>
          <div className="by">by Orvane Labs</div>
        </div>
        <div className="promo-footer-copy">© 2026 Orvane Labs. Tous droits réservés.</div>
        <div className="promo-footer-links">
          <a href="#">Confidentialité</a>
          <a href="#">CGU</a>
          <Link href="/">Accueil</Link>
        </div>
      </footer>
    </>
  );
}
