/**
 * Helper utility functions for formatting Indian currency, dates,
 * and determining color-blind friendly risk indicators.
 */

/**
 * Format numbers in the standard Indian number system:
 * e.g. 125472 -> "1,25,472"
 * e.g. 71056  -> "71,056"
 */
export function formatRupees(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }
  const rounded = Math.round(Number(amount));
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(rounded);
}

/**
 * Format an ISO date (YYYY-MM-DD) into a friendly short label:
 * e.g. "2026-11-03" -> "Tue, 3 Nov"
 */
export function formatFriendlyDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Returns color-blind friendly cues (Word + Icon + High-contrast CSS classes)
 * corresponding to the alert level.
 */
export function getStatusCue(alertLevel) {
  const level = (alertLevel || '').toLowerCase();

  if (level === 'green' || level === 'safe') {
    return {
      type: 'safe',
      wordKey: 'statusSafe',
      dotColor: '#10b981',
      bgClass: 'bg-emerald-50 border-emerald-300 text-emerald-900',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      pillClass: 'bg-emerald-600 text-white',
    };
  }

  if (level === 'amber' || level === 'watch') {
    return {
      type: 'watch',
      wordKey: 'statusWatch',
      dotColor: '#f59e0b',
      bgClass: 'bg-amber-50 border-amber-300 text-amber-900',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      pillClass: 'bg-amber-500 text-white',
    };
  }

  // Red / Danger
  return {
    type: 'danger',
    wordKey: 'statusDanger',
    dotColor: '#ef4444',
    bgClass: 'bg-rose-50 border-rose-300 text-rose-900',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    pillClass: 'bg-rose-600 text-white',
  };
}
