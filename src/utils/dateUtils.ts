/**
 * Utilitaires pour le formatage des dates au standard français (JJ/MM/AAAA)
 */

/**
 * Convertit une date ISO (YYYY-MM-DD) en date française JJ/MM/AAAA.
 * Ex: "2026-10-17" -> "17/10/2026"
 */
export function formatToFrenchDate(dateStr: string | undefined | null): string {
  if (!dateStr || !dateStr.trim()) return '—';

  // Si c'est déjà au format JJ/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (y.length === 4 && m.length <= 2 && d.length <= 2) {
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
  }

  // Fallback si format Date ISO complet
  const dateObj = new Date(dateStr);
  if (!isNaN(dateObj.getTime())) {
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = dateObj.getFullYear();
    return `${d}/${m}/${y}`;
  }

  return dateStr;
}

/**
 * Libellé avec jour de la semaine abrégé et date française JJ/MM/AAAA.
 * Ex: "2026-10-17" -> "Sam 17/10/2026"
 */
export function formatFrenchDayWithDate(dateStr: string | undefined | null): string {
  if (!dateStr || !dateStr.trim()) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  const weekday = dateObj.toLocaleDateString('fr-FR', { weekday: 'short' });
  const cleanWeekday = weekday.replace('.', '').trim();
  const capWeekday = cleanWeekday.charAt(0).toUpperCase() + cleanWeekday.slice(1);
  return `${capWeekday} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

/**
 * Libellé complet avec jour en toutes lettres et date JJ/MM/AAAA.
 * Ex: "2026-10-17" -> "Samedi 17/10/2026"
 */
export function formatFrenchFullWeekdayWithDate(dateStr: string | undefined | null): string {
  if (!dateStr || !dateStr.trim()) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  const weekday = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' });
  const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capWeekday} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

/**
 * Formate la période d'un salon au format français : "Du JJ/MM/AAAA au JJ/MM/AAAA"
 */
export function formatTradeShowDateRange(startDate?: string, endDate?: string): string {
  if (!startDate) return '';
  const start = formatToFrenchDate(startDate);
  if (!endDate || endDate === startDate) return `Le ${start}`;
  const end = formatToFrenchDate(endDate);
  return `Du ${start} au ${end}`;
}
