// Praatkaartjes – gedeelde shell (menu/sheet/theme/background)
import { pathForAsset, withV, DEBUG } from '../core/paths.js';

export function applyCssVars(vars) {
  if (!vars || !document.documentElement) return;
  for (const k in vars) {
    if (!Object.prototype.hasOwnProperty.call(vars, k)) continue;
    const name = k.indexOf('--') === 0 ? k : '--' + k;
    try { document.documentElement.style.setProperty(name, String(vars[k])); } catch {}
  }
}

export function initShell() {
  if (DEBUG && typeof console !== 'undefined') console.log('[DEBUG] shell init');

  // Zorg dat het merk-icoon via PATHS wordt gezet (relatief pad)
  try {
    const body = document.body;
    const brand = !!(body && body.getAttribute && body.getAttribute('data-brand-icon') === '1');
    const icon = document.getElementById('setCoverIcon');
    if (brand && icon) {
      const src = pathForAsset('logo-icons/masters/master-transparent.svg');
      icon.setAttribute('src', withV(src));
    }
  } catch {}
}
