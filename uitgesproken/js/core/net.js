// Praatkaartjes – netwerk helpers
import { DEBUG } from './paths.js';

export function getText(url) {
  try {
    if (DEBUG && window.console) window.console.log('[DEBUG] fetch', url);
  } catch (_e) {}
  if (window.fetch) {
    return fetch(url, { cache: 'default' }).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
      return r.text();
    });
  }
  // XHR fallback
  return new Promise((resolve, reject) => {
    try {
      const x = new XMLHttpRequest();
      x.open('GET', url, true);
      x.onreadystatechange = function() {
        if (x.readyState === 4) {
          if (x.status >= 200 && x.status < 300) resolve(x.responseText);
          else reject(new Error('HTTP ' + x.status + ' ' + url));
        }
      };
      x.send(null);
    } catch (e) { reject(e); }
  });
}

export function getJson(url) {
  return getText(url).then(
    t => { try { return JSON.parse(t); } catch (_e) { return {}; } },
    () => ({})
  );
}

export function loadJson(url) {
  return getText(url).then(t => JSON.parse(t));
}
