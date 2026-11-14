import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Txt } from './ui';

type Mode = 'date' | 'time';

interface DateFieldProps {
  label?: string;
  /** `YYYY-MM-DD` in date mode, `HH:MM` (24h) in time mode. */
  value: string;
  onChange: (value: string) => void;
  mode?: Mode;
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  clearable?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  style?: any;
  disabled?: boolean;
}

// ---------------------------------------------------------------- constants

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// --------------------------------------------------------------- conversion

/**
 * `YYYY-MM-DD` is built from local parts on purpose.
 * `new Date('1998-06-15')` parses as UTC midnight, which reads as the 14th
 * anywhere west of Greenwich — the calendar would open on the wrong day and
 * save it back shifted.
 */
function parseDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function parseTime(value: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value || '');
  if (!m) return null;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatTimeValue(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function displayText(value: string, mode: Mode): string | null {
  if (mode === 'time') {
    const d = parseTime(value);
    if (!d) return null;
    const h = d.getHours();
    return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }
  const d = parseDate(value);
  if (!d) return null;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Local y/m/d equality — avoids comparing times. */
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function tap() {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync().catch(() => undefined);
  }
}

// ------------------------------------------------------------------- field

export function DateField({
  label,
  value,
  onChange,
  mode = 'date',
  placeholder,
  icon,
  error,
  clearable = false,
  minimumDate,
  maximumDate,
  style,
  disabled = false,
}: DateFieldProps) {
  const { theme, radius, spacing } = useTheme();
  const [open, setOpen] = useState(false);

  const parsed = useMemo(
    () => (mode === 'time' ? parseTime(value) : parseDate(value)),
    [value, mode],
  );

  /**
   * Where the picker opens when nothing is chosen yet. For a date of birth the
   * maximum is decades back, so starting there saves a long scroll.
   */
  const initial = useMemo(() => {
    if (parsed) return parsed;
    if (mode === 'time') return new Date();
    const today = new Date();
    if (maximumDate && maximumDate < today) return maximumDate;
    if (minimumDate && minimumDate > today) return minimumDate;
    return today;
  }, [parsed, mode, minimumDate, maximumDate]);

  const text = displayText(value, mode);
  const weekday = mode === 'date' && parsed ? DAYS_SHORT[parsed.getDay()] : null;

  return (
    <View style={[{ marginBottom: spacing.base }, style]}>
      {label ? (
        <Txt
          variant="caption"
          color={theme.textTertiary}
          style={{ marginBottom: spacing.sm, marginLeft: 2 }}
        >
          {label}
        </Txt>
      ) : null}

      <Pressable
        onPress={() => {
          if (disabled) return;
          tap();
          setOpen(true);
        }}
        disabled={disabled}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.inputBackground,
          borderRadius: radius.pill,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: error ? theme.danger : open ? theme.primary : theme.inputBorder,
          paddingHorizontal: spacing.base,
          minHeight: 52,
          opacity: disabled ? 0.6 : pressed ? 0.8 : 1,
        })}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: text ? theme.primarySoft : theme.surfaceMuted,
            marginRight: spacing.md,
          }}
        >
          <Ionicons
            name={icon || (mode === 'time' ? 'time-outline' : 'calendar-outline')}
            size={15}
            color={text ? theme.primary : theme.textTertiary}
          />
        </View>

        <Txt
          variant="body"
          color={text ? theme.text : theme.inputPlaceholder}
          style={{ flex: 1, fontWeight: '700' }}
          numberOfLines={1}
        >
          {text || placeholder || (mode === 'time' ? 'Select a time' : 'Select a date')}
        </Txt>

        {weekday ? (
          <Txt variant="caption" color={theme.primary} style={{ marginRight: spacing.sm }}>
            {weekday}
          </Txt>
        ) : null}

        {clearable && value ? (
          <Pressable
            onPress={() => {
              tap();
              onChange('');
            }}
            hitSlop={10}
            style={{ padding: 2, marginRight: 2 }}
          >
            <Ionicons name="close-circle" size={17} color={theme.textTertiary} />
          </Pressable>
        ) : null}

        <Ionicons name="chevron-down" size={15} color={theme.textTertiary} />
      </Pressable>

      {error ? (
        <Txt
          variant="caption"
          color={theme.danger}
          style={{ marginTop: spacing.xs, marginLeft: spacing.md }}
        >
          {error}
        </Txt>
      ) : null}

      <PickerSheet
        visible={open}
        mode={mode}
        title={label}
        initial={initial}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onCancel={() => setOpen(false)}
        onConfirm={(d) => {
          setOpen(false);
          onChange(mode === 'time' ? formatTimeValue(d) : formatDateValue(d));
        }}
      />
    </View>
  );
}

// ------------------------------------------------------------------- sheet

/**
 * One sheet for both modes, built from app components rather than the OS
 * picker so the look is identical on iOS, Android and web.
 */
function PickerSheet({
  visible,
  mode,
  title,
  initial,
  minimumDate,
  maximumDate,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  mode: Mode;
  title?: string;
  initial: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onCancel: () => void;
  onConfirm: (d: Date) => void;
}) {
  const { theme, radius, spacing } = useTheme();

  const [draft, setDraft] = useState<Date>(initial);
  const [view, setView] = useState<'days' | 'months' | 'years'>('days');

  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setDraft(initial);
    setView('days');
    slide.setValue(0);
    Animated.timing(slide, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, initial, slide]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  const headerLabel =
    mode === 'time'
      ? `${draft.getHours() % 12 || 12}:${String(draft.getMinutes()).padStart(2, '0')} ${
          draft.getHours() >= 12 ? 'PM' : 'AM'
        }`
      : `${DAYS_SHORT[draft.getDay()]}, ${draft.getDate()} ${
          MONTHS_SHORT[draft.getMonth()]
        } ${draft.getFullYear()}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Dimmed, blurred backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill}>
              <View
                style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,8,11,0.55)' }]}
              />
            </BlurView>
          ) : (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,8,11,0.72)' }]}
            />
          )}
        </Pressable>

        <Animated.View style={{ opacity: slide, transform: [{ translateY }] }}>
          <View
            style={{
              backgroundColor: theme.cardElevated,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              borderTopWidth: StyleSheet.hairlineWidth * 2,
              borderColor: theme.glassBorder,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOpacity: 0.4,
              shadowRadius: 30,
              shadowOffset: { width: 0, height: -10 },
              elevation: 24,
            }}
          >
            {/* accent wash behind the header */}
            <LinearGradient
              colors={[`${theme.primary}26`, 'transparent']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120 }}
            />

            <View style={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
              <View
                style={{
                  width: 38,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.border,
                  alignSelf: 'center',
                  marginBottom: spacing.base,
                }}
              />

              {/* live preview of the pending selection */}
              <Txt variant="caption" color={theme.textTertiary} align="center">
                {title || (mode === 'time' ? 'SELECT A TIME' : 'SELECT A DATE')}
              </Txt>
              <Txt variant="h3" align="center" style={{ marginTop: 3, marginBottom: spacing.lg }}>
                {headerLabel}
              </Txt>

              {mode === 'time' ? (
                <TimeWheels value={draft} onChange={setDraft} />
              ) : view === 'days' ? (
                <CalendarGrid
                  draft={draft}
                  onChange={setDraft}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  onOpenMonths={() => setView('months')}
                  onOpenYears={() => setView('years')}
                />
              ) : view === 'months' ? (
                <MonthGrid
                  draft={draft}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  onPick={(monthIndex) => {
                    const d = new Date(draft);
                    d.setMonth(monthIndex, 1);
                    setDraft(clampTo(d, minimumDate, maximumDate));
                    setView('days');
                  }}
                  onBack={() => setView('days')}
                />
              ) : (
                <YearGrid
                  draft={draft}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  onPick={(year) => {
                    const d = new Date(draft);
                    d.setFullYear(year);
                    setDraft(clampTo(d, minimumDate, maximumDate));
                    setView('months');
                  }}
                  onBack={() => setView('days')}
                />
              )}

              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
                <Button title="Cancel" variant="glass" style={{ flex: 1 }} onPress={onCancel} />
                <Button
                  title="Confirm"
                  icon="checkmark"
                  style={{ flex: 1.4 }}
                  onPress={() => onConfirm(draft)}
                />
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function clampTo(d: Date, min?: Date, max?: Date): Date {
  if (min && d < min) return new Date(min);
  if (max && d > max) return new Date(max);
  return d;
}

// ---------------------------------------------------------------- calendar

function CalendarGrid({
  draft,
  onChange,
  minimumDate,
  maximumDate,
  onOpenMonths,
  onOpenYears,
}: {
  draft: Date;
  onChange: (d: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  onOpenMonths: () => void;
  onOpenYears: () => void;
}) {
  const { theme, radius, spacing } = useTheme();
  const [cursor, setCursor] = useState(new Date(draft.getFullYear(), draft.getMonth(), 1));

  useEffect(() => {
    setCursor(new Date(draft.getFullYear(), draft.getMonth(), 1));
  }, [draft]);

  const today = startOfDay(new Date());
  const minDay = minimumDate ? startOfDay(minimumDate) : null;
  const maxDay = maximumDate ? startOfDay(maximumDate) : null;

  const { cells, canPrev, canNext } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const leading = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();

    const list: (Date | null)[] = [];
    for (let i = 0; i < leading; i += 1) list.push(null);
    for (let day = 1; day <= count; day += 1) list.push(new Date(year, month, day));

    const prevMonthEnd = new Date(year, month, 0);
    const nextMonthStart = new Date(year, month + 1, 1);

    return {
      cells: list,
      canPrev: !minDay || prevMonthEnd >= minDay,
      canNext: !maxDay || nextMonthStart <= maxDay,
    };
  }, [cursor, minDay, maxDay]);

  const shiftMonth = (delta: number) => {
    tap();
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  };

  const isDisabled = (d: Date) => (minDay && d < minDay) || (maxDay && d > maxDay);

  return (
    <View>
      {/* month / year header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.base,
        }}
      >
        <NavButton icon="chevron-back" disabled={!canPrev} onPress={() => shiftMonth(-1)} />

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Pressable
            onPress={() => {
              tap();
              onOpenMonths();
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.md,
              paddingVertical: 7,
              borderRadius: radius.pill,
              backgroundColor: theme.surfaceMuted,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Txt variant="small" style={{ fontWeight: '800' }}>
              {MONTHS_LONG[cursor.getMonth()]}
            </Txt>
            <Ionicons name="chevron-down" size={12} color={theme.textTertiary} style={{ marginLeft: 4 }} />
          </Pressable>

          <Pressable
            onPress={() => {
              tap();
              onOpenYears();
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.md,
              paddingVertical: 7,
              borderRadius: radius.pill,
              backgroundColor: theme.primarySoft,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Txt variant="small" color={theme.primary} style={{ fontWeight: '800' }}>
              {cursor.getFullYear()}
            </Txt>
            <Ionicons name="chevron-down" size={12} color={theme.primary} style={{ marginLeft: 4 }} />
          </Pressable>
        </View>

        <NavButton icon="chevron-forward" disabled={!canNext} onPress={() => shiftMonth(1)} />
      </View>

      {/* weekday header */}
      <View style={{ flexDirection: 'row', marginBottom: spacing.xs }}>
        {DAY_INITIALS.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Txt variant="caption" color={theme.textTertiary}>
              {d}
            </Txt>
          </View>
        ))}
      </View>

      {/* day grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, index) => {
          if (!d) {
            return <View key={`blank-${index}`} style={{ width: `${100 / 7}%`, height: 44 }} />;
          }

          const selected = sameDay(d, draft);
          const isToday = sameDay(d, today);
          const off = isDisabled(d);

          return (
            <View key={d.toISOString()} style={{ width: `${100 / 7}%`, height: 44, padding: 2 }}>
              <Pressable
                onPress={() => {
                  if (off) return;
                  tap();
                  // keep the time-of-day noon anchor so DST never shifts it
                  onChange(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12));
                }}
                disabled={!!off}
                style={({ pressed }) => ({
                  flex: 1,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? theme.primary : 'transparent',
                  borderWidth: !selected && isToday ? 1.5 : 0,
                  borderColor: theme.primary,
                  opacity: off ? 0.25 : pressed ? 0.6 : 1,
                  ...(selected
                    ? {
                        shadowColor: theme.primary,
                        shadowOpacity: 0.55,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 3 },
                        elevation: 6,
                      }
                    : {}),
                })}
              >
                <Txt
                  variant="small"
                  color={selected ? theme.onPrimary : isToday ? theme.primary : theme.text}
                  style={{ fontWeight: selected || isToday ? '800' : '600' }}
                >
                  {d.getDate()}
                </Txt>
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* quick jump */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm }}>
        <Pressable
          onPress={() => {
            if (isDisabled(today)) return;
            tap();
            onChange(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12));
          }}
          disabled={!!isDisabled(today)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.base,
            paddingVertical: 6,
            borderRadius: radius.pill,
            backgroundColor: theme.surfaceMuted,
            opacity: isDisabled(today) ? 0.35 : pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="today-outline" size={13} color={theme.textSecondary} />
          <Txt variant="caption" color={theme.textSecondary} style={{ marginLeft: 5 }}>
            Jump to today
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

function NavButton({
  icon,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { theme, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.surfaceMuted,
        opacity: disabled ? 0.3 : pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={18} color={theme.text} />
    </Pressable>
  );
}

// ------------------------------------------------------------ month / year

function MonthGrid({
  draft,
  minimumDate,
  maximumDate,
  onPick,
  onBack,
}: {
  draft: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onPick: (monthIndex: number) => void;
  onBack: () => void;
}) {
  const { theme, radius, spacing } = useTheme();
  const year = draft.getFullYear();

  const disabled = (m: number) => {
    const monthEnd = new Date(year, m + 1, 0);
    const monthStart = new Date(year, m, 1);
    if (minimumDate && monthEnd < startOfDay(minimumDate)) return true;
    if (maximumDate && monthStart > startOfDay(maximumDate)) return true;
    return false;
  };

  return (
    <View>
      <SubHeader title={`Month · ${year}`} onBack={onBack} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {MONTHS_SHORT.map((m, i) => {
          const selected = draft.getMonth() === i;
          const off = disabled(i);
          return (
            <View key={m} style={{ width: '33.333%', padding: 4 }}>
              <Pressable
                onPress={() => !off && onPick(i)}
                disabled={off}
                style={({ pressed }) => ({
                  paddingVertical: spacing.md,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  backgroundColor: selected ? theme.primary : theme.surfaceMuted,
                  opacity: off ? 0.25 : pressed ? 0.6 : 1,
                })}
              >
                <Txt
                  variant="small"
                  color={selected ? theme.onPrimary : theme.text}
                  style={{ fontWeight: '700' }}
                >
                  {m}
                </Txt>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function YearGrid({
  draft,
  minimumDate,
  maximumDate,
  onPick,
  onBack,
}: {
  draft: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onPick: (year: number) => void;
  onBack: () => void;
}) {
  const { theme, radius, spacing } = useTheme();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const minYear = minimumDate ? minimumDate.getFullYear() : new Date().getFullYear() - 100;
  const maxYear = maximumDate ? maximumDate.getFullYear() : new Date().getFullYear() + 10;

  const years = useMemo(() => {
    const list: number[] = [];
    // newest first — a birth year or a recent date is usually near the top
    for (let y = maxYear; y >= minYear; y -= 1) list.push(y);
    return list;
  }, [minYear, maxYear]);

  // Open scrolled to the year already selected rather than at the top.
  useEffect(() => {
    const index = years.indexOf(draft.getFullYear());
    if (index < 0) return;
    const row = Math.floor(index / 3);
    const timer = setTimeout(
      () => scrollRef.current?.scrollTo({ y: Math.max(0, row * 52 - 80), animated: false }),
      40,
    );
    return () => clearTimeout(timer);
  }, [years, draft]);

  return (
    <View>
      <SubHeader title="Year" onBack={onBack} />
      <ScrollView
        ref={scrollRef}
        style={{ maxHeight: 260 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {years.map((y) => {
            const selected = draft.getFullYear() === y;
            return (
              <View key={y} style={{ width: '33.333%', padding: 4 }}>
                <Pressable
                  onPress={() => {
                    tap();
                    onPick(y);
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: spacing.md,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    backgroundColor: selected ? theme.primary : theme.surfaceMuted,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Txt
                    variant="small"
                    color={selected ? theme.onPrimary : theme.text}
                    style={{ fontWeight: '700' }}
                  >
                    {y}
                  </Txt>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const { theme, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
      }}
    >
      <NavButton icon="chevron-back" onPress={onBack} />
      <Txt variant="small" color={theme.textSecondary} style={{ fontWeight: '700' }}>
        {title}
      </Txt>
      <View style={{ width: 36 }} />
    </View>
  );
}

// ------------------------------------------------------------- time wheels

const ITEM_H = 46;
const WHEEL_H = ITEM_H * 5;

function TimeWheels({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const { theme, radius, spacing } = useTheme();

  const hour12 = value.getHours() % 12 || 12;
  const isPm = value.getHours() >= 12;

  const setParts = (h12: number, minute: number, pm: boolean) => {
    const d = new Date(value);
    const h24 = (h12 % 12) + (pm ? 12 : 0);
    d.setHours(h24, minute, 0, 0);
    onChange(d);
  };

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          height: WHEEL_H,
          borderRadius: radius.lg,
          backgroundColor: theme.surfaceMuted,
          overflow: 'hidden',
        }}
      >
        {/* selection band sits behind both columns */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: spacing.sm,
            right: spacing.sm,
            top: ITEM_H * 2,
            height: ITEM_H,
            borderRadius: radius.md,
            backgroundColor: theme.primarySoft,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: `${theme.primary}55`,
          }}
        />

        <Wheel
          data={Array.from({ length: 12 }, (_, i) => i + 1)}
          selected={hour12}
          onSelect={(h) => setParts(h, value.getMinutes(), isPm)}
          format={(n) => String(n)}
        />
        <View style={{ justifyContent: 'center' }}>
          <Txt variant="h3" color={theme.textTertiary}>
            :
          </Txt>
        </View>
        <Wheel
          data={Array.from({ length: 60 }, (_, i) => i)}
          selected={value.getMinutes()}
          onSelect={(m) => setParts(hour12, m, isPm)}
          format={(n) => String(n).padStart(2, '0')}
        />
      </View>

      {/* AM / PM */}
      <View
        style={{
          flexDirection: 'row',
          marginTop: spacing.md,
          padding: 4,
          borderRadius: radius.pill,
          backgroundColor: theme.surfaceMuted,
        }}
      >
        {[false, true].map((pm) => {
          const active = isPm === pm;
          return (
            <Pressable
              key={String(pm)}
              onPress={() => {
                tap();
                setParts(hour12, value.getMinutes(), pm);
              }}
              style={{
                flex: 1,
                paddingVertical: spacing.sm + 2,
                borderRadius: radius.pill,
                alignItems: 'center',
                backgroundColor: active ? theme.primary : 'transparent',
              }}
            >
              <Txt
                variant="small"
                color={active ? theme.onPrimary : theme.textSecondary}
                style={{ fontWeight: '800' }}
              >
                {pm ? 'PM' : 'AM'}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Wheel({
  data,
  selected,
  onSelect,
  format,
}: {
  data: number[];
  selected: number;
  onSelect: (value: number) => void;
  format: (n: number) => string;
}) {
  const { theme } = useTheme();
  const ref = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const settling = useRef(false);

  const index = Math.max(0, data.indexOf(selected));

  // Follow external changes, but not while the user is mid-scroll.
  useEffect(() => {
    if (settling.current) return;
    const timer = setTimeout(
      () => ref.current?.scrollTo({ y: index * ITEM_H, animated: false }),
      30,
    );
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <ScrollView
      ref={ref}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
      onScrollBeginDrag={() => {
        settling.current = true;
      }}
      onMomentumScrollEnd={(e) => {
        const next = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
        settling.current = false;
        const picked = data[Math.max(0, Math.min(data.length - 1, next))];
        if (picked !== undefined && picked !== selected) {
          tap();
          onSelect(picked);
        }
      }}
    >
      {data.map((n) => {
        const active = n === selected;
        return (
          <Pressable
            key={n}
            onPress={() => {
              tap();
              onSelect(n);
            }}
            style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}
          >
            <Txt
              variant={active ? 'h3' : 'body'}
              color={active ? theme.primary : theme.textTertiary}
              style={{ fontWeight: active ? '800' : '600' }}
            >
              {format(n)}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ------------------------------------------------------------------ helpers

/** Today as `YYYY-MM-DD`, in the device's own calendar. */
export function todayValue(): string {
  return formatDateValue(new Date());
}

/** A date `years` back from today — handy for sensible bounds. */
export function yearsAgo(years: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d;
}

/** `YYYY-MM-DD` to a local Date, or null. Useful for min/max bounds. */
export function parseIsoDate(value?: string | null): Date | null {
  return parseDate(value || '');
}
