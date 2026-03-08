'use client';

import './dashboard.css';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage, LangToggle } from '@/lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || '';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Building = {
  id: string;
  name: string;
  address: string;
  city: string;
  totalUnits: number;
  monthlyFee: number;
  color: string;
  stats: { totalCollected: number; totalExpected: number; collectionRate: number };
};

type Payment = {
  id: string;
  month: number;
  year: number;
  amount: number;
  status: 'PAID' | 'PENDING' | 'LATE' | 'WAIVED';
  paidAt: string | null;
  unit: {
    number: string;
    buildingId: string;
    building?: { id: string; name: string } | null;
    resident?: { id: string; name: string; phone: string; isOwner: boolean } | null;
  };
};

type Expense = {
  id: string;
  label: string;
  amount: number;
  category: string;
  date: string;
  dueDate: string | null;
  isPaid: boolean;
  buildingId: string;
  building?: { name: string } | null;
};

type Reminder = {
  id: string;
  channel: string;
  status: string;
  message: string;
  sentAt: string;
  resident: {
    name: string;
    phone: string;
    unit?: { number: string; building?: { name: string } | null } | null;
  };
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const CAT_LABELS_FR: Record<string, string> = {
  ENTRETIEN: 'Entretien', REPARATION: 'Réparation', SECURITE: 'Sécurité',
  ELECTRICITE: 'Électricité', EAU: 'Eau', ASSURANCE: 'Assurance', AUTRE: 'Autre',
};
const CAT_LABELS_EN: Record<string, string> = {
  ENTRETIEN: 'Maintenance', REPARATION: 'Repair', SECURITE: 'Security',
  ELECTRICITE: 'Electricity', EAU: 'Water', ASSURANCE: 'Insurance', AUTRE: 'Other',
};
const CAT_COLORS: Record<string, string> = {
  ENTRETIEN: '#7b5ea7', REPARATION: '#f87171', SECURITE: '#34d399',
  ELECTRICITE: '#fbbf24', EAU: '#60a5fa', ASSURANCE: '#e8906a', AUTRE: '#9ca3af',
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type Tab = 'overview' | 'buildings' | 'residents' | 'expenses' | 'reminders';

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { t, lang } = useLanguage();
  const CAT_LABELS = lang === 'en' ? CAT_LABELS_EN : CAT_LABELS_FR;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [customReminderOpen, setCustomReminderOpen] = useState(false);
  const [customReminderResidentId, setCustomReminderResidentId] = useState('');
  const [customReminderMsg, setCustomReminderMsg] = useState('');
  const [customReminderLoading, setCustomReminderLoading] = useState(false);
  const [customReminderError, setCustomReminderError] = useState('');
  const [newExpense, setNewExpense] = useState({ label: '', amount: '', date: '', dueDate: '', buildingId: '', category: 'ENTRETIEN', isPaid: true });
  const [addExpenseLoading, setAddExpenseLoading] = useState(false);
  const [addExpenseError, setAddExpenseError] = useState('');
  const [expenseBuildingFilter, setExpenseBuildingFilter] = useState('All');
  const [residentBuildingFilter, setResidentBuildingFilter] = useState('All');
  const [residentStatusFilter, setResidentStatusFilter] = useState<'All' | 'PAID' | 'PENDING' | 'LATE'>('All');
  const [addResidentOpen, setAddResidentOpen] = useState(false);
  const [newResident, setNewResident] = useState({ name: '', phone: '', buildingId: '', unitNumber: '', isOwner: false });
  const [addResidentLoading, setAddResidentLoading] = useState(false);
  const [addResidentError, setAddResidentError] = useState('');
  const [reminderSent, setReminderSent] = useState<string[]>([]);

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token =
      localStorage.getItem('syndic_token') ||
      sessionStorage.getItem('syndic_token');

    if (!token) {
      router.push('/login');
      return;
    }
    tokenRef.current = token;

    async function loadData() {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [buildingsRes, paymentsRes, expensesRes, remindersRes] = await Promise.all([
          fetch(`${API_BASE}/api/buildings`, { headers }),
          fetch(`${API_BASE}/api/payments?month=3&year=2026`, { headers }),
          fetch(`${API_BASE}/api/expenses`, { headers }),
          fetch(`${API_BASE}/api/reminders`, { headers }),
        ]);

        const [buildingsData, paymentsData, expensesData, remindersData] = await Promise.all([
          buildingsRes.ok ? buildingsRes.json() : [],
          paymentsRes.ok ? paymentsRes.json() : [],
          expensesRes.ok ? expensesRes.json() : [],
          remindersRes.ok ? remindersRes.json() : [],
        ]);

        setBuildings(Array.isArray(buildingsData) ? buildingsData : []);
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);
        setExpenses(Array.isArray(expensesData) ? expensesData : []);
        setReminders(Array.isArray(remindersData) ? remindersData : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('dash_error_loading'));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Global KPIs
  const totalCollected = buildings.reduce((s, b) => s + (b.stats?.totalCollected || 0), 0);
  const totalDue = buildings.reduce((s, b) => s + (b.stats?.totalExpected || 0), 0);
  const totalUnpaid = totalDue - totalCollected;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const pendingCount = payments.filter(p => p.status !== 'PAID').length;
  const collectionRate = totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0;

  const buildingResidents = selectedBuilding
    ? payments.filter(p => p.unit?.building?.id === selectedBuilding || p.unit?.buildingId === selectedBuilding)
    : [];

  async function handleMarkExpensePaid(id: string, isPaid: boolean) {
    try {
      const res = await fetch(`${API_BASE}/api/expenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenRef.current}` },
        body: JSON.stringify({ isPaid }),
      });
      if (res.ok) setExpenses(prev => prev.map(e => e.id === id ? { ...e, isPaid } : e));
    } catch { /* silent */ }
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm(t('dash_delete_expense_confirm'))) return;
    try {
      const res = await fetch(`${API_BASE}/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (res.ok) setExpenses(prev => prev.filter(e => e.id !== id));
    } catch { /* silent */ }
  }

  async function handleAddExpense() {
    setAddExpenseError('');
    if (!newExpense.label || !newExpense.amount || !newExpense.date || !newExpense.buildingId) {
      setAddExpenseError(t('dash_required_fields'));
      return;
    }
    setAddExpenseLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenRef.current}` },
        body: JSON.stringify({ ...newExpense, amount: parseFloat(newExpense.amount) }),
      });
      const data = await res.json();
      if (!res.ok) { setAddExpenseError(data.error || t('dash_error_add')); return; }
      setExpenses(prev => [data, ...prev]);
      setAddExpenseOpen(false);
      setNewExpense({ label: '', amount: '', date: '', dueDate: '', buildingId: '', category: 'ENTRETIEN', isPaid: true });
    } catch {
      setAddExpenseError(t('dash_error_connection'));
    } finally {
      setAddExpenseLoading(false);
    }
  }

  async function handleCustomReminder() {
    setCustomReminderError('');
    if (!customReminderResidentId || !customReminderMsg.trim()) {
      setCustomReminderError(t('dash_reminder_required'));
      return;
    }
    setCustomReminderLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenRef.current}` },
        body: JSON.stringify({ residentId: customReminderResidentId, customMessage: customReminderMsg }),
      });
      const data = await res.json();
      if (!res.ok) { setCustomReminderError(data.error || t('dash_error_send')); return; }
      if (data.reminder) setReminders(prev => [{ ...data.reminder, resident: payments.find(p => p.unit?.resident && p.unit.resident)?.unit?.resident }, ...prev]);
      setCustomReminderOpen(false);
      setCustomReminderResidentId('');
      setCustomReminderMsg('');
    } catch {
      setCustomReminderError(t('dash_error_connection'));
    } finally {
      setCustomReminderLoading(false);
    }
  }

  function sendReminder(id: string) {
    setReminderSent(prev => [...prev, id]);
  }

  async function handleAddResident() {
    setAddResidentError('');
    if (!newResident.name || !newResident.phone || !newResident.buildingId || !newResident.unitNumber) {
      setAddResidentError(t('dash_required_fields'));
      return;
    }
    setAddResidentLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/residents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenRef.current}` },
        body: JSON.stringify(newResident),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddResidentError(data.error || t('dash_error_add'));
        return;
      }
      // Refresh payments to show new resident
      const paymentsRes = await fetch(`${API_BASE}/api/payments?month=3&year=2026`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (paymentsRes.ok) setPayments(await paymentsRes.json());
      setAddResidentOpen(false);
      setNewResident({ name: '', phone: '', buildingId: '', unitNumber: '', isOwner: false });
    } catch {
      setAddResidentError(t('dash_error_connection'));
    } finally {
      setAddResidentLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('syndic_token');
    localStorage.removeItem('syndic_user');
    sessionStorage.removeItem('syndic_token');
    sessionStorage.removeItem('syndic_user');
    router.push('/login');
  }

  const storedUser = typeof window !== 'undefined'
    ? localStorage.getItem('syndic_user') || sessionStorage.getItem('syndic_user')
    : null;
  const userName = storedUser ? JSON.parse(storedUser).name : 'Imad Ikani';

  if (loading) {
    return (
      <div className="dashboard-shell" style={{ ...styles.shell, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(200,184,232,0.6)', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' }}>{t('dash_loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-shell" style={{ ...styles.shell, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#f87171', fontSize: 14 }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell" style={styles.shell}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarBrand}>
          <div style={styles.brandLogo}>Syndic<span style={{ color: '#c8b8e8' }}>Pro</span></div>
          <div style={styles.brandSub}>by Mizane AI</div>
        </div>

        <nav style={styles.sidebarNav}>
          {([
            { id: 'overview', icon: '◈', label: t('dash_overview') },
            { id: 'buildings', icon: '⬡', label: t('dash_buildings') },
            { id: 'residents', icon: '◎', label: t('dash_residents') },
            { id: 'expenses', icon: '◉', label: t('dash_expenses') },
            { id: 'reminders', icon: '◈', label: t('dash_reminders') },
          ] as { id: Tab; icon: string; label: string }[]).map(item => (
            <button
              key={item.id}
              style={{ ...styles.navItem, ...(activeTab === item.id ? styles.navItemActive : {}) }}
              onClick={() => { setActiveTab(item.id); setSelectedBuilding(null); }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userBadge}>
            <div style={styles.userAvatar}>{userName[0]}</div>
            <div>
              <div style={styles.userName}>{userName}</div>
              <div style={styles.userRole}>{t('user_role_admin')}</div>
            </div>
          </div>
          <LangToggle style={{ marginBottom: 8 }} />
          <button style={styles.logoutBtn} onClick={logout}>{t('dash_logout')}</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        {/* HEADER */}
        <header style={styles.header}>
          <div>
            <div style={styles.headerEyebrow}>Mars 2026</div>
            <h1 style={styles.headerTitle}>
              {activeTab === 'overview' && t('dash_overview')}
              {activeTab === 'buildings' && (selectedBuilding ? buildings.find(b => b.id === selectedBuilding)?.name : t('dash_buildings'))}
              {activeTab === 'residents' && t('dash_residents_payments')}
              {activeTab === 'expenses' && t('dash_expenses')}
              {activeTab === 'reminders' && t('dash_reminders')}
            </h1>
          </div>
          <div style={styles.headerRate}>
            <div style={styles.rateLabel}>{t('dash_collection_rate')}</div>
            <div style={styles.rateValue}>{collectionRate}<span style={{ fontSize: 18, color: '#c8b8e8' }}>%</span></div>
          </div>
        </header>

        <div style={styles.content}>

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div>
              {/* KPI STRIP */}
              <div style={styles.kpiGrid}>
                {[
                  { label: t('dash_collected_month_kpi'), value: `${totalCollected.toLocaleString()} MAD`, sub: `${t('dash_on_of')} ${totalDue.toLocaleString()} MAD ${t('dash_due_text')}`, color: '#34d399' },
                  { label: t('dash_unpaid'), value: `${totalUnpaid.toLocaleString()} MAD`, sub: `${pendingCount} ${t('dash_late_residents')}`, color: '#f87171' },
                  { label: t('dash_buildings_managed_kpi'), value: buildings.length.toString(), sub: `${buildings.reduce((s, b) => s + b.totalUnits, 0)} ${t('dash_total_units')}`, color: '#c8b8e8' },
                  { label: t('dash_expenses_month_kpi'), value: `${totalExpenses.toLocaleString()} MAD`, sub: `${expenses.length} ${t('dash_entries_pl')}`, color: '#fbbf24' },
                ].map(kpi => (
                  <div key={kpi.label} style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>{kpi.label}</div>
                    <div style={{ ...styles.kpiValue, color: kpi.color }}>{kpi.value}</div>
                    <div style={styles.kpiSub}>{kpi.sub}</div>
                  </div>
                ))}
              </div>

              {/* COLLECTION BAR */}
              <div style={styles.card}>
                <div style={styles.cardTitle}>{t('dash_collection_header')}</div>
                <div style={styles.collectionBar}>
                  <div style={{ ...styles.collectionFill, width: `${collectionRate}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <span style={styles.smallMuted}>{collectionRate}{t('dash_percent_collected')}</span>
                  <span style={styles.smallMuted}>{totalDue.toLocaleString()} {t('dash_total_due_label')}</span>
                </div>
              </div>

              {/* BUILDINGS OVERVIEW */}
              <div style={styles.cardTitle2}>{t('dash_status_by_building')}</div>
              <div style={styles.buildingRows}>
                {buildings.map(b => {
                  const rate = b.stats?.collectionRate || 0;
                  return (
                    <div key={b.id} style={styles.buildingRow} onClick={() => { setActiveTab('buildings'); setSelectedBuilding(b.id); }}>
                      <div style={{ ...styles.buildingDot, background: b.color }} />
                      <div style={{ flex: 1 }}>
                        <div style={styles.buildingRowName}>{b.name}</div>
                        <div style={styles.buildingRowSub}>{b.city} · {b.totalUnits} {t('dash_units_count')} · {b.monthlyFee} {t('dash_per_month_short')}</div>
                      </div>
                      <div style={styles.buildingRowBar}>
                        <div style={{ ...styles.buildingRowFill, width: `${rate}%`, background: b.color }} />
                      </div>
                      <div style={{ ...styles.buildingRateBadge, color: b.color }}>{rate}%</div>
                      <div style={styles.arrowIcon}>→</div>
                    </div>
                  );
                })}
              </div>

              {/* RECENT ACTIVITY */}
              <div style={styles.cardTitle2}>{t('dash_recent_activity')}</div>
              <div style={styles.card}>
                {payments.filter(p => p.status === 'PAID').slice(0, 3).map((p, i) => (
                  <div key={p.id} style={{ ...styles.activityRow, borderBottom: '1px solid rgba(200,184,232,0.1)' }}>
                    <div style={{ ...styles.activityIcon, color: '#34d399' }}>✓</div>
                    <div style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                      {p.unit?.resident?.name || t('dash_resident_fallback')} — {p.amount} {t('dash_mad_received')} ({p.unit?.building?.name || ''} {p.unit?.number || ''})
                    </div>
                    <div style={styles.activityTime}>{fmtDate(p.paidAt)}</div>
                  </div>
                ))}
                {reminders.slice(0, 2).map((r, i) => (
                  <div key={r.id} style={{ ...styles.activityRow, borderBottom: i < 1 ? '1px solid rgba(200,184,232,0.1)' : 'none' }}>
                    <div style={{ ...styles.activityIcon, color: '#7b5ea7' }}>💬</div>
                    <div style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                      {r.message} {t('dash_sent_to')} {r.resident?.name || 'résident'}
                    </div>
                    <div style={styles.activityTime}>{fmtDate(r.sentAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BUILDINGS ── */}
          {activeTab === 'buildings' && !selectedBuilding && (
            <div style={styles.buildingGrid}>
              {buildings.map(b => {
                const rate = b.stats?.collectionRate || 0;
                const collectedAmt = b.stats?.totalCollected || 0;
                return (
                  <div key={b.id} style={styles.buildingCard} onClick={() => setSelectedBuilding(b.id)}>
                    <div style={{ ...styles.buildingCardAccent, background: b.color }} />
                    <div style={styles.buildingCardHeader}>
                      <div style={{ ...styles.buildingCardIcon, background: b.color + '22', color: b.color }}>⬡</div>
                      <div style={{ ...styles.buildingCardRate, color: b.color }}>{rate}%</div>
                    </div>
                    <div style={styles.buildingCardName}>{b.name}</div>
                    <div style={styles.buildingCardAddress}>{b.address}</div>
                    <div style={styles.buildingCardAddress}>{b.city}</div>
                    <div style={styles.buildingCardStats}>
                      <div style={styles.bStat}>
                        <div style={styles.bStatVal}>{b.totalUnits}</div>
                        <div style={styles.bStatLabel}>{t('dash_units_kpi')}</div>
                      </div>
                      <div style={styles.bStat}>
                        <div style={styles.bStatVal}>{b.monthlyFee}</div>
                        <div style={styles.bStatLabel}>{t('dash_per_month_short')}</div>
                      </div>
                      <div style={styles.bStat}>
                        <div style={{ ...styles.bStatVal, color: '#34d399' }}>{collectedAmt.toLocaleString()}</div>
                        <div style={styles.bStatLabel}>{t('dash_collected_kpi')}</div>
                      </div>
                    </div>
                    <div style={styles.buildingCardBar}>
                      <div style={{ ...styles.buildingCardFill, width: `${rate}%`, background: b.color }} />
                    </div>
                    <div style={styles.buildingCardCta}>{t('dash_see_residents')}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── BUILDING DETAIL ── */}
          {activeTab === 'buildings' && selectedBuilding && (() => {
            const b = buildings.find(x => x.id === selectedBuilding)!;
            if (!b) return null;
            const rate = b.stats?.collectionRate || 0;
            return (
              <div>
                <button style={styles.backBtn} onClick={() => setSelectedBuilding(null)}>{t('dash_back_to_buildings')}</button>
                <div style={styles.buildingDetailHeader}>
                  <div style={{ ...styles.buildingDetailDot, background: b.color }} />
                  <div>
                    <div style={styles.buildingDetailName}>{b.name}</div>
                    <div style={styles.buildingDetailAddress}>{b.address} · {b.city}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ ...styles.bigRate, color: b.color }}>{rate}%</div>
                    <div style={styles.smallMuted}>{t('dash_collection_rate_lower')}</div>
                  </div>
                </div>
                <div style={styles.residentTable}>
                  <div style={styles.tableHeader}>
                    <span style={{ flex: 2 }}>{t('dash_resident_col')}</span>
                    <span style={{ flex: 1 }}>{t('dash_unit_col')}</span>
                    <span style={{ flex: 1 }}>{t('dash_phone')}</span>
                    <span style={{ flex: 1 }}>{t('dash_amount')}</span>
                    <span style={{ flex: 1 }}>{t('dash_status')}</span>
                    <span style={{ flex: 1 }}>{t('dash_payment_date')}</span>
                  </div>
                  {buildingResidents.map(p => (
                    <div key={p.id} style={styles.tableRow}>
                      <span style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ ...styles.residentAv, background: p.status === 'PAID' ? '#34d399' : p.status === 'LATE' ? '#f87171' : '#fbbf24' }}>
                          {(p.unit?.resident?.name || '?')[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{p.unit?.resident?.name || t('dash_unknown')}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{p.unit?.resident?.isOwner ? t('dash_owner') : t('dash_tenant')}</div>
                        </div>
                      </span>
                      <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{p.unit?.number || '—'}</span>
                      <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{p.unit?.resident?.phone || '—'}</span>
                      <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{p.amount} MAD</span>
                      <span style={{ flex: 1 }}>
                        <span style={{ ...styles.statusBadge, ...getStatusStyle(p.status) }}>
                          {p.status === 'PAID' ? t('dash_paid') : p.status === 'LATE' ? t('dash_late') : t('dash_pending')}
                        </span>
                      </span>
                      <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{fmtDate(p.paidAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── RESIDENTS ── */}
          {activeTab === 'residents' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={styles.filterRow}>
                  {['All', ...buildings.map(b => b.name.split(' ').slice(-1)[0])].map(f => (
                    <button key={f} style={{ ...styles.filterBtn, ...(residentBuildingFilter === f ? styles.filterBtnActive : {}) }} onClick={() => setResidentBuildingFilter(f)}>{f === 'All' ? t('all') : f}</button>
                  ))}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {([
                      { key: 'All', label: t('all') },
                      { key: 'PAID', label: t('filter_paid') },
                      { key: 'PENDING', label: t('filter_pending') },
                      { key: 'LATE', label: t('filter_late') },
                    ] as { key: typeof residentStatusFilter; label: string }[]).map(f => (
                      <button key={f.key} style={{ ...styles.filterBtn, ...(residentStatusFilter === f.key ? styles.filterBtnActive : {}) }} onClick={() => setResidentStatusFilter(f.key)}>{f.label}</button>
                    ))}
                  </div>
                </div>
                <button style={styles.addBtn} onClick={() => { setAddResidentError(''); setAddResidentOpen(true); }}>{t('dash_new_resident')}</button>
              </div>
              <div style={styles.residentTable}>
                <div style={styles.tableHeader}>
                  <span style={{ flex: 2 }}>{t('dash_resident_col')}</span>
                  <span style={{ flex: 1 }}>{t('dash_building_unit')}</span>
                  <span style={{ flex: 1 }}>{t('dash_phone')}</span>
                  <span style={{ flex: 1 }}>{t('dash_amount')}</span>
                  <span style={{ flex: 1 }}>{t('dash_status')}</span>
                  <span style={{ flex: 1 }}>{t('dash_action')}</span>
                </div>
                {payments.filter(p => {
                  if (residentBuildingFilter !== 'All') {
                    const bName = p.unit?.building?.name || '';
                    if (!bName.split(' ').slice(-1)[0].includes(residentBuildingFilter)) return false;
                  }
                  if (residentStatusFilter !== 'All' && p.status !== residentStatusFilter) return false;
                  return true;
                }).map(p => (
                  <div key={p.id} style={styles.tableRow}>
                    <span style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ ...styles.residentAv, background: p.status === 'PAID' ? '#34d399' : p.status === 'LATE' ? '#f87171' : '#fbbf24' }}>
                        {(p.unit?.resident?.name || '?')[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{p.unit?.resident?.name || t('dash_unknown')}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{p.unit?.resident?.isOwner ? t('dash_owner') : t('dash_tenant')}</div>
                      </div>
                    </span>
                    <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                      {p.unit?.building?.name?.split(' ').slice(-1)[0] || '—'} · {p.unit?.number || '—'}
                    </span>
                    <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{p.unit?.resident?.phone || '—'}</span>
                    <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{p.amount} MAD</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ ...styles.statusBadge, ...getStatusStyle(p.status) }}>
                        {p.status === 'PAID' ? t('dash_paid') : p.status === 'LATE' ? t('dash_late') : t('dash_pending')}
                      </span>
                    </span>
                    <span style={{ flex: 1 }}>
                      {p.status !== 'PAID' && (
                        <button style={styles.reminderBtn}>{t('dash_send_reminder')}</button>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {addResidentOpen && (
                <div style={styles.modalBackdrop} onClick={() => setAddResidentOpen(false)}>
                  <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
                    <button style={styles.modalClose} onClick={() => setAddResidentOpen(false)}>×</button>
                    <div style={{ fontSize: 11, color: '#c8b8e8', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{t('res_modal_label')}</div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: 'white', marginBottom: 24 }}>{t('res_modal_title')}</div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={styles.formLabel}>{t('res_full_name')}</label>
                      <input type="text" placeholder="Ex. Karim Benali" style={styles.formInput} value={newResident.name} onChange={e => setNewResident(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={styles.formLabel}>{t('res_phone')}</label>
                      <input type="tel" placeholder="+212 6 XX XX XX XX" style={styles.formInput} value={newResident.phone} onChange={e => setNewResident(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={styles.formLabel}>{t('res_building')}</label>
                      <select style={styles.formInput} value={newResident.buildingId} onChange={e => setNewResident(p => ({ ...p, buildingId: e.target.value }))}>
                        <option value="">{t('res_choose_building')}</option>
                        {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={styles.formLabel}>{t('res_unit_number')}</label>
                      <input type="text" placeholder={t('res_unit_placeholder')} style={styles.formInput} value={newResident.unitNumber} onChange={e => setNewResident(p => ({ ...p, unitNumber: e.target.value }))} />
                    </div>
                    <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="checkbox" id="isOwner" checked={newResident.isOwner} onChange={e => setNewResident(p => ({ ...p, isOwner: e.target.checked }))} />
                      <label htmlFor="isOwner" style={{ ...styles.formLabel, marginBottom: 0, cursor: 'pointer' }}>{t('res_is_owner')}</label>
                    </div>
                    {addResidentError && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{addResidentError}</div>}
                    <button style={styles.submitBtn} onClick={handleAddResident} disabled={addResidentLoading}>
                      {addResidentLoading ? t('res_submitting') : t('res_submit')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── EXPENSES / ACCOUNTING ── */}
          {activeTab === 'expenses' && (() => {
            const today = new Date();
            const filteredBuilding = buildings.find(b => b.name.split(' ').slice(-1)[0] === expenseBuildingFilter);
            const filteredExpenses = expenseBuildingFilter === 'All' ? expenses : expenses.filter(e => e.buildingId === filteredBuilding?.id);
            const filteredPayments = expenseBuildingFilter === 'All' ? payments : payments.filter(p => p.unit?.building?.id === filteredBuilding?.id);

            // Build month keys from both revenues and expenses
            const monthKeys = Array.from(new Set([
              ...filteredPayments.filter(p => p.status === 'PAID' && p.paidAt).map(p => { const d = new Date(p.paidAt!); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }),
              ...filteredExpenses.map(e => { const d = new Date(e.date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }),
            ])).sort((a,b) => b.localeCompare(a)).slice(0, 6);

            const cashflow = monthKeys.map(key => {
              const [y, m] = key.split('-').map(Number);
              const rev = filteredPayments.filter(p => p.status === 'PAID' && p.paidAt && new Date(p.paidAt).getFullYear() === y && new Date(p.paidAt).getMonth()+1 === m).reduce((s,p) => s + p.amount, 0);
              const exp = filteredExpenses.filter(e => { const d = new Date(e.date); return d.getFullYear() === y && d.getMonth()+1 === m; }).reduce((s,e) => s + e.amount, 0);
              const label = new Date(y, m-1).toLocaleString('fr-FR', { month: 'short', year: '2-digit' });
              return { key, label, rev, exp, net: rev - exp };
            });

            const totalRev = cashflow.reduce((s,c) => s + c.rev, 0);
            const totalExp = cashflow.reduce((s,c) => s + c.exp, 0);
            const expensesByMonth = monthKeys.map(key => {
              const [y, m] = key.split('-').map(Number);
              const label = new Date(y, m-1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
              const rows = filteredExpenses.filter(e => { const d = new Date(e.date); return d.getFullYear() === y && d.getMonth()+1 === m; });
              return { key, label, rows };
            }).filter(g => g.rows.length > 0);

            return (
              <div>
                {/* ── Cashflow KPIs ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div style={styles.kpiGrid}>
                    {[
                      { label: t('dash_revenues'), value: `${totalRev.toLocaleString()} MAD`, color: '#34d399' },
                      { label: t('dash_expenses_total'), value: `${totalExp.toLocaleString()} MAD`, color: '#f87171' },
                      { label: t('dash_net'), value: `${(totalRev - totalExp) >= 0 ? '+' : ''}${(totalRev - totalExp).toLocaleString()} MAD`, color: (totalRev - totalExp) >= 0 ? '#34d399' : '#f87171' },
                    ].map(k => (
                      <div key={k.label} style={styles.kpiCard}>
                        <div style={styles.kpiLabel}>{k.label}</div>
                        <div style={{ ...styles.kpiValue, color: k.color, fontSize: 26 }}>{k.value}</div>
                      </div>
                    ))}
                  </div>
                  <button style={styles.addBtn} onClick={() => { setAddExpenseError(''); setAddExpenseOpen(true); }}>{t('dash_new_expense')}</button>
                </div>

                {/* ── Building filter ── */}
                <div style={{ ...styles.filterRow, marginBottom: 28 }}>
                  {['All', ...buildings.map(b => b.name.split(' ').slice(-1)[0])].map(f => (
                    <button key={f} style={{ ...styles.filterBtn, ...(expenseBuildingFilter === f ? styles.filterBtnActive : {}) }} onClick={() => setExpenseBuildingFilter(f)}>{f === 'All' ? t('all') : f}</button>
                  ))}
                </div>

                {/* ── Monthly cashflow table ── */}
                <div style={{ marginBottom: 32 }}>
                  <div style={styles.cardTitle2}>{t('dash_cashflow')}</div>
                  <div style={{ ...styles.residentTable, marginTop: 12 }}>
                    <div style={{ ...styles.tableHeader, background: 'rgba(52,211,153,0.05)' }}>
                      <span style={{ flex: 1 }}>{t('dash_month_col')}</span>
                      <span style={{ flex: 1 }}>{t('dash_revenues_col')}</span>
                      <span style={{ flex: 1 }}>{t('dash_expenses_col')}</span>
                      <span style={{ flex: 1 }}>{t('dash_balance')}</span>
                      <span style={{ flex: 2 }}>{t('dash_visual')}</span>
                    </div>
                    {cashflow.map(c => {
                      const maxVal = Math.max(...cashflow.map(x => Math.max(x.rev, x.exp)), 1);
                      return (
                        <div key={c.key} style={styles.tableRow}>
                          <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500, textTransform: 'capitalize' }}>{c.label}</span>
                          <span style={{ flex: 1, fontSize: 13, color: '#34d399', fontWeight: 600 }}>{c.rev.toLocaleString()} MAD</span>
                          <span style={{ flex: 1, fontSize: 13, color: '#f87171', fontWeight: 600 }}>{c.exp.toLocaleString()} MAD</span>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: c.net >= 0 ? '#34d399' : '#f87171' }}>{c.net >= 0 ? '+' : ''}{c.net.toLocaleString()} MAD</span>
                          <span style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 9, color: '#34d399', width: 14 }}>▲</span>
                              <div style={{ height: 6, borderRadius: 3, background: '#34d399', width: `${Math.round((c.rev / maxVal) * 100)}%`, minWidth: 4 }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 9, color: '#f87171', width: 14 }}>▼</span>
                              <div style={{ height: 6, borderRadius: 3, background: '#f87171', width: `${Math.round((c.exp / maxVal) * 100)}%`, minWidth: c.exp > 0 ? 4 : 0 }} />
                            </div>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Expenses grouped by month ── */}
                {expensesByMonth.map(group => (
                  <div key={group.key} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{ ...styles.cardTitle2, textTransform: 'capitalize', margin: 0 }}>{group.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: 100 }}>
                        {group.rows.length} {group.rows.length > 1 ? t('dash_entries_pl') : t('dash_entries')} · {group.rows.reduce((s,e) => s + e.amount, 0).toLocaleString()} MAD
                      </div>
                    </div>
                    <div style={styles.residentTable}>
                      <div style={styles.tableHeader}>
                        <span style={{ flex: '0 0 32px' }}></span>
                        <span style={{ flex: 2 }}>{t('dash_label_col')}</span>
                        <span style={{ flex: 1 }}>{t('dash_building_col')}</span>
                        <span style={{ flex: 1 }}>{t('dash_category_col')}</span>
                        <span style={{ flex: 1 }}>{t('dash_amount_col')}</span>
                        <span style={{ flex: 1 }}>{t('dash_due_col')}</span>
                        <span style={{ flex: 1 }}>{t('dash_status_col')}</span>
                        <span style={{ flex: '0 0 48px' }}></span>
                      </div>
                      {group.rows.map(e => {
                        const isOverdue = !e.isPaid && e.dueDate && new Date(e.dueDate) < today;
                        const isDueSoon = !e.isPaid && e.dueDate && new Date(e.dueDate) >= today;
                        return (
                          <div key={e.id} style={{ ...styles.tableRow, ...(isOverdue ? { background: 'rgba(248,113,113,0.04)', borderLeft: '2px solid rgba(248,113,113,0.3)' } : {}) }}>
                            <span style={{ flex: '0 0 32px', fontSize: 16, textAlign: 'center' }}>
                              {e.isPaid ? '🧾' : isOverdue ? '⚠️' : '🕐'}
                            </span>
                            <span style={{ flex: 2, fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{e.label}</span>
                            <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{e.building?.name?.split(' ').slice(-1)[0] || '—'}</span>
                            <span style={{ flex: 1 }}>
                              <span style={{ ...styles.catBadge, background: (CAT_COLORS[e.category] || '#9ca3af') + '22', color: CAT_COLORS[e.category] || '#9ca3af' }}>
                                {CAT_LABELS[e.category] || e.category}
                              </span>
                            </span>
                            <span style={{ flex: 1, fontSize: 13, color: '#f87171', fontWeight: 600 }}>{e.amount.toLocaleString()} MAD</span>
                            <span style={{ flex: 1, fontSize: 11, color: isOverdue ? '#f87171' : isDueSoon ? '#fbbf24' : 'rgba(255,255,255,0.35)' }}>
                              {e.dueDate ? fmtDate(e.dueDate) : '—'}
                            </span>
                            <span style={{ flex: 1 }}>
                              {e.isPaid ? (
                                <span style={{ fontSize: 11, color: '#34d399', background: 'rgba(52,211,153,0.12)', padding: '3px 10px', borderRadius: 100 }}>{t('exp_paid')}</span>
                              ) : isOverdue ? (
                                <button onClick={() => handleMarkExpensePaid(e.id, true)} style={{ fontSize: 11, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', padding: '3px 10px', borderRadius: 100, cursor: 'pointer' }}>{t('exp_overdue')}</button>
                              ) : (
                                <button onClick={() => handleMarkExpensePaid(e.id, true)} style={{ fontSize: 11, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', padding: '3px 10px', borderRadius: 100, cursor: 'pointer' }}>{t('exp_mark_paid')}</button>
                              )}
                            </span>
                            <span style={{ flex: '0 0 48px' }}>
                              <button onClick={() => handleDeleteExpense(e.id)} style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.4)', cursor: 'pointer', fontSize: 16, padding: '2px 6px', borderRadius: 6, lineHeight: 1 }} title={t('dash_delete_tooltip')}>×</button>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* ── Add expense modal ── */}
                {addExpenseOpen && (
                  <div style={styles.modalBackdrop} onClick={() => setAddExpenseOpen(false)}>
                    <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
                      <button style={styles.modalClose} onClick={() => setAddExpenseOpen(false)}>×</button>
                      <div style={{ fontSize: 11, color: '#c8b8e8', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{t('exp_modal_label')}</div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: 'white', marginBottom: 24 }}>{t('exp_modal_title')}</div>
                      <div style={{ marginBottom: 16 }}>
                        <label style={styles.formLabel}>{t('exp_libelle')}</label>
                        <input type="text" placeholder="Ex. Entretien ascenseur" style={styles.formInput} value={newExpense.label} onChange={ev => setNewExpense(p => ({ ...p, label: ev.target.value }))} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div>
                          <label style={styles.formLabel}>{t('exp_amount')}</label>
                          <input type="number" placeholder="0" style={styles.formInput} value={newExpense.amount} onChange={ev => setNewExpense(p => ({ ...p, amount: ev.target.value }))} />
                        </div>
                        <div>
                          <label style={styles.formLabel}>{t('exp_date')}</label>
                          <input type="date" style={styles.formInput} value={newExpense.date} onChange={ev => setNewExpense(p => ({ ...p, date: ev.target.value }))} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label style={styles.formLabel}>{t('exp_due_date')}</label>
                        <input type="date" style={styles.formInput} value={newExpense.dueDate} onChange={ev => setNewExpense(p => ({ ...p, dueDate: ev.target.value }))} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div>
                          <label style={styles.formLabel}>{t('exp_building')}</label>
                          <select style={styles.formInput} value={newExpense.buildingId} onChange={ev => setNewExpense(p => ({ ...p, buildingId: ev.target.value }))}>
                            <option value="">{t('exp_choose')}</option>
                            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={styles.formLabel}>{t('exp_category')}</label>
                          <select style={styles.formInput} value={newExpense.category} onChange={ev => setNewExpense(p => ({ ...p, category: ev.target.value }))}>
                            {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="checkbox" id="expIsPaid" checked={newExpense.isPaid} onChange={ev => setNewExpense(p => ({ ...p, isPaid: ev.target.checked }))} />
                        <label htmlFor="expIsPaid" style={{ ...styles.formLabel, marginBottom: 0, cursor: 'pointer' }}>{t('exp_already_paid')}</label>
                      </div>
                      {addExpenseError && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{addExpenseError}</div>}
                      <button style={styles.submitBtn} onClick={handleAddExpense} disabled={addExpenseLoading}>
                        {addExpenseLoading ? t('exp_saving') : t('exp_save')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── REMINDERS ── */}
          {activeTab === 'reminders' && (
            <div>
              <div style={styles.kpiGrid}>
                {[
                  { label: t('rem_sent_month'), value: reminders.length.toString(), color: '#c8b8e8' },
                  { label: t('rem_delivered'), value: reminders.filter(r => r.status === 'DELIVERED').length.toString(), color: '#34d399' },
                  { label: t('rem_pending'), value: reminders.filter(r => r.status === 'SENT').length.toString(), color: '#fbbf24' },
                  { label: t('rem_failed'), value: reminders.filter(r => r.status === 'FAILED').length.toString(), color: '#f87171' },
                ].map(k => (
                  <div key={k.label} style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>{k.label}</div>
                    <div style={{ ...styles.kpiValue, color: k.color, fontSize: 36 }}>{k.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '28px 0 16px' }}>
                <div style={styles.cardTitle2}>{t('rem_history')}</div>
                <button style={styles.addBtn} onClick={() => { setCustomReminderError(''); setCustomReminderOpen(true); }}>{t('rem_custom_btn')}</button>
              </div>

              <div style={styles.residentTable}>
                <div style={styles.tableHeader}>
                  <span style={{ flex: 2 }}>{t('dash_resident_col')}</span>
                  <span style={{ flex: 1 }}>{t('rem_building_unit')}</span>
                  <span style={{ flex: 1 }}>{t('dash_phone')}</span>
                  <span style={{ flex: 1 }}>{t('rem_sent_at')}</span>
                  <span style={{ flex: 1 }}>{t('dash_status')}</span>
                </div>
                {reminders.map(r => (
                  <div key={r.id} style={styles.tableRow}>
                    <span style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ ...styles.residentAv, background: '#7b5ea7', fontSize: 11 }}>
                        {(r.resident?.name || '?').split(' ').map((w: string) => w[0]).join('')}
                      </div>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{r.resident?.name || '—'}</span>
                    </span>
                    <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                      {r.resident?.unit?.building?.name || '—'} · {r.resident?.unit?.number || '—'}
                    </span>
                    <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{r.resident?.phone || '—'}</span>
                    <span style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{fmtDate(r.sentAt)}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ ...styles.statusBadge, ...getReminderStatusStyle(r.status) }}>
                        {r.status === 'DELIVERED' ? t('rem_delivered_badge') : r.status === 'SENT' ? t('rem_sent_badge') : t('rem_failed_badge')}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              {customReminderOpen && (
                <div style={styles.modalBackdrop} onClick={() => setCustomReminderOpen(false)}>
                  <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
                    <button style={styles.modalClose} onClick={() => setCustomReminderOpen(false)}>×</button>
                    <div style={{ fontSize: 11, color: '#c8b8e8', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{t('rem_modal_label')}</div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: 'white', marginBottom: 24 }}>{t('rem_modal_title')}</div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={styles.formLabel}>{t('dash_resident_col')}</label>
                      <select style={styles.formInput} value={customReminderResidentId} onChange={e => setCustomReminderResidentId(e.target.value)}>
                        <option value="">{t('rem_choose_resident')}</option>
                        {Array.from(new Map(payments.filter(p => p.unit?.resident?.id).map(p => [p.unit.resident!.id, p])).values()).map(p => (
                          <option key={p.unit.resident!.id} value={p.unit.resident!.id}>
                            {p.unit.resident!.name} — {p.unit?.building?.name?.split(' ').slice(-1)[0]} {p.unit.number}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <label style={styles.formLabel}>{t('rem_message')}</label>
                      <textarea
                        rows={5}
                        placeholder="Bonjour, votre charge de Mars est due..."
                        style={{ ...styles.formInput, resize: 'vertical', lineHeight: 1.6 }}
                        value={customReminderMsg}
                        onChange={e => setCustomReminderMsg(e.target.value)}
                      />
                    </div>
                    {customReminderError && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{customReminderError}</div>}
                    <button style={styles.submitBtn} onClick={handleCustomReminder} disabled={customReminderLoading}>
                      {customReminderLoading ? t('rem_sending') : t('rem_send_btn')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// ─── STYLE HELPERS ────────────────────────────────────────────────────────────

function getStatusStyle(status: string) {
  if (status === 'PAID') return { background: 'rgba(52,211,153,0.15)', color: '#34d399' };
  if (status === 'LATE') return { background: 'rgba(248,113,113,0.15)', color: '#f87171' };
  return { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
}

function getReminderStatusStyle(status: string) {
  if (status === 'DELIVERED') return { background: 'rgba(52,211,153,0.15)', color: '#34d399' };
  if (status === 'FAILED') return { background: 'rgba(248,113,113,0.15)', color: '#f87171' };
  return { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', minHeight: '100vh', background: '#0f0b08', fontFamily: "'DM Sans', sans-serif" },

  // SIDEBAR
  sidebar: { width: 240, background: '#1a1410', borderRight: '1px solid rgba(200,184,232,0.08)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' },
  sidebarBrand: { padding: '28px 24px 24px', borderBottom: '1px solid rgba(200,184,232,0.07)' },
  brandLogo: { fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: 'white', letterSpacing: 0.3 },
  brandSub: { fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 3 },
  sidebarNav: { padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 13, cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s' },
  navItemActive: { background: 'rgba(200,184,232,0.1)', color: 'rgba(255,255,255,0.95)' },
  navIcon: { fontSize: 14, opacity: 0.7 },
  sidebarFooter: { padding: '16px 16px 24px', borderTop: '1px solid rgba(200,184,232,0.07)', marginTop: 'auto' },
  userBadge: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  logoutBtn: { width: '100%', background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'rgba(255,255,255,0.3)', fontSize: 11, padding: '7px 0', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.5 },
  userAvatar: { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7b5ea7,#9b6bc0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, color: 'white' },
  userName: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 },
  userRole: { fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5, textTransform: 'uppercase' },

  // MAIN
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  header: { padding: '28px 36px 24px', borderBottom: '1px solid rgba(200,184,232,0.07)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', background: '#1a1410' },
  headerEyebrow: { fontSize: 10, color: 'rgba(200,184,232,0.6)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  headerTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: 'white', margin: 0, lineHeight: 1 },
  headerRate: { textAlign: 'right' },
  rateLabel: { fontSize: 10, color: 'rgba(200,184,232,0.5)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  rateValue: { fontFamily: "'DM Sans', sans-serif", fontSize: 42, fontWeight: 300, color: 'white', lineHeight: 1 },
  content: { padding: '28px 36px', flex: 1 },

  // KPI
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 },
  kpiCard: { background: '#1a1410', border: '1px solid rgba(200,184,232,0.08)', borderRadius: 16, padding: '20px 22px' },
  kpiLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  kpiValue: { fontFamily: "'DM Sans', sans-serif", fontSize: 32, fontWeight: 300, lineHeight: 1, marginBottom: 6 },
  kpiSub: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },

  // CARDS
  card: { background: '#1a1410', border: '1px solid rgba(200,184,232,0.08)', borderRadius: 16, padding: '20px 24px', marginBottom: 24 },
  cardTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,0.7)', marginBottom: 16 },
  cardTitle2: { fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,0.7)', marginBottom: 14 },

  // COLLECTION BAR
  collectionBar: { height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' },
  collectionFill: { height: '100%', background: 'linear-gradient(90deg,#7b5ea7,#c8b8e8)', borderRadius: 100, transition: 'width 1s ease' },

  // BUILDING ROWS (overview)
  buildingRows: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 },
  buildingRow: { display: 'flex', alignItems: 'center', gap: 14, background: '#1a1410', border: '1px solid rgba(200,184,232,0.08)', borderRadius: 14, padding: '14px 18px', cursor: 'pointer', transition: 'border-color 0.2s' },
  buildingDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  buildingRowName: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500, marginBottom: 2 },
  buildingRowSub: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  buildingRowBar: { width: 120, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' },
  buildingRowFill: { height: '100%', borderRadius: 100 },
  buildingRateBadge: { fontSize: 15, fontFamily: "'DM Sans', sans-serif", fontWeight: 300, minWidth: 40, textAlign: 'right' },
  arrowIcon: { fontSize: 14, color: 'rgba(255,255,255,0.2)' },

  // ACTIVITY
  activityRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0' },
  activityIcon: { fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 },
  activityTime: { fontSize: 11, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' },

  // BUILDING CARDS (grid)
  buildingGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 },
  buildingCard: { background: '#1a1410', border: '1px solid rgba(200,184,232,0.08)', borderRadius: 20, padding: '0 0 24px', cursor: 'pointer', overflow: 'hidden', transition: 'transform 0.2s, border-color 0.2s', position: 'relative' },
  buildingCardAccent: { height: 4 },
  buildingCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 10px' },
  buildingCardIcon: { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
  buildingCardRate: { fontFamily: "'DM Sans', sans-serif", fontSize: 28, fontWeight: 300 },
  buildingCardName: { fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: 'white', padding: '0 20px', marginBottom: 4 },
  buildingCardAddress: { fontSize: 12, color: 'rgba(255,255,255,0.4)', padding: '0 20px', lineHeight: 1.6 },
  buildingCardStats: { display: 'flex', gap: 0, margin: '18px 20px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12 },
  bStat: { flex: 1, padding: '12px 0', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' },
  bStatVal: { fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 300, color: 'white', lineHeight: 1 },
  bStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  buildingCardBar: { height: 3, background: 'rgba(255,255,255,0.05)', margin: '0 20px 16px' },
  buildingCardFill: { height: '100%', borderRadius: 100 },
  buildingCardCta: { fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '0 20px', textAlign: 'right' },

  // BUILDING DETAIL
  backBtn: { background: 'none', border: 'none', color: 'rgba(200,184,232,0.6)', fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0 },
  buildingDetailHeader: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, background: '#1a1410', border: '1px solid rgba(200,184,232,0.08)', borderRadius: 16, padding: '20px 24px' },
  buildingDetailDot: { width: 14, height: 14, borderRadius: '50%', flexShrink: 0 },
  buildingDetailName: { fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, color: 'white', marginBottom: 4 },
  buildingDetailAddress: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  bigRate: { fontFamily: "'DM Sans', sans-serif", fontSize: 40, fontWeight: 300, lineHeight: 1 },

  // TABLE
  residentTable: { background: '#1a1410', border: '1px solid rgba(200,184,232,0.08)', borderRadius: 16, overflow: 'hidden' },
  tableHeader: { display: 'flex', padding: '12px 20px', background: 'rgba(200,184,232,0.04)', borderBottom: '1px solid rgba(200,184,232,0.08)', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, textTransform: 'uppercase' },
  tableRow: { display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(200,184,232,0.05)', transition: 'background 0.15s' },
  residentAv: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, whiteSpace: 'nowrap' },
  catBadge: { fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 100 },
  reminderBtn: { background: 'rgba(123,94,167,0.2)', color: '#c8b8e8', border: '1px solid rgba(123,94,167,0.3)', borderRadius: 8, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },

  // MISC
  smallMuted: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  filterRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterBtn: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)', borderRadius: 100, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  filterBtnActive: { background: 'rgba(123,94,167,0.2)', border: '1px solid rgba(123,94,167,0.5)', color: '#c8b8e8' },
  addBtn: { background: 'rgba(123,94,167,0.25)', border: '1px solid rgba(123,94,167,0.4)', color: '#c8b8e8', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' },

  // MODAL
  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalBox: { background: '#1a1410', border: '1px solid rgba(200,184,232,0.12)', borderRadius: 24, padding: '40px', maxWidth: 480, width: '90%', position: 'relative', maxHeight: '90vh', overflowY: 'auto' },
  modalClose: { position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'rgba(255,255,255,0.4)', lineHeight: 1 },
  formLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6 },
  formInput: { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' },
  submitBtn: { width: '100%', padding: 14, background: 'linear-gradient(135deg,#7b5ea7,#9b6bc0)', border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
};
