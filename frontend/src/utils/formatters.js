/**
 * Format a number as currency (FCFA by default).
 */
export function formatCurrency(amount, currency = 'XOF') {
  const n = Number(amount);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Format a date string to locale.
 */
export function formatDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

/**
 * Status label & badge variant mapping.
 */
export const STATUS_MAP = {
  draft: { label: 'Brouillon', variant: 'neutral' },
  generated: { label: 'PDF généré', variant: 'info' },
  sent_for_signature: { label: 'En signature', variant: 'warning' },
  signed: { label: 'Signé', variant: 'success' },
  archived: { label: 'Archivé', variant: 'accent' },
  cancelled: { label: 'Annulé', variant: 'danger' },
};

export function getStatusInfo(status) {
  return STATUS_MAP[status] || { label: status, variant: 'neutral' };
}
