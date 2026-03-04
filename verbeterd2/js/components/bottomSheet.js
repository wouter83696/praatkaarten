// Praatkaartjes – BottomSheet component
// Herbruikbare sheet/overlay met open/close/toggle + ESC + klik op overlay.

export function createBottomSheet(options = {}) {
  const { sheet, overlay, trigger, onOpen, onClose } = options;

  if (!sheet) return { open() {}, close() {}, toggle() {}, isOpen() { return false; }, destroy() {} };

  function setAria(expanded) {
    if (trigger && trigger.setAttribute) {
      trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }
  }

  function show() {
    sheet.hidden = false;
    if (overlay) overlay.hidden = false;
    sheet.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    try { sheet.offsetHeight; } catch {} // force reflow
    requestAnimationFrame(() => {
      sheet.classList.add('open');
      if (overlay) overlay.classList.add('open');
      setAria(true);
      if (typeof onOpen === 'function') onOpen();
    });
  }

  function hide() {
    sheet.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    const delay = typeof options.hideDelay === 'number' ? options.hideDelay : 200;
    setTimeout(() => {
      sheet.hidden = true;
      if (overlay) overlay.hidden = true;
    }, delay);
    setAria(false);
    if (typeof onClose === 'function') onClose();
  }

  const isOpen  = () => !sheet.hidden;
  const toggle  = () => isOpen() ? hide() : show();

  const onOverlayClick = () => hide();
  const onTriggerClick = () => toggle();
  const onKeyDown = ev => { if ((ev || window.event) && (ev || window.event).key === 'Escape') hide(); };

  if (trigger) trigger.addEventListener('click', onTriggerClick);
  if (overlay) overlay.addEventListener('click', onOverlayClick);
  document.addEventListener('keydown', onKeyDown);

  return {
    open: show, close: hide, toggle, isOpen,
    destroy() {
      if (trigger) trigger.removeEventListener('click', onTriggerClick);
      if (overlay) overlay.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKeyDown);
    },
  };
}
