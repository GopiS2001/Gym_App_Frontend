/**
 * Typed wrappers over every backend endpoint the app uses.
 *
 * Nothing in the UI constructs a URL or computes a derived value — the
 * backend owns all business logic and these functions just pass filters
 * through and hand back whatever it returns.
 */
import { Platform } from 'react-native';
import { api, request } from './api';
import type {
  Attendance,
  AttendanceCalendar,
  AttendanceStats,
  BodyMeasurement,
  Dashboard,
  Exercise,
  ExerciseFilterOptions,
  ExerciseHistory,
  FitnessGoal,
  FoodLog,
  GoalType,
  MonthlyReport,
  NutritionDaily,
  NutritionHistory,
  Paginated,
  Profile,
  ProgressPhoto,
  SleepLog,
  SleepSummary,
  StrengthProgress,
  UserSettings,
  WaterDaily,
  WaterHistory,
  WeightChart,
  WeightLog,
  WeightSummary,
  WorkoutCategory,
  WorkoutPlan,
  WorkoutSession,
  WorkoutStats,
  Food,
  MealReminder,
  MealReminderList,
  WorkoutSchedule,
  Warmup,
  Song,
} from '@/types/models';

type Query = Record<string, any> | undefined;

/** Drops empty filter values so the query string stays clean. */
function params(query: Query) {
  if (!query) return undefined;
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value;
  }
  return out;
}

// ------------------------------------------------------------------ auth

export const authApi = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; user: any }>(
      api.post('/auth/login', { email, password }),
    ),
  me: () => request<any>(api.get('/auth/me')),
  logout: (refreshToken?: string) =>
    request<any>(api.post('/auth/logout', { refreshToken })),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<any>(api.post('/auth/change-password', { currentPassword, newPassword })),
};

// --------------------------------------------------------------- profile

export const profileApi = {
  get: () => request<Profile>(api.get('/users/profile')),
  update: (payload: Partial<Profile>) =>
    request<Profile>(api.put('/users/profile', payload)),
  exportData: () => request<any>(api.get('/users/export')),
  deleteAllData: () => request<any>(api.delete('/users/data')),
};

// ----------------------------------------------------------------- goals

export const goalsApi = {
  list: (query?: Query) =>
    request<Paginated<FitnessGoal>>(api.get('/goals', { params: params(query) })),
  active: () => request<FitnessGoal | null>(api.get('/goals/active')),
  types: () =>
    request<{ items: { value: string; label: string }[] }>(api.get('/goals/types')),
  get: (id: string) => request<FitnessGoal>(api.get(`/goals/${id}`)),
  create: (payload: any) => request<FitnessGoal>(api.post('/goals', payload)),
  update: (id: string, payload: any) =>
    request<FitnessGoal>(api.patch(`/goals/${id}`, payload)),
  complete: (id: string) => request<FitnessGoal>(api.patch(`/goals/${id}/complete`)),
  activate: (id: string) => request<FitnessGoal>(api.patch(`/goals/${id}/activate`)),
  remove: (id: string) => request<any>(api.delete(`/goals/${id}`)),
};

// ------------------------------------------------------------ goal types

export const goalTypesApi = {
  list: (query?: Query) =>
    request<Paginated<GoalType>>(
      api.get('/goal-types', { params: params({ limit: 100, ...query }) }),
    ),
  get: (id: string) => request<GoalType>(api.get(`/goal-types/${id}`)),
  create: (payload: any) => request<GoalType>(api.post('/goal-types', payload)),
  update: (id: string, payload: any) =>
    request<GoalType>(api.patch(`/goal-types/${id}`, payload)),
  restore: (id: string) => request<GoalType>(api.patch(`/goal-types/${id}/restore`)),
  remove: (id: string) => request<any>(api.delete(`/goal-types/${id}`)),
  reorder: (orderedIds: string[]) =>
    request<any>(api.patch('/goal-types/reorder', { orderedIds })),
};

// --------------------------------------------------------------- warm-ups

export const warmupsApi = {
  /** `categoryId: 'none'` lists general warm-ups only. */
  list: (query?: Query) =>
    request<Paginated<Warmup>>(api.get('/warmups', { params: params(query) })),
  get: (id: string) => request<Warmup>(api.get(`/warmups/${id}`)),
  create: (payload: Partial<Warmup>) => request<Warmup>(api.post('/warmups', payload)),
  update: (id: string, payload: Partial<Warmup>) =>
    request<Warmup>(api.patch(`/warmups/${id}`, payload)),
  /** `silent` skips the automatic toast — bulk deletes show one summary instead. */
  remove: (id: string, opts?: { silent?: boolean }) =>
    request<any>(api.delete(`/warmups/${id}`, { silent: opts?.silent } as any)),
};

// ----------------------------------------------------------------- music

export const songsApi = {
  list: (query?: Query) =>
    request<Paginated<Song>>(api.get('/songs', { params: params(query) })),
  get: (id: string) => request<Song>(api.get(`/songs/${id}`)),
  create: (payload: Partial<Song>) => request<Song>(api.post('/songs', payload)),
  update: (id: string, payload: Partial<Song>) =>
    request<Song>(api.patch(`/songs/${id}`, payload)),
  remove: (id: string) => request<any>(api.delete(`/songs/${id}`)),
};

// ------------------------------------------------------------ categories

export const categoriesApi = {
  list: (query?: Query) =>
    request<Paginated<WorkoutCategory>>(
      api.get('/categories', { params: params({ limit: 50, ...query }) }),
    ),
  get: (id: string) => request<WorkoutCategory>(api.get(`/categories/${id}`)),
  create: (payload: any) => request<WorkoutCategory>(api.post('/categories', payload)),
  update: (id: string, payload: any) =>
    request<WorkoutCategory>(api.patch(`/categories/${id}`, payload)),
  remove: (id: string) => request<any>(api.delete(`/categories/${id}`)),
};

// ------------------------------------------------------------- exercises

export const exercisesApi = {
  list: (query?: Query) =>
    request<Paginated<Exercise>>(api.get('/exercises', { params: params(query) })),
  get: (id: string) => request<Exercise & ExerciseHistory>(api.get(`/exercises/${id}`)),
  history: (id: string, limit = 20) =>
    request<ExerciseHistory>(api.get(`/exercises/${id}/history`, { params: { limit } })),
  filters: () => request<ExerciseFilterOptions>(api.get('/exercises/filters')),
  create: (payload: any) => request<Exercise>(api.post('/exercises', payload)),
  update: (id: string, payload: any) =>
    request<Exercise>(api.patch(`/exercises/${id}`, payload)),
  toggleFavourite: (id: string) =>
    request<{ exerciseId: string; isFavourite: boolean }>(
      api.post(`/exercises/${id}/favourite`),
    ),
  /** `silent` skips the automatic toast — bulk deletes show one summary instead. */
  remove: (id: string, opts?: { silent?: boolean }) =>
    request<any>(api.delete(`/exercises/${id}`, { silent: opts?.silent } as any)),
};

// ---------------------------------------------------------- workout plans

export const plansApi = {
  list: (query?: Query) =>
    request<Paginated<WorkoutPlan>>(api.get('/workout-plans', { params: params(query) })),
  get: (id: string) => request<WorkoutPlan>(api.get(`/workout-plans/${id}`)),
  today: (day?: string) =>
    request<any>(api.get('/workout-plans/today', { params: params({ day }) })),
  weekDays: () =>
    request<{ items: { value: string; label: string }[] }>(
      api.get('/workout-plans/week-days'),
    ),
  create: (payload: any) => request<WorkoutPlan>(api.post('/workout-plans', payload)),
  update: (id: string, payload: any) =>
    request<WorkoutPlan>(api.put(`/workout-plans/${id}`, payload)),
  duplicate: (id: string) =>
    request<WorkoutPlan>(api.post(`/workout-plans/${id}/duplicate`)),
  activate: (id: string) =>
    request<WorkoutPlan>(api.patch(`/workout-plans/${id}/activate`)),
  archive: (id: string) =>
    request<WorkoutPlan>(api.patch(`/workout-plans/${id}/archive`)),
  /** `silent` skips the automatic toast — bulk deletes show one summary instead. */
  remove: (id: string, opts?: { silent?: boolean }) =>
    request<any>(api.delete(`/workout-plans/${id}`, { silent: opts?.silent } as any)),

  addExercise: (planId: string, payload: any) =>
    request<WorkoutPlan>(api.post(`/workout-plans/${planId}/exercises`, payload)),
  updateExercise: (planId: string, rowId: string, payload: any) =>
    request<WorkoutPlan>(
      api.patch(`/workout-plans/${planId}/exercises/${rowId}`, payload),
    ),
  removeExercise: (planId: string, rowId: string) =>
    request<WorkoutPlan>(api.delete(`/workout-plans/${planId}/exercises/${rowId}`)),
  reorderExercises: (planId: string, orderedIds: string[]) =>
    request<WorkoutPlan>(
      api.patch(`/workout-plans/${planId}/exercises/reorder`, { orderedIds }),
    ),
};

// ------------------------------------------------------- workout sessions

export const sessionsApi = {
  list: (query?: Query) =>
    request<Paginated<WorkoutSession>>(
      api.get('/workout-sessions', { params: params(query) }),
    ),
  get: (id: string) => request<WorkoutSession>(api.get(`/workout-sessions/${id}`)),
  active: () => request<WorkoutSession | null>(api.get('/workout-sessions/active')),
  today: () =>
    request<{ items: WorkoutSession[] }>(api.get('/workout-sessions/today')),
  start: (payload: any) =>
    request<WorkoutSession>(api.post('/workout-sessions/start', payload)),
  update: (id: string, payload: any) =>
    request<WorkoutSession>(api.patch(`/workout-sessions/${id}`, payload)),
  complete: (id: string, payload: any) =>
    request<WorkoutSession>(api.post(`/workout-sessions/${id}/complete`, payload)),
  cancel: (id: string) =>
    request<WorkoutSession>(api.post(`/workout-sessions/${id}/cancel`)),
  pause: (id: string) =>
    request<WorkoutSession>(api.post(`/workout-sessions/${id}/pause`)),
  resume: (id: string) =>
    request<WorkoutSession>(api.post(`/workout-sessions/${id}/resume`)),
  remove: (id: string) => request<any>(api.delete(`/workout-sessions/${id}`)),

  addExercise: (id: string, payload: any) =>
    request<WorkoutSession>(api.post(`/workout-sessions/${id}/exercises`, payload)),
  removeExercise: (id: string, rowId: string) =>
    request<WorkoutSession>(api.delete(`/workout-sessions/${id}/exercises/${rowId}`)),
  skipExercise: (id: string, rowId: string) =>
    request<WorkoutSession>(
      api.patch(`/workout-sessions/${id}/exercises/${rowId}/skip`),
    ),
  reorderExercises: (id: string, orderedIds: string[]) =>
    request<WorkoutSession>(
      api.patch(`/workout-sessions/${id}/exercises/reorder`, { orderedIds }),
    ),

  recordSet: (id: string, payload: any) =>
    request<WorkoutSession>(api.post(`/workout-sessions/${id}/sets`, payload)),
  updateSet: (id: string, setId: string, payload: any) =>
    request<WorkoutSession>(api.patch(`/workout-sessions/${id}/sets/${setId}`, payload)),
  deleteSet: (id: string, setId: string) =>
    request<WorkoutSession>(api.delete(`/workout-sessions/${id}/sets/${setId}`)),
};

// -------------------------------------------------------------- progress

export const progressApi = {
  addWeight: (payload: any) => request<WeightLog>(api.post('/progress/weight', payload)),
  weightHistory: (query?: Query) =>
    request<Paginated<WeightLog> & { summary: WeightSummary }>(
      api.get('/progress/weight', { params: params(query) }),
    ),
  weightSummary: () => request<WeightSummary>(api.get('/progress/weight/summary')),
  weightChart: (days = 90) =>
    request<WeightChart>(api.get('/progress/weight/chart', { params: { days } })),
  updateWeight: (id: string, payload: any) =>
    request<WeightLog>(api.patch(`/progress/weight/${id}`, payload)),
  removeWeight: (id: string) => request<any>(api.delete(`/progress/weight/${id}`)),

  addMeasurement: (payload: any) =>
    request<BodyMeasurement>(api.post('/progress/measurements', payload)),
  measurements: (query?: Query) =>
    request<Paginated<BodyMeasurement> & { summary: any }>(
      api.get('/progress/measurements', { params: params(query) }),
    ),
  measurementSummary: () => request<any>(api.get('/progress/measurements/summary')),
  getMeasurement: (id: string) =>
    request<BodyMeasurement>(api.get(`/progress/measurements/${id}`)),
  updateMeasurement: (id: string, payload: any) =>
    request<BodyMeasurement>(api.patch(`/progress/measurements/${id}`, payload)),
  removeMeasurement: (id: string) =>
    request<any>(api.delete(`/progress/measurements/${id}`)),

  addPhoto: (payload: any) => request<ProgressPhoto>(api.post('/progress/photos', payload)),
  photos: (query?: Query) =>
    request<Paginated<ProgressPhoto> & { timeline: any[] }>(
      api.get('/progress/photos', { params: params(query) }),
    ),
  comparePhotos: (firstPhotoId: string, secondPhotoId: string) =>
    request<any>(api.post('/progress/photos/compare', { firstPhotoId, secondPhotoId })),
  updatePhoto: (id: string, payload: any) =>
    request<ProgressPhoto>(api.patch(`/progress/photos/${id}`, payload)),
  removePhoto: (id: string) => request<any>(api.delete(`/progress/photos/${id}`)),
};

// ------------------------------------------------------------- nutrition

export const nutritionApi = {
  daily: (date?: string) =>
    request<NutritionDaily>(api.get('/nutrition/daily', { params: params({ date }) })),
  history: (days = 7, endDate?: string) =>
    request<NutritionHistory>(
      api.get('/nutrition/history', { params: params({ days, endDate }) }),
    ),
  mealTypes: () =>
    request<{ items: { value: string; label: string }[] }>(
      api.get('/nutrition/meal-types'),
    ),
  frequent: (query?: Query) =>
    request<{ items: any[] }>(api.get('/nutrition/frequent', { params: params(query) })),
  list: (query?: Query) =>
    request<Paginated<FoodLog>>(api.get('/nutrition/food', { params: params(query) })),
  get: (id: string) => request<FoodLog>(api.get(`/nutrition/food/${id}`)),
  create: (payload: any) => request<FoodLog>(api.post('/nutrition/food', payload)),
  update: (id: string, payload: any) =>
    request<FoodLog>(api.put(`/nutrition/food/${id}`, payload)),
  remove: (id: string) => request<any>(api.delete(`/nutrition/food/${id}`)),
};

// ---------------------------------------------------------- food library

export const foodsApi = {
  list: (query?: Query) =>
    request<Paginated<Food>>(api.get('/foods', { params: params(query) })),
  categories: () =>
    request<{ items: { name: string; count: number }[] }>(api.get('/foods/categories')),
  get: (id: string) => request<Food>(api.get(`/foods/${id}`)),
  create: (payload: Partial<Food>) => request<Food>(api.post('/foods', payload)),
  update: (id: string, payload: Partial<Food>) =>
    request<Food>(api.patch(`/foods/${id}`, payload)),
  remove: (id: string) => request<any>(api.delete(`/foods/${id}`)),
};

// --------------------------------------------------------- meal reminders

export const remindersApi = {
  list: () => request<MealReminderList>(api.get('/meal-reminders')),
  get: (id: string) => request<MealReminder>(api.get(`/meal-reminders/${id}`)),
  create: (payload: any) => request<MealReminder>(api.post('/meal-reminders', payload)),
  update: (id: string, payload: any) =>
    request<MealReminder>(api.patch(`/meal-reminders/${id}`, payload)),
  toggle: (id: string, isEnabled?: boolean) =>
    request<MealReminder>(api.patch(`/meal-reminders/${id}/toggle`, { isEnabled })),
  remove: (id: string) => request<any>(api.delete(`/meal-reminders/${id}`)),
  addSamples: () =>
    request<MealReminderList & { created: number }>(api.post('/meal-reminders/samples')),
  workoutSchedule: () =>
    request<WorkoutSchedule>(api.get('/meal-reminders/workout-schedule')),
  updateWorkoutSchedule: (payload: Partial<WorkoutSchedule>) =>
    request<WorkoutSchedule>(api.put('/meal-reminders/workout-schedule', payload)),
};

// ----------------------------------------------------------------- water

export const waterApi = {
  daily: (date?: string) =>
    request<WaterDaily>(api.get('/water/daily', { params: params({ date }) })),
  history: (days = 7) =>
    request<WaterHistory>(api.get('/water/history', { params: { days } })),
  list: (query?: Query) => request<Paginated<any>>(api.get('/water', { params: params(query) })),
  add: (amountMl: number) => request<any>(api.post('/water', { amountMl })),
  update: (id: string, payload: any) => request<any>(api.patch(`/water/${id}`, payload)),
  remove: (id: string) => request<any>(api.delete(`/water/${id}`)),
  undo: (date?: string) =>
    request<any>(api.delete('/water/undo', { params: params({ date }) })),
};

// ----------------------------------------------------------------- sleep

export const sleepApi = {
  list: (query?: Query) =>
    request<Paginated<SleepLog>>(api.get('/sleep', { params: params(query) })),
  summary: (days = 7) =>
    request<SleepSummary>(api.get('/sleep/summary', { params: { days } })),
  qualityOptions: () =>
    request<{ items: { value: string; label: string }[] }>(
      api.get('/sleep/quality-options'),
    ),
  get: (id: string) => request<SleepLog>(api.get(`/sleep/${id}`)),
  create: (payload: any) => request<SleepLog>(api.post('/sleep', payload)),
  update: (id: string, payload: any) => request<SleepLog>(api.patch(`/sleep/${id}`, payload)),
  remove: (id: string) => request<any>(api.delete(`/sleep/${id}`)),
};

// ------------------------------------------------------------ attendance

export const attendanceApi = {
  list: (query?: Query) =>
    request<Paginated<Attendance>>(api.get('/attendance', { params: params(query) })),
  today: () => request<any>(api.get('/attendance/today')),
  calendar: (month?: string) =>
    request<AttendanceCalendar>(api.get('/attendance/calendar', { params: params({ month }) })),
  stats: () => request<AttendanceStats>(api.get('/attendance/stats')),
  checkIn: (payload?: any) => request<Attendance>(api.post('/attendance/check-in', payload || {})),
  checkOut: (payload?: any) =>
    request<Attendance>(api.post('/attendance/check-out', payload || {})),
  update: (id: string, payload: any) =>
    request<Attendance>(api.patch(`/attendance/${id}`, payload)),
  remove: (id: string) => request<any>(api.delete(`/attendance/${id}`)),
};

// ------------------------------------------------------------- analytics

export const analyticsApi = {
  dashboard: () => request<Dashboard>(api.get('/analytics/dashboard')),
  workouts: (days = 30) =>
    request<WorkoutStats>(api.get('/analytics/workouts', { params: { days } })),
  weight: (days = 90) =>
    request<WeightChart>(api.get('/analytics/weight', { params: { days } })),
  strength: (exerciseId?: string, limit = 10) =>
    request<StrengthProgress>(
      api.get('/analytics/strength', { params: params({ exerciseId, limit }) }),
    ),
  monthly: (month?: string) =>
    request<MonthlyReport>(api.get('/analytics/monthly', { params: params({ month }) })),
};

// -------------------------------------------------------------- settings

export const settingsApi = {
  get: () => request<UserSettings>(api.get('/settings')),
  options: () => request<any>(api.get('/settings/options')),
  update: (payload: Partial<UserSettings>) =>
    request<UserSettings>(api.put('/settings', payload)),
};

// ----------------------------------------------------------------- media

export const mediaApi = {
  list: (query?: Query) => request<Paginated<any>>(api.get('/media', { params: params(query) })),
  remove: (id: string) => request<any>(api.delete(`/media/${id}`)),

  /**
   * Uploads a picked file as multipart form data.
   *
   * Pass the picker's `mimeType` / `fileName` when available: the URI alone
   * often has no extension (Android content:// URIs, web blob: URIs), and the
   * server rejects files whose type it can't recognise.
   */
  upload: async (
    uri: string,
    folder = 'photos',
    meta?: { mimeType?: string | null; fileName?: string | null },
  ) => {
    const isVideoHint = meta?.mimeType?.startsWith('video/');
    const rawName =
      meta?.fileName ||
      (uri.startsWith('blob:') || uri.startsWith('data:') ? '' : uri.split('/').pop()) ||
      '';
    const ext = (/\.(\w+)$/.exec(rawName)?.[1] || (isVideoHint ? 'mp4' : 'jpg')).toLowerCase();
    const type = meta?.mimeType || MIME_BY_EXT[ext] || 'image/jpeg';
    const name = rawName || `upload-${Date.now()}.${ext}`;

    const form = new FormData();
    if (Platform.OS === 'web') {
      // Browsers need a real Blob; the {uri,name,type} object is native-only.
      const blob = await (await fetch(uri)).blob();
      form.append('file', new File([blob], name, { type: blob.type || type }));
    } else {
      form.append('file', { uri, name, type } as any);
    }

    const res = await api.post(`/media/upload?folder=${folder}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Videos over a phone's Wi-Fi can take a while.
      timeout: type.startsWith('video/') ? 5 * 60_000 : 60_000,
    });
    return res.data.data as { id: string; mediaUrl: string; mediaType: 'IMAGE' | 'VIDEO' };
  },
};

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  mov: 'video/quicktime',
  webm: 'video/webm',
  '3gp': 'video/3gpp',
  mkv: 'video/x-matroska',
};
