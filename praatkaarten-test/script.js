// Zorg dat "viewport units" op mobiel/rotatie altijd kloppen (iOS/Safari quirks)
function setVh(){
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
setVh();

// ===============================
// Path-resolver (werkt in ELKE directory op GitHub Pages)
// - probeert eerst huidige directory
// - daarna repo-root (bijv. /praatkaarten/)
// - daarna (optioneel) parent directories
// ===============================
function getRepoRoot(){
  const parts = location.pathname.split('/').filter(Boolean);
  // GitHub Pages project site: eerste segment is repo-name
  // /<repo>/... -> repo root = /<repo>/
  if(parts.length>=1) return `/${parts[0]}/`;
  return '/';
}
function currentDirUrl(){
  return new URL('./', location.href);
}
function resolveResourceUrl(rel){
  const relClean = rel.replace(/^\//,''); // nooit absolute slash
  const tries = [];
  const cur = currentDirUrl();
  tries.push(new URL(relClean, cur));

  // probeer parent directories (max 3 niveaus) voor het geval je nested test-mappen hebt
  let parent = cur;
  for(let i=0;i<3;i++){
    parent = new URL('../', parent);
    tries.push(new URL(relClean, parent));
  }

  // repo root als laatste (meest stabiel)
  const repoRoot = new URL(getRepoRoot(), location.origin);
  tries.push(new URL(relClean, repoRoot));

  // ook repoRoot + "praatkaarten-main/" fallback (voor oudere structuren)
  tries.push(new URL(`praatkaarten-main/${relClean}`, repoRoot));

  return tries;
}
async function fetchJsonFallback(rel){
  const urls = resolveResourceUrl(rel);
  let lastErr = null;
  for(const u of urls){
    try{
      const r = await fetch(u.toString(), { cache: 'no-store' });
      if(r.ok) return await r.json();
      lastErr = new Error(`HTTP ${r.status} for ${u}`);
    }catch(e){
      lastErr = e;
    }
  }
  throw lastErr || new Error(`Kon ${rel} niet laden`);
}
async function fetchTextFallback(rel){
  const urls = resolveResourceUrl(rel);
  let lastErr = null;
  for(const u of urls){
    try{
      const r = await fetch(u.toString(), { cache: 'no-store' });
      if(r.ok) return await r.text();
      lastErr = new Error(`HTTP ${r.status} for ${u}`);
    }catch(e){
      lastErr = e;
    }
  }
  throw lastErr || new Error(`Kon ${rel} niet laden`);
}
window.addEventListener('resize', setVh);
window.addEventListener('orientationchange', setVh);
if (window.visualViewport){
  window.visualViewport.addEventListener('resize', setVh);
}

// Versie + cache-buster (handig op GitHub Pages)
// Versie (ook gebruikt als cache-buster op GitHub Pages)
const VERSION = '3.3.23';
const withV = (url) => url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(VERSION);

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
  // (v3.3.7) swipe-hint is bewust verwijderd
  const navHint = null;

  const closeBtn = document.getElementById('close');
// POSITION OVERLAY CLOSE v3.3.40
const overlayClose = document.getElementById('close');
function positionOverlayClose(){
  if(!overlayClose || !lbCard) return;
  const r = lbCard.getBoundingClientRect();
  overlayClose.style.top = Math.round(r.top + 8) + 'px';
  overlayClose.style.left = Math.round(r.right - 8 - 44) + 'px';
}
window.addEventListener('resize', positionOverlayClose, {passive:true});
window.addEventListener('scroll', positionOverlayClose, {passive:true});
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');

  // Onderbalk: chips (v3.2)
  const shuffleBtn = document.getElementById('shuffleBtn');
  const uitlegBtn  = document.getElementById('uitlegBtn');
  // (v3.3.7) geen extra sluitknoppen in de pills
  const mobileIntroEl = document.getElementById('mobileIntro');

  let shuffleOn = false;
  let uitlegOn  = false;

  function setChip(btn, on){
    if(!btn) return;
    btn.classList.toggle('is-on', !!on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function isMobile(){
    return !!(window.matchMedia && window.matchMedia('(max-width: 720px)').matches);
  }
  const lbHelpText = document.getElementById('lbHelpText');
  const lbHelpTitle = document.getElementById('lbHelpTitle');
  const lbHelpDesc = document.getElementById('lbHelpDesc');

  // POSITION OVERLAY CLOSE v3.3.34
  const overlayClose = document.getElementById('close');
  function positionOverlayClose(){
    if(!overlayClose || !lbCard) return;
    const r = lbCard.getBoundingClientRect();
    const top = Math.round(r.top + 8);
    const left = Math.round(r.right - 8 - 44);
    overlayClose.style.top = top + 'px';
    overlayClose.style.left = left + 'px';
  }
  window.addEventListener('resize', positionOverlayClose, {passive:true});
  window.addEventListener('scroll', positionOverlayClose, {passive:true});

  // In de uitleg willen we GEEN extra kop boven de tekst (alleen de beschrijving).
  if(lbHelpTitle){
    lbHelpTitle.textContent = "";
    lbHelpTitle.style.display = "none";
  }

  

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
    { theme:'',            key:'cover',       bg:withV('voorkant.svg') },
    { theme:'Verkennen',   key:'verkennen',   bg:withV('cards/verkennen.svg') },
    { theme:'Duiden',      key:'duiden',      bg:withV('cards/duiden.svg') },
    { theme:'Verbinden',   key:'verbinden',   bg:withV('cards/verbinden.svg') },
    { theme:'Verhelderen', key:'verhelderen', bg:withV('cards/verhelderen.svg') },
    { theme:'Vertragen',   key:'vertragen',   bg:withV('cards/vertragen.svg') },
    { theme:'Bewegen',     key:'bewegen',     bg:withV('cards/bewegen.svg') }
  ];

  // (v3.3.7) swipe-hint verwijderd: geen timers/tekst meer
  let hintTimer = null;

// UI chrome (pijlen + sluiten)
  // - Touch: iets langer zichtbaar
  // - Desktop: ook auto-hide, maar alleen na inactiviteit (muis bewegen laat het weer zien)
  const HAS_HOVER = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  const HIDE_MS_DESKTOP = 600;
  const HIDE_MS_TOUCH   = 900;

  let uiTimer = null;
  function showUI(){
    try{ positionOverlayClose(); }catch(_e){}

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
          bg: withV(`cards/${theme}.svg`),
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
    // FIX: gebruik de bg van het item (niet het <img>-element zelf), anders breekt klikken.
    const bg = (item && item.bg) ? String(item.bg).trim() : "";
    const bgResolved = (!bg)
      ? ""
      : (/^https?:\/\//i.test(bg) ? bg : resolveResourceUrl(bg)[0].toString());

    lbImg.src = bgResolved;
    if(bgResolved) setLightboxBackground(bgResolved);

    if(mode === 'help'){
      lb.classList.add('help');

      // UITLEG: toon uitlegtekst onder de kaart (titel onder kaart is via CSS verborgen)
      if(lbHelpText) lbHelpText.setAttribute('aria-hidden','false');
      // geen kop in uitleg
      // Support: sommige data-bestanden gebruiken nog 'verdiepen'
      const key = item.key === 'verhelderen' && helpData && (typeof helpData.verhelderen !== 'string') && (typeof helpData.verdiepen === 'string')
        ? 'verdiepen'
        : item.key;

      const raw = (helpData && key && typeof helpData[key] === 'string') ? helpData[key].trim() : "";
      // Geen geforceerde enters: laat de browser het netjes afbreken.
      const desc = firstSentence(raw.replace(/\s*\n\s*/g, ' '));
      if(lbHelpDesc) lbHelpDesc.textContent = desc;
      // In help-mode: thema-naam in het midden (net als op mobiel), behalve op de voorkant.
      const isCover = (item && item.key === 'cover');
      const t = (!isCover && item && typeof item.theme === 'string') ? item.theme.trim() : '';
      lbText.textContent = t;
      lb.classList.toggle('help-title', !!t);
      lb.classList.remove('no-overlay');
    }

    else{
      lb.classList.remove('help');
      if(lbHelpText) lbHelpText.setAttribute('aria-hidden','true');
      // geen kop in uitleg
      if(lbHelpDesc) lbHelpDesc.textContent = "";

      lbText.textContent = item.q || "";
    }

    lb.setAttribute('aria-hidden','false');
    lb.classList.add('open');
    positionOverlayClose();
try{ positionOverlayClose(); }catch(_e){}
document.body.classList.add('lb-open');

    // voorkom scrollen achter de lightbox (iOS/Safari vriendelijk)
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    showUI();
    // (v3.3.7) geen swipe-hint

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
    // geen kop in uitleg
    if(lbHelpDesc) lbHelpDesc.textContent = "";
    currentIndex = -1;
    lb.setAttribute('aria-hidden','true');
    document.body.classList.remove('lb-open');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    // (v3.3.7) geen swipe-hint

    // Sync: als je de uitleg-lightbox op desktop sluit, zet de chip uit
    try{
      if(typeof isMobile === 'function' && !isMobile() && typeof uitlegOn !== 'undefined' && uitlegOn){
        uitlegOn = false;
        setChip(uitlegBtn, false);
      }
    }catch(_e){}
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
  closeLb(); });

  // CLOSE FIX v3.3.34: force pointerdown so gestures can't swallow close
  e.stopPropagation();
    closeLb();
  }, {capture:true});

  // CLOSE FIX v3.3.30: op mobiel kan 'click' soms niet afvuren door gesture/capture; forceer pointerdown
  e.stopPropagation();
    closeLb();
  }, {capture:true});
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
    // Alleen onderdrukken als de click buiten overlays/controls valt.
    // Anders kan bijvoorbeeld de close-knop soms "dood" aanvoelen op mobiel.
    if (
      performance.now() < suppressClickUntil &&
      !lb.contains(e.target) &&
      !(mobileIntroEl && mobileIntroEl.contains(e.target)) &&
      !(e.target && e.target.closest && e.target.closest('.pillsDock'))
    ) {
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

  // ===============================
  // v3.2 – Chips onderbalk
  // (Let op: shuffleOn/uitlegOn, setChip() en isMobile() worden al bovenin gedeclareerd.)
  // - Hussel: aan = 1x shuffle, uit = originele volgorde
  // - Uitleg: mobiel = carousel boven grid, desktop = help-lightbox
  // ===============================

  function setUitleg(on){
    uitlegOn = !!on;
    setChip(uitlegBtn, uitlegOn);

    // Pills verplaatsen: onder ↔ boven
    document.body.classList.toggle('uitleg-open', uitlegOn);

    if(isMobile()){
      document.body.classList.toggle('show-intro', uitlegOn);
      return;
    }

    // Desktop: help-lightbox aan/uit
    if(uitlegOn){
      // (v3.3.7) geen swipe-hint
      mode = 'help';
      helpFiltered = helpItems.slice();
      openAt(0);
    }else{
      if(mode === 'help') closeLb();
      mode = 'cards';
    }
  }

  function setShuffle(on){
    shuffleOn = !!on;
    setChip(shuffleBtn, shuffleOn);

    mode = 'cards';
    filtered = shuffleOn ? shuffle(data.slice()) : data.slice();
    render(filtered);
    closeLb();
  }

  // Start: beide uit
  setChip(shuffleBtn, false);
  setChip(uitlegBtn, false);
  document.body.classList.remove('show-intro');
  document.body.classList.remove('uitleg-open');

  if(shuffleBtn){
    shuffleBtn.addEventListener('click', () => setShuffle(!shuffleOn));
  }
  if(uitlegBtn){
    uitlegBtn.addEventListener('click', () => setUitleg(!uitlegOn));
  }

  // Mobiel: sluit-knop in de hoek van het plaatje (wordt per kaart gerenderd)
  // Gebruik event delegation zodat clones ook werken.
  if(mobileIntroEl){
    mobileIntroEl.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest && e.target.closest('.introClose');
      if(!btn) return;
      e.stopPropagation();
      setUitleg(false);
    });
  }

  // Houd altijd genoeg "safe space" boven de fixed pills (links-onder),
  // zodat tekst nooit onder de pills valt. Dynamisch (iOS safe-area + grootte).
  const updatePillsSafe = () => {
    const dock = document.querySelector('.pillsDock');
    if(!dock) return;
    const rect = dock.getBoundingClientRect();
    const h = Math.max(0, rect.height);
    // +6px ademruimte (compacter op mobiel)
    document.documentElement.style.setProperty('--pillsSafe', `${Math.ceil(h + 6)}px`);
  };
  window.addEventListener('resize', updatePillsSafe, {passive:true});
  window.addEventListener('orientationchange', updatePillsSafe, {passive:true});
  // eerste run
  requestAnimationFrame(updatePillsSafe);

  // ===============================
  // v3.3.8 – Swipe omlaag om uitleg (bottom-sheet) te sluiten (mobiel)
  // - robuuster: luister capture + pointer events (iOS/Safari) + touch fallback
  // ===============================
  const introTrackEl  = document.getElementById('introTrack');
  if(mobileIntroEl){
    // Interactie-eis:
    // - Tijdens drag: uitlegkaart blijft volledig zichtbaar en beweegt mee (met weerstand)
    // - Geen fade tijdens drag
    // - Release: onder drempel => veer terug, boven drempel => sluit
    let sy = 0, sx = 0, active = false;
    let dragging = false;
    let lastDy = 0;
    const THRESH = 110;

    const resistance = (dy) => {
      // zachte weerstand: eerste stuk 1:1, daarna afvlakkend
      const d = Math.max(0, dy);
      return d * 0.85;
    };

    const start = (x,y) => {
      sx = x; sy = y; active = true; dragging = false; lastDy = 0;
      // tijdens drag geen CSS transition, zodat het 'plakt' aan je vinger
      mobileIntroEl.style.transition = 'none';
      mobileIntroEl.style.willChange = 'transform';
    };

    const move = (x,y) => {
      if(!active || !uitlegOn) return;
      const dy = y - sy;
      const dx = x - sx;
      const ay = Math.abs(dy);
      const ax = Math.abs(dx);

      // alleen omlaag (geen omhoog trekken)
      if(dy <= 0) return;

      // verticaal moet dominant zijn, anders is het een horizontale swipe in de carousel
      if(ay <= ax * 1.15) return;

      dragging = true;
      lastDy = dy;
      const t = resistance(dy);
      mobileIntroEl.style.transform = `translateY(${t}px)`;
    };

    const end = () => {
      if(!active) return;
      active = false;
      if(!uitlegOn){
        mobileIntroEl.style.transition = '';
        mobileIntroEl.style.transform = '';
        mobileIntroEl.style.willChange = '';
        return;
      }

      // release animatie
      mobileIntroEl.style.transition = 'transform .28s cubic-bezier(.2,.9,.2,1)';

      if(dragging && lastDy > THRESH){
        // laat CSS weer de leiding nemen
        mobileIntroEl.style.transform = '';
        mobileIntroEl.style.willChange = '';
        setUitleg(false);
        return;
      }

      // veer terug
      mobileIntroEl.style.transform = 'translateY(0px)';
      const cleanup = () => {
        mobileIntroEl.style.transition = '';
        mobileIntroEl.style.transform = '';
        mobileIntroEl.style.willChange = '';
        mobileIntroEl.removeEventListener('transitionend', cleanup);
      };
      mobileIntroEl.addEventListener('transitionend', cleanup);
    };

    // Pointer events (meest betrouwbaar, ook op moderne iOS)
    const onPointerDown = (e) => {
      if(!uitlegOn) return;
      // alleen primaire pointer
      if(e.isPrimary === false) return;
      start(e.clientX, e.clientY);
    };
    const onPointerMove = (e) => move(e.clientX, e.clientY);
    const onPointerUp = () => end();

    mobileIntroEl.addEventListener('pointerdown', onPointerDown, {passive:true, capture:true});
    mobileIntroEl.addEventListener('pointermove', onPointerMove, {passive:true, capture:true});
    mobileIntroEl.addEventListener('pointerup', onPointerUp, {passive:true, capture:true});
    mobileIntroEl.addEventListener('pointercancel', () => { active = false; end(); }, {passive:true, capture:true});

    // Touch fallback (oudere iOS)
    mobileIntroEl.addEventListener('touchstart', (e) => {
      if(!uitlegOn) return;
      const t = e.touches && e.touches[0];
      if(!t) return;
      start(t.clientX, t.clientY);
    }, {passive:true, capture:true});
    mobileIntroEl.addEventListener('touchmove', (e) => {
      const t = e.touches && e.touches[0];
      if(!t) return;
      move(t.clientX, t.clientY);
    }, {passive:true, capture:true});
    mobileIntroEl.addEventListener('touchend', (e) => {
      end();
    }, {passive:true, capture:true});

    // Extra: als je swipe start op de track zelf, vang die ook af (bubbelt niet altijd lekker bij momentum scroll)
    if(introTrackEl){
      introTrackEl.addEventListener('touchstart', (e) => {
        if(!uitlegOn) return;
        const t = e.touches && e.touches[0];
        if(!t) return;
        start(t.clientX, t.clientY);
      }, {passive:true, capture:true});
      introTrackEl.addEventListener('touchend', (e) => {
        end();
      }, {passive:true, capture:true});
    }
  }

  // (v3.3.7) sluiten gaat via:
  // - Uitleg-knop opnieuw (toggle)
  // - swipe omlaag op het uitleg-venster (mobiel)
  // - ESC / klik buiten de kaart / swipe omlaag in lightbox

  (async function init(){
    const res = await fetch(withV('questions.json'));
    const questions = await res.json();
    data = buildData(questions);
    filtered = data.slice();
    render(filtered);

    // uitleg-teksten (later invulbaar)
    try{
      const hr = await fetch(withV('uitleg-data.json'), { cache:'no-store' });
      helpData = await hr.json();
    }catch(e){
      helpData = {};
    }
  })();



window.closeLb = closeLb;


window.go = go;



// (v3.2) Geen extra "Uitleg/Verberg" header meer op mobiel.




/* ===============================
   v2.8 – Mobile uitleg-carousel vanuit JSON
   =============================== */
async function renderMobileIntro(){
  const section = document.getElementById('mobileIntro');
  const track = document.getElementById('introTrack');
  if(!section || !track) return;

  let data = null;
  try{
    const r = await fetch(withV('intro-data.json'), { cache:'no-store' });
    data = await r.json();
  }catch(e){
    return;
  }
  if(!data || !Array.isArray(data.slides)) return;

  // Build cards
  track.innerHTML = '';

  const slides = data.slides.slice();
  const realCount = slides.length;

  // helper om één kaart te bouwen
  const buildCard = (s) => {
    const art = document.createElement('article');
    art.className = 'introCard';
    art.dataset.intro = s.key || '';

    const wrap = document.createElement('div');
    wrap.className = 'introImgWrap';

    // Sluitknop op de hoek van het plaatje (bespaart ruimte)
    const close = document.createElement('button');
    close.className = 'introClose';
    close.type = 'button';
    close.setAttribute('aria-label', 'Sluiten');
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
    wrap.appendChild(close);

    const img = document.createElement('img');
    img.className = 'introImg';
    img.src = withV(s.img || '');
    img.alt = s.alt || s.title || '';
    wrap.appendChild(img);

    // Thema-naam in het midden van de kaart (alleen thema-kaarten, niet de voorkant)
    if((s.key || '') !== 'cover' && (s.title || '').trim()){
      const theme = document.createElement('div');
      theme.className = 'introTheme';
      theme.textContent = s.title;
      wrap.appendChild(theme);
    }

    const text = document.createElement('div');
    text.className = 'introText';

    const b = document.createElement('div');
    b.className = 'introTextBody';
    b.textContent = s.body || '';

    text.appendChild(b);

    art.appendChild(wrap);
    art.appendChild(text);
    return art;
  };

  // (Infinity scroll) clones aan beide kanten zodat je "oneindig" door kan swipen
  const CLONE_N = Math.min(2, realCount);
  if(realCount > 1){
    for(let i=realCount-CLONE_N; i<realCount; i++){
      const c = buildCard(slides[i]);
      c.dataset.clone = '1';
      track.appendChild(c);
    }
  }

  for(const s of slides){
    track.appendChild(buildCard(s));
  }

  if(realCount > 1){
    for(let i=0; i<CLONE_N; i++){
      const c = buildCard(slides[i]);
      c.dataset.clone = '1';
      track.appendChild(c);
    }
  }

  // Hint text (optional)
  const hintEl = section.querySelector('.introHint');
  if(hintEl && typeof data.hint === 'string') hintEl.textContent = data.hint;

  // Infinity scroll: na layout (widths bekend) scroll naar eerste echte item
  if(realCount > 1){
    requestAnimationFrame(() => {
      const firstReal = track.querySelectorAll('.introCard')[CLONE_N];
      if(!firstReal) return;
      const gap = 14; // gelijk aan CSS
      const step = firstReal.getBoundingClientRect().width + gap;
      let jumping = false;

      // Startpositie: op eerste echte kaart
      track.scrollLeft = step * CLONE_N;

      const onScroll = () => {
        if(jumping) return;
        const max = step * (realCount + CLONE_N);
        const min = step * (CLONE_N - 1);
        const x = track.scrollLeft;

        // Te ver naar links -> spring naar dezelfde positie achteraan
        if(x <= min){
          jumping = true;
          track.scrollLeft = x + step * realCount;
          requestAnimationFrame(() => { jumping = false; });
        }
        // Te ver naar rechts -> spring naar dezelfde positie vooraan
        else if(x >= max){
          jumping = true;
          track.scrollLeft = x - step * realCount;
          requestAnimationFrame(() => { jumping = false; });
        }
      };

      track.addEventListener('scroll', onScroll, { passive:true });
    });
  }
}

// Fire & forget after DOM is ready
document.addEventListener('DOMContentLoaded', () => { renderMobileIntro(); });




// SAFETY: close button delegation (v3.3.28)
document.addEventListener('click', (e) => {
  const closeEl = e.target && (e.target.closest ? e.target.closest('.close') : null);
  const lb = document.getElementById('lb');
  if (!lb) return;
  if (lb.classList.contains('open') && closeEl) {
    e.preventDefault();
    e.stopPropagation();
    try { closeLb(); } catch(_) {}
  }
}, true);

// CLOSE DELEGATION v3.3.32: als de overlay open is, sluit altijd bij tap op #close of .close
document.addEventListener('pointerdown', (e) => {
  const lb = document.getElementById('lb');
  if (!lb || !lb.classList.contains('open')) return;
  const closeEl = e.target && (e.target.closest ? e.target.closest('#close, .close') : null);
  if (!closeEl) return;
  e.preventDefault();
  e.stopPropagation();
  try { closeLb(); } catch(_) {}
}, true);
// CLOSE HANDLER v3.3.40 (betrouwbaar + conflictvrij)
function onClosePress(e){
  e.preventDefault();
  e.stopPropagation();
  if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  closeLb();
}
closeBtn.addEventListener('click', onClosePress, true);
closeBtn.addEventListener('pointerup', onClosePress, true);
// VERTICAL SWIPE CLOSE v3.3.40
(function(){
  const panel = document.querySelector('.panel');
  const lbEl = document.getElementById('lb');
  if(!panel || !lbEl) return;

  let startX=0, startY=0, dragging=false, locked=false, lockDir=null, activeId=null;
  const THRESH=90, MAX_DRAG=260;

  function resetPos(){
    panel.style.transition='transform 180ms ease';
    panel.style.transform='';
    setTimeout(()=>panel.style.transition='', 200);
  }

  function onDown(e){
    if(!lbEl.classList.contains('open')) return;
    if(e.target && e.target.closest && e.target.closest('#close')) return;
    activeId=e.pointerId;
    startX=e.clientX; startY=e.clientY;
    dragging=true; locked=false; lockDir=null;
    try{ panel.setPointerCapture(activeId); }catch(_){}
  }

  function onMove(e){
    if(!dragging || e.pointerId!==activeId) return;
    const dx=e.clientX-startX;
    const dy=e.clientY-startY;
    if(!locked && (Math.abs(dy)>8 || Math.abs(dx)>8)){
      locked=true;
      lockDir=(Math.abs(dy)>Math.abs(dx))?'v':'h';
    }
    if(lockDir!=='v') return;
    const down=Math.max(0,dy);
    const clamped=Math.min(MAX_DRAG,down);
    panel.style.transform='translateY(' + clamped + 'px)';
    e.preventDefault(); e.stopPropagation();
  }

  function onUp(e){
    if(!dragging || e.pointerId!==activeId) return;
    dragging=false;
    const dy=e.clientY-startY;
    if(lockDir==='v' && dy>THRESH){ closeLb(); }
    else resetPos();
    activeId=null;
  }

  panel.addEventListener('pointerdown', onDown, {passive:true});
  panel.addEventListener('pointermove', onMove, {passive:false});
  panel.addEventListener('pointerup', onUp, {passive:true});
  panel.addEventListener('pointercancel', onUp, {passive:true});
})();
