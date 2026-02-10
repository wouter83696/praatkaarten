// Praatkaartjes – BottomSheet component (ES5)
// Doel: één herbruikbare sheet/overlay met open/close/toggle + ESC + klik op overlay.
// Later uitbreidbaar met: drag handle, swipe links/rechts, snap points.

(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};

  function on(el, type, fn){
    if(el && el.addEventListener) el.addEventListener(type, fn);
  }
  function off(el, type, fn){
    if(el && el.removeEventListener) el.removeEventListener(type, fn);
  }

  PK.createBottomSheet = function(options){
    options = options || {};
    var sheet = options.sheet;
    var overlay = options.overlay;
    var trigger = options.trigger;
    var onOpen = options.onOpen;
    var onClose = options.onClose;

    if(!sheet){
      return {
        open: function(){}, close: function(){}, toggle: function(){}, isOpen: function(){ return false; }, destroy: function(){}
      };
    }

    // Default state: respect current hidden attribute
    function setAria(expanded){
      if(trigger && trigger.setAttribute){
        trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      }
    }

    function show(){
      // Zorg voor nette CSS-transitions: eerst unhide, dan in volgende frame 'open'.
      sheet.hidden = false;
      if(overlay) overlay.hidden = false;

      if(sheet.classList) sheet.classList.remove('open');
      if(overlay && overlay.classList) overlay.classList.remove('open');

      // force reflow zodat de browser de startstaat pakt
      try{ sheet.offsetHeight; }catch(_e){}

      w.requestAnimationFrame(function(){
        if(sheet.classList) sheet.classList.add('open');
        if(overlay && overlay.classList) overlay.classList.add('open');
        setAria(true);
        if(typeof onOpen === 'function') onOpen();
      });
    }

    function hide(){
      if(sheet.classList) sheet.classList.remove('open');
      if(overlay && overlay.classList) overlay.classList.remove('open');

      // Wacht kort zodat eventuele CSS-transitions kunnen uitlopen.
      // Fallback: direct hide als transitions niet bestaan.
      var delay = options && typeof options.hideDelay === 'number' ? options.hideDelay : 200;
      w.setTimeout(function(){
        sheet.hidden = true;
        if(overlay) overlay.hidden = true;
      }, delay);

      setAria(false);
      if(typeof onClose === 'function') onClose();
    }

    function isOpen(){
      return !sheet.hidden;
    }

    function toggle(){
      if(isOpen()) hide(); else show();
    }

    // Wiring
    var onOverlayClick = function(){ hide(); };
    var onTriggerClick = function(){ toggle(); };
    var onKeyDown = function(ev){
      ev = ev || w.event;
      if(ev && ev.key === 'Escape') hide();
    };

    if(trigger) on(trigger, 'click', onTriggerClick);
    if(overlay) on(overlay, 'click', onOverlayClick);
    on(w.document, 'keydown', onKeyDown);

    // public API
    return {
      open: show,
      close: hide,
      toggle: toggle,
      isOpen: isOpen,
      destroy: function(){
        if(trigger) off(trigger, 'click', onTriggerClick);
        if(overlay) off(overlay, 'click', onOverlayClick);
        off(w.document, 'keydown', onKeyDown);
      }
    };
  };
})(window);
