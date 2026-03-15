'use client';

import '../dashboard.css';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PaymentStatusBadge from '@/components/PaymentStatusBadge';

type PendingPayment = {
  id: string;
  amount: number;
  approvedAt: string;
  receiptStatus: string;
  receiptAiData: { confidence: number; notes: string; amountMatch: boolean; accountMatch: boolean; hasStamp: boolean } | null;
  confirmToken: string | null;
  disputeToken: string | null;
  unit: {
    number: string;
    building: { id: string; name: string };
    resident: { id: string; name: string; phone: string } | null;
  };
};

export default function ReceiptsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#16131f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b7db5', fontSize: 13 }}>Chargement...</div>}>
      <ReceiptsPageInner />
    </Suspense>
  );
}

function ReceiptsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const confirmed = searchParams.get('confirmed') === 'true';
  const disputed = searchParams.get('disputed') === 'true';

  useEffect(() => {
    const token = localStorage.getItem('syndic_token');
    if (!token) { router.push('/login'); return; }

    fetch('/api/payments?receiptStatus=APPROVED_PENDING_RECEIPT', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setPayments(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function daysSince(iso: string) {
    return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  }

  async function handleConfirm(paymentId: string) {
    const token = localStorage.getItem('syndic_token');
    if (!token) return;
    setActionLoading(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}/mark-paid`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceNoReceipt: false }),
      });
      const data = await res.json();
      if (data.success) {
        setPayments(prev => prev.filter(p => p.id !== paymentId));
      }
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  }

  async function handleDispute(paymentId: string) {
    const token = localStorage.getItem('syndic_token');
    if (!token) return;
    setActionLoading(paymentId);
    try {
      await fetch(`/api/payments/${paymentId}/update-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISPUTE', reason: 'Syndic dispute from receipts page' }),
      });
      setPayments(prev => prev.filter(p => p.id !== paymentId));
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  }

  // Group by building
  const grouped = new Map<string, PendingPayment[]>();
  for (const p of payments) {
    const bName = p.unit.building.name;
    if (!grouped.has(bName)) grouped.set(bName, []);
    grouped.get(bName)!.push(p);
  }

  return (
    <div style={s.shell}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Virements en attente</h1>
            <p style={s.subtitle}>Reçus vérifiés par IA — en attente de votre confirmation</p>
          </div>
          <button style={s.backBtn} onClick={() => router.push('/dashboard')}>
            ← Tableau de bord
          </button>
        </div>

        {/* Flash messages */}
        {confirmed && (
          <div style={s.flash}>✅ Paiement confirmé avec succès.</div>
        )}
        {disputed && (
          <div style={{ ...s.flash, background: 'rgba(251,146,60,0.1)', borderColor: 'rgba(251,146,60,0.25)', color: '#fb923c' }}>
            ⚠️ Paiement mis en vérification.
          </div>
        )}

        {loading ? (
          <div style={s.empty}>Chargement...</div>
        ) : payments.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>✓</div>
            <div style={s.emptyText}>Aucun virement en attente de confirmation</div>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([buildingName, bPayments]) => (
            <div key={buildingName} style={s.group}>
              <div style={s.groupHeader}>{buildingName}</div>
              {bPayments.map(p => (
                <div key={p.id} style={s.card}>
                  <div style={s.cardTop}>
                    <div>
                      <div style={s.residentName}>
                        {p.unit.resident?.name || 'Résident'}
                      </div>
                      <div style={s.unitInfo}>
                        Appt {p.unit.number} · {p.amount.toLocaleString()} MAD
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <PaymentStatusBadge status="PENDING" receiptStatus={p.receiptStatus} />
                      <div style={s.daysAgo}>
                        il y a {daysSince(p.approvedAt)} jour{daysSince(p.approvedAt) > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* AI confidence */}
                  {p.receiptAiData && (
                    <div style={s.aiRow}>
                      <span style={s.aiLabel}>Confiance IA</span>
                      <span style={{
                        ...s.aiValue,
                        color: p.receiptAiData.confidence >= 0.9 ? '#34d399'
                          : p.receiptAiData.confidence >= 0.7 ? '#fbbf24'
                          : '#f87171'
                      }}>
                        {Math.round(p.receiptAiData.confidence * 100)}%
                      </span>
                      {p.receiptAiData.hasStamp && (
                        <span style={s.stampBadge}>Tamponné</span>
                      )}
                      {p.receiptAiData.amountMatch && (
                        <span style={s.matchBadge}>Montant ✓</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={s.cardActions}>
                    <button
                      style={s.confirmBtn}
                      onClick={() => handleConfirm(p.id)}
                      disabled={actionLoading === p.id}
                    >
                      {actionLoading === p.id ? '...' : '✅ Confirmer'}
                    </button>
                    <button
                      style={s.disputeBtn}
                      onClick={() => handleDispute(p.id)}
                      disabled={actionLoading === p.id}
                    >
                      ⚠️ Dispute
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  shell: { minHeight: '100vh', background: '#16131f', fontFamily: "'DM Sans', sans-serif", color: '#e8e0ff' },
  container: { maxWidth: 800, margin: '0 auto', padding: '32px 24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 300, margin: '0 0 6px', color: '#e8e0ff' },
  subtitle: { fontSize: 13, color: '#8b7db5', margin: 0 },
  backBtn: { background: 'rgba(124,92,191,0.1)', border: '1px solid rgba(124,92,191,0.2)', color: '#c4b5f4', padding: '8px 16px', borderRadius: 10, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' },
  flash: { background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', borderRadius: 12, padding: '12px 16px', fontSize: 13, marginBottom: 24 },
  empty: { textAlign: 'center', color: '#8b7db5', fontSize: 13, padding: '48px 0' },
  emptyState: { textAlign: 'center', padding: '64px 0' },
  emptyIcon: { width: 56, height: 56, borderRadius: '50%', background: 'rgba(52,211,153,0.1)', color: '#34d399', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  emptyText: { fontSize: 14, color: '#8b7db5' },
  group: { marginBottom: 32 },
  groupHeader: { fontSize: 11, color: '#c4b5f4', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },
  card: { background: '#1d1a2e', border: '1px solid rgba(196,181,244,0.1)', borderRadius: 16, padding: '20px', marginBottom: 12 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  residentName: { fontSize: 15, fontWeight: 500, color: '#e8e0ff', marginBottom: 4 },
  unitInfo: { fontSize: 12, color: '#8b7db5' },
  daysAgo: { fontSize: 11, color: '#8b7db5', marginTop: 6 },
  aiRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid rgba(196,181,244,0.06)', marginBottom: 12 },
  aiLabel: { fontSize: 11, color: '#8b7db5' },
  aiValue: { fontSize: 14, fontWeight: 600 },
  stampBadge: { fontSize: 10, background: 'rgba(52,211,153,0.1)', color: '#34d399', padding: '2px 8px', borderRadius: 100 },
  matchBadge: { fontSize: 10, background: 'rgba(96,165,250,0.1)', color: '#60a5fa', padding: '2px 8px', borderRadius: 100 },
  cardActions: { display: 'flex', gap: 10 },
  confirmBtn: { flex: 1, padding: '10px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
  disputeBtn: { flex: 1, padding: '10px', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)', color: '#fb923c', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" },
};
