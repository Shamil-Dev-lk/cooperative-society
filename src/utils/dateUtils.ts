// ============================================================
// Date Utilities
// ============================================================

/**
 * Normalize various date formats to YYYY-MM-DD
 */
export function normalizeDate(value: string): string {
  if (!value || String(value).trim() === '') return '';

  const str = String(value).trim();

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // MM/DD/YYYY
  const mdy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Excel serial date
  const serial = parseInt(str, 10);
  if (!isNaN(serial) && serial > 40000 && serial < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + serial * 86400000);
    return date.toISOString().split('T')[0];
  }

  // Try native Date parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

  return str;
}

/**
 * Format a date string for display
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-LK', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Get month label
 */
export function getMonthLabel(date: Date): string {
  return date.toLocaleString('default', { month: 'short', year: '2-digit' });
}

/**
 * Get current date as YYYY-MM-DD
 */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return 'Rs. ' + new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number with commas
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-LK').format(n);
}
