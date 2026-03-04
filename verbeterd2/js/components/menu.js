// Praatkaartjes – Menu component
import { PATHS } from '../core/paths.js';

function goHome() {
  const target = (PATHS && PATHS.gridPage) ? String(PATHS.gridPage) : (() => {
    const p = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : '';
    return (p.indexOf('/kaarten/') !== -1 || p.indexOf('/uitleg/') !== -1) ? '../index.html' : './index.html';
  })();
  try { window.location.href = target; } catch {}
}

function isHomeAreaClick(trigger, ev) {
  if (!trigger || !ev) return false;
  const t = ev.target || null;
  if (!t || !t.closest) return false;
  const main = t.closest('.themePillMain');
  return !!(main && trigger.contains(main));
}

function bindTopBarHome(trigger) {
  if (!trigger || trigger.__pkTopBarHomeBound) return;
  trigger.__pkTopBarHomeBound = true;
  trigger.addEventListener('click', ev => {
    if (!isHomeAreaClick(trigger, ev)) return;
    ev.preventDefault();
    if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    else if (ev.stopPropagation) ev.stopPropagation();
    goHome();
  }, true);
}

export function createMenu(options = {}) {
  const menu    = options.menu    || document.getElementById('themeMenu');
  const overlay = options.overlay || document.getElementById('themeMenuOverlay');
  const trigger = options.trigger || document.getElementById('themePill');

  if (menu && menu.__pkMenuApi) return menu.__pkMenuApi;
  if (!menu) return { open() {}, close() {}, toggle() {}, isOpen() { return false; } };

  function open() {
    menu.hidden = false;
    if (overlay) overlay.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }

  function close() {
    menu.hidden = true;
    if (overlay) overlay.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  const isOpen  = () => !menu.hidden;
  const toggle  = () => isOpen() ? close() : open();

  function onTriggerClick(ev) {
    if (isHomeAreaClick(trigger, ev)) { close(); goHome(); return; }
    toggle();
  }

  function onDocPointerDown(ev) {
    const t = ev && ev.target;
    if (!isOpen() || !t) return;
    if (menu.contains(t)) return;
    if (trigger && trigger.contains(t)) return;
    close();
  }

  function onDocClick(ev) {
    const t = ev && ev.target;
    if (!t || !isOpen()) return;
    if (menu.contains(t)) return;
    if (trigger && trigger.contains(t)) return;
    close();
  }

  function onKeyDown(ev) {
    if (ev && ev.key === 'Escape') close();
  }

  bindTopBarHome(trigger);
  if (trigger) trigger.addEventListener('click', onTriggerClick);
  if (overlay) { overlay.hidden = true; overlay.setAttribute('aria-hidden', 'true'); }
  document.addEventListener('pointerdown', onDocPointerDown, true);
  document.addEventListener('click', onDocClick, true);
  document.addEventListener('keydown', onKeyDown);

  const api = {
    open, close, toggle, isOpen,
    destroy() {
      if (trigger) trigger.removeEventListener('click', onTriggerClick);
      document.removeEventListener('pointerdown', onDocPointerDown, true);
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKeyDown);
    },
  };
  menu.__pkMenuApi = api;
  return api;
}
