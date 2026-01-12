// Praatkaarten – Mobile-only rebuild
// Version: 3.4.1 (rebuild start)

const VERSION = '3.4.1';

// ===============================
// Pad-resolutie: werkt in elke directory op GitHub Pages
// ===============================
function getRepoRoot(){
  const p = location.pathname;
  // als we op /praatkaarten/... zitten, pak /praatkaarten/
  const m = p.match(/^(\/[^\/]+\/)/);
  return (m && m[1]) ? m[1] : '/';
}

const withV = (u) => (u.includes('?') ? `${u}&v=${VERSION}` : `${u}?v=${VERSION}`);

async function fetchJsonSmart(relPath){
  // 1) lokaal relatief
  try {
    const r1 = await fetch(withV(relPath), {cache:'no-store'});
    if(r1.ok) return await r1.json();
  } catch(_e){}

  // 2) repo root (GitHub Pages subpath)
  try {
    const root = getRepoRoot();
    const url = root + relPath.replace(/^\//,'');
    const r2 = await fetch(withV(url), {cache:'no-store'});
    if(r2.ok) return await r2.json();
  } catch(_e){}

  throw new Error(`Kan JSON niet laden: ${relPath}`);
}

// ===============================
// Grid (mobile)
// ===============================
const grid = document.getElementById('grid');
const shuffleBtn = document.getElementById('shuffleBtn');
const uitlegBtn = document.getElementById('uitlegBtn');

let items = [];

function shuffleInPlace(arr){
  for(let i=arr.length-1;i>0;i--) {
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

// ===============================
// Clean Mobile uitleg-sheet (bottom-sheet + drag)
// ===============================
const introSheet = document.getElementById('mobileIntro');
const introTrack = document.getElementById('introTrack');
const introCloseBtn = document.getElementById('introClose');

let sheetOpen = false;
let dragging = false;
let decidedDir = null; // null | 'v' | 'h'
let startX = 0, startY = 0;
let currentY = 0;
let threshold = 140;
let lockedClose = false;
let restoreOx = '';

const DEADZONE = 14;
const V_RATIO  = 1.15;
const RESIST   = 0.55;
const OPEN_MS  = 165;
const CLOSE_MS = 150;
const EASE     = 'cubic-bezier(.2,.9,.2,1)';

function computeThreshold(){
  const vh = window.innerHeight || 700;
  const sh = introSheet ? Math.max(1, introSheet.getBoundingClientRect().height) : vh;
  threshold = Math.max(120, Math.round(vh * 0.22), Math.round(sh * 0.25));
}

function setSheetY(px){
  if(!introSheet) return;
  introSheet.style.transform = `translateY(${Math.max(0, px)}px)`;
}

function getSheetY(){
  if(!introSheet) return 0;
  const t = getComputedStyle(introSheet).transform;
  if(!t || t === 'none') return 0;
  const m = t.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,\s*([^)]+)\)/);
  if(m) return parseFloat(m[1]) || 0;
  return 0;
}

function setCrossVisible(on){
  if(!introCloseBtn) return;
  introCloseBtn.style.transition = 'opacity 150ms ease-out';
  introCloseBtn.style.opacity = on ? '1' : '0';
  introCloseBtn.style.pointerEvents = on ? 'auto' : 'none';
}

function setStableOpenState(){
  setCrossVisible(true);
  document.body.classList.remove('intro-dragging');
}

function setDraggingState(){
  setCrossVisible(false);
  document.body.classList.add('intro-dragging');
}

function openIntroSheet(){
  if(!introSheet) return;
  sheetOpen = true;
  computeThreshold();

  document.body.classList.add('show-intro');
  introSheet.classList.add('is-open');

  setCrossVisible(false);

  const offY = Math.round(window.innerHeight * 1.03);
  introSheet.style.transition = 'none';
  setSheetY(offY);

  requestAnimationFrame(() => {
    introSheet.style.transition = `transform ${OPEN_MS}ms ${EASE}`;
    setSheetY(-8);
    requestAnimationFrame(() => setSheetY(0));
    setTimeout(() => setStableOpenState(), OPEN_MS + 20);
  });
}

function closeIntroSheet(){
  if(!introSheet) return;
  sheetOpen = false;

  setCrossVisible(false);
  document.body.classList.remove('intro-dragging');

  const current = getSheetY();
  const offY = Math.max(
    Math.round(window.innerHeight * 1.03),
    Math.round(current + 40)
  );

  introSheet.style.transition = `transform ${CLOSE_MS}ms ${EASE}`;
  setSheetY(offY);

  setTimeout(() => {
    document.body.classList.remove('show-intro');
    introSheet.classList.remove('is-open');
    introSheet.style.transition = 'none';
    setSheetY(offY);
  }, CLOSE_MS + 25);
}

function toggleIntro(){
  if(sheetOpen) closeIntroSheet();
  else openIntroSheet();
}

if(uitlegBtn) uitlegBtn.addEventListener('click', (e) => { e.preventDefault(); toggleIntro(); }, {passive:true});
if(introCloseBtn) introCloseBtn.addEventListener('click', (e) => { e.preventDefault(); closeIntroSheet(); }, {passive:true});

function lockTrackScroll(){
  if(!introTrack) return;
  restoreOx = introTrack.style.overflowX || '';
  introTrack.style.overflowX = 'hidden';
}
function unlockTrackScroll(){
  if(!introTrack) return;
  introTrack.style.overflowX = restoreOx;
  restoreOx = '';
}

function onStart(ev){
  if(!sheetOpen || !introSheet) return;
  const p = ev.touches ? ev.touches[0] : ev;
  dragging = true;
  decidedDir = null;
  lockedClose = false;
  currentY = 0;
  startX = p.clientX;
  startY = p.clientY;
  computeThreshold();
}

function onMove(ev){
  if(!dragging || !sheetOpen || !introSheet) return;
  const p = ev.touches ? ev.touches[0] : ev;
  const dx = p.clientX - startX;
  const dy = p.clientY - startY;

  const ax = Math.abs(dx);
  const ay = Math.abs(dy);

  if(!decidedDir){
    if(ax < DEADZONE && ay < DEADZONE) return;
    if(ay > ax * V_RATIO && dy > 0){
      decidedDir = 'v';
      setDraggingState();
      lockTrackScroll();
    }else if(ax > ay * V_RATIO){
      decidedDir = 'h';
      return;
    }else{
      return;
    }
  }

  if(decidedDir !== 'v') return;

  ev.preventDefault();

  let y = Math.max(0, dy - DEADZONE);
  y = y * RESIST;

  if(!lockedClose && y > threshold) lockedClose = true;
  if(lockedClose){
    const over = y - threshold;
    y = threshold + over * 1.15;
    y = Math.max(threshold, y);
  }

  currentY = y;
  introSheet.style.transition = 'none';
  setSheetY(y);
}

function onEnd(){
  if(!dragging) return;
  dragging = false;

  if(decidedDir !== 'v'){
    setStableOpenState();
    return;
  }

  unlockTrackScroll();
  document.body.classList.remove('intro-dragging');

  if(lockedClose || currentY >= threshold){
    closeIntroSheet();
    return;
  }

  introSheet.style.transition = `transform 150ms ${EASE}`;
  setSheetY(0);
  setTimeout(() => setStableOpenState(), 170);
}

if(introSheet){
  introSheet.addEventListener('pointerdown', onStart, {capture:true, passive:true});
  window.addEventListener('pointermove', onMove, {capture:true, passive:false});
  window.addEventListener('pointerup', onEnd, {capture:true, passive:true});

  introSheet.addEventListener('touchstart', onStart, {capture:true, passive:true});
  window.addEventListener('touchmove', onMove, {capture:true, passive:false});
  window.addEventListener('touchend', onEnd, {capture:true, passive:true});
  window.addEventListener('touchcancel', onEnd, {capture:true, passive:true});
}
window.addEventListener('resize', computeThreshold);

// ===============================
// Data load
// ===============================
(async function init(){
  try {
    const q = await fetchJsonSmart('questions.json');
    // questions.json verwacht: { themes: [..], questions: {theme:[]} } of vergelijkbaar.
    // We nemen een defensieve benadering: als het een array is -> direct items.
    let built = [];
    if(Array.isArray(q)) {
      built = q;
    } else {
      // probeer bestaande structuur te volgen
      const themes = q.themes || q.kopjes || q.categories || [];
      const qmap = q.questions || q.vragen || q.items || {};
      const order = themes.length ? themes : Object.keys(qmap);
      order.forEach((themeKey) => {
        const qs = qmap[themeKey] || [];
        qs.forEach((text, i) => {
          built.push({
            theme: themeKey,
            num: i+1,
            q: text,
            bg: withV(`cards/${themeKey}.svg`)
          });
        });
      });
    }
    items = built;
    render(items);
  } catch(e) {
    console.error(e);
  }
})();

// ===============================
/*


// ===============================
// Intro carousel vullen (uitleg kaarten)
// ===============================
async function renderMobileIntro(){
  const track = document.getElementById('introTrack');
  if(!track) return;

  let data;
  try {
    // voorkeur: uitleg-data.json, anders intro-data.json
    try { data = await fetchJsonSmart('uitleg-data.json'); }
    catch(_e){ data = await fetchJsonSmart('intro-data.json'); }
  } catch(e){
    console.error('Kon uitlegdata niet laden', e);
    return;
  }

  // verwacht: { slides: [ {title, desc, img}, ... ] } of array
  const slides = Array.isArray(data) ? data : (data.slides || data.items || []);

  track.innerHTML = '';
  const frag = document.createDocumentFragment();

  slides.forEach((s) => {
    const card = document.createElement('div');
    card.className = 'introCard';

    const img = document.createElement('img');
    img.className = 'introImg';
    img.alt = '';
    img.draggable = false;
    img.src = withV(s.img || s.src || s.image || '');

    const t = document.createElement('div');
    t.className = 'introTitle';
    t.textContent = s.title || s.kop || s.heading || '';

    const d = document.createElement('div');
    d.className = 'introDesc';
    d.textContent = s.desc || s.tekst || s.text || '';

    card.appendChild(img);
    card.appendChild(t);
    card.appendChild(d);
    frag.appendChild(card);
  });

  track.appendChild(frag);

  // cross-fade (optioneel): fade ✕ tijdens horizontaal scrollen
  let fadeTimer = null;
  track.addEventListener('scroll', () => {
    setCrossVisible(false);
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => {
      if(sheetOpen && !document.body.classList.contains('intro-dragging')) setCrossVisible(true);
    }, 120);
  }, {passive:true});
}

document.addEventListener('DOMContentLoaded', () => {
  renderMobileIntro();
});

