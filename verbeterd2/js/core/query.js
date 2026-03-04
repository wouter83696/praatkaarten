// Praatkaartjes – query & naming helpers

export function getQueryParam(name) {
  let s = (typeof window !== 'undefined' && window.location && window.location.search) ? window.location.search : '';
  if (s.charAt(0) === '?') s = s.substring(1);
  for (const part of s.split('&')) {
    const [k, v] = part.split('=');
    if (decodeURIComponent(k || '') === name) return decodeURIComponent(v || '');
  }
  return '';
}

export function getActiveSet(state) {
  // 1) state (als pagina set bepaald heeft)
  if (state && state.activeSet) return String(state.activeSet).trim() || 'samenwerken';
  // 2) querystring
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
