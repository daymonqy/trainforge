// ForgeFit Main Application
import { getState, subscribe, completeOnboarding, updateProfile, getAllExercises, getExercise,
  addCustomExercise, addPlan, updatePlan, deletePlan, duplicatePlan,
  startWorkout, addSetToActive, finishWorkout, cancelWorkout, addExerciseToActive,
  removeSetFromActive, suggestWeight, getRecoveryStatus, getExerciseHistory,
  estimate1RM, getWeeklyVolume, setState, update } from './store.js';
import { MUSCLES, EQUIPMENT, GOALS, LEVELS, SET_TYPES, DEFAULT_PLATES, DEFAULT_BARS } from './data.js';
import { el, els, formatDate, formatTime, formatDuration, muscleName, recoveryColor } from './utils.js';
import {
  renderOnboarding, renderDashboard, renderExercises, renderExerciseDetail,
  renderPlans, renderPlanEdit, renderWorkoutHub
} from './views-core.js';
import {
  renderLiveWorkout, renderWorkoutSummary, renderHistory, renderRecovery,
  renderProgress, renderCalculator, renderProfile, renderTools
} from './views-workout.js';

const app = document.getElementById('app');
const bottomNav = document.getElementById('bottom-nav');

let currentRoute = 'dashboard';
let restTimer = null;
let restSecondsLeft = 0;

function navigate(route, params = {}) {
  currentRoute = route;
  window.location.hash = route + (params.id ? '/' + params.id : '');
  render();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1) || 'dashboard';
  const [route, id] = hash.split('/');
  currentRoute = route;
  render(id);
});

function render(id) {
  const state = getState();
  if (!state.onboardingComplete && currentRoute !== 'onboarding') {
    currentRoute = 'onboarding';
  }
  const hideNav = ['onboarding', 'live', 'workout-summary'].includes(currentRoute);
  bottomNav.classList.toggle('hidden', hideNav);
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const r = btn.dataset.route;
    const active = r === currentRoute || (currentRoute === 'live' && r === 'workout');
    btn.classList.toggle('text-forge-400', active);
    btn.classList.toggle('text-gray-400', !active);
  });
  let html = '';
  switch (currentRoute) {
    case 'onboarding': html = renderOnboarding(); break;
    case 'dashboard': html = renderDashboard(); break;
    case 'exercises': html = renderExercises(); break;
    case 'exercise': html = renderExerciseDetail(id); break;
    case 'plans': html = renderPlans(); break;
    case 'plan-edit': html = renderPlanEdit(id); break;
    case 'workout': html = renderWorkoutHub(); break;
    case 'live': html = renderLiveWorkout(); break;
    case 'workout-summary': html = renderWorkoutSummary(id); break;
    case 'history': html = renderHistory(); break;
    case 'recovery': html = renderRecovery(); break;
    case 'progress': html = renderProgress(); break;
    case 'calculator': html = renderCalculator(); break;
    case 'profile': html = renderProfile(); break;
    case 'tools': html = renderTools(); break;
    default: html = renderDashboard();
  }
  app.innerHTML = html;
  bindEvents();
}

// bindEvents and rest will be in the full file - continuing with essential bindings
function bindEvents() {
  document.querySelectorAll('[data-go]').forEach(btn => {
    btn.addEventListener('click', () => {
      const route = btn.dataset.go;
      const id = btn.dataset.id;
      navigate(route, id ? { id } : {});
    });
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => navigate(btn.dataset.route);
  });

  const onbForm = document.querySelector('#onboarding-form');
  if (onbForm) {
    onbForm.onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(onbForm);
      completeOnboarding({
        name: fd.get('name'), age: Number(fd.get('age')), sex: fd.get('sex'),
        height: Number(fd.get('height')), weight: Number(fd.get('weight')),
        level: fd.get('level'), goal: fd.get('goal'), frequency: Number(fd.get('frequency')),
        equipment: fd.getAll('equipment')
      });
      navigate('dashboard');
    };
  }

  // Exercise filters
  const search = document.querySelector('#ex-search');
  if (search) search.oninput = () => { window._exFilter = window._exFilter || {}; window._exFilter.q = search.value; render(); };
  const musc = document.querySelector('#ex-muscle');
  if (musc) musc.onchange = () => { window._exFilter = {...(window._exFilter||{}), muscle: musc.value}; render(); };
  const equip = document.querySelector('#ex-equip');
  if (equip) equip.onchange = () => { window._exFilter = {...(window._exFilter||{}), equipment: equip.value}; render(); };

  // Plans
  const newPlanBtn = document.querySelector('#btn-new-plan') || document.querySelector('#btn-new-plan-2');
  if (newPlanBtn) newPlanBtn.onclick = () => navigate('plan-edit', { id: 'new' });
  document.querySelectorAll('[data-edit-plan]').forEach(b => b.onclick = () => navigate('plan-edit', { id: b.dataset.editPlan }));
  document.querySelectorAll('[data-dup-plan]').forEach(b => b.onclick = () => { duplicatePlan(b.dataset.dupPlan); render(); });
  document.querySelectorAll('[data-del-plan]').forEach(b => b.onclick = () => { if (confirm('Usunąć plan?')) { deletePlan(b.dataset.delPlan); render(); } });
  document.querySelectorAll('[data-start-plan]').forEach(b => {
    b.onclick = () => {
      const plan = getState().plans.find(p => p.id === b.dataset.startPlan);
      if (!plan?.days?.[0]) return;
      const day = plan.days[0];
      startWorkout({ planId: plan.id, name: plan.name + ' — ' + (day.name || 'Dzień 1'),
        exercises: (day.exercises || []).map(e => ({ exerciseId: e.exerciseId, name: getExercise(e.exerciseId)?.name, sets: e.sets, reps: e.reps })) });
      window._liveExIdx = 0; navigate('live');
    };
  });

  // Start empty / quick
  document.querySelector('#start-empty')?.addEventListener('click', () => {
    startWorkout({ name: 'Trening wolny', exercises: [] });
    window._liveExIdx = 0; navigate('live');
  });
  document.querySelectorAll('[data-start-day]').forEach(b => {
    b.onclick = () => {
      const plan = getState().plans.find(p => p.id === b.dataset.startDay);
      const day = plan?.days?.[Number(b.dataset.dayIdx)];
      if (!day) return;
      startWorkout({ planId: plan.id, name: `${plan.name} — ${day.name}`,
        exercises: (day.exercises || []).map(e => ({ exerciseId: e.exerciseId, name: getExercise(e.exerciseId)?.name, sets: e.sets, reps: e.reps })) });
      window._liveExIdx = 0; navigate('live');
    };
  });
  document.querySelectorAll('[data-quick]').forEach(b => {
    b.onclick = () => {
      const map = {
        push: ['ex-bp', 'ex-ohp', 'ex-dbpress', 'ex-skull', 'ex-lateral'],
        pull: ['ex-pullup', 'ex-row', 'ex-latpd', 'ex-curl', 'ex-facepull'],
        legs: ['ex-squat', 'ex-rdl', 'ex-legpress', 'ex-hipthrust', 'ex-calfraise'],
        full: ['ex-squat', 'ex-bp', 'ex-row', 'ex-ohp', 'ex-rdl']
      };
      const ids = map[b.dataset.quick] || [];
      startWorkout({ name: b.dataset.quick.charAt(0).toUpperCase() + b.dataset.quick.slice(1),
        exercises: ids.map(id => { const e = getExercise(id); return { exerciseId: id, name: e?.name, sets: 3, reps: '8-12' }; }) });
      window._liveExIdx = 0; navigate('live');
    };
  });

  // Live workout
  document.querySelectorAll('[data-live-ex]').forEach(b => {
    b.onclick = () => { window._liveExIdx = Number(b.dataset.liveEx); render(); };
  });
  document.querySelector('#save-set')?.addEventListener('click', () => {
    const weight = document.querySelector('#set-weight')?.value;
    const reps = document.querySelector('#set-reps')?.value;
    if (!weight || !reps) { alert('Podaj ciężar i powtórzenia'); return; }
    const idx = window._liveExIdx ?? 0;
    addSetToActive(idx, {
      weight, reps,
      rir: document.querySelector('#set-rir')?.value,
      rpe: document.querySelector('#set-rpe')?.value,
      rip: document.querySelector('#set-rip')?.value,
      type: document.querySelector('#set-type')?.value || 'working'
    });
    const rest = getState().activeWorkout?.exercises[idx]?.restSec || 90;
    startRestTimer(rest); render();
  });
  document.querySelectorAll('[data-remove-set]').forEach(b => {
    b.onclick = () => { removeSetFromActive(window._liveExIdx ?? 0, Number(b.dataset.removeSet)); render(); };
  });
  document.querySelector('#finish-workout')?.addEventListener('click', () => {
    if (!confirm('Zakończyć trening?')) return;
    const { completed } = finishWorkout();
    navigate('workout-summary', { id: completed.id });
  });
  document.querySelector('#cancel-workout')?.addEventListener('click', () => {
    if (confirm('Anulować trening? Dane nie zostaną zapisane.')) {
      cancelWorkout(); navigate('dashboard');
    }
  });
  document.querySelector('#add-ex-live')?.addEventListener('click', () => {
    const name = prompt('Wpisz nazwę lub ID ćwiczenia:');
    if (!name) return;
    const found = getAllExercises().find(e => e.id === name || e.name.toLowerCase().includes(name.toLowerCase()));
    if (found) {
      addExerciseToActive(found.id);
      window._liveExIdx = getState().activeWorkout.exercises.length - 1;
      render();
    } else alert('Nie znaleziono ćwiczenia');
  });

  // Rest timer
  document.querySelector('#rest-skip')?.addEventListener('click', stopRestTimer);
  document.querySelector('#rest-plus')?.addEventListener('click', () => { restSecondsLeft += 30; updateRestDisplay(); });
  document.querySelector('#rest-minus')?.addEventListener('click', () => { restSecondsLeft = Math.max(0, restSecondsLeft - 30); updateRestDisplay(); });

  // Calculator
  document.querySelector('#calc-load')?.addEventListener('click', () => {
    const target = Number(document.querySelector('#calc-target').value);
    const bar = Number(document.querySelector('#calc-bar').value);
    if (!target || target <= bar) {
      document.querySelector('#calc-result').innerHTML = '<p class="text-red-400">Ciężar musi być większy niż sztanga.</p>';
      document.querySelector('#calc-result').classList.remove('hidden');
      return;
    }
    const side = (target - bar) / 2;
    const plates = [...DEFAULT_PLATES].sort((a,b) => b.weight - a.weight);
    let remaining = side; const used = [];
    for (const p of plates) {
      let count = 0;
      while (remaining >= p.weight - 0.01 && count < p.count) { remaining -= p.weight; count++; }
      if (count) used.push({ weight: p.weight, count });
    }
    const ok = Math.abs(remaining) < 0.1;
    document.querySelector('#calc-result').innerHTML = `<p class="font-medium ${ok?'text-forge-400':'text-yellow-400'}">${ok?'Dokładne obciążenie':'Przybliżone'}</p>
      <p class="mt-1">Na stronę: <strong>${side.toFixed(1)} kg</strong></p>
      <p class="mt-2">${used.map(u => `${u.count}× ${u.weight} kg`).join(' + ') || '—'}</p>`;
    document.querySelector('#calc-result').classList.remove('hidden');
  });
  document.querySelector('#calc-orm')?.addEventListener('click', () => {
    const w = Number(document.querySelector('#orm-weight').value);
    const r = Number(document.querySelector('#orm-reps').value);
    if (!w || !r) return;
    document.querySelector('#orm-result').textContent = `≈ ${estimate1RM(w, r)} kg`;
    document.querySelector('#orm-result').classList.remove('hidden');
  });

  // Recovery can-train
  document.querySelector('#can-train-muscle')?.addEventListener('change', (e) => {
    const mid = e.target.value;
    const info = document.querySelector('#can-train-info');
    if (!mid) { info.classList.add('hidden'); return; }
    const r = getRecoveryStatus()[mid] || {};
    const vol = getWeeklyVolume()[mid] || {};
    info.innerHTML = `<p>Status: <strong>${r.percent ?? 100}%</strong></p>
      <p>Ostatni trening: ${r.lastTrained ? formatDate(r.lastTrained) : 'brak'}</p>
      <p>Objętość tyg.: ${(vol.direct||0)+(vol.indirect||0)} serii</p>
      <p class="mt-2 text-gray-500">Dane pomocnicze — decyzja należy do Ciebie.</p>`;
    info.classList.remove('hidden');
  });

  document.querySelector('#reset-data')?.addEventListener('click', () => {
    if (confirm('Na pewno usunąć WSZYSTKIE dane lokalne?')) {
      localStorage.removeItem('forgefit_v1');
      location.reload();
    }
  });
  document.querySelector('#btn-add-exercise')?.addEventListener('click', () => {
    const name = prompt('Nazwa własnego ćwiczenia:');
    if (!name) return;
    const primary = prompt('Główna partia (chest, back, shoulders...):', 'chest');
    addCustomExercise({
      name, primary: primary || 'chest', secondary: [], equipment: ['other'],
      type: 'hypertrophy', difficulty: 'intermediate',
      description: 'Ćwiczenie własne', instructions: '', isPublic: false
    });
    render();
  });

  // Plan form (simplified)
  const planForm = document.querySelector('#plan-form');
  if (planForm) {
    planForm.onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(planForm);
      const id = fd.get('id');
      const days = [];
      document.querySelectorAll('.day-block').forEach((block, di) => {
        const name = fd.get('dayName_' + di) || 'Dzień ' + (di + 1);
        const exercises = [];
        block.querySelectorAll('.exercises-list > div').forEach((row, ei) => {
          const exId = fd.get(`ex_${di}_${ei}`);
          if (exId) exercises.push({ exerciseId: exId, sets: Number(fd.get(`sets_${di}_${ei}`)) || 3, reps: fd.get(`reps_${di}_${ei}`) || '8-12' });
        });
        days.push({ name, exercises });
      });
      const data = { name: fd.get('name'), description: fd.get('description'), goal: fd.get('goal'), level: fd.get('level'), days };
      if (id) updatePlan(id, data); else addPlan(data);
      navigate('plans');
    };
  }
}

function startRestTimer(seconds) {
  restSecondsLeft = seconds;
  const overlay = document.querySelector('#rest-timer');
  if (overlay) overlay.classList.remove('hidden');
  updateRestDisplay();
  if (restTimer) clearInterval(restTimer);
  restTimer = setInterval(() => {
    restSecondsLeft--;
    updateRestDisplay();
    if (restSecondsLeft <= 0) stopRestTimer();
  }, 1000);
}
function updateRestDisplay() {
  const m = Math.floor(restSecondsLeft / 60);
  const s = restSecondsLeft % 60;
  const disp = document.querySelector('#rest-display');
  if (disp) disp.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function stopRestTimer() {
  if (restTimer) clearInterval(restTimer);
  restTimer = null;
  const overlay = document.querySelector('#rest-timer');
  if (overlay) overlay.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const [route] = hash.split('/');
    currentRoute = route || 'dashboard';
  }
  render();
});
