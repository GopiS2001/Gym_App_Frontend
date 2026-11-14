/** Display formatting. All of these take values the API already computed. */

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Calendar-day values arrive as UTC midnight. Reading them with local getters
 * would shift the date backwards west of UTC, so day-only values are read in
 * UTC and timestamps in local time.
 */
function parse(value: string | Date): { date: Date; dayOnly: boolean } | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const dayOnly =
    typeof value === 'string' &&
    (/^\d{4}-\d{2}-\d{2}$/.test(value) || value.endsWith('T00:00:00.000Z'));

  return { date, dayOnly };
}

function parts(value: string | Date) {
  const parsed = parse(value);
  if (!parsed) return null;
  const { date, dayOnly } = parsed;
  return dayOnly
    ? {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth(),
        day: date.getUTCDate(),
        weekDay: date.getUTCDay(),
        hours: date.getUTCHours(),
        minutes: date.getUTCMinutes(),
        date,
      }
    : {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
        weekDay: date.getDay(),
        hours: date.getHours(),
        minutes: date.getMinutes(),
        date,
      };
}

export function formatDate(
  value?: string | Date | null,
  style: 'short' | 'long' | 'medium' | 'dayMonth' | 'iso' = 'medium',
): string {
  if (!value) return '--';
  const p = parts(value);
  if (!p) return '--';

  switch (style) {
    case 'short':
      return `${String(p.day).padStart(2, '0')}/${String(p.month + 1).padStart(2, '0')}/${p.year}`;
    case 'long':
      return `${DAYS_SHORT[p.weekDay]}, ${p.day} ${MONTHS_LONG[p.month]} ${p.year}`;
    case 'dayMonth':
      return `${p.day} ${MONTHS_SHORT[p.month]}`;
    case 'iso':
      return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
    case 'medium':
    default:
      return `${p.day} ${MONTHS_SHORT[p.month]} ${p.year}`;
  }
}

export function formatTime(value?: string | Date | null): string {
  if (!value) return '--';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const display = hours % 12 || 12;
  return `${display}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function formatRelativeDate(value?: string | Date | null): string {
  if (!value) return '--';
  const p = parts(value);
  if (!p) return '--';

  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const thatDay = Date.UTC(p.year, p.month, p.day);
  const diffDays = Math.round((todayUtc - thatDay) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays === -1) return 'Tomorrow';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < -1 && diffDays > -7) return `In ${Math.abs(diffDays)} days`;
  return formatDate(value, 'medium');
}

export function formatDuration(seconds?: number | null): string {
  const total = Math.max(0, Math.round(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function formatMinutes(minutes?: number | null): string {
  const total = Math.max(0, Math.round(minutes || 0));
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function formatNumber(value?: number | null, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatWeight(kg?: number | null, unit: 'KG' | 'LB' = 'KG'): string {
  if (kg === null || kg === undefined) return '--';
  if (unit === 'LB') return `${(kg * 2.20462).toFixed(1)} lb`;
  return `${kg.toFixed(1)} kg`;
}

export function formatVolume(kg?: number | null): string {
  const value = kg || 0;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}t`;
  return `${Math.round(value)} kg`;
}

/** Title-cases an enum value, e.g. PRE_WORKOUT -> Pre Workout. */
export function humanise(value?: string | null): string {
  if (!value) return '';
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function initials(name?: string | null): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

/** YYYY-MM-DD for today, in the device's local calendar. */
export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export const WEEK_DAY_LABELS: Record<string, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};
