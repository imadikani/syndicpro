'use client';

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  PENDING: { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', label: 'À payer' },
  PENDING_APPROVAL: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Analyse en cours...' },
  APPROVED_PENDING_RECEIPT: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa', label: 'En attente de réception' },
  PAID: { bg: 'rgba(52,211,153,0.15)', color: '#34d399', label: 'Payé ✅' },
  REJECTED: { bg: 'rgba(248,113,113,0.15)', color: '#f87171', label: 'Reçu rejeté' },
  DISPUTE: { bg: 'rgba(251,146,60,0.15)', color: '#fb923c', label: 'En vérification' },
  LATE: { bg: 'rgba(248,113,113,0.15)', color: '#f87171', label: 'En retard ⚠️' },
  WAIVED: { bg: 'rgba(168,85,247,0.15)', color: '#a855f7', label: 'Dispensé' },
};

function getEffectiveStatus(paymentStatus: string, receiptStatus?: string | null): string {
  // receiptStatus takes priority for display when it exists
  if (receiptStatus === 'PENDING_APPROVAL') return 'PENDING_APPROVAL';
  if (receiptStatus === 'APPROVED_PENDING_RECEIPT') return 'APPROVED_PENDING_RECEIPT';
  if (receiptStatus === 'REJECTED') return 'REJECTED';
  if (receiptStatus === 'DISPUTE') return 'DISPUTE';
  if (receiptStatus === 'CONFIRMED' && paymentStatus === 'PAID') return 'PAID';
  return paymentStatus;
}

export default function PaymentStatusBadge({
  status,
  receiptStatus,
  style,
}: {
  status: string;
  receiptStatus?: string | null;
  style?: React.CSSProperties;
}) {
  const effectiveStatus = getEffectiveStatus(status, receiptStatus);
  const config = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.PENDING;

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: 100,
        whiteSpace: 'nowrap',
        background: config.bg,
        color: config.color,
        ...style,
      }}
    >
      {config.label}
    </span>
  );
}

export { getEffectiveStatus, STATUS_CONFIG };
