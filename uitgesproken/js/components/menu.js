// Praatkaartjes – Menu component
import { PATHS } from '../core/paths.js';

function goHome(){
  var target = '';
  try{
    if(PK && PK.PATHS && PK.PATHS.gridPage){
      target = String(PK.PATHS.gridPage || '');
    }
  }catch(_ePath){}
  if(!target){
    var p = '';
    try{ p = String((window.location && window.location.pathname) || ''); }catch(_eLoc){ p = ''; }
    target = (p.indexOf('/kaarten/') !== -1 || p.indexOf('/uitleg/') !== -1) ? '../index.html' : './index.html';
  }
  try{ window.location.href = target; }catch(_eNav){}
}

function isHomeAreaClick(trigger, ev){
  if(!trigger || !ev) return false;
  var t = ev.target || null;
  if(!t || !t.closest) return false;
  var main = t.closest('.themePillMain');
  return !!(main && trigger.contains(main));
}

function bindTopBarHome(trigger){
  if(!trigger || trigger.__pkTopBarHomeBound) return;
  trigger.__pkTopBarHomeBound = true;
  trigger.addEventListener('click', function(ev){
    if(!isHomeAreaClick(trigger, ev)) return;
    if(ev && ev.preventDefault) ev.preventDefault();
    if(ev && ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    else if(ev && ev.stopPropagation) ev.stopPropagation();
    goHome();
  }, true);
}

export function createMenu(options) {
  options = options || {};
  var menu = options.menu || document.getElementById('themeMenu');
  var overlay = options.overlay || document.getElementById('themeMenuOverlay');
  var trigger = options.trigger || document.getElementById('themePill');
  var api = null;

  if(menu && menu.__pkMenuApi) return menu.__pkMenuApi;

  if(!menu){
    return {
      open: function(){}, close: function(){}, toggle: function(){}, isOpen: function(){ return false; }
    };
  }

  function open(){
    menu.hidden = false;
    if(overlay) overlay.hidden = true;
    if(trigger) trigger.setAttribute('aria-expanded','true');
  }

  function close(){
    menu.hidden = true;
    if(overlay) overlay.hidden = true;
    if(trigger) trigger.setAttribute('aria-expanded','false');
  }

  function isOpen(){
    return !menu.hidden;
  }

  function toggle(){
    if(isOpen()) close(); else open();
  }

  function onTriggerClick(ev){
    if(isHomeAreaClick(trigger, ev)){
      close();
      goHome();
      return;
    }
    toggle();
  }

  function onDocPointerDown(ev){
    var t = ev && ev.target ? ev.target : null;
    if(!isOpen() || !t) return;
    if(menu.contains(t)) return;
    if(trigger && trigger.contains(t)) return;
    close();
  }

  function onDocClick(ev){
    var t = ev && ev.target ? ev.target : null;
    if(!t) return;
    if(!isOpen()) return;
    if(menu.contains(t)) return;
    if(trigger && trigger.contains(t)) return;
    close();
  }

  function onKeyDown(ev){
    ev = ev || window.event;
    if(ev && ev.key === 'Escape') close();
  }

  bindTopBarHome(trigger);
  if(trigger) trigger.addEventListener('click', onTriggerClick);
  if(overlay){
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
  }
  document.addEventListener('pointerdown', onDocPointerDown, true);
  document.addEventListener('click', onDocClick, true);
  document.addEventListener('keydown', onKeyDown);

  api = {
    open: open,
    close: close,
    toggle: toggle,
    isOpen: isOpen,
    destroy: function(){
      if(trigger) trigger.removeEventListener('click', onTriggerClick);
      document.removeEventListener('pointerdown', onDocPointerDown, true);
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKeyDown);
    }
  };
  menu.__pkMenuApi = api;
  return api;
};