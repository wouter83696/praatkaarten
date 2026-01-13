// Zorg dat "viewport units" op mobiel/rotatie altijd kloppen (iOS/Safari quirks)
function setVh(){
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
setVh();
window.addEventListener('resize', setVh);
window.addEventListener('orientationchange', setVh);
if (window.visualViewport){
  window.visualViewport.addEventListener('resize', setVh);
}

const THEMES = ["verkennen","duiden","verbinden","verdiepen","vertragen","bewegen"];

  // State
  let data = [];
  let filtered = [];      // huidige (eventueel gehusselde) kaartset
  let helpFiltered = [];  // uitlegkaartjes
  let currentIndex = -1;


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
  const uitlegBtn = document.getElementById('uitleg');
  const lbHelpText = document.getElementById('lbHelpText');
  const lbHelpTitle = document.getElementById('lbHelpTitle');
  const lbHelpDesc = document.getElementById('lbHelpDesc');

  

  let mode = 'cards'; // 'cards' of 'help'
  let helpData = {};

  function firstSentence(txt){
    const t = String(txt || "").trim().replace(/\s+/g,' ');
    const m = t.match(/^[\s\S]*?[.!?]/);
    return m ? m[0].trim() : t;
  }
  // Uitleg-modus: voorkant + 6 thema-kaarten (alles in dezelfde lightbox).
  // Let op: sommige data-bestanden gebruiken nog "verdiepen" i.p.v. "verhelderen"; we ondersteunen beide.
  const helpItems = [
    { theme:'',            key:'cover',       bg:'voorkant.svg' },
    { theme:'Verkennen',   key:'verkennen',   bg:'cards/verkennen.svg' },
    { theme:'Duiden',      key:'duiden',      bg:'cards/duiden.svg' },
    { theme:'Verbinden',   key:'verbinden',   bg:'cards/verbinden.svg' },
    { theme:'Verhelderen', key:'verhelderen', bg:'cards/verhelderen.svg' },
    { theme:'Vertragen',   key:'vertragen',   bg:'cards/vertragen.svg' },
    { theme:'Bewegen',     key:'bewegen',     bg:'cards/bewegen.svg' }
  ];

  // Nav hint (rechts): alleen op touch-apparaten, eenmalig per sessie
  let hintTimer = null;
  const HINT_KEY = 'pk_nav_hint_shown';
  const IS_TOUCH = (
    (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)
  );
  function showNavHint(){
    if(!navHint) return;
    document.body.classList.add('show-hint');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => document.body.classList.remove('show-hint'), 20000);
  }
  function maybeShowNavHintOnce(){
    // Alleen tonen op touch-apparaten
    if(!IS_TOUCH) return;
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
    // Bewaar de huidige (zichtbare) kaartset voor navigatie
    filtered = items;
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
      // Tekst op een vast wit vlak (met extra wit onder de tekst)
      const qText = document.createElement('span');
      qText.className = 'qText';
      qText.textContent = item.q;
      q.appendChild(qText);

      inner.appendChild(img);
      inner.appendChild(q);
      btn.appendChild(inner);

      btn.addEventListener('click', () => {
        mode = 'cards';
        openAt(idx);
      });
      frag.appendChild(btn);
    });

    grid.appendChild(frag);
  }

  function setLightboxBackground(url){
    // Geblurde achtergrond = dezelfde SVG als huidige kaart
    // (werkt ook als de img zelf nog laadt)
    try{
      lb.style.setProperty('--lb-bg-url', `url("${url}")`);
    }catch(_e){}
  }

  function openLb(item){
    // item: {bg, q} voor kaarten, of {bg, theme, key} voor help
    lbImg.src = item.bg || "";
    if(item.bg) setLightboxBackground(item.bg);

    if(mode === 'help'){
      lb.classList.add('help');

      // UITLEG: toon uitlegtekst onder de kaart (titel onder kaart is via CSS verborgen)
      if(lbHelpText) lbHelpText.setAttribute('aria-hidden','false');
      if(lbHelpTitle) lbHelpTitle.textContent = item.theme || "";
      // Support: sommige data-bestanden gebruiken nog 'verdiepen'
      const key = item.key === 'verhelderen' && helpData && (typeof helpData.verhelderen !== 'string') && (typeof helpData.verdiepen === 'string')
        ? 'verdiepen'
        : item.key;

      const raw = (helpData && key && typeof helpData[key] === 'string') ? helpData[key].trim() : "";
      // Geen geforceerde enters: laat de browser het netjes afbreken.
      const desc = firstSentence(raw.replace(/\s*\n\s*/g, ' '));
      if(lbHelpDesc) lbHelpDesc.textContent = desc;
      // In help-mode: geen overlay-tekst over de kaart (alleen tekst onderin)
      lbText.textContent = "";
      lb.classList.add('no-overlay');
      lb.classList.remove('help-title');
    }

    else{
      lb.classList.remove('help');
      if(lbHelpText) lbHelpText.setAttribute('aria-hidden','true');
      if(lbHelpTitle) lbHelpTitle.textContent = "";
      if(lbHelpDesc) lbHelpDesc.textContent = "";

      lbText.textContent = item.q || "";
    }

    lb.setAttribute('aria-hidden','false');
    lb.classList.add('open');
    document.body.classList.add('lb-open');

    // voorkom scrollen achter de lightbox (iOS/Safari vriendelijk)
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    showUI();
    maybeShowNavHintOnce();

    // Oneindig doorlopen: pijlen nooit uitschakelen
    if(prevBtn) prevBtn.disabled = false;
    if(nextBtn) nextBtn.disabled = false;
  }

  function closeLb(){
    // Sluiten = terug naar normale kaartmodus
    if(mode === 'help'){
      mode = 'cards';
      helpFiltered = [];
    }
    lb.classList.remove('help','no-overlay','help-title','open','show-ui');
    lbImg.src = "";
    lbText.textContent = "";
    if(lbHelpText) lbHelpText.setAttribute('aria-hidden','true');
    if(lbHelpTitle) lbHelpTitle.textContent = "";
    if(lbHelpDesc) lbHelpDesc.textContent = "";
    currentIndex = -1;
    lb.setAttribute('aria-hidden','true');
    document.body.classList.remove('lb-open');
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

  // Voorkom dat de 'synthetic click' na een touch-tap doorvalt naar de grid
  // (klassieker: je sluit de lightbox, maar de klik opent direct weer een kaart).
  let suppressClickUntil = 0;

  function closeFromTap(e){
    suppressClickUntil = performance.now() + 450;
    try{ e?.preventDefault?.(); }catch(_e){}
    try{ e?.stopPropagation?.(); }catch(_e){}
    closeLb();
  }

  // Fallback: tap/click op de achtergrond (blur) sluit ook (handig als iOS pointer-events raar doet)
  const lbBg = lb.querySelector('.lbBg');
  if(lbBg){
    lbBg.addEventListener('click', (e) => {
      if(!lb.classList.contains('open')) return;
      // voorkom dubbele click na touch
      if(performance.now() < suppressClickUntil) return;
      closeFromTap(e);
    });
    lbBg.addEventListener('touchend', (e) => {
      if(!lb.classList.contains('open')) return;
      closeFromTap(e);
    }, {passive:false});
  }



  lb.addEventListener('pointerdown', (e) => {
    if(!lb.classList.contains('open')) return;
    lastPointerType = e.pointerType || 'mouse';
    // Als je start op een UI-knop (pijlen/sluiten), dan willen we géén swipe-gesture starten.
    // Als je start in het uitleg-tekstvak: laat verticale scroll met rust (geen swipe-gesture).
    // Anders kan een "klik" per ongeluk als swipe omlaag geïnterpreteerd worden en sluit het venster.
    if (e.target.closest && e.target.closest('button')) {
      gestureArmed = false;
      showUI();
      return;
    }
    if (e.target.closest && (e.target.closest('.lbHelpText') || e.target.closest('.lbHelpDesc'))){
      gestureArmed = false;
      return;
    }
    pointerDown = true;
    gestureArmed = true;
    startX = e.clientX;
    startY = e.clientY;
    startT = performance.now();
    // Op touch willen we native verticaal scrollen (zeker bij lange kaarten).
    // Pointer-capture kan dat soms "stroef" maken, dus alleen gebruiken bij mouse/pen.
    if(lastPointerType !== 'touch'){
      lb.setPointerCapture?.(e.pointerId);
    }
    showUI();
  });

  
lb.addEventListener('pointermove', (e) => {
  if(!pointerDown) return;
  if(!gestureArmed) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);

  // Alleen "swipe"-modus als het echt horizontaal is.
  // Dit voorkomt dat verticaal scrollen soms als swipe/tap wordt gezien.
  if(ax > ay && ax > 12){
    lb.classList.add('is-swiping');
  }
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
      closeFromTap(e);
      return;
    }
  });

  function activeItems(){
    return (mode === 'help') ? helpFiltered : filtered;
  }

  function openAt(index){
    const items = activeItems();
    currentIndex = index;
    openLb(items[currentIndex]);
  }

  function go(delta){

    if (currentIndex < 0) return;
    const items = activeItems();
    const total = items.length;
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
      closeFromTap(e);
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
      closeFromTap(e);
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
    if(!lbCard.contains(e.target)) {
      if ((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || lastPointerType !== 'mouse') {
        closeFromTap(e);
      } else {
        closeLb();
      }
      return;
    }

    // Touch: klik op kaart wordt al door lbCard afgehandeld (tap-to-close)
    // Desktop: alleen UI tonen
    showUI();
  });

  // Onderdruk 'click-through' direct na een touch-tap-close.
  // Dit voorkomt dat er meteen weer een kaart opent op de plek waar je tikt.
  document.addEventListener('click', (e) => {
    if (performance.now() < suppressClickUntil) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);
document.addEventListener('keydown', (e) => {
    if(!lb.classList.contains('open')) return;
    if(e.key === 'Escape') closeLb();
    if(e.key === 'ArrowLeft') go(-1);
    if(e.key === 'ArrowRight') go(1);
  });

  resetBtn?.addEventListener('click', () => {
    mode = 'cards';
    filtered = data.slice();
    render(filtered);
    closeLb();
  });

  shuffleBtn.addEventListener('click', () => {
    filtered = shuffle(filtered.slice());
    render(filtered);
  });

  
  if(uitlegBtn){
    uitlegBtn.addEventListener('click', () => {
      showNavHint();
      mode = 'help';
      helpFiltered = helpItems.slice();
      openAt(0);
    });
  }

  (async function init(){
    const res = await fetch('questions.json');
    const questions = await res.json();
    data = buildData(questions);
    filtered = data.slice();
    render(filtered);

    // uitleg-teksten (later invulbaar)
    try{
      const hr = await fetch('uitleg-data.json', { cache:'no-store' });
      helpData = await hr.json();
    }catch(e){
      helpData = {};
    }
  })();



window.closeLb = closeLb;


window.go = go;
