import type { Ionicons } from '@expo/vector-icons';
import type { Food, WeekDayName } from '@/types/models';

/** Meal categories in the order they happen through the day. */
export const MEAL_TYPES: { value: string; label: string }[] = [
  { value: 'PRE_WORKOUT', label: 'Pre-Workout' },
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'POST_WORKOUT', label: 'Post-Workout' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'SNACKS', label: 'Evening Snacks' },
  { value: 'DINNER', label: 'Dinner' },
  { value: 'BEFORE_BED', label: 'Before Bed' },
];

export const MEAL_LABELS: Record<string, string> = Object.fromEntries(
  MEAL_TYPES.map((m) => [m.value, m.label]),
);

export function mealIcon(mealType: string): keyof typeof Ionicons.glyphMap {
  switch (mealType) {
    case 'BREAKFAST':
      return 'sunny-outline';
    case 'LUNCH':
      return 'restaurant-outline';
    case 'DINNER':
      return 'moon-outline';
    case 'PRE_WORKOUT':
      return 'flash-outline';
    case 'POST_WORKOUT':
      return 'barbell-outline';
    case 'BEFORE_BED':
      return 'bed-outline';
    default:
      return 'cafe-outline';
  }
}

/** The meal that fits the current hour, used as the default when logging. */
export function mealForNow(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 11) return 'BREAKFAST';
  if (hour < 15) return 'LUNCH';
  if (hour < 18) return 'SNACKS';
  if (hour < 22) return 'DINNER';
  return 'BEFORE_BED';
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Nutrition for `quantity` of a food, where quantity is in the food's own
 * serving unit (150 g of a food stored per 100 g = 1.5 servings). This is the
 * on-screen preview; the server calculates the saved values the same way.
 */
export function nutritionFor(food: Food, quantity: number) {
  const factor = quantity / (food.servingSize || 1);
  return {
    calories: Math.round(food.calories * factor),
    proteinG: round1(food.proteinG * factor),
    carbsG: round1(food.carbsG * factor),
    fatG: round1(food.fatG * factor),
  };
}

/** "1 piece", "100 g", "250 ml" */
export function servingLabel(size: number, unit: string): string {
  const n = Number.isInteger(size) ? String(size) : String(round1(size));
  return `${n} ${unit}`;
}

export const WEEK_DAYS: WeekDayName[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

/** "07:30" → "7:30 AM" */
export function formatClock(hhmm?: string | null): string {
  if (!hhmm) return '--';
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Normalises what someone typed ("7:5", "730", "19.30") to "HH:mm", or null. */
export function parseClock(input: string): string | null {
  const digits = input.trim().replace(/[.\s]/g, ':');
  let h: number;
  let m: number;
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(digits);
  if (match) {
    h = Number(match[1]);
    m = Number(match[2]);
  } else if (/^\d{3,4}$/.test(digits)) {
    h = Number(digits.slice(0, digits.length - 2));
    m = Number(digits.slice(-2));
  } else {
    return null;
  }
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "Every day", "Weekdays", or "Mon, Wed, Fri" */
export function describeDays(days: WeekDayName[]): string {
  if (!days.length || days.length === 7) return 'Every day';
  const key = days.join(',');
  if (key === 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY') return 'Weekdays';
  if (key === 'SATURDAY,SUNDAY') return 'Weekends';
  return days.map((d) => d.slice(0, 1) + d.slice(1, 3).toLowerCase()).join(', ');
}

/** YYYY-MM-DD moved by whole days, on the local calendar. */
export function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

/** Local Date for a YYYY-MM-DD at the current time of day (for consumedAt). */
export function dateAtNow(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  const now = new Date();
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
}
