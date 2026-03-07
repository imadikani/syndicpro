'use client';

import { useState, useEffect, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || '';

type ModalState = {
  open: boolean;
  plan: string | null;
};

export default function LandingPage() {
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

  function openModal(plan: string | null) {
    setModal({ open: true, plan });
    setModalName('');
    setModalEmail('');
    setModalPhone('');
    setModalBuildings(plan === 'Essentiel' ? '1' : plan === 'Professionnel' ? '5' : plan === 'Cabinet' ? '15' : plan === 'Grand Compte' ? '30' : '');
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
      setModalError('Veuillez entrer un email valide.');
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
        setModalError(data.error || 'Une erreur est survenue. Réessayez.');
      }
    } catch {
      setModalError('Impossible de joindre le serveur. Réessayez dans un instant.');
    } finally {
      setModalLoading(false);
    }
  }

  async function submitCta() {
    if (!ctaEmail || !ctaEmail.includes('@')) {
      setCtaError('Veuillez entrer un email valide.');
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
        setCtaError(data.error || 'Une erreur est survenue.');
      }
    } catch {
      setCtaError('Impossible de joindre le serveur. Réessayez.');
    } finally {
      setCtaLoading(false);
    }
  }

  return (
    <>
      {/* NAV */}
      <nav>
        <div className="nav-brand">
          <div className="nav-logo">Syndic<span>Pro</span></div>
          <div className="nav-sub">by Mizane AI</div>
        </div>
        <ul className="nav-links">
          <li><a href="#features">Fonctionnalités</a></li>
          <li><a href="#managed">Notre approche</a></li>
          <li><a href="#pricing">Tarifs</a></li>
          <li><a href="#team">Équipe</a></li>
          <li><a href="/login" className="nav-ghost">Se connecter</a></li>
          <li><a href="#contact" className="nav-cta" onClick={(e) => { e.preventDefault(); openModal(null); }}>Demander une démo</a></li>
        </ul>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-eyebrow">Gestion d&apos;immeubles au Maroc</div>
          <h1>Gestion d&apos;immeuble<br /><em>sans le chaos</em></h1>
          <p className="hero-sub">Automatisez le recouvrement des charges, le suivi des paiements et la gestion des dépenses — avec rappels WhatsApp automatiques, sans envoyer un seul message manuellement.</p>
          <p className="hero-tagline">ميزان — Balance. Précision. Automatisation.</p>
          <div className="hero-btns">
            <button className="btn-primary" onClick={() => openModal(null)}>Demander une démo</button>
            <a href="#features" className="btn-secondary">Explorer la plateforme</a>
          </div>
        </div>
        <div className="mockups">
          {/* Syndic dashboard phone */}
          <div className="phone">
            <div className="phone-notch" />
            <div className="screen-dash">
              <div className="dash-header">
                <div className="dh-eyebrow">Mars 2026 · Collecté</div>
                <div className="dh-amount">12 450 MAD</div>
                <div className="dh-sub">sur 15 400 MAD · 80% collecté</div>
              </div>
              <div className="dash-stats">
                <div className="ds-card"><div className="ds-label">Immeubles</div><div className="ds-val">3</div><div className="ds-sub">gérés</div></div>
                <div className="ds-card"><div className="ds-label">Impayés</div><div className="ds-val" style={{ color: '#f87171' }}>6</div><div className="ds-sub">ce mois</div></div>
              </div>
              <div className="dash-stitle">Résidents — ce mois</div>
              {[
                { init: 'K', color: '#7b5ea7', name: 'Karim Benali', unit: 'A3 · Al Andalous', paid: true },
                { init: 'F', color: '#e8906a', name: 'Fatima Idrissi', unit: 'B1 · Al Andalous', paid: false },
                { init: 'O', color: '#34d399', name: 'Omar Tazi', unit: 'C2 · Résid. Safae', paid: true },
                { init: 'N', color: '#f87171', name: 'Nadia Cherkaoui', unit: 'A1 · Al Andalous', paid: false },
              ].map((r) => (
                <div key={r.name} className="dash-row">
                  <div className="dr-av" style={{ background: r.color }}>{r.init}</div>
                  <div><div className="dr-name">{r.name}</div><div className="dr-unit">{r.unit}</div></div>
                  <div className={`dr-status ${r.paid ? 'paid' : 'unpaid'}`}>{r.paid ? '✓ Payé' : '⚠ Impayé'}</div>
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
                <span className="ph-unit">Appartement A1</span>
              </div>
              <div className="portal-balance">
                <div className="pb-label">Montant dû</div>
                <div className="pb-amount">350 MAD</div>
                <div className="pb-due">Mars 2026 · Échéance le 10</div>
              </div>
              <button className="portal-paybtn">💳 Payer maintenant</button>
              <div className="portal-htitle">Historique</div>
              {[
                { month: 'Février 2026', date: 'Payé le 05/02' },
                { month: 'Janvier 2026', date: 'Payé le 07/01' },
                { month: 'Décembre 2025', date: 'Payé le 11/12' },
              ].map((h) => (
                <div key={h.month} className="ph-item">
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
          <div className="pb-label">Le problème</div>
          <h2 className="pb-title">Chaque syndic au Maroc vit<br /><em>la même crise</em> chaque mois</h2>
          <div className="problems">
            {[
              { num: '01', title: 'Relances qui épuisent', desc: "20 à 30% des résidents ne paient pas à temps. Des heures de messages WhatsApp, d'appels, de conversations gênantes dans l'ascenseur — ignorés à moitié." },
              { num: '02', title: 'Zéro visibilité financière', desc: "Pas de tableau de bord, pas de rapport en temps réel. En fin d'année, la réconciliation prend plusieurs jours et les copropriétaires contestent chaque ligne." },
              { num: '03', title: 'Litiges et méfiance', desc: '"Pourquoi 15 000 MAD pour l\'ascenseur ?" Dans les cas graves, ces litiges mènent à des poursuites personnelles contre le syndic.' },
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
          { num: '90', suf: '%', label: 'taux de recouvrement cible' },
          { num: '3', suf: 'sem', label: 'pour votre premier immeuble en ligne' },
          { num: '0', suf: '', label: 'message WhatsApp manuel à envoyer' },
          { num: '4', suf: '×', label: "plus d'immeubles gérés par manager" },
        ].map((s) => (
          <div key={s.label} className="stat">
            <div className="stat-num">{s.num}<em>{s.suf}</em></div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="section-label">Fonctionnalités</div>
        <h2 className="section-title">Tout ce dont un syndic a <em>besoin</em></h2>
        <div className="features-grid">
          {[
            { icon: '💳', title: 'Recouvrement automatisé', desc: "Charges générées le 1er du mois, suivi en temps réel. Marquez cash, virement ou carte instantanément depuis le tableau de bord." },
            { icon: '💬', title: 'Rappels WhatsApp IA', desc: "J+5, J+10, J+15, escalade J+20 — séquences automatiques bilingues français/arabe, personnalisées par nom et appartement." },
            { icon: '📊', title: 'Gestion des dépenses', desc: "Enregistrez chaque dépense avec justificatifs. Tableau de bord financier visible par les copropriétaires — les litiges disparaissent." },
            { icon: '🏢', title: 'Multi-immeubles', desc: "1 ou 100 immeubles depuis un tableau de bord unique. Chaque immeuble a son propre suivi, ses KPIs, son cycle de recouvrement." },
            { icon: '📱', title: 'Portail résident mobile', desc: "Chaque résident accède à son solde et historique via un lien WhatsApp. Sans application à installer." },
            { icon: '📋', title: 'Rapports automatiques', desc: "Rapport hebdomadaire au syndic chaque lundi. Rapport mensuel partagé avec les copropriétaires via le portail." },
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
            <div className="section-label">Notre approche</div>
            <h2 className="section-title">Entièrement géré.<br /><em>Pas un outil,<br />un service.</em></h2>
            <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.75, fontWeight: 300, marginBottom: 36 }}>
              Nous n&apos;envoyons pas un lien d&apos;inscription et disparaissons. Mizane AI configure chaque immeuble, gère chaque rappel et livre chaque rapport en votre nom.
            </p>
            <div className="timeline">
              {[
                { n: '1', week: 'Semaine 1', title: 'Kick-off & collecte', desc: "Un appel, on capture tout : liste des résidents, charges, historique. Vous ne remplissez rien vous-même." },
                { n: '2', week: 'Semaine 2', title: 'Configuration plateforme', desc: "Mizane AI configure l'immeuble, les charges et séquences de rappels. Votre première expérience est un tableau de bord fonctionnel." },
                { n: '3', week: 'Semaine 3', title: 'Intégration des résidents', desc: "Message WhatsApp d'intégration envoyé à tous vos résidents en votre nom. Premier cycle de recouvrement lancé." },
                { n: '∞', week: 'Mois 1+', title: 'Opérations continues', desc: "Rappels, réconciliation, rapport hebdomadaire chaque lundi, rapport mensuel copropriétaires. Nous gérons, vous supervisez." },
              ].map((t) => (
                <div key={t.n} className="tl-item">
                  <div className="tl-dot">{t.n}</div>
                  <div>
                    <div className="tl-week">{t.week}</div>
                    <div className="tl-title">{t.title}</div>
                    <p className="tl-desc">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="managed-callout">
            <div className="mc-badge">Principe fondateur</div>
            <div className="mc-title">L&apos;IA relance.<br /><em>Pas le syndic.</em></div>
            <div className="mc-quote">
              &ldquo;Le syndic doit toujours pouvoir dire : <strong>SyndicPro me fait recouvrer X MAD de plus par mois qu&apos;avant, et me coûte Y MAD.</strong> Si X n&apos;est pas supérieur à Y, nous avons échoué à la livraison — pas à la tarification.&rdquo;
            </div>
            <ul className="mc-list">
              {[
                'Chaque client a un responsable Mizane AI dédié',
                "Rapport de performance hebdomadaire — pas un log d'utilisation",
                'Si le taux de recouvrement baisse, on enquête',
                'Si les résidents ne répondent plus, on change le message',
                'Données exportables intégralement à tout moment',
              ].map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* ROI */}
      <section className="roi">
        <div className="roi-inner">
          <div>
            <div className="roi-label">Retour sur investissement</div>
            <h2 className="roi-title">Le calcul est<br /><em>simple</em></h2>
            <p className="roi-desc">Nous récupérons de l&apos;argent qui reste actuellement non collecté. Pour un syndic gérant 5 immeubles, le bénéfice mensuel dépasse 4× le coût de l&apos;abonnement dès le premier mois.</p>
          </div>
          <div className="roi-card">
            <div className="roi-scenario">Exemple — Syndic 5 immeubles</div>
            {[
              { label: 'Charges mensuelles dues', val: '50 000 MAD', cls: '' },
              { label: 'Taux de recouvrement actuel', val: '72%', cls: 'amber' },
              { label: 'Non collecté / mois', val: '~14 000 MAD', cls: '' },
              { label: 'Uplift recouvrement (→ 90%)', val: '+9 000 MAD/mois', cls: 'green' },
              { label: 'Gain de temps (20h × 80 MAD)', val: '+1 600 MAD/mois', cls: 'green' },
              { label: 'Abonnement SyndicPro', val: '2 400 MAD/mois', cls: '' },
            ].map((r) => (
              <div key={r.label} className="roi-row">
                <span className="roi-row-label">{r.label}</span>
                <span className={`roi-row-val ${r.cls}`}>{r.val}</span>
              </div>
            ))}
            <div className="roi-total">
              <div className="roi-total-label">Bénéfice net mensuel</div>
              <div className="roi-total-num">+8 200 MAD</div>
              <div className="roi-total-sub">soit 3.4× le coût de l&apos;abonnement</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="pricing">
        <div className="section-label">Tarifs</div>
        <h2 className="section-title">Simple et <em>transparent</em></h2>
        <div className="pricing-cards">
          {/* Essentiel */}
          <div className="p-card">
            <div className="p-tier">Essentiel</div>
            <div className="p-price"><sup>MAD</sup>990<sub>/mois</sub></div>
            <div className="p-buildings">1–2 immeubles inclus</div>
            <div className="p-divider" />
            <ul className="p-features">
              <li>Charges &amp; suivi paiements</li>
              <li>Rappels WhatsApp auto</li>
              <li>Portail résident mobile</li>
              <li>Tableau de bord complet</li>
              <li className="na">Gestion des dépenses</li>
              <li className="na">Module locatif</li>
              <li className="na">Rapports mensuels PDF</li>
            </ul>
            <div className="p-setup">Mise en service : 5 000 MAD (unique)</div>
            <button className="p-btn" onClick={() => openModal('Essentiel')}>Commencer</button>
          </div>
          {/* Professionnel */}
          <div className="p-card featured">
            <div className="p-badge">Populaire</div>
            <div className="p-tier">Professionnel</div>
            <div className="p-price"><sup>MAD</sup>2 400<sub>/mois</sub></div>
            <div className="p-buildings">3–8 immeubles inclus</div>
            <div className="p-divider" />
            <ul className="p-features">
              <li>Tout Essentiel inclus</li>
              <li>Gestion des dépenses</li>
              <li>Module revenus locatifs</li>
              <li>Rapports financiers mensuels</li>
              <li>Rappels SMS en secours</li>
              <li>Support prioritaire 24h</li>
              <li>Bilan mensuel dédié</li>
            </ul>
            <div className="p-setup">Mise en service : 10 000 MAD (unique)</div>
            <button className="p-btn" onClick={() => openModal('Professionnel')}>Commencer</button>
          </div>
          {/* Cabinet */}
          <div className="p-card">
            <div className="p-tier">Cabinet</div>
            <div className="p-price"><sup>MAD</sup>5 500<sub>/mois</sub></div>
            <div className="p-buildings">9–25 immeubles · +200 MAD/imm.</div>
            <div className="p-divider" />
            <ul className="p-features">
              <li>Tout Professionnel inclus</li>
              <li>Accès multi-utilisateurs</li>
              <li>Rapports personnalisés</li>
              <li>Manager ops dédié</li>
              <li>SLA 8h garanti</li>
              <li>Bilan trimestriel</li>
              <li>Paiement en ligne Phase 2</li>
            </ul>
            <div className="p-setup">Mise en service : 20 000 MAD (unique)</div>
            <button className="p-btn" onClick={() => openModal('Cabinet')}>Contacter l&apos;équipe</button>
          </div>
          {/* Grand Compte */}
          <div className="p-card">
            <div className="p-tier">Grand Compte</div>
            <div className="p-price" style={{ fontSize: 26, lineHeight: 1.4, paddingTop: 8 }}>Sur<br />mesure</div>
            <div className="p-buildings">25+ immeubles</div>
            <div className="p-divider" />
            <ul className="p-features">
              <li>Tout Cabinet inclus</li>
              <li>Marque blanche</li>
              <li>Infrastructure dédiée</li>
              <li>SLA personnalisé</li>
              <li>Intégration sur site</li>
              <li>CSM senior dédié</li>
              <li>Contrat personnalisé</li>
            </ul>
            <div className="p-setup" style={{ opacity: 0 }}>—</div>
            <button className="p-btn" onClick={() => openModal('Grand Compte')}>Nous contacter</button>
          </div>
        </div>
        <div className="pricing-note">Tous les prix HT (TVA 20%). Engagement 12 mois. <a href="#contact">Prépaiement annuel : −10%.</a></div>
      </section>

      {/* TEAM */}
      <section className="team" id="team">
        <div className="section-label">L&apos;équipe</div>
        <h2 className="section-title">Casablanca-based.<br /><em>Entièrement opérationnel.</em></h2>
        <div className="team-grid">
          {[
            { init: 'I', grad: 'linear-gradient(135deg,#7b5ea7,#9b6bc0)', name: 'Imad Ikani', role: 'CEO & CTO', desc: "Dirige l'entreprise et possède toute la pile technologique. Architecte et développeur de SyndicPro — full-stack et vision produit." },
            { init: 'A', grad: 'linear-gradient(135deg,#e8906a,#f0b090)', name: 'Asmaa Ikani', role: 'COO', desc: "Responsable de l'épine dorsale opérationnelle. Chaque intégration client, chaque immeuble mis en service, chaque séquence de rappels." },
            { init: 'J', grad: 'linear-gradient(135deg,#34d399,#10b981)', name: 'Jihane Ouzane', role: 'CPO & Co-Head Sales', desc: "Pilote la feuille de route produit et co-dirige le commercial. Traduit les retours clients en décisions produit." },
            { init: 'S', grad: 'linear-gradient(135deg,#f87171,#e85555)', name: 'Sara Ikani', role: 'CMO & Co-Head Sales', desc: "Responsable de la marque Mizane AI et de la génération de demande. Lead l'acquisition des syndics indépendants et PME." },
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
          <h2>Prêt à récupérer vos charges ?</h2>
          <p>Rejoignez les premiers syndics au Maroc qui digitalisent leur immeuble avec Mizane AI.</p>
          {ctaSuccess ? (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, padding: '14px 28px' }}>
                <span style={{ fontSize: 20 }}>✓</span>
                <span style={{ color: 'white', fontSize: 15 }}>Reçu ! Nous vous contactons dans 24h.</span>
              </div>
            </div>
          ) : (
            <div className="cta-form" style={{ position: 'relative', zIndex: 1 }}>
              <input
                className="cta-input"
                type="email"
                placeholder="Votre email professionnel"
                value={ctaEmail}
                onChange={(e) => setCtaEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitCta()}
              />
              <button className="cta-btn" onClick={submitCta} disabled={ctaLoading}>
                {ctaLoading ? 'Envoi...' : 'Demander une démo →'}
              </button>
            </div>
          )}
          {ctaError && <p style={{ color: 'rgba(255,180,180,0.9)', fontSize: 13, marginTop: 10, position: 'relative', zIndex: 1 }}>{ctaError}</p>}
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="footer-brand">
          <div className="footer-logo">Syndic<span>Pro</span></div>
          <div className="footer-by">by Mizane AI · Casablanca, Maroc</div>
        </div>
        <div className="footer-copy">© 2026 Mizane AI. Tous droits réservés.</div>
        <div className="footer-links">
          <a href="#">Confidentialité</a>
          <a href="#">CGU</a>
          <a href="#">Contact</a>
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
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 300, color: '#1a1410', marginBottom: 10 }}>Demande reçue !</h3>
                <p style={{ fontSize: 14, color: '#8a7a6e', lineHeight: 1.7, fontWeight: 300 }}>Notre équipe vous contactera dans les <strong style={{ color: '#1a1410' }}>24 heures</strong> pour organiser votre démo personnalisée.</p>
                <button onClick={closeModal} style={{ marginTop: 24, padding: '12px 32px', background: '#1a1410', color: 'white', border: 'none', borderRadius: 100, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Fermer</button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 11, color: '#7b5ea7', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>Demande de démo</p>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: '#1a1410', marginBottom: 6, lineHeight: 1.1 }}>
                  {modal.plan ? `Plan ${modal.plan}` : 'Commençons'}
                </h3>
                <p style={{ fontSize: 13, color: '#8a7a6e', marginBottom: 28, fontWeight: 300 }}>
                  Notre équipe vous contactera dans les 24h pour organiser une démo{modal.plan ? ` ${modal.plan}` : ''} personnalisée.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Prénom & Nom', id: 'name', type: 'text', placeholder: 'Ex. Hassan Benali', value: modalName, set: setModalName },
                    { label: 'Email *', id: 'email', type: 'email', placeholder: 'vous@exemple.ma', value: modalEmail, set: setModalEmail },
                    { label: 'WhatsApp / Téléphone', id: 'phone', type: 'tel', placeholder: '+212 6 XX XX XX XX', value: modalPhone, set: setModalPhone },
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
                    <label className="modal-label">Nombre d&apos;immeubles gérés</label>
                    <select className="modal-input" value={modalBuildings} onChange={(e) => setModalBuildings(e.target.value)} style={{ appearance: 'none', cursor: 'pointer' }}>
                      <option value="">Sélectionner...</option>
                      <option value="1">1–2 immeubles</option>
                      <option value="5">3–8 immeubles</option>
                      <option value="15">9–25 immeubles</option>
                      <option value="30">25+ immeubles</option>
                    </select>
                  </div>
                </div>
                {modalError && <p style={{ color: '#f87171', fontSize: 13, marginTop: 12 }}>{modalError}</p>}
                <button className="modal-submit" onClick={submitModal} disabled={modalLoading}>
                  {modalLoading ? 'Envoi en cours...' : 'Demander une démo →'}
                </button>
                <p style={{ textAlign: 'center', fontSize: 11, color: '#8a7a6e', marginTop: 12 }}>Aucun engagement. Réponse garantie en 24h.</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
