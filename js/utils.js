// ForgeFit utils
import { MUSCLES } from './data.js';

export function el(sel, parent = document) { return parent.querySelector(sel); }
export function els(sel, parent = document) { return [...parent.querySelectorAll(sel)]; }

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(min) {
  if (!min) return '0 min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

export function muscleName(id) {
  return MUSCLES.find(m => m.id === id)?.name || id;
}

export function recoveryColor(pct) {
  if (pct >= 85) return 'bg-forge-500';
  if (pct >= 60) return 'bg-yellow-500';
  if (pct >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}
