// ForgeFit Store — localStorage persistence + reactive state
import { SEED_EXERCISES, MUSCLES, RECOVERY_HOURS } from './data.js';

const STORAGE_KEY = 'forgefit_v1';

const defaultState = () => ({
  user: null,
  onboardingComplete: false,
  exercises: [...SEED_EXERCISES],
  customExercises: [],
  plans: [],
  workouts: [],
  activeWorkout: null,
  bodyMeasurements: [],
  bodyPhotos: [],
  goals: [],
  equipmentSets: [
    { id: 'home', name: 'Dom', equipment: ['dumbbell', 'bodyweight', 'bands', 'pullup'] },
    { id: 'gym', name: 'Siłownia', equipment: ['barbell', 'dumbbell', 'machine', 'cable', 'bench', 'pullup', 'kettlebell'] }
  ],
  currentLocation: 'gym',
  settings: {
    mode: 'advanced',
    ripScale: { 1: 'Bardzo lekka', 2: 'Lekka', 3: 'Średnia', 4: 'Ciężka', 5: 'Maksymalny wysiłek' },
    unit: 'kg',
    restDefault: 90,
    notifications: true
  },
  personalRecords: []
});

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed, exercises: parsed.exercises?.length ? parsed.exercises : SEED_EXERCISES };
  } catch {
    return defaultState();
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Save failed', e);
  }
}

let state = load();
const listeners = new Set();

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => fn(state));
  save(state);
}

export function setState(partial) {
  state = { ...state, ...partial };
  notify();
}

export function update(fn) {
  state = fn(state);
  notify();
}

export function completeOnboarding(profile) {
  update(s => ({
    ...s,
    user: {
      id: crypto.randomUUID?.() || Date.now().toString(),
      ...profile,
      createdAt: new Date().toISOString(),
      stats: {
        totalWorkouts: 0,
        totalTimeMin: 0,
        totalSets: 0,
        totalReps: 0,
        totalTonnage: 0
      }
    },
    onboardingComplete: true
  }));
}

export function updateProfile(data) {
  update(s => ({ ...s, user: { ...s.user, ...data } }));
}

export function getAllExercises() {
  return [...state.exercises, ...state.customExercises];
}

export function getExercise(id) {
  return getAllExercises().find(e => e.id === id);
}

export function addCustomExercise(ex) {
  const newEx = {
    ...ex,
    id: 'custom-' + (crypto.randomUUID?.() || Date.now()),
    isCustom: true,
    createdAt: new Date().toISOString()
  };
  update(s => ({ ...s, customExercises: [...s.customExercises, newEx] }));
  return newEx;
}

export function updateCustomExercise(id, data) {
  update(s => ({
    ...s,
    customExercises: s.customExercises.map(e => e.id === id ? { ...e, ...data } : e)
  }));
}

export function deleteCustomExercise(id) {
  update(s => ({
    ...s,
    customExercises: s.customExercises.filter(e => e.id !== id)
  }));
}

export function addPlan(plan) {
  const p = {
    ...plan,
    id: 'plan-' + (crypto.randomUUID?.() || Date.now()),
    createdAt: new Date().toISOString()
  };
  update(s => ({ ...s, plans: [...s.plans, p] }));
  return p;
}

export function updatePlan(id, data) {
  update(s => ({
    ...s,
    plans: s.plans.map(p => p.id === id ? { ...p, ...data } : p)
  }));
}

export function deletePlan(id) {
  update(s => ({ ...s, plans: s.plans.filter(p => p.id !== id) }));
}

export function duplicatePlan(id) {
  const original = state.plans.find(p => p.id === id);
  if (!original) return;
  const copy = {
    ...JSON.parse(JSON.stringify(original)),
    id: 'plan-' + (crypto.randomUUID?.() || Date.now()),
    name: original.name + ' (kopia)',
    createdAt: new Date().toISOString()
  };
  update(s => ({ ...s, plans: [...s.plans, copy] }));
  return copy;
}

export function startWorkout({ planId = null, planDay = null, name = 'Trening', exercises = [] } = {}) {
  const workout = {
    id: 'w-' + (crypto.randomUUID?.() || Date.now()),
    name,
    planId,
    planDay,
    startedAt: new Date().toISOString(),
    exercises: exercises.map(ex => ({
      exerciseId: ex.exerciseId || ex.id,
      name: ex.name || getExercise(ex.exerciseId)?.name || 'Ćwiczenie',
      plannedSets: ex.sets || 3,
      plannedReps: ex.reps || '8-12',
      plannedWeight: ex.weight || null,
      plannedRir: ex.rir ?? 2,
      restSec: ex.restSec || state.settings.restDefault,
      sets: [],
      notes: '',
      order: ex.order || 0
    })),
    feelingBefore: null,
    feelingAfter: null,
    notes: ''
  };
  update(s => ({ ...s, activeWorkout: workout }));
  return workout;
}

export function addSetToActive(exerciseIndex, setData) {
  update(s => {
    if (!s.activeWorkout) return s;
    const exercises = [...s.activeWorkout.exercises];
    const sets = [...exercises[exerciseIndex].sets, {
      id: 'set-' + Date.now(),
      weight: Number(setData.weight) || 0,
      reps: Number(setData.reps) || 0,
      rir: setData.rir != null ? Number(setData.rir) : null,
      rpe: setData.rpe != null ? Number(setData.rpe) : null,
      rip: setData.rip != null ? Number(setData.rip) : null,
      type: setData.type || 'working',
      tempo: setData.tempo || null,
      notes: setData.notes || '',
      quality: setData.quality || null,
      pain: setData.pain || null,
      completedAt: new Date().toISOString()
    }];
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
    return { ...s, activeWorkout: { ...s.activeWorkout, exercises } };
  });
}

export function updateSetInActive(exerciseIndex, setIndex, data) {
  update(s => {
    if (!s.activeWorkout) return s;
    const exercises = [...s.activeWorkout.exercises];
    const sets = [...exercises[exerciseIndex].sets];
    sets[setIndex] = { ...sets[setIndex], ...data };
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
    return { ...s, activeWorkout: { ...s.activeWorkout, exercises } };
  });
}

export function removeSetFromActive(exerciseIndex, setIndex) {
  update(s => {
    if (!s.activeWorkout) return s;
    const exercises = [...s.activeWorkout.exercises];
    const sets = exercises[exerciseIndex].sets.filter((_, i) => i !== setIndex);
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };
    return { ...s, activeWorkout: { ...s.activeWorkout, exercises } };
  });
}

export function addExerciseToActive(exerciseId) {
  const ex = getExercise(exerciseId);
  if (!ex) return;
  update(s => {
    if (!s.activeWorkout) return s;
    const exercises = [...s.activeWorkout.exercises, {
      exerciseId: ex.id,
      name: ex.name,
      plannedSets: 3,
      plannedReps: '8-12',
      plannedWeight: null,
      plannedRir: 2,
      restSec: s.settings.restDefault,
      sets: [],
      notes: '',
      order: s.activeWorkout.exercises.length
    }];
    return { ...s, activeWorkout: { ...s.activeWorkout, exercises } };
  });
}

export function finishWorkout(feelingAfter = null) {
  const active = state.activeWorkout;
  if (!active) return null;

  const endedAt = new Date().toISOString();
  const durationMin = Math.round((new Date(endedAt) - new Date(active.startedAt)) / 60000);

  let totalSets = 0, totalReps = 0, totalTonnage = 0;
  const muscleVolume = {};

  active.exercises.forEach(ex => {
    const exercise = getExercise(ex.exerciseId);
    ex.sets.forEach(set => {
      if (set.type === 'warmup' || set.type === 'feeder') return;
      totalSets++;
      totalReps += set.reps;
      totalTonnage += set.weight * set.reps;
      if (exercise) {
        const primary = exercise.primary;
        const secondary = exercise.secondary || [];
        muscleVolume[primary] = muscleVolume[primary] || { direct: 0, indirect: 0, tonnage: 0 };
        muscleVolume[primary].direct += 1;
        muscleVolume[primary].tonnage += set.weight * set.reps;
        secondary.forEach(m => {
          muscleVolume[m] = muscleVolume[m] || { direct: 0, indirect: 0, tonnage: 0 };
          muscleVolume[m].indirect += 1;
        });
      }
    });
  });

  const completed = {
    ...active,
    endedAt,
    durationMin,
    feelingAfter,
    stats: { totalSets, totalReps, totalTonnage, muscleVolume },
    completed: true
  };

  const newPRs = detectPRs(completed);

  update(s => {
    const user = { ...s.user };
    if (user.stats) {
      user.stats.totalWorkouts = (user.stats.totalWorkouts || 0) + 1;
      user.stats.totalTimeMin = (user.stats.totalTimeMin || 0) + durationMin;
      user.stats.totalSets = (user.stats.totalSets || 0) + totalSets;
      user.stats.totalReps = (user.stats.totalReps || 0) + totalReps;
      user.stats.totalTonnage = (user.stats.totalTonnage || 0) + totalTonnage;
    }
    return {
      ...s,
      activeWorkout: null,
      workouts: [completed, ...s.workouts],
      user,
      personalRecords: [...s.personalRecords, ...newPRs]
    };
  });

  return { completed, newPRs };
}

export function cancelWorkout() {
  update(s => ({ ...s, activeWorkout: null }));
}

function detectPRs(workout) {
  const prs = [];
  const historyByEx = {};
  state.workouts.forEach(w => {
    w.exercises?.forEach(ex => {
      if (!historyByEx[ex.exerciseId]) historyByEx[ex.exerciseId] = [];
      ex.sets?.forEach(s => historyByEx[ex.exerciseId].push(s));
    });
  });

  workout.exercises.forEach(ex => {
    const hist = historyByEx[ex.exerciseId] || [];
    const maxWeight = Math.max(0, ...hist.map(s => s.weight || 0));
    const maxRepsAtWeight = {};
    hist.forEach(s => {
      const key = s.weight;
      maxRepsAtWeight[key] = Math.max(maxRepsAtWeight[key] || 0, s.reps || 0);
    });

    ex.sets.forEach(set => {
      if (set.type === 'warmup') return;
      if (set.weight > maxWeight) {
        prs.push({
          id: 'pr-' + Date.now() + Math.random(),
          type: 'weight',
          exerciseId: ex.exerciseId,
          exerciseName: ex.name,
          value: set.weight,
          reps: set.reps,
          date: workout.endedAt,
          workoutId: workout.id
        });
      } else if (set.reps > (maxRepsAtWeight[set.weight] || 0)) {
        prs.push({
          id: 'pr-' + Date.now() + Math.random(),
          type: 'reps',
          exerciseId: ex.exerciseId,
          exerciseName: ex.name,
          value: set.reps,
          weight: set.weight,
          date: workout.endedAt,
          workoutId: workout.id
        });
      }
    });
  });
  return prs;
}

export function suggestWeight(exerciseId) {
  const history = [];
  state.workouts.forEach(w => {
    w.exercises?.filter(e => e.exerciseId === exerciseId).forEach(ex => {
      ex.sets?.filter(s => s.type === 'working' || !s.type).forEach(s => history.push({ ...s, date: w.endedAt || w.startedAt }));
    });
  });
  if (!history.length) return null;
  history.sort((a, b) => new Date(b.date) - new Date(a.date));
  const last = history[0];
  let suggested = last.weight;
  if (last.rir != null) {
    if (last.rir >= 3) suggested = Math.round((last.weight + 2.5) * 2) / 2;
    else if (last.rir <= 1 && last.reps < 8) suggested = last.weight;
    else if (last.rir >= 2) suggested = Math.round((last.weight + 1.25) * 2) / 2;
  }
  return { weight: suggested, basedOn: last };
}

export function getRecoveryStatus() {
  const now = Date.now();
  const status = {};
  MUSCLES.forEach(m => {
    status[m.id] = { percent: 100, lastTrained: null, volume: 0, lastRir: null };
  });

  state.workouts.slice(0, 30).forEach(w => {
    const ageH = (now - new Date(w.endedAt || w.startedAt).getTime()) / 3600000;
    Object.entries(w.stats?.muscleVolume || {}).forEach(([muscle, vol]) => {
      if (!status[muscle]) return;
      const halfLife = RECOVERY_HOURS[muscle] || 48;
      const impact = Math.min(100, (vol.direct * 8 + vol.indirect * 3) * (1 + (5 - (w.feelingAfter?.fatigue || 3)) * 0.1));
      const remaining = impact * Math.pow(0.5, ageH / halfLife);
      const recovered = Math.max(0, 100 - remaining);
      if (recovered < status[muscle].percent) {
        status[muscle].percent = Math.round(recovered);
        status[muscle].lastTrained = w.endedAt || w.startedAt;
        status[muscle].volume = vol.direct + vol.indirect;
      }
    });
  });
  return status;
}

export function getExerciseHistory(exerciseId, limit = 20) {
  const sets = [];
  state.workouts.forEach(w => {
    w.exercises?.filter(e => e.exerciseId === exerciseId).forEach(ex => {
      ex.sets?.forEach(s => sets.push({ ...s, date: w.endedAt || w.startedAt, workoutId: w.id }));
    });
  });
  return sets.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
}

export function estimate1RM(weight, reps, formula = 'epley') {
  if (reps <= 1) return weight;
  if (formula === 'epley') return Math.round(weight * (1 + reps / 30));
  if (formula === 'brzycki') return Math.round(weight * (36 / (37 - reps)));
  return Math.round(weight * (1 + reps / 30));
}

export function getWeeklyVolume() {
  const weekAgo = Date.now() - 7 * 24 * 3600000;
  const volume = {};
  MUSCLES.forEach(m => { volume[m.id] = { direct: 0, indirect: 0 }; });
  state.workouts.filter(w => new Date(w.endedAt || w.startedAt) > weekAgo).forEach(w => {
    Object.entries(w.stats?.muscleVolume || {}).forEach(([m, v]) => {
      if (volume[m]) {
        volume[m].direct += v.direct || 0;
        volume[m].indirect += v.indirect || 0;
      }
    });
  });
  return volume;
}

export function resetAllData() {
  localStorage.removeItem(STORAGE_KEY);
  state = defaultState();
  notify();
}
