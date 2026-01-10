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
const VERSION = '3.3.10';
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
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');

  // Onderbalk: chips (v3.2)
  const shuffleBtn = document.getElementById('shuffleBtn');
  const uitlegBtn  = document.getElementById('uitlegBtn');
  const introCloseBtn = document.getElementById('introClose');
  // (v3.3.7) geen extra sluitknoppen in de pills
  const mobileIntroEl = document.getElementById('mobileIntro');
  const pillsDockEl = document.querySelector('.pillsDock');

  function updatePillsForIntro(){
    if(!pillsDockEl) return;
    if(!(uitlegOn && isMobile() && mobileIntroEl)){
      pillsDockEl.style.transform = 'translateY(0px)';
      return;
    }
    const sheetRect = mobileIntroEl.getBoundingClientRect();
    const baseTop = parseFloat(getComputedStyle(pillsDockEl).top) || 0;
    const pillsH = pillsDockEl.getBoundingClientRect().height || 42;
    const desiredTop = Math.max(8, sheetRect.top - 12 - pillsH);
    const dy = desiredTop - baseTop;
    pillsDockEl.style.transform = `translateY(${Math.round(dy)}px)`;
  }

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

      // na class-toggle even wachten op layout/transition
      requestAnimationFrame(() => {
        updatePillsForIntro();
        setTimeout(updatePillsForIntro, 60);
      });

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

  // Sluitknop rechtsboven ín het uitlegvenster (mobiel)
  if(introCloseBtn){
    introCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setUitleg(false);
    });
  }

  // Houd positie van de zwevende pills correct bij resize/rotatie
  window.addEventListener('resize', () => {
    if(uitlegOn && isMobile()){
      requestAnimationFrame(() => {
        updatePillsForIntro();
        setTimeout(updatePillsForIntro, 60);
      });
    }
  });

  // ===============================
  // v3.3.8 – Swipe omlaag om uitleg (bottom-sheet) te sluiten (mobiel)
  // - robuuster: luister capture + pointer events (iOS/Safari) + touch fallback
  // ===============================
  const introTrackEl  = document.getElementById('introTrack');
  if(mobileIntroEl){
    let sy = 0, sx = 0, active = false;

    const start = (x,y) => { sx = x; sy = y; active = true; };
    const end = (x,y) => {
      if(!active) return;
      active = false;
      if(!uitlegOn) return;
      const dy = y - sy;
      const dx = x - sx;
      const ay = Math.abs(dy);
      const ax = Math.abs(dx);
      // Duidelijke swipe omlaag: verticaal dominant + voldoende afstand
      if(ay > ax * 1.2 && dy > 85){
        setUitleg(false);
      }
    };

    // Pointer events (meest betrouwbaar, ook op moderne iOS)
    const onPointerDown = (e) => {
      if(!uitlegOn) return;
      // alleen primaire pointer
      if(e.isPrimary === false) return;
      start(e.clientX, e.clientY);
    };
    const onPointerUp = (e) => end(e.clientX, e.clientY);

    mobileIntroEl.addEventListener('pointerdown', onPointerDown, {passive:true, capture:true});
    mobileIntroEl.addEventListener('pointerup', onPointerUp, {passive:true, capture:true});
    mobileIntroEl.addEventListener('pointercancel', () => { active = false; }, {passive:true, capture:true});

    // Touch fallback (oudere iOS)
    mobileIntroEl.addEventListener('touchstart', (e) => {
      if(!uitlegOn) return;
      const t = e.touches && e.touches[0];
      if(!t) return;
      start(t.clientX, t.clientY);
    }, {passive:true, capture:true});
    mobileIntroEl.addEventListener('touchend', (e) => {
      const t = e.changedTouches && e.changedTouches[0];
      if(!t) return;
      end(t.clientX, t.clientY);
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
        const t = e.changedTouches && e.changedTouches[0];
        if(!t) return;
        end(t.clientX, t.clientY);
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

  // Sluitkruisje in de hoek van het kaartje (mobiel uitleg).
  // We herpositioneren de bestaande knop (#introClose) zodat hij boven de
  // rechterbovenhoek van de zichtbare slide hangt.
  const introCloseBtn = document.getElementById('introClose');
  let closeRaf = 0;
  const updateIntroClosePos = () => {
    if(!introCloseBtn) return;
    if(!document.body.classList.contains('show-intro')) return;

    const cards = track.querySelectorAll('.introCard .introImgWrap');
    if(!cards || !cards.length) return;

    const cx = window.innerWidth / 2;
    let best = null;
    let bestDist = Infinity;
    for(const el of cards){
      const r = el.getBoundingClientRect();
      // Skip offscreen kaarten
      if(r.right < 0 || r.left > window.innerWidth) continue;
      const mid = (r.left + r.right) / 2;
      const d = Math.abs(mid - cx);
      if(d < bestDist){ bestDist = d; best = r; }
    }
    if(!best) return;

    const pad = 8;
    const btn = introCloseBtn.getBoundingClientRect();
    const w = btn.width || 44;
    const h = btn.height || 44;

    const top = Math.max(pad, best.top + pad);
    const left = Math.min(window.innerWidth - w - pad, best.right - w - pad);
    introCloseBtn.style.top = `${Math.round(top)}px`;
    introCloseBtn.style.left = `${Math.round(left)}px`;
  };
  const scheduleIntroClosePos = () => {
    if(!introCloseBtn) return;
    if(closeRaf) return;
    closeRaf = requestAnimationFrame(() => {
      closeRaf = 0;
      updateIntroClosePos();
    });
  };

  // Houd de positie bij tijdens swipen/scrollen en bij resize.
  if(introCloseBtn){
    track.addEventListener('scroll', scheduleIntroClosePos, { passive:true });
    window.addEventListener('resize', scheduleIntroClosePos, { passive:true });
    window.addEventListener('orientationchange', scheduleIntroClosePos, { passive:true });
  }

  let data = null;
  try{
    const r = await fetch(withV('intro-data.json'), { cache:'no-store' });
    data = await r.json();
  }catch(e){
    return;
  }
  if(!data || !Array.isArray(data.slides)) return;

  const slides = data.slides.slice();
  if(!slides.length) return;

  const makeCard = (s) => {
    const art = document.createElement('article');
    art.className = 'introCard';
    art.dataset.intro = s.key || '';

    const wrap = document.createElement('div');
    wrap.className = 'introImgWrap';

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

  // Infinity-scroll: render 3x dezelfde set en start in het midden.
  // Bij "te ver" links/rechts springen we onzichtbaar terug naar het midden.
  track.innerHTML = '';
  for(let rep=0; rep<3; rep++){
    for(const s of slides){
      track.appendChild(makeCard(s));
    }
  }

  const positionToMiddle = () => {
    const oneSet = track.scrollWidth / 3;
    if(!isFinite(oneSet) || oneSet <= 0) return;
    track.scrollLeft = oneSet; // begin van de middelste set
  };

  // Wacht 1 tick zodat layout/afmetingen er zijn
  requestAnimationFrame(() => {
    positionToMiddle();
    setTimeout(positionToMiddle, 40);
    // Plaats het kruisje direct goed op de eerste zichtbare kaart
    scheduleIntroClosePos();
    setTimeout(scheduleIntroClosePos, 80);
  });

  let lock = false;
  track.addEventListener('scroll', () => {
    if(lock) return;
    const oneSet = track.scrollWidth / 3;
    if(!isFinite(oneSet) || oneSet <= 0) return;
    // thresholds rond de set-grenzen
    if(track.scrollLeft < oneSet * 0.35){
      lock = true;
      track.scrollLeft += oneSet;
      requestAnimationFrame(() => { lock = false; });
    }else if(track.scrollLeft > oneSet * 1.65){
      lock = true;
      track.scrollLeft -= oneSet;
      requestAnimationFrame(() => { lock = false; });
    }
  }, {passive:true});

  // Hint text (optional)
  const hintEl = section.querySelector('.introHint');
  if(hintEl && typeof data.hint === 'string') hintEl.textContent = data.hint;
}

// Fire & forget after DOM is ready
document.addEventListener('DOMContentLoaded', () => { renderMobileIntro(); });

