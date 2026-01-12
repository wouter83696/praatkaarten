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
const VERSION = '3.3.53';
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

  const closeBtn = document.getElementById('lbClose');
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

  // POSITION OVERLAY CLOSE (mobiel/desktop)
  // Zorg dat het kruisje (én de hitbox) altijd bovenop de kaart ligt.
  // Close knop (opnieuw geplaatst)
  const overlayClose = document.getElementById('lbClose');
  const overlayCloseHitbox = document.getElementById('lbCloseHitbox');
  function positionOverlayClose(){
    // In deze build staat het kruisje "vast" (position: fixed) rechtsboven in de viewport.
    // Dus we hoeven niets te positioneren via JS. (Dit voorkomt gezeik met transforms/gesture layers.)
    return;
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
  
  // ===============================
  // v3.3.47 – Init grid (portable)
  // - gebruikt embedded JSON (#questions-json) voor file://
  // - fallback: fetch ./questions.json voor hosting
  // - bouwt originele kaartjes (SVG achtergrond + tekst) zoals vóórheen
  // ===============================
  function readEmbeddedQuestions(){
    const el = document.getElementById('questions-json');
    if(!el) return null;
    try{ return JSON.parse(el.textContent); }catch(_e){ return null; }
  }

  async function loadQuestions(){
    const embedded = readEmbeddedQuestions();
    if(embedded) return embedded;
    // fallback via fetch (werkt op GitHub Pages / server)
    try{
      const r = await fetch('./questions.json', {cache:'no-store'});
      if(r.ok) return await r.json();
    }catch(_e){}
    return null;
  }

  (async function initGrid(){
    try{
      const q = await loadQuestions();
      if(!q){
        // laat debug tekst i.p.v. leeg
        if(grid) grid.innerHTML = '<div style="padding:24px;font-family:system-ui;">Kon vragen niet laden.</div>';
        return;
      }
      data = buildData(q);
      // start zonder shuffle
      render(data.slice());
    }catch(e){
      console.error(e);
      if(grid) grid.innerHTML = '<div style="padding:24px;font-family:system-ui;">Fout bij laden.</div>';
    }
  })();

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
  // Sluiten moet altijd werken (ook op mobiel waar 'click' soms niet afvuurt)
  closeBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeLb(); });
  closeBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeLb();
  }, {capture:true});

  // Extra (onzichtbare) hitbox naast/om het kruisje voor makkelijke bediening op telefoon
  if(overlayCloseHitbox){
    overlayCloseHitbox.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeLb(); });
    overlayCloseHitbox.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeLb();
    }, {capture:true});
  }
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
      // Mobiel: bottom-sheet (uitleg carousel)
      if(uitlegOn) openIntroSheet();
      else closeIntroSheet();
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
  // v3.3.50 – Mobile bottom-sheet gedrag (uitleg)
  // Eisen:
  // - Tijdens drag: sheet volgt vinger (geen opacity/fade/mee-bewegen UI)
  // - Animaties alleen bij loslaten
  // - Horizontaal swipen: licht (native scroll), Verticaal omlaag: zwaar met weerstand
  // - Drempel: onder = veer terug, boven = sluit onherroepelijk
  // - ✕ alleen zichtbaar als sheet volledig open & stabiel; verdwijnt bij drag-start
  // ===============================

  const introSheet = document.getElementById('mobileIntro');

  // ✕ gedrag tijdens horizontaal bladeren:
  // - bij horizontaal scrollen (links/rechts) mag het kruisje even wegfaden
  // - bij verticale drag blijft hij sowieso verborgen (dat regelen we via .is-stable)
  // - zodra het scrollen stopt komt hij weer netjes terug (fade)
  (function setupIntroCloseFadeOnXScroll(){
    const introTrack = document.getElementById('introTrack');
    if(!introSheet || !introTrack) return;
    let t = null;
    introTrack.addEventListener('scroll', () => {
      if(!document.body.classList.contains('show-intro')) return;
      introSheet.classList.add('x-scrolling');
      clearTimeout(t);
      t = setTimeout(() => introSheet.classList.remove('x-scrolling'), 220);
    }, {passive:true});
  })();
  let sheetAnim = null;

  function setSheetStable(stable){
    if(!introSheet) return;
    introSheet.classList.toggle('is-stable', !!stable);
  }

  function animateSheet(toY, {duration=160, overshoot=false} = {}){
    if(!introSheet) return;
    try{ sheetAnim?.cancel?.(); }catch(_e){}
    introSheet.style.transition = 'none';

    const from = getCurrentSheetY();
    const frames = overshoot
      ? [
          { transform: `translateY(${from}px)` },
          { transform: `translateY(${Math.min(-8, toY)}px)` },
          { transform: `translateY(${toY}px)` },
        ]
      : [
          { transform: `translateY(${from}px)` },
          { transform: `translateY(${toY}px)` },
        ];

    sheetAnim = introSheet.animate(frames, {
      duration,
      easing: 'cubic-bezier(.2,.9,.2,1)',
      fill: 'forwards'
    });
    sheetAnim.onfinish = () => {
      introSheet.style.transform = `translateY(${toY}px)`;
      sheetAnim = null;
    };
  }

  function getCurrentSheetY(){
    if(!introSheet) return 0;
    const t = getComputedStyle(introSheet).transform;
    if(!t || t === 'none') return 0;
    // matrix(a,b,c,d,tx,ty)
    const m = t.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,\s*([^)]+)\)/);
    if(m) return parseFloat(m[1]) || 0;
    // matrix3d(..., ty)
    const m3 = t.match(/matrix3d\((?:[^,]+,){13}\s*([^,]+)\s*\)/);
    if(m3) return parseFloat(m3[1]) || 0;
    return 0;
  }

  function openIntroSheet(){
    if(!introSheet) return;
    document.body.classList.add('show-intro');
    // Start net onder beeld
    introSheet.style.transform = 'translateY(103%)';
    setSheetStable(false);
    // Open in 120–180ms met mini-overshoot
    requestAnimationFrame(() => {
      animateSheet(0, {duration:160, overshoot:true});
      // Markeer als stabiel na de animatie
      setTimeout(() => setSheetStable(true), 170);
    });
  }

  function closeIntroSheet(){
    if(!introSheet) return;
    setSheetStable(false);
    // Sluiten iets sneller dan openen
    animateSheet(introSheet.getBoundingClientRect().height + 24, {duration:140, overshoot:false});
    // Na close: class weg (zodat layout/aria consistent is)
    setTimeout(() => {
      document.body.classList.remove('show-intro');
      introSheet.style.transform = 'translateY(103%)';
    }, 145);
  }

  // --- Drag gedrag ---
  (function setupIntroSheetDrag(){
    if(!introSheet) return;
    const introTrack = document.getElementById('introTrack');
    // Swipes starten vaak op de kaarten/track zelf.
    // Als we de gesture direct aan de track hangen kan (met touch-action/scroll-snap)
    // de browser de verticale beweging overnemen (dan krijg je 'scroll' i.p.v. sheet-drag).
    // Daarom luisteren we op de SHEET (capture), zodat we altijd de beweging zien.
    // Horizontaal bladeren blijft native via de track; verticaal (omlaag) claimen we pas na beslissing.
    const dragEl = introSheet;
    let down = false;
    let armed = false;
    let decided = false;
    let vertical = false;
    let sx=0, sy=0;
    let currentY = 0;
    let threshold = 160;
    let lockedClose = false;

    const DEAD = 14; // 10–15px: bijna geen beweging

    function startFrom(x, y, rawEvt){
      down = true;
      armed = true;
      decided = false;
      vertical = false;
      lockedClose = false;
      sx = x; sy = y;
      currentY = getCurrentSheetY();
      introSheet.style.transition = 'none';
      // ✕ verdwijnt pas bij verticale drag (beslissing), niet bij start
      // Maar tijdens een drag (vertical) zetten we 'stable' uit.
      try{ dragEl.setPointerCapture?.(rawEvt.pointerId); }catch(_e){}
    }

    function moveFrom(x, y, rawEvt){
      if(!down || !armed) return;
      const dx = x - sx;
      const dy = y - sy;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);

      if(!decided){
        if(ax < 12 && ay < 12) return;
        // Verticale intent wint bij lichte drift; horizontaal laten we native.
        if(ay > ax * 1.15 && dy > 0){
          decided = true;
          vertical = true;
          setSheetStable(false); // verberg ✕ (en fixeer UI)
          disableHorizontalScroll();
        }else if(ax > ay * 1.15){
          decided = true;
          vertical = false;
          setSheetStable(true);
          return;
        }else{
          // nog twijfel: niets doen
          return;
        }
      }

      if(!vertical) return;

      // Nu claimen we: geen page-scroll
      rawEvt && rawEvt.preventDefault && rawEvt.preventDefault();

      // Deadzone + weerstand
      let yDrag = Math.max(0, dy);
      if(yDrag <= DEAD){
        setY(0);
        return;
      }
      yDrag = DEAD + (yDrag - DEAD) * 0.55;

      // Drempel
      if(yDrag >= threshold){
        lockedClose = true;
        const over = yDrag - threshold;
        yDrag = threshold + over * 1.12; // lichte versnelling / snap
      }
      if(lockedClose) yDrag = Math.max(threshold, yDrag);

      setY(yDrag);
    }

    function endFrom(){
      if(!down) return;
      down = false;
      restoreHorizontalScroll();

      if(!decided || !vertical){
        setSheetStable(true);
        return;
      }

      const yNow = getCurrentSheetY();
      if(lockedClose || yNow >= threshold){
        setSheetStable(false);
        closeIntroSheet();
      }else{
        setSheetStable(false);
        // Snap back
        introSheet.style.transition = 'transform 180ms cubic-bezier(.2,.9,.2,1)';
        introSheet.style.transform = 'translateY(0px)';
        setTimeout(()=>setSheetStable(true), 190);
      }
    }

    function computeThreshold(){
      const h = Math.max(1, introSheet.getBoundingClientRect().height);
      // ~35% van sheet, met sane caps
      threshold = Math.max(120, Math.min(220, h * 0.35));
    }

    function setY(y){
      currentY = Math.max(0, y);
      introSheet.style.transform = `translateY(${currentY}px)`;
    }

    function resistance(d){
      // zwaar gevoel: eerst deadzone, daarna voelbaar meegeven
      const x = Math.max(0, d - DEAD);
      let y = x * 0.55;
      if(x > 220) y = 220 * 0.55 + (x - 220) * 0.25;
      return y;
    }

    function disableHorizontalScroll(){
      if(!introTrack) return;
      // tijdens verticale drag tijdelijk blokkeren zodat iOS/Android niet 'pakt' op horizontaal scrollen
      introTrack.dataset._ox = introTrack.style.overflowX || '';
      introTrack.style.overflowX = 'hidden';
      introTrack.dataset._ta = introTrack.style.touchAction || '';
      introTrack.style.touchAction = 'none';
    }
    function restoreHorizontalScroll(){
      if(!introTrack) return;
      if('_ox' in introTrack.dataset) introTrack.style.overflowX = introTrack.dataset._ox;
      if('_ta' in introTrack.dataset) introTrack.style.touchAction = introTrack.dataset._ta;
      delete introTrack.dataset._ox;
      delete introTrack.dataset._ta;
    }

    dragEl.addEventListener('pointerdown', (e) => {
      if(!document.body.classList.contains('show-intro')) return;
      if(e.target && e.target.closest && e.target.closest('button')) return;
      startFrom(e.clientX, e.clientY, e);
    }, {passive:true, capture:true});



    dragEl.addEventListener('pointermove', (e) => {
      moveFrom(e.clientX, e.clientY, e);
    }, {passive:false, capture:true});



    function release(){
      if(!down) return;
      down = false;
      restoreHorizontalScroll();
      if(!decided){
        // Geen drag: sheet blijft open
        setSheetStable(true);
        return;
      }
      if(!vertical){
        setSheetStable(true);
        return;
      }

      if(lockedClose || currentY >= threshold){
        // Onherroepelijk sluiten
        setSheetStable(false);
        closeIntroSheet();
        return;
      }
      // Altijd terugveren onder drempel
      animateSheet(0, {duration:150, overshoot:true});
      setTimeout(() => setSheetStable(true), 155);
    }

        dragEl.addEventListener('pointerup', (e)=>{ endFrom(); }, {passive:true, capture:true});

        dragEl.addEventListener('touchmove', (e) => {
      if(!tActive) return;
      const t = e.touches && e.touches[0];
      if(!t) return;
      moveFrom(t.clientX, t.clientY, e);
    }, {passive:false, capture:true});

    function touchRelease(){
      if(!tActive) return;
      tActive = false;
      release();
    }
        dragEl.addEventListener('touchend', (e)=>{ tActive=false; endFrom(); }, {passive:true, capture:true});
        dragEl.addEventListener('touchcancel', (e)=>{ tActive=false; endFrom(); }, {passive:true, capture:true});
  })(
    // Gestures vanuit de uitleg-iframe doorgeven (iOS/Safari: iframe slokt touch events op).
    window.addEventListener('message', (ev) => {
      try{
        if(!ev || !ev.data || ev.data.type !== 'PK_INTRO_GESTURE') return;
        if(ev.data.origin !== window.location.origin) return;
        if(!document.body.classList.contains('show-intro')) return;
        const phase = ev.data.phase;
        const x = ev.data.x || 0;
        const y = ev.data.y || 0;
        if(phase === 'start') startFrom(x, y, {pointerId:0});
        else if(phase === 'move') moveFrom(x, y, {preventDefault: ()=>{}});
        else if(phase === 'end') endFrom();
      }catch(_e){}
    }, {capture:true});

);

  // Swipe-down verwijderd voor stabiliteit (v3.3.42)

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
  const closeEl = e.target && (e.target.closest ? e.target.closest('.lbClose, .close') : null);
  const lb = document.getElementById('lb');
  if (!lb) return;
  if (lb.classList.contains('open') && closeEl) {
    e.preventDefault();
    e.stopPropagation();
    try { closeLb(); } catch(_) {}
  }
}, true);

// CLOSE DELEGATION v3.3.32: als de overlay open is, sluit altijd bij tap op #lbClose of .lbClose
document.addEventListener('pointerdown', (e) => {
  const lb = document.getElementById('lb');
  if (!lb || !lb.classList.contains('open')) return;
  const closeEl = e.target && (e.target.closest ? e.target.closest('#lbClose, .lbClose, .close') : null);
  if (!closeEl) return;
  e.preventDefault();
  e.stopPropagation();
  try { closeLb(); } catch(_) {}
}, true);


// KEIHARDE CLOSE FIX v3.3.38
(function(){
  const lb = document.getElementById('lb');
  const closeBtn = document.getElementById('lbClose');
  const closeHitbox = document.getElementById('lbCloseHitbox');
  const hud = document.getElementById('debugHud');
  if(!lb || !closeBtn || !closeHitbox) return;

  function setHud(t){ if(hud) hud.textContent = t; }
  function isDebug(){ return document.documentElement.classList.contains('debug-on'); }

  function positionCloseHitbox(){
    const r = closeBtn.getBoundingClientRect();
    closeHitbox.style.top = Math.round(r.top - 10) + 'px';
    closeHitbox.style.left = Math.round(r.left - 10) + 'px';
  }

  window.addEventListener('resize', positionCloseHitbox, {passive:true});
  window.addEventListener('scroll', positionCloseHitbox, {passive:true});

  let taps = 0, tmr = null;
  document.addEventListener('click', (e)=>{
    if(!lb.classList.contains('open')) return;
    if(e.target && e.target.closest && e.target.closest('#lbClose,#lbCloseHitbox')) return;
    taps++;
    clearTimeout(tmr);
    tmr = setTimeout(()=>{ taps=0; }, 500);
    if(taps>=3){
      document.documentElement.classList.toggle('debug-on');
      taps=0;
    }
  }, true);

  function forceClose(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    if(typeof closeLb === 'function') closeLb();
  }

  closeHitbox.addEventListener('pointerdown', forceClose, {capture:true});
  closeHitbox.addEventListener('click', forceClose, {capture:true});

  const obs = new MutationObserver(()=>{
    if(lb.classList.contains('open')) positionCloseHitbox();
  });
  obs.observe(lb, {attributes:true, attributeFilter:['class']});

  document.addEventListener('pointerdown', (e)=>{
    if(!lb.classList.contains('open') || !isDebug()) return;
    const el = e.target;
    const cls = el && el.className ? (typeof el.className === 'string' ? el.className : '[svg]') : '';
    setHud(
      'pointerdown\n' +
      'target: ' + (el ? el.tagName.toLowerCase() : '?') + (el && el.id ? '#'+el.id : '') + (cls ? '.'+String(cls).trim().replace(/\s+/g,'.') : '') + '\n' +
      'x,y: ' + Math.round(e.clientX) + ',' + Math.round(e.clientY)
    );
  }, true);
})();


/* ------------------------------------------------------------
   CLOSE (opnieuw opgebouwd)
   - Eén centrale binding voor #lbClose en #lbCloseHitbox
   - Backdrop tap sluit ook (buiten .panel)
------------------------------------------------------------ */
(function(){
  const lb = document.getElementById('lb');
  const closeBtn = document.getElementById('lbClose');
  const hit = document.getElementById('lbCloseHitbox');
  if(!lb) return;

  function hardClose(){
    lb.classList.remove('open','dragging','closing','is-dragging','is-swiping');
    lb.style.transform = '';
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.body.style.position = '';
    document.body.style.top = '';
  }

  function safeClose(e){
    if(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
    try{
      if(typeof closeLb === 'function'){
        closeLb();
        // Als closeLb door iets vroegtijdig stopt, val dan terug.
        setTimeout(()=>{ if(lb.classList.contains('open')) hardClose(); }, 0);
      } else {
        hardClose();
      }
    }catch(_){
      hardClose();
    }
  }

  [closeBtn, hit].forEach(el=>{
    if(!el) return;
    el.addEventListener('touchstart', safeClose, {capture:true, passive:false});
    el.addEventListener('pointerdown', safeClose, {capture:true});
    el.addEventListener('click', safeClose, {capture:true});
  });

  // Backdrop klik/tap sluit (maar niet binnen de kaart/panel)
  document.addEventListener('pointerdown', (e)=>{
    if(!lb.classList.contains('open')) return;
    const insidePanel = e.target && e.target.closest && e.target.closest('.panel');
    const isClose = e.target && e.target.closest && e.target.closest('#lbClose,#lbCloseHitbox');
    if(!insidePanel && !isClose) safeClose(e);
  }, true);
})();


/* v3.3.50 – Horizontaal swipen in de uitleg gebeurt native via scroll-snap.
   Geen JS-gestures nodig (houdt het licht, vloeiend en conflictvrij). */


/* v3.3.42 – Harde swipe reset */
function resetSwipe(){
  document.body.style.touchAction = '';
}

const _origClose = window.closeLb;
window.closeLb = function(){
  resetSwipe();
  if(_origClose) _origClose();
};
