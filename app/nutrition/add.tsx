import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useDebounced, useMutation } from '@/hooks/useApi';
import { nutritionApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Button, Chip, EmptyState, Field, LoadingState, SectionHeader, Txt } from '@/components/ui';

export default function AddFoodScreen() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [foodName, setFoodName] = useState('');
  const [mealType, setMealType] = useState('BREAKFAST');
  const [quantity, setQuantity] = useState('1');
  const [quantityUnit, setQuantityUnit] = useState('serving');
  const [calories, setCalories] = useState('');
  const [proteinG, setProteinG] = useState('');
  const [carbsG, setCarbsG] = useState('');
  const [fatG, setFatG] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const debouncedSearch = useDebounced(search, 350);

  const mealTypes = useApi(() => nutritionApi.mealTypes(), []);
  const frequent = useApi(
    () => nutritionApi.frequent({ limit: 12, search: debouncedSearch || undefined }),
    [debouncedSearch],
    { enabled: !isEdit },
  );
  const existing = useApi(() => (id ? nutritionApi.get(id) : Promise.resolve(null)), [id], {
    enabled: isEdit,
  });

  useEffect(() => {
    const f = existing.data;
    if (!f) return;
    setFoodName(f.foodName);
    setMealType(f.mealType);
    setQuantity(String(f.quantity));
    setQuantityUnit(f.quantityUnit);
    setCalories(String(f.calories));
    setProteinG(String(f.proteinG));
    setCarbsG(String(f.carbsG));
    setFatG(String(f.fatG));
    setNotes(f.notes || '');
  }, [existing.data]);

  // Default the meal type to whatever fits the current hour.
  useEffect(() => {
    if (isEdit) return;
    const hour = new Date().getHours();
    if (hour < 11) setMealType('BREAKFAST');
    else if (hour < 15) setMealType('LUNCH');
    else if (hour < 18) setMealType('SNACKS');
    else setMealType('DINNER');
  }, [isEdit]);

  const applyPreset = (item: any) => {
    setFoodName(item.foodName);
    setQuantity(String(item.quantity));
    setQuantityUnit(item.quantityUnit);
    setCalories(String(item.calories));
    setProteinG(String(item.proteinG));
    setCarbsG(String(item.carbsG));
    setFatG(String(item.fatG));
  };

  const save = useMutation(async () => {
    const payload = {
      foodName: foodName.trim(),
      mealType,
      quantity: parseFloat(quantity) || 1,
      quantityUnit: quantityUnit.trim() || 'serving',
      calories: parseFloat(calories) || 0,
      proteinG: parseFloat(proteinG) || 0,
      carbsG: parseFloat(carbsG) || 0,
      fatG: parseFloat(fatG) || 0,
      notes: notes.trim() || undefined,
    };
    return isEdit ? nutritionApi.update(id!, payload) : nutritionApi.create(payload);
  });

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    if (foodName.trim().length < 2) nextErrors.foodName = 'Enter a food name';
    if (!calories || Number.isNaN(parseFloat(calories)))
      nextErrors.calories = 'Enter the calories';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const result = await save.mutate();
    if (result) router.back();
  };

  if (isEdit && existing.loading) {
    return (
      <Screen withTabBar={false}>
        <LoadingState />
      </Screen>
    );
  }

  // Macro calories should roughly reconcile with the entered total.
  const macroCalories =
    (parseFloat(proteinG) || 0) * 4 + (parseFloat(carbsG) || 0) * 4 + (parseFloat(fatG) || 0) * 9;
  const enteredCalories = parseFloat(calories) || 0;
  const mismatch =
    enteredCalories > 0 && macroCalories > 0 && Math.abs(macroCalories - enteredCalories) > 60;

  return (
    <Screen withTabBar={false}>
      <ScreenHeader
        title={isEdit ? 'Edit Food' : 'Log Food'}
        subtitle={isEdit ? foodName : 'What did you eat?'}
        showBack
      />

      {!isEdit && (
        <>
          <Field
            value={search}
            onChangeText={setSearch}
            placeholder="Search foods you logged before"
            icon="search"
            autoCapitalize="none"
            style={{ marginBottom: spacing.md }}
          />

          {frequent.data?.items?.length ? (
            <>
              <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
                QUICK ADD
              </Txt>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, marginBottom: spacing.base }}
              >
                {frequent.data.items.map((item: any, index: number) => (
                  <Pressable
                    key={`${item.foodName}-${index}`}
                    onPress={() => applyPreset(item)}
                    style={({ pressed }) => ({
                      width: 142,
                      padding: spacing.md,
                      marginRight: spacing.sm,
                      borderRadius: radius.md,
                      backgroundColor: theme.glass,
                      borderWidth: StyleSheet.hairlineWidth * 2,
                      borderColor: theme.glassBorder,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Txt variant="small" style={{ fontWeight: '700' }} numberOfLines={1}>
                      {item.foodName}
                    </Txt>
                    <Txt variant="caption" color={theme.nutrition} style={{ marginTop: 3 }}>
                      {Math.round(item.calories)} kcal
                    </Txt>
                    <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 1 }}>
                      P{Math.round(item.proteinG)} C{Math.round(item.carbsG)} F
                      {Math.round(item.fatG)}
                    </Txt>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}
        </>
      )}

      <GlassCard variant="strong" style={{ marginBottom: spacing.base }}>
        <Field
          label="FOOD NAME *"
          value={foodName}
          onChangeText={(t) => {
            setFoodName(t);
            setErrors((p) => ({ ...p, foodName: undefined as any }));
          }}
          placeholder="e.g. Grilled Chicken Salad"
          error={errors.foodName}
        />

        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
          MEAL
        </Txt>
        <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          rowGap: spacing.sm,
          marginBottom: spacing.base,
        }}
      >
          {(mealTypes.data?.items || []).map((t) => (
            <Chip
              key={t.value}
              label={t.label}
              color={theme.nutrition}
              selected={mealType === t.value}
              onPress={() => setMealType(t.value)}
            />
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Field
            label="QUANTITY"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            placeholder="1"
            style={{ flex: 1 }}
          />
          <Field
            label="UNIT"
            value={quantityUnit}
            onChangeText={setQuantityUnit}
            placeholder="serving"
            autoCapitalize="none"
            style={{ flex: 1.3 }}
          />
        </View>

        <Field
          label="CALORIES *"
          value={calories}
          onChangeText={(t) => {
            setCalories(t);
            setErrors((p) => ({ ...p, calories: undefined as any }));
          }}
          keyboardType="decimal-pad"
          placeholder="550"
          suffix="kcal"
          icon="flame-outline"
          error={errors.calories}
        />

        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
          MACROS
        </Txt>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Field
            label="PROTEIN"
            value={proteinG}
            onChangeText={setProteinG}
            keyboardType="decimal-pad"
            placeholder="0"
            suffix="g"
            style={{ flex: 1 }}
          />
          <Field
            label="CARBS"
            value={carbsG}
            onChangeText={setCarbsG}
            keyboardType="decimal-pad"
            placeholder="0"
            suffix="g"
            style={{ flex: 1 }}
          />
          <Field
            label="FAT"
            value={fatG}
            onChangeText={setFatG}
            keyboardType="decimal-pad"
            placeholder="0"
            suffix="g"
            style={{ flex: 1 }}
          />
        </View>

        {mismatch && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              padding: spacing.md,
              borderRadius: radius.sm,
              backgroundColor: theme.streakSoft,
              marginBottom: spacing.base,
            }}
          >
            <Ionicons name="information-circle-outline" size={15} color={theme.streak} />
            <Txt variant="caption" color={theme.streak} style={{ flex: 1, marginLeft: spacing.sm }}>
              Your macros work out to about {Math.round(macroCalories)} kcal, which does not match
              the {Math.round(enteredCalories)} kcal entered. Saving either value is fine.
            </Txt>
          </View>
        )}

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
      </GlassCard>
    </Screen>
  );
}
