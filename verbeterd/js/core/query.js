// Praatkaartjes – query & naming helpers
import { state } from './state.js';

export function getQueryParam(name) {
  let s = window.location && window.location.search ? window.location.search : '';
  if (s.charAt(0) === '?') s = s.substring(1);
  const parts = s ? s.split('&') : [];
  for (let i = 0; i < parts.length; i++) {
    const kv = parts[i].split('=');
    if (decodeURIComponent(kv[0] || '') === name) return decodeURIComponent(kv[1] || '');
  }
  return '';
}

export function getActiveSet() {
  const stateSet = state && state.activeSet ? String(state.activeSet).trim() : '';
  if (stateSet) return stateSet;
  const s = (getQueryParam('set') || getQueryParam('s') || '').trim();
  return s || 'samenwerken';
}

export function prettyName(setId) {
  const s = String(setId || '').toLowerCase();
  const map = {
    'check-in': 'Check-in', checkin: 'Check-in',
    samenwerken: 'Samen onderzoeken', verbinden: 'Verbinden',
    verkennen: 'Verkennen', verhelderen: 'Verhelderen',
    vertragen: 'Vertragen', bewegen: 'Bewegen',
    teamstart: 'Teamstart', reflectie: 'Reflectie',
    spanning: 'Spanning', feedback: 'Feedback', energie: 'Energie',
  };
  return map[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Samen onderzoeken');
}

export function prettifySetName(s) {
  s = String(s || '').replace(/[._-]+/g, ' ').trim();
  if (!s) return '';
  return s.split(/\s+/).map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '').join(' ');
}
