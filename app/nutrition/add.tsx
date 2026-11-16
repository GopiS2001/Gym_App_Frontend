import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useDebounced, useMutation } from '@/hooks/useApi';
import { foodsApi, nutritionApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Button, Chip, EmptyState, Field, LoadingState, Txt } from '@/components/ui';
import { useConfirm } from '@/components/Dialog';
import type { Food, FoodLog } from '@/types/models';
import { formatDate, todayIso } from '@/utils/format';
import {
  MEAL_TYPES,
  mealForNow,
  mealIcon,
  nutritionFor,
  parseClock,
  servingLabel,
  shiftIsoDate,
} from '@/utils/nutrition';

type Mode = 'library' | 'manual';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local date + optional "HH:mm" → ISO timestamp for consumedAt. */
function consumedAtFor(date: string, time: string | null): string {
  const [y, m, d] = date.split('-').map(Number);
  const now = new Date();
  const [h, min] = time ? time.split(':').map(Number) : [now.getHours(), now.getMinutes()];
  return new Date(y, m - 1, d, h, min).toISOString();
}

/** Quick amounts in the food's own unit. */
function quickAmounts(food: Pick<Food, 'servingSize' | 'servingUnit'>): number[] {
  const s = food.servingSize || 1;
  if (s === 1) return [0.5, 1, 2, 3];
  return [s * 0.5, s, s * 1.5, s * 2].map((n) => Math.round(n * 10) / 10);
}

/**
 * Add or edit a Food Intake entry.
 *
 * Normally a food is picked from the Food Library and only the quantity is
 * entered; calories and macros are calculated from the library values (and
 * saved as a snapshot by the server). Manual entry covers one-off foods.
 */
export default function AddFoodScreen() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const params = useLocalSearchParams<{
    id?: string;
    mealType?: string;
    date?: string;
    foodId?: string;
  }>();
  const id = params.id;
  const isEdit = !!id;

  const [mode, setMode] = useState<Mode>('library');
  const [food, setFood] = useState<Food | null>(null);
  const [entry, setEntry] = useState<FoodLog | null>(null);
  const [date, setDate] = useState(params.date || todayIso());
  const [mealType, setMealType] = useState(params.mealType || mealForNow());
  const [quantity, setQuantity] = useState('1');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  // Manual entry fields.
  const [foodName, setFoodName] = useState('');
  const [unit, setUnit] = useState('serving');
  const [calories, setCalories] = useState('');
  const [proteinG, setProteinG] = useState('');
  const [carbsG, setCarbsG] = useState('');
  const [fatG, setFatG] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(false);

  const debouncedSearch = useDebounced(search, 300);
  const searching = mode === 'library' && !food && !isEdit;

  const results = useApi(
    () => foodsApi.list({ search: debouncedSearch || undefined, limit: 40 }),
    [debouncedSearch],
    { enabled: searching },
  );
  const recent = useApi(() => nutritionApi.frequent({ limit: 8 }), [], {
    enabled: searching && !debouncedSearch,
  });
  const existing = useApi(() => (id ? nutritionApi.get(id) : Promise.resolve(null)), [id], {
    enabled: isEdit,
  });
  const preselected = useApi(
    () => (params.foodId ? foodsApi.get(params.foodId) : Promise.resolve(null)),
    [params.foodId],
    { enabled: !!params.foodId && !isEdit },
  );

  // Opened from the Food Library's "Log this food".
  useEffect(() => {
    if (preselected.data) pickFood(preselected.data);
  }, [preselected.data]);

  // Editing: fill the form from the saved entry.
  useEffect(() => {
    const f = existing.data;
    if (!f) return;
    setEntry(f);
    setMode(f.foodId ? 'library' : 'manual');
    setDate(String(f.loggedDate).slice(0, 10));
    setMealType(f.mealType);
    setQuantity(String(f.quantity));
    const at = new Date(f.consumedAt);
    setTime(`${pad(at.getHours())}:${pad(at.getMinutes())}`);
    setNotes(f.notes || '');
    setFoodName(f.foodName);
    setUnit(f.quantityUnit);
    setCalories(String(f.calories));
    setProteinG(String(f.proteinG));
    setCarbsG(String(f.carbsG));
    setFatG(String(f.fatG));
  }, [existing.data]);

  function pickFood(f: Food) {
    setFood(f);
    setMode('library');
    setQuantity(String(f.servingSize || 1));
    setErrors({});
  }

  const qty = parseFloat(quantity);
  const qtyValid = Number.isFinite(qty) && qty > 0;

  /** Calories and macros shown before saving. */
  const preview = useMemo(() => {
    if (!qtyValid) return null;
    if (food) return nutritionFor(food, qty);
    // An existing library entry scales its own snapshot, like the server does.
    if (entry?.foodId && mode === 'library' && entry.quantity) {
      const k = qty / entry.quantity;
      return {
        calories: Math.round(entry.calories * k),
        proteinG: Math.round(entry.proteinG * k * 10) / 10,
        carbsG: Math.round(entry.carbsG * k * 10) / 10,
        fatG: Math.round(entry.fatG * k * 10) / 10,
      };
    }
    return null;
  }, [food, entry, mode, qty, qtyValid]);

  const save = useMutation(async () => {
    const parsedTime = time.trim() ? parseClock(time) : null;
    const common = {
      mealType,
      quantity: qty,
      loggedDate: date,
      consumedAt: consumedAtFor(date, parsedTime),
      notes: notes.trim() || undefined,
    };

    if (mode === 'library' && (food || entry?.foodId)) {
      const payload = { ...common, ...(food ? { foodId: food.id } : {}) };
      return isEdit ? nutritionApi.update(id!, payload) : nutritionApi.create(payload);
    }

    const manual = {
      foodName: foodName.trim(),
      quantityUnit: unit.trim() || 'serving',
      calories: parseFloat(calories) || 0,
      proteinG: parseFloat(proteinG) || 0,
      carbsG: parseFloat(carbsG) || 0,
      fatG: parseFloat(fatG) || 0,
    };

    if (!isEdit && saveToLibrary) {
      // Save the food per the amount entered, then log it from the library.
      const created = await foodsApi.create({
        name: manual.foodName,
        servingSize: qty,
        servingUnit: manual.quantityUnit,
        calories: manual.calories,
        proteinG: manual.proteinG,
        carbsG: manual.carbsG,
        fatG: manual.fatG,
      });
      return nutritionApi.create({ ...common, foodId: created.id });
    }

    const payload = { ...common, ...manual };
    return isEdit ? nutritionApi.update(id!, payload) : nutritionApi.create(payload);
  });

  const handleSave = async () => {
    const next: Record<string, string> = {};
    if (!qtyValid) next.quantity = 'Enter an amount greater than zero';
    if (time.trim() && !parseClock(time)) next.time = 'Use a time like 08:30';
    if (mode === 'manual') {
      if (foodName.trim().length < 2) next.foodName = 'Enter a food name';
      if (!calories || Number.isNaN(parseFloat(calories))) next.calories = 'Enter the calories';
    } else if (!food && !entry?.foodId) {
      next.food = 'Choose a food from the library';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    const result = await save.mutate();
    if (result) router.back();
  };

  const remove = useMutation(async () => {
    await nutritionApi.remove(id!);
    return true;
  });

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete entry',
      message: `Remove "${entry?.foodName || foodName || 'this food'}" from your log?`,
      tone: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    if (await remove.mutate()) router.back();
  };

  if ((isEdit && existing.loading) || (!!params.foodId && preselected.loading)) {
    return (
      <Screen withTabBar={false}>
        <LoadingState />
      </Screen>
    );
  }

  const today = todayIso();
  const chosenName = food?.name || (mode === 'library' ? entry?.foodName : undefined);
  const chosenUnit = food?.servingUnit || entry?.quantityUnit || unit;

  // ------------------------------------------------------------ search view
  if (searching) {
    const items = results.data?.items || [];
    const recentItems = (recent.data?.items || []).slice(0, 8);
    return (
      <Screen withTabBar={false}>
        <ScreenHeader title="Add Food" subtitle="Pick a food from your library" showBack />

        <Field
          value={search}
          onChangeText={setSearch}
          placeholder="Search the Food Library"
          icon="search"
          autoCapitalize="none"
        />

        {!debouncedSearch && recentItems.length > 0 && (
          <>
            <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
              RECENTLY LOGGED
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.base }}>
              {recentItems.map((r: any, i: number) => (
                <Chip
                  key={`${r.foodName}-${i}`}
                  label={r.foodName}
                  icon={r.foodId ? 'library-outline' : 'create-outline'}
                  onPress={async () => {
                    if (r.foodId) {
                      const f = await foodsApi.get(r.foodId).catch(() => null);
                      if (f && f.isActive) return pickFood(f);
                    }
                    // Not from the library (or removed since): prefill manual entry.
                    setMode('manual');
                    setFoodName(r.foodName);
                    setQuantity(String(r.quantity));
                    setUnit(r.quantityUnit);
                    setCalories(String(r.calories));
                    setProteinG(String(r.proteinG));
                    setCarbsG(String(r.carbsG));
                    setFatG(String(r.fatG));
                  }}
                />
              ))}
            </View>
          </>
        )}

        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
          {debouncedSearch ? 'RESULTS' : 'FOOD LIBRARY'}
        </Txt>

        {results.loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <GlassCard>
            <EmptyState
              icon="search-outline"
              title={debouncedSearch ? `No food called "${debouncedSearch}"` : 'Your library is empty'}
              message="Add it to the Food Library, or enter it manually."
              actionLabel="Add to library"
              onAction={() =>
                router.push({ pathname: '/nutrition/library/edit', params: { name: debouncedSearch } })
              }
            />
          </GlassCard>
        ) : (
          <GlassCard padded={false} style={{ marginBottom: spacing.base }}>
            {items.map((f, i) => (
              <Pressable
                key={f.id}
                onPress={() => pickFood(f)}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.base,
                  borderTopWidth: i ? StyleSheet.hairlineWidth : 0,
                  borderTopColor: theme.divider,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={{ flex: 1 }}>
                  <Txt variant="small" style={{ fontWeight: '700' }}>
                    {f.name}
                  </Txt>
                  <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                    {servingLabel(f.servingSize, f.servingUnit)} · P {f.proteinG}g · C {f.carbsG}g · F {f.fatG}g
                  </Txt>
                </View>
                <Txt variant="small" color={theme.nutrition} style={{ fontWeight: '700' }}>
                  {Math.round(f.calories)} kcal
                </Txt>
              </Pressable>
            ))}
          </GlassCard>
        )}

        <Button
          title="Enter manually instead"
          variant="ghost"
          icon="create-outline"
          fullWidth
          onPress={() => {
            setMode('manual');
            setFoodName(search.trim());
          }}
        />
      </Screen>
    );
  }

  // -------------------------------------------------------------- form view
  return (
    <Screen withTabBar={false}>
      <ScreenHeader
        title={isEdit ? 'Edit Food' : 'Log Food'}
        subtitle={chosenName || foodName || 'What did you eat?'}
        showBack
      />

      {mode === 'manual' && !isEdit && (
        <Button
          title="Choose from Food Library instead"
          variant="ghost"
          icon="library-outline"
          fullWidth
          style={{ marginBottom: spacing.md }}
          onPress={() => {
            setMode('library');
            setFood(null);
          }}
        />
      )}

      {/* Chosen library food */}
      {mode === 'library' && chosenName && (
        <GlassCard style={{ marginBottom: spacing.base }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.nutritionSoft,
                marginRight: spacing.md,
              }}
            >
              <Ionicons name="nutrition-outline" size={20} color={theme.nutrition} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">{chosenName}</Txt>
              <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                {food
                  ? `${Math.round(food.calories)} kcal per ${servingLabel(food.servingSize, food.servingUnit)}`
                  : 'Logged from the Food Library'}
              </Txt>
            </View>
            {!isEdit && (
              <Button
                title="Change"
                variant="ghost"
                size="sm"
                onPress={() => {
                  setFood(null);
                  setSearch('');
                }}
              />
            )}
          </View>
        </GlassCard>
      )}

      <GlassCard variant="strong" style={{ marginBottom: spacing.base }}>
        {/* Date */}
        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
          DATE
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.base }}>
          <Chip label="‹" onPress={() => setDate(shiftIsoDate(date, -1))} />
          <Txt variant="bodyStrong" align="center" style={{ flex: 1 }}>
            {date === today ? 'Today' : formatDate(`${date}T12:00:00`, 'long')}
          </Txt>
          <View style={{ opacity: date >= today ? 0.3 : 1 }}>
            <Chip label="›" onPress={() => date < today && setDate(shiftIsoDate(date, 1))} />
          </View>
        </View>

        {/* Meal */}
        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
          MEAL
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.base }}>
          {MEAL_TYPES.map((t) => (
            <Chip
              key={t.value}
              label={t.label}
              icon={mealIcon(t.value)}
              color={theme.nutrition}
              selected={mealType === t.value}
              onPress={() => setMealType(t.value)}
            />
          ))}
        </View>

        {mode === 'manual' && (
          <Field
            label="FOOD NAME *"
            value={foodName}
            onChangeText={(t) => {
              setFoodName(t);
              setErrors((p) => ({ ...p, foodName: undefined }));
            }}
            placeholder="e.g. Chicken biryani"
            error={errors.foodName}
          />
        )}

        {/* Quantity */}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Field
            label="QUANTITY *"
            value={quantity}
            onChangeText={(t) => {
              setQuantity(t);
              setErrors((p) => ({ ...p, quantity: undefined }));
            }}
            keyboardType="decimal-pad"
            placeholder="1"
            error={errors.quantity}
            suffix={mode === 'library' ? chosenUnit : undefined}
            style={{ flex: 1 }}
          />
          {mode === 'manual' && (
            <Field
              label="UNIT"
              value={unit}
              onChangeText={setUnit}
              placeholder="serving"
              autoCapitalize="none"
              style={{ flex: 1 }}
            />
          )}
        </View>

        {mode === 'library' && food && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.base }}>
            {quickAmounts(food).map((n) => (
              <Chip
                key={n}
                label={`${n} ${food.servingUnit}`}
                selected={qty === n}
                onPress={() => setQuantity(String(n))}
              />
            ))}
          </View>
        )}

        {/* Nutrition: calculated preview, or typed in for manual entries */}
        {mode === 'library' ? (
          <View
            style={{
              padding: spacing.base,
              borderRadius: radius.md,
              backgroundColor: theme.nutritionSoft,
              marginBottom: spacing.base,
            }}
          >
            <Txt variant="caption" color={theme.textTertiary}>
              YOU'LL LOG (ESTIMATE)
            </Txt>
            {preview ? (
              <>
                <Txt variant="h2" color={theme.nutrition} style={{ marginTop: 4 }}>
                  {preview.calories} kcal
                </Txt>
                <Txt variant="small" color={theme.textSecondary} style={{ marginTop: 2 }}>
                  Protein {preview.proteinG} g · Carbs {preview.carbsG} g · Fat {preview.fatG} g
                </Txt>
              </>
            ) : (
              <Txt variant="small" color={theme.textTertiary} style={{ marginTop: 4 }}>
                Enter an amount to see calories and macros.
              </Txt>
            )}
          </View>
        ) : (
          <>
            <Field
              label="CALORIES *"
              value={calories}
              onChangeText={(t) => {
                setCalories(t);
                setErrors((p) => ({ ...p, calories: undefined }));
              }}
              keyboardType="decimal-pad"
              placeholder="550"
              suffix="kcal"
              icon="flame-outline"
              error={errors.calories}
            />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Field label="PROTEIN" value={proteinG} onChangeText={setProteinG} keyboardType="decimal-pad" placeholder="0" suffix="g" style={{ flex: 1 }} />
              <Field label="CARBS" value={carbsG} onChangeText={setCarbsG} keyboardType="decimal-pad" placeholder="0" suffix="g" style={{ flex: 1 }} />
              <Field label="FAT" value={fatG} onChangeText={setFatG} keyboardType="decimal-pad" placeholder="0" suffix="g" style={{ flex: 1 }} />
            </View>
            {!isEdit && (
              <Pressable
                onPress={() => setSaveToLibrary((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: saveToLibrary }}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.base }}
              >
                <Ionicons
                  name={saveToLibrary ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={saveToLibrary ? theme.primary : theme.textTertiary}
                />
                <Txt variant="small" style={{ marginLeft: spacing.sm, flex: 1 }}>
                  Also save to my Food Library (values per the amount above)
                </Txt>
              </Pressable>
            )}
          </>
        )}

        {errors.food && (
          <Txt variant="small" color={theme.danger} style={{ marginBottom: spacing.md }}>
            {errors.food}
          </Txt>
        )}

        <Field
          label="TIME (OPTIONAL)"
          value={time}
          onChangeText={(t) => {
            setTime(t);
            setErrors((p) => ({ ...p, time: undefined }));
          }}
          placeholder="Now, or e.g. 08:30"
          keyboardType="default"
          icon="time-outline"
          error={errors.time}
        />

        <Field
          label="NOTES"
          value={notes}
          onChangeText={setNotes}
          placeholder="Where it was from, how it was cooked…"
          multiline
        />

        {save.error && (
          <Txt variant="small" color={theme.danger} style={{ marginBottom: spacing.md }}>
            {save.error}
          </Txt>
        )}

        <Button
          title={isEdit ? 'Save changes' : 'Log food'}
          icon="checkmark"
          fullWidth
          size="lg"
          loading={save.loading}
          onPress={handleSave}
        />

        {isEdit && (
          <>
            {remove.error && (
              <Txt variant="small" color={theme.danger} style={{ marginTop: spacing.md }}>
                {remove.error}
              </Txt>
            )}
            <View style={{ marginTop: spacing.md }}>
              <Button
                title="Delete entry"
                icon="trash-outline"
                variant="danger"
                fullWidth
                size="lg"
                loading={remove.loading}
                onPress={handleDelete}
              />
            </View>
          </>
        )}
      </GlassCard>
    </Screen>
  );
}
