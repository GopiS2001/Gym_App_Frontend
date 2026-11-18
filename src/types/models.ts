/** Shapes returned by the backend. Kept loose where the API sends extras. */

export interface Paginated<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface Profile {
  id: string;
  userId: string;
  email?: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string;
  heightCm?: number | null;
  currentWeightKg?: number | null;
  gymJoiningDate?: string | null;
  experienceLevel?: string;
  profileImageUrl?: string | null;
  phone?: string | null;
  notes?: string | null;
  age?: number | null;
  bmi?: number | null;
  bmiCategory?: string | null;
  bmr?: number | null;
  membershipDays?: number | null;
}

export interface GoalType {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  iconName?: string | null;
  colorHex?: string | null;
  displayOrder: number;
  isCustom: boolean;
  isActive: boolean;
  goalCount?: number;
}

export interface FitnessGoal {
  id: string;
  goalTypeId: string;
  goalType?: GoalType;
  goalTypeLabel?: string;
  goalTypeColor?: string | null;
  goalTypeIcon?: string | null;
  title?: string;
  startingWeightKg?: number | null;
  targetWeightKg?: number | null;
  targetBodyFatPercentage?: number | null;
  startDate: string;
  targetDate?: string | null;
  status: string;
  notes?: string | null;
  currentWeightKg?: number | null;
  progressPercentage?: number;
  remainingKg?: number | null;
  changedKg?: number | null;
  totalDays?: number | null;
  daysElapsed?: number;
  daysRemaining?: number | null;
  isOverdue?: boolean;
}

export interface WorkoutCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  iconName?: string | null;
  colorHex?: string | null;
  displayOrder: number;
  isCustom: boolean;
  exerciseCount?: number;
}

/** A warm-up drill; with no category it is a general one. */
export interface Warmup {
  id: string;
  name: string;
  categoryId?: string | null;
  category?: Pick<WorkoutCategory, 'id' | 'name' | 'slug' | 'colorHex' | 'iconName'> | null;
  durationSeconds?: number | null;
  reps?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  backgroundImageUrl?: string | null;
  videoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Exercise {
  id: string;
  categoryId: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  targetMuscle?: string | null;
  secondaryMuscles?: string[] | null;
  equipment?: string | null;
  difficultyLevel: string;
  /** Banner behind the title on the detail page; separate from the gallery. */
  backgroundImageUrl?: string | null;
  /** Cover image — the first of `imageUrls`. */
  imageUrl?: string | null;
  /** Gallery, in display order. Null on exercises saved before galleries existed. */
  imageUrls?: string[] | null;
  /** A link (YouTube etc.) or the URL of an uploaded video file. */
  videoUrl?: string | null;
  caloriesPerMin?: number | null;
  isCustom: boolean;
  isActive: boolean;
  isFavourite?: boolean;
  category?: WorkoutCategory;
}

export interface ExercisePerformance {
  sessionId?: string;
  sessionDate: string;
  sessionTitle?: string | null;
  setCount: number;
  totalReps?: number;
  totalVolumeKg: number;
  bestWeightKg: number;
  bestReps: number;
  estimatedOneRepMaxKg?: number;
  sets: { setNumber: number; reps: number; weightKg: number }[];
}

export interface ExerciseHistory {
  history: ExercisePerformance[];
  lastPerformance: ExercisePerformance | null;
  personalRecord: {
    weightKg: number;
    reps: number;
    estimatedOneRepMaxKg: number;
    isEstimate: boolean;
  } | null;
  bestVolumeKg: number;
}

export interface ExerciseFilterOptions {
  equipment: string[];
  targetMuscles: string[];
  difficultyLevels: string[];
}

export interface PlanExercise {
  id: string;
  exerciseId: string;
  scheduledDay: string;
  displayOrder: number;
  targetSets: number;
  targetReps: number;
  targetWeightKg?: number | null;
  restSeconds: number;
  notes?: string | null;
  exercise: Exercise;
}

export interface PlanScheduleDay {
  day: string;
  dayLabel: string;
  isRestDay: boolean;
  exerciseCount: number;
  estimatedMinutes: number;
  muscleGroups: string[];
  exercises: PlanExercise[];
}

export interface WorkoutPlan {
  id: string;
  planName: string;
  description?: string | null;
  coverImageUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  difficultyLevel: string;
  exerciseCount?: number;
  sessionCount?: number;
  trainingDays?: string[];
  exercises?: PlanExercise[];
  schedule?: PlanScheduleDay[];
  todaysWorkout?: PlanScheduleDay | null;
}

export interface SessionSet {
  id: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  completed: boolean;
  restSeconds: number;
  notes?: string | null;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  displayOrder: number;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  status: string;
  notes?: string | null;
  exercise: Exercise;
  sets: SessionSet[];
  completedSetCount?: number;
  totalVolumeKg?: number;
  bestSet?: SessionSet | null;
  previousPerformance?: ExercisePerformance | null;
}

export interface WorkoutSession {
  id: string;
  workoutPlanId?: string | null;
  title?: string | null;
  sessionDate: string;
  startedAt: string;
  completedAt?: string | null;
  durationSeconds: number;
  durationMinutes?: number;
  totalVolumeKg: number;
  caloriesBurned: number;
  status: string;
  notes?: string | null;
  plan?: { id: string; planName: string } | null;
  exercises: SessionExercise[];
  exerciseCount?: number;
  completedExerciseCount?: number;
  totalSets?: number;
  completedSets?: number;
  totalReps?: number;
  completionPercentage?: number;
  muscleGroups?: string[];
}

export interface WeightLog {
  id: string;
  weightKg: number;
  recordedDate: string;
  notes?: string | null;
}

export interface WeightSummary {
  startingWeightKg: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  totalChangeKg: number | null;
  weeklyChangeKg: number | null;
  monthlyChangeKg: number | null;
  remainingToTargetKg: number | null;
  entryCount: number;
  lastRecordedDate: string | null;
}

export interface WeightChart {
  points: { date: string; value: number }[];
  rangeDays: number;
  min: number | null;
  max: number | null;
  average: number | null;
  targetWeightKg: number | null;
}

export interface BodyMeasurement {
  id: string;
  recordedDate: string;
  chestCm?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  leftArmCm?: number | null;
  rightArmCm?: number | null;
  leftThighCm?: number | null;
  rightThighCm?: number | null;
  leftCalfCm?: number | null;
  rightCalfCm?: number | null;
  neckCm?: number | null;
  shouldersCm?: number | null;
  bodyFatPercentage?: number | null;
  notes?: string | null;
}

export interface ProgressPhoto {
  id: string;
  photoUrl: string;
  photoType: string;
  capturedDate: string;
  weightKg?: number | null;
  notes?: string | null;
}

/** A Food Library item; nutrition is per servingSize × servingUnit. */
export interface Food {
  id: string;
  name: string;
  category?: string | null;
  servingSize: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG?: number | null;
  imageUrl?: string | null;
  isCustom: boolean;
  isActive: boolean;
}

export type WeekDayName =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type ReminderType =
  | 'PRE_WORKOUT'
  | 'BREAKFAST'
  | 'POST_WORKOUT'
  | 'LUNCH'
  | 'SNACK'
  | 'DINNER'
  | 'BEFORE_BED'
  | 'WATER'
  | 'CUSTOM';

export type WorkoutLink = 'NONE' | 'BEFORE' | 'AFTER';

export interface MealReminder {
  id: string;
  title: string;
  reminderType: ReminderType;
  typeLabel: string;
  /** Food Intake meal this reminder opens, if any. */
  mealType: string | null;
  reminderTime: string;
  repeatDays: WeekDayName[];
  message: string | null;
  isEnabled: boolean;
  workoutLink: WorkoutLink;
  snoozeMinutes: number;
  /** When it actually fires (workout-linked ones follow the workout schedule). */
  schedule: {
    time: string;
    days: WeekDayName[];
    basedOnWorkout: boolean;
    needsWorkoutTime: boolean;
  };
}

export interface WorkoutSchedule {
  workoutTime: string | null;
  workoutDays: WeekDayName[] | null;
  effectiveDays: WeekDayName[];
  daysSource: 'CUSTOM' | 'PLAN' | 'EVERY_DAY';
  workoutDurationMin: number;
  preWorkoutLeadMin: number;
  postWorkoutDelayMin: number;
}

export interface MealReminderList {
  items: MealReminder[];
  workoutSchedule: WorkoutSchedule;
  types: { value: ReminderType; label: string; defaultMessage: string }[];
}

export interface FoodLog {
  id: string;
  foodId?: string | null;
  foodName: string;
  mealType: string;
  mealTypeLabel?: string;
  quantity: number;
  quantityUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  imageUrl?: string | null;
  consumedAt: string;
  loggedDate: string;
  notes?: string | null;
}

export interface NutritionDaily {
  date: string;
  totals: { calories: number; proteinG: number; carbsG: number; fatG: number };
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number };
  remaining: { calories: number; proteinG: number; carbsG: number; fatG: number };
  progress: { calories: number; proteinG: number; carbsG: number; fatG: number };
  macroSplit: { proteinPct: number; carbsPct: number; fatPct: number };
  entryCount: number;
  meals: {
    mealType: string;
    label: string;
    itemCount: number;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    items: FoodLog[];
  }[];
}

export interface NutritionHistory {
  points: {
    date: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    entryCount: number;
  }[];
  rangeDays: number;
  averageCalories: number;
  averageProteinG: number;
  daysLogged: number;
}

export interface WaterDaily {
  date: string;
  totalMl: number;
  targetMl: number;
  remainingMl: number;
  progressPercentage: number;
  goalReached: boolean;
  glassesCount: number;
  totalLitres: number;
  entries: { id: string; amountMl: number; recordedAt: string }[];
  quickAddOptions: number[];
}

export interface WaterHistory {
  points: { date: string; totalMl: number; targetMl: number; goalReached: boolean }[];
  rangeDays: number;
  targetMl: number;
  averageMl: number;
  daysGoalReached: number;
  streak: number;
}

export interface SleepLog {
  id: string;
  sleepStart: string;
  sleepEnd: string;
  durationMinutes: number;
  durationHours?: number;
  durationLabel?: string;
  sleepQuality?: string | null;
  qualityScore?: number | null;
  loggedDate: string;
  notes?: string | null;
}

export interface SleepSummary {
  points: { date: string; durationMinutes: number; durationHours: number; sleepQuality: string | null }[];
  rangeDays: number;
  nightsRecorded: number;
  averageMinutes: number;
  averageHours: number;
  averageQualityScore: number | null;
  lastNight: SleepLog | null;
}

export interface Attendance {
  id: string;
  attendanceDate: string;
  checkInAt: string;
  checkOutAt?: string | null;
  durationMinutes: number;
  notes?: string | null;
}

export interface AttendanceCalendarDay {
  date: string;
  dayOfMonth: number;
  weekDay: number;
  isToday: boolean;
  isFuture: boolean;
  attended: boolean;
  workedOut: boolean;
  durationMinutes: number;
  sessionCount: number;
  sessions: any[];
  status: 'WORKOUT' | 'VISIT' | 'REST' | 'UPCOMING';
}

export interface AttendanceCalendar {
  month: string;
  monthLabel: string;
  year: number;
  firstWeekDay: number;
  daysInMonth: number;
  days: AttendanceCalendarDay[];
  summary: {
    attendedDays: number;
    workoutDays: number;
    restDays: number;
    totalMinutes: number;
    averageMinutes: number;
    consistencyPercentage: number;
  };
}

export interface AttendanceStats {
  totalVisits: number;
  thisMonthVisits: number;
  thisWeekVisits: number;
  currentStreak: number;
  longestStreak: number;
  totalMinutes: number;
  averageMinutes: number;
  lastVisit: string | null;
}

export interface Dashboard {
  greeting: string;
  profile: {
    fullName: string;
    profileImageUrl?: string | null;
    experienceLevel?: string;
    age?: number | null;
    heightCm?: number | null;
    gymJoiningDate?: string | null;
  } | null;
  todaysProgress: {
    date: string;
    workoutMinutes: number;
    caloriesBurned: number;
    caloriesConsumed: number;
    calorieTarget: number;
    waterMl: number;
    waterTargetMl: number;
    waterPercentage: number;
    workoutCompleted: boolean;
    overallPercentage: number;
  };
  weight: {
    currentKg: number | null;
    startingKg: number | null;
    targetKg: number | null;
    changeKg: number | null;
    bmi: number | null;
    bmiCategory: string | null;
    lastRecordedDate: string | null;
  };
  activeGoal: FitnessGoal | null;
  todaysWorkout: {
    planId: string;
    planName: string;
    day: string;
    isRestDay: boolean;
    exerciseCount: number;
    alreadyCompleted: boolean;
    estimatedMinutes: number;
    muscleGroups: string[];
    exercises: {
      id: string;
      exerciseId: string;
      name: string;
      imageUrl?: string | null;
      targetSets: number;
      targetReps: number;
      categoryName?: string;
      colorHex?: string;
    }[];
  } | null;
  activeSession: { id: string; title: string; startedAt: string; status: string } | null;
  weeklySummary: {
    weekStart: string;
    workoutCount: number;
    target: number;
    completionPercentage: number;
    totalMinutes: number;
    totalVolumeKg: number;
    caloriesBurned: number;
    activity: {
      date: string;
      label: string;
      dayName: string;
      isToday: boolean;
      sessionCount: number;
      durationMinutes: number;
      volumeKg: number;
      caloriesBurned: number;
    }[];
  };
  monthlySummary: {
    month: string;
    workoutCount: number;
    totalMinutes: number;
    totalVolumeKg: number;
  };
  totals: {
    totalWorkouts: number;
    currentStreak: number;
    memberSinceDays: number | null;
  };
  latestMeasurement: BodyMeasurement | null;
  lastSleep: (SleepLog & { durationHours: number }) | null;
  recentActivity: {
    id: string;
    title?: string | null;
    sessionDate: string;
    durationMinutes: number;
    totalVolumeKg: number;
    caloriesBurned: number;
    exerciseCount: number;
    muscleGroups: string[];
    coverImageUrl?: string | null;
  }[];
}

export interface WorkoutStats {
  rangeDays: number;
  points: {
    date: string;
    sessionCount: number;
    durationMinutes: number;
    volumeKg: number;
    caloriesBurned: number;
  }[];
  totals: {
    sessionCount: number;
    totalMinutes: number;
    totalVolumeKg: number;
    totalSets: number;
    caloriesBurned: number;
    averageMinutes: number;
    averageVolumeKg: number;
  };
  muscleDistribution: { name: string; count: number; percentage: number }[];
}

export interface StrengthProgress {
  exerciseId?: string;
  exerciseName?: string | null;
  points?: {
    date: string;
    maxWeightKg: number;
    reps: number;
    estimatedOneRepMaxKg: number;
    totalVolumeKg: number;
    setCount: number;
  }[];
  personalRecordKg?: number;
  bestEstimatedOneRepMaxKg?: number;
  improvementKg?: number;
  isEstimate: boolean;
  personalRecords?: {
    exerciseId: string;
    exerciseName: string;
    imageUrl?: string | null;
    categoryName?: string;
    colorHex?: string;
    maxWeightKg: number;
    reps: number;
    estimatedOneRepMaxKg: number;
    achievedOn: string;
  }[];
}

export interface MonthlyReport {
  month: string;
  monthLabel: string;
  workouts: {
    count: number;
    totalMinutes: number;
    totalVolumeKg: number;
    totalSets: number;
    caloriesBurned: number;
    mostTrained: { name: string; count: number }[];
  };
  body: {
    startWeightKg: number | null;
    endWeightKg: number | null;
    changeKg: number | null;
    entriesLogged: number;
  };
  nutrition: {
    daysLogged: number;
    totalCalories: number;
    averageDailyCalories: number;
    averageDailyProteinG: number;
  };
  hydration: { totalMl: number; daysLogged: number };
  sleep: { nightsLogged: number; averageHours: number };
  attendance: {
    daysAttended: number;
    daysInMonth: number;
    consistencyPercentage: number;
    totalMinutes: number;
  };
}

export interface UserSettings {
  id: string;
  theme: 'SYSTEM' | 'LIGHT' | 'DARK';
  weightUnit: 'KG' | 'LB';
  heightUnit: 'CM' | 'FT';
  dailyWaterTargetMl: number;
  dailyCalorieTarget: number;
  dailyProteinTargetG: number;
  dailyCarbsTargetG: number;
  dailyFatTargetG: number;
  weeklyWorkoutTarget: number;
  defaultRestSeconds: number;
  notificationEnabled: boolean;
  workoutReminderEnabled: boolean;
  waterReminderEnabled: boolean;
}
