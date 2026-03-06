// Praatkaartjes – gedeelde shell
import { pathForAsset, withV, DEBUG } from '../core/paths.js';

export function applyCssVars(vars) {
  if (!vars) return;
  const root = document.documentElement;
  if (!root || !root.style) return;
  for (const k in vars) {
    if (!Object.prototype.hasOwnProperty.call(vars, k)) continue;
    const name = k.indexOf('--') === 0 ? k : ('--' + k);
    try { root.style.setProperty(name, String(vars[k])); } catch (_e) {}
  }
}

export function initShell() {
  try {
    if (DEBUG && window.console) window.console.log('[DEBUG] shell init');
  } catch (_e) {}

  try {
    const body = document.body;
    const brand = !!(body && body.getAttribute && body.getAttribute('data-brand-icon') === '1');
    const icon = document.getElementById('setCoverIcon');
    if (brand && icon) {
      const src = pathForAsset('logo-icons/masters/logo-ballon-vlak.svg');
      icon.setAttribute('src', withV(src));
    }
  } catch (_eIcon) {}
}
