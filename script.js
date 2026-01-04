const THEMES = ["verkennen","verbinden","bewegen","duiden","verdiepen","vertragen"];

  const grid = document.getElementById('grid');
  const lb = document.getElementById('lb');
  const lbImg = document.getElementById('lbImg');
  const lbText = document.getElementById('lbText');
  const lbCard = document.getElementById('lbCard');
  const themeTag = document.getElementById('themeTag');
  const navHint = document.getElementById('navHint');

  const closeBtn = document.getElementById('close');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');

  const shuffleBtn = document.getElementById('shuffle');
  const resetBtn = document.getElementById('reset');

  let data = [];       // full list
  let filtered = [];   // current order
  let currentIndex = -1;

  // Nav hint (rechts): kort zichtbaar bij openen
  let hintTimer = null;
  const HINT_KEY = 'pk_nav_hint_shown';
  function showNavHint(){
    if(!navHint) return;
    document.body.classList.add('show-hint');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => document.body.classList.remove('show-hint'), 9500);
  }
  function maybeShowNavHintOnce(){
    // Alleen tonen wanneer de viewer via touch/pen is geopend (dus niet met muis/desktop)
    if(lastPointerType === 'mouse') return;
    try{
      if(sessionStorage.getItem(HINT_KEY) === '1') return;
      sessionStorage.setItem(HINT_KEY,'1');
    }catch(_e){}
    showNavHint();
  }

// UI chrome (pijlen + sluiten)
  // - Touch: iets langer zichtbaar
  // - Desktop: ook auto-hide, maar alleen na inactiviteit (muis bewegen laat het weer zien)
  const HAS_HOVER = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  const HIDE_MS_DESKTOP = 600;
  const HIDE_MS_TOUCH   = 900;

  let uiTimer = null;
  function showUI(){
    lb.classList.add('show-ui');
    clearTimeout(uiTimer);
    const ms = HAS_HOVER ? HIDE_MS_DESKTOP : HIDE_MS_TOUCH;
    uiTimer = setTimeout(() => lb.classList.remove('show-ui'), ms);
  }

  function buildData(questions){
    const out = [];
    for (const theme of THEMES){
      const qs = questions[theme] || [];
      for (let i=0; i<qs.length; i++){
        out.push({
          theme,
          num: i+1,
          q: qs[i],
          bg: `cards/${theme}.svg`,
          id: `${theme}-${String(i+1).padStart(2,'0')}`
        });
      }
    }
    return out;
  }

  function render(items){
    grid.innerHTML = "";
    const frag = document.createDocumentFragment();

    items.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.className = 'card';
      btn.type = 'button';
      btn.setAttribute('aria-label', item.id);

      const inner = document.createElement('div');
      inner.className = 'cardInner';

      const img = document.createElement('img');
      img.className = 'bg';
      img.src = item.bg;
      img.alt = "";

      const q = document.createElement('div');
      q.className = 'q';
      q.textContent = item.q;

      inner.appendChild(img);
      inner.appendChild(q);
      btn.appendChild(inner);

      btn.addEventListener('click', () => openAt(idx));
      frag.appendChild(btn);
    });

    grid.appendChild(frag);
  }

  function openLb(item){
    lbImg.src = item.bg;
    lbText.textContent = item.q || "";
    lb.setAttribute('aria-hidden','false');
    lb.classList.add('open');
    document.body.classList.add('lb-open');
    // voorkom scrollen achter de lightbox (iOS/Safari vriendelijk)
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    showUI();
    maybeShowNavHintOnce();

    prevBtn.disabled = currentIndex <= 0;
    nextBtn.disabled = currentIndex >= filtered.length - 1;
  }

  function closeLb(){
    lb.setAttribute('aria-hidden','true');
    lb.classList.remove('open');
    lb.classList.remove('is-swiping');
    document.body.classList.remove('lb-open');
    lbImg.src = "";
    lbText.textContent = "";
    currentIndex = -1;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    clearTimeout(hintTimer);
    document.body.classList.remove('show-hint');
  }

  // Swipe / drag overal (ook op de grijze achtergrond):
  // - links/rechts: vorige/volgende
  // - omlaag: sluiten
  // - tap (touch): sluiten
  let startX = 0, startY = 0, startT = 0;
  let pointerDown = false;
  lb.classList.remove('is-swiping');
  let gestureArmed = false;
  let lastPointerType = 'mouse';

  lb.addEventListener('pointerdown', (e) => {
    if(!lb.classList.contains('open')) return;
    lastPointerType = e.pointerType || 'mouse';
    // Als je start op een UI-knop (pijlen/sluiten), dan willen we géén swipe-gesture starten.
    // Anders kan een "klik" per ongeluk als swipe omlaag geïnterpreteerd worden en sluit het venster.
    if (e.target.closest && e.target.closest('button')) {
      gestureArmed = false;
      showUI();
      return;
    }
    pointerDown = true;
    gestureArmed = true;
    startX = e.clientX;
    startY = e.clientY;
    startT = performance.now();
    lb.setPointerCapture?.(e.pointerId);
    showUI();
  });

  
lb.addEventListener('pointermove', (e) => {
  if(!pointerDown) return;
  if(!gestureArmed) return;
  // Tijdens echte swipe/drag: iconen tijdelijk verbergen
  lb.classList.add('is-swiping');
}, {passive:true});

lb.addEventListener('pointerup', (e) => {
    if(!pointerDown) return;
    pointerDown = false;
    lb.classList.remove('is-swiping');
    if(!gestureArmed) return;
    gestureArmed = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const dt = performance.now() - startT;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);

    const fast = dt < 420;
    const thrX = fast ? 40 : 60;
    const thrY = fast ? 50 : 80;

    if(ay > ax && dy > thrY){
      closeLb();
      return;
    }
    if(ax > ay && ax > thrX){
      if(dx < 0) go(1); else go(-1);
      showUI();
      return;
    }

    // ✅ Tap-to-close op touch: ook als je op de kaart zelf tapt
    // (geen swipe, geen drag)
    if(lastPointerType !== 'mouse' && ax < 10 && ay < 10){
      closeLb();
      return;
    }
  });

  function openAt(index){
    currentIndex = index;
    openLb(filtered[currentIndex]);
  }

  function go(delta){
    if (currentIndex < 0) return;
    const total = filtered.length;
    let next = currentIndex + delta;
    if (next < 0) next = total - 1;
    if (next >= total) next = 0;
    openAt(next);
  }


  // Touch fallback (iOS/Safari): als Pointer Events niet (goed) werken, toch tap-to-close.
  let tStartX = 0, tStartY = 0;
  lb.addEventListener('touchstart', (e) => {
    if(!lb.classList.contains('open')) return;
    if (e.target.closest && e.target.closest('button')) return;
    const t = e.touches && e.touches[0];
    if(!t) return;
    tStartX = t.clientX;
    tStartY = t.clientY;
  }, {passive:true});

  lb.addEventListener('touchend', (e) => {
    if(!lb.classList.contains('open')) return;
    if (e.target.closest && e.target.closest('button')) return;
    const t = e.changedTouches && e.changedTouches[0];
    if(!t) return;
    const ax = Math.abs(t.clientX - tStartX);
    const ay = Math.abs(t.clientY - tStartY);
    // Alleen echte tap, geen swipe/drag
    if(ax < 10 && ay < 10){
      closeLb();
    }
  }, {passive:true});

  function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  }

  // events (iconen op de kaart)
  // Belangrijk: desktop = klik op kaart doet niets (alleen UI tonen),
  // touch = tap op kaart sluit (tap-to-close).
  lbCard.addEventListener('click', (e) => {
    if ((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || lastPointerType !== 'mouse') {
      e.stopPropagation();
      closeLb();
      return;
    }
    e.stopPropagation();
  });
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeLb(); });
  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); go(-1); showUI(); });
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); go(1); showUI(); });

  lb.addEventListener('mousemove', showUI);
  lb.addEventListener('touchstart', showUI, {passive:true});
  lb.addEventListener('click', (e) => {
    // Klik buiten de kaart (op de blur/achtergrond) = sluiten
    if(!lbCard.contains(e.target)) { closeLb(); return; }

    // Touch: klik op kaart wordt al door lbCard afgehandeld (tap-to-close)
    // Desktop: alleen UI tonen
    showUI();
  });
document.addEventListener('keydown', (e) => {
    if(!lb.classList.contains('open')) return;
    if(e.key === 'Escape') closeLb();
    if(e.key === 'ArrowLeft') go(-1);
    if(e.key === 'ArrowRight') go(1);
  });

  shuffleBtn.addEventListener('click', () => {
    filtered = shuffle(filtered.slice());
    render(filtered);
  });

  resetBtn.addEventListener('click', () => {
    filtered = data.slice();
    render(filtered);
  });

  (async function init(){
    const res = await fetch('questions.json');
    const questions = await res.json();
    data = buildData(questions);
    filtered = data.slice();
    render(filtered);
  })();



window.closeLb = closeLb;


window.go = go;

/* ===== MOBILE TAP-TO-CLOSE (v2) =====
   - Telefoon: swipe links/rechts = nav (go)
   - Tap (geen swipe) = sluit overlay
*/
(function(){
  const lb = document.getElementById('lb');
  if(!lb) return;

  const isTouchPhone = () =>
    window.matchMedia &&
    window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  let sx=0, sy=0, moved=false;
  const SWIPE_X = 40;   // px
  const TAP_SLOP = 10;  // px

  lb.addEventListener('touchstart', (e) => {
    if(!isTouchPhone()) return;
    if(!lb.classList.contains('open')) return;
    const t = e.touches[0];
    sx = t.clientX; sy = t.clientY;
    moved = false;
  }, {passive:true});

  lb.addEventListener('touchmove', (e) => {
    if(!isTouchPhone()) return;
    if(!lb.classList.contains('open')) return;
    const t = e.touches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if(Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) moved = true;
  }, {passive:true});

  lb.addEventListener('touchend', (e) => {
    if(!isTouchPhone()) return;
    if(!lb.classList.contains('open')) return;
    const t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
    if(!t) return;
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;

    // horizontale swipe
    if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_X){
      if(typeof window.go === 'function'){
        window.go(dx < 0 ? 1 : -1);
      }
      return;
    }

    // tap: sluiten (ook als je op de kaart tikt)
    if(!moved){
      if(typeof window.closeLb === 'function') window.closeLb();
      else lb.classList.remove('open');
    }
  }, {passive:true});
})();
