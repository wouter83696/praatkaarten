
/* MINIMAL LIGHTBOX v3.3.42
   Alleen:
   - kaart openen
   - sluiten
   - shuffle (random kaart)
   Geen swipe / geen gesture-lock / geen scroll hacks
*/
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const lb = $('#lb');
  const lbCard = $('#lbCard');
  const lbSvg = $('#lbSvg');
  const lbTitle = $('#lbHelpTitle');
  const lbDesc = $('#lbHelpDesc');
  const closeBtn = $('#close');
  const closeHitbox = $('#closeHitbox');
  const shuffleBtn = $('#shuffleBtn');

  // cards from DOM: we expect grid items with data-index or href to svg
  const gridCards = $$('.grid .card, .gridCard, [data-card-index]');

  function setBodyLock(lock){
    // KEEP IT SIMPLE: no locking; but we ensure no weird leftovers
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
  }

  function openLbFromCard(el){
    if(!el) return;
    const svgSrc = el.getAttribute('data-svg') || el.getAttribute('data-src') || el.getAttribute('href');
    const title = el.getAttribute('data-title') || el.getAttribute('aria-label') || '';
    const desc = el.getAttribute('data-desc') || el.getAttribute('data-text') || '';

    if(svgSrc && lbSvg){
      lbSvg.setAttribute('src', svgSrc);
    }
    if(lbTitle) lbTitle.textContent = title;
    if(lbDesc) lbDesc.textContent = desc;

    lb.classList.add('open');
    setBodyLock(false);
    // Position close hitbox around close button if present
    try{
      const r = closeBtn.getBoundingClientRect();
      if(closeHitbox){
        closeHitbox.style.top = Math.round(r.top - 10) + 'px';
        closeHitbox.style.left = Math.round(r.left - 10) + 'px';
      }
    }catch(_){}
  }

  function closeLb(){
    if(!lb) return;
    lb.classList.remove('open','dragging','closing','is-dragging','is-swiping');
    lb.style.transform = '';
    setBodyLock(false);
  }

  function onClose(e){
    if(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
    closeLb();
  }

  // Bind grid cards: click opens
  gridCards.forEach((el)=>{
    el.addEventListener('click', (e)=>{
      e.preventDefault();
      openLbFromCard(el);
    }, {passive:false});
  });

  // Close bindings
  [closeBtn, closeHitbox].forEach((el)=>{
    if(!el) return;
    el.addEventListener('touchstart', onClose, {capture:true, passive:false});
    el.addEventListener('pointerdown', onClose, {capture:true});
    el.addEventListener('click', onClose, {capture:true});
  });

  // Backdrop close (click outside panel)
  lb && lb.addEventListener('pointerdown', (e)=>{
    const insidePanel = e.target && e.target.closest && e.target.closest('.panel');
    const isClose = e.target && e.target.closest && e.target.closest('#close,#closeHitbox');
    if(!insidePanel && !isClose) onClose(e);
  }, true);

  // Shuffle: pick random card from grid and open
  if(shuffleBtn){
    shuffleBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();
      const list = gridCards.length ? gridCards : $$('.card');
      if(!list.length) return;
      const el = list[Math.floor(Math.random()*list.length)];
      openLbFromCard(el);
    }, {capture:true});
  }

  // Expose for inline onclick fallbacks
  window.closeLb = closeLb;
})();
