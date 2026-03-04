// Praatkaartjes – netwerk helpers
import { DEBUG } from './paths.js';

export function getText(url) {
  if (DEBUG && typeof console !== 'undefined') console.log('[DEBUG] fetch', url);
  if (typeof fetch !== 'undefined') {
    return fetch(url, { cache: 'default' }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
      return r.text();
    });
  }
  // XHR fallback
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.onreadystatechange = () => {
      if (x.readyState === 4) {
        if (x.status >= 200 && x.status < 300) resolve(x.responseText);
        else reject(new Error(`HTTP ${x.status} ${url}`));
      }
    };
    x.send(null);
  });
}

export function getJson(url) {
  return getText(url).then(
    t => { try { return JSON.parse(t); } catch { return {}; } },
    ()  => ({})
  );
}

// loadJson: harde fout bij HTTP-errors (catch in page)
export function loadJson(url) {
  return getText(url).then(t => JSON.parse(t));
}
