import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useMutation } from '@/hooks/useApi';
import { foodsApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Button, Chip, Field, LoadingState, Txt } from '@/components/ui';

const UNITS = ['piece', 'g', 'ml', 'cup', 'bowl', 'slice', 'tbsp', 'scoop', 'serving'];

/** Add a food to the library, or edit one (past entries keep their values). */
export default function EditFoodScreen() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const isEdit = !!params.id;

  const [name, setName] = useState(params.name || '');
  const [category, setCategory] = useState('');
  const [servingSize, setServingSize] = useState('1');
  const [servingUnit, setServingUnit] = useState('piece');
  const [calories, setCalories] = useState('');
  const [proteinG, setProteinG] = useState('');
  const [carbsG, setCarbsG] = useState('');
  const [fatG, setFatG] = useState('');
  const [fibreG, setFibreG] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const existing = useApi(
    () => (params.id ? foodsApi.get(params.id) : Promise.resolve(null)),
    [params.id],
    { enabled: isEdit },
  );
  const categories = useApi(() => foodsApi.categories(), []);

  useEffect(() => {
    const f = existing.data;
    if (!f) return;
    setName(f.name);
    setCategory(f.category || '');
    setServingSize(String(f.servingSize));
    setServingUnit(f.servingUnit);
    setCalories(String(f.calories));
    setProteinG(String(f.proteinG));
    setCarbsG(String(f.carbsG));
    setFatG(String(f.fatG));
    setFibreG(f.fibreG != null ? String(f.fibreG) : '');
  }, [existing.data]);

  const save = useMutation(async () => {
    const payload = {
      name: name.trim(),
      category: category.trim() || undefined,
      servingSize: parseFloat(servingSize),
      servingUnit: servingUnit.trim(),
      calories: parseFloat(calories),
      proteinG: parseFloat(proteinG) || 0,
      carbsG: parseFloat(carbsG) || 0,
      fatG: parseFloat(fatG) || 0,
      fibreG: fibreG.trim() ? parseFloat(fibreG) || 0 : undefined,
      // Saving a removed food brings it back into the library.
      isActive: true,
    };
    return isEdit ? foodsApi.update(params.id!, payload) : foodsApi.create(payload);
  });

  const handleSave = async () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Enter a food name';
    const size = parseFloat(servingSize);
    if (!Number.isFinite(size) || size <= 0) next.servingSize = 'Must be more than 0';
    if (!servingUnit.trim()) next.servingUnit = 'Enter a unit';
    if (!calories.trim() || Number.isNaN(parseFloat(calories)) || parseFloat(calories) < 0)
      next.calories = 'Enter the calories';
    setErrors(next);
    if (Object.keys(next).length) return;
    if (await save.mutate()) router.back();
  };

  if (isEdit && existing.loading) {
    return (
      <Screen withTabBar={false}>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen withTabBar={false}>
      <ScreenHeader
        title={isEdit ? 'Edit Food' : 'New Food'}
        subtitle="Nutrition for one serving"
        showBack
      />

      <GlassCard variant="strong">
        <Field
          label="FOOD NAME *"
          value={name}
          onChangeText={(t) => {
            setName(t);
            setErrors((p) => ({ ...p, name: undefined }));
          }}
          placeholder="e.g. Boiled Egg"
          error={errors.name}
        />

        <Field
          label="CATEGORY"
          value={category}
          onChangeText={setCategory}
          placeholder="e.g. Protein"
        />
        {!!categories.data?.items.length && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: -spacing.sm, marginBottom: spacing.base }}>
            {categories.data.items.map((c) => (
              <Chip
                key={c.name}
                label={c.name}
                selected={category === c.name}
                onPress={() => setCategory(c.name)}
              />
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Field
            label="SERVING SIZE *"
            value={servingSize}
            onChangeText={(t) => {
              setServingSize(t);
              setErrors((p) => ({ ...p, servingSize: undefined }));
            }}
            keyboardType="decimal-pad"
            error={errors.servingSize}
            style={{ flex: 1 }}
          />
          <Field
            label="UNIT *"
            value={servingUnit}
            onChangeText={(t) => {
              setServingUnit(t);
              setErrors((p) => ({ ...p, servingUnit: undefined }));
            }}
            autoCapitalize="none"
            error={errors.servingUnit}
            style={{ flex: 1 }}
          />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: -spacing.sm, marginBottom: spacing.base }}>
          {UNITS.map((u) => (
            <Chip key={u} label={u} selected={servingUnit === u} onPress={() => setServingUnit(u)} />
          ))}
        </View>

        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.md }}>
          The values below are for {servingSize || '1'} {servingUnit || 'serving'}.
        </Txt>

        <Field
          label="CALORIES *"
          value={calories}
          onChangeText={(t) => {
            setCalories(t);
            setErrors((p) => ({ ...p, calories: undefined }));
          }}
          keyboardType="decimal-pad"
          suffix="kcal"
          icon="flame-outline"
          error={errors.calories}
        />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Field label="PROTEIN" value={proteinG} onChangeText={setProteinG} keyboardType="decimal-pad" placeholder="0" suffix="g" style={{ flex: 1 }} />
          <Field label="CARBS" value={carbsG} onChangeText={setCarbsG} keyboardType="decimal-pad" placeholder="0" suffix="g" style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Field label="FAT" value={fatG} onChangeText={setFatG} keyboardType="decimal-pad" placeholder="0" suffix="g" style={{ flex: 1 }} />
          <Field label="FIBRE (OPTIONAL)" value={fibreG} onChangeText={setFibreG} keyboardType="decimal-pad" placeholder="–" suffix="g" style={{ flex: 1 }} />
        </View>

        {isEdit && (
          <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.md }}>
            Changes apply to future logging only. Meals you already logged keep their values.
          </Txt>
        )}

        {save.error && (
          <Txt variant="small" color={theme.danger} style={{ marginBottom: spacing.md }}>
            {save.error}
          </Txt>
        )}

        <Button
          title={isEdit ? 'Save changes' : 'Add to library'}
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
