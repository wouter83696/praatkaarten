// uitleg.js (super minimal)
// Doel:
// - 1 SVG tonen in hetzelfde frame als het grid (img in cardInner)
// - uitlegtekst eronder tonen
// - volgende/vorige met pijlen
// Geen swipe/gesture, geen track/translate, geen extra effecten.

(function () {
  const VERSION = '3.7.1';
  const v = (url) => url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(VERSION);

  // uitleg/uitleg.html -> project root
  const BASE = '..';

  // set via query: uitleg.html?set=samenwerken
  const params = new URLSearchParams(location.search);
  const setName = (params.get('set') || 'samenwerken').trim() || 'samenwerken';
  const encSet = encodeURIComponent(setName);

  const imgEl = document.getElementById('uitlegImg');
  const kaartThemaEl = document.getElementById('kaartThema');
  const descEl = document.getElementById('desc');
  const themeEl = document.getElementById('uitlegTheme');
  const closeHelp = document.getElementById('closeHelp');
  const backLink = document.getElementById('backLink');
  const uitlegTextEl = document.querySelector('.uitlegText');
  const cardTapEl = document.querySelector('.uitlegCardInner');


  if (!imgEl || !descEl) return;

  const cardPath = (file) => `${BASE}/sets/${encSet}/cards/${file}`;
  const uitlegPath = `${BASE}/sets/${encSet}/uitleg.json`;

  const slides = [
    { key: 'cover',       src: v(cardPath('voorkant.svg')),     alt: 'Voorkant' },
    { key: 'verkennen',   src: v(cardPath('verkennen.svg')),    alt: 'Verkennen' },
    { key: 'duiden',      src: v(cardPath('duiden.svg')),       alt: 'Duiden' },
    { key: 'verbinden',   src: v(cardPath('verbinden.svg')),    alt: 'Verbinden' },
    { key: 'verhelderen', src: v(cardPath('verhelderen.svg')),  alt: 'Verhelderen' },
    { key: 'vertragen',   src: v(cardPath('vertragen.svg')),    alt: 'Vertragen' },
    { key: 'bewegen',     src: v(cardPath('bewegen.svg')),      alt: 'Bewegen' },
  ];

  let uitlegData = {};
  let index = 0;

  const prettifySetName = (s) => {
    return String(s || '')
      .replace(/[._-]+/g, ' ')
      .trim()
      .split(/\s+/)
      .map(w => w ? (w[0].toUpperCase() + w.slice(1)) : '')
      .join(' ');
  };

  const themeName = prettifySetName(setName);


  // --- Dominante kleur uit SVG -> rustige, lichte tint voor tekstvak ---
  const parseColorToRgb = (c) => {
    if (!c) return null;
    c = String(c).trim().toLowerCase();
    if (c === 'none' || c === 'transparent') return null;

    // hex
    let m = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) {
      let h = m[1];
      if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
      const r = parseInt(h.slice(0,2),16);
      const g = parseInt(h.slice(2,4),16);
      const b = parseInt(h.slice(4,6),16);
      return {r,g,b};
    }
    // rgb/rgba
    m = c.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const parts = m[1].split(',').map(x => x.trim());
      if (parts.length >= 3) {
        const r = Math.max(0, Math.min(255, parseFloat(parts[0])));
        const g = Math.max(0, Math.min(255, parseFloat(parts[1])));
        const b = Math.max(0, Math.min(255, parseFloat(parts[2])));
        return {r,g,b};
      }
    }
    return null;
  };

  const isNearWhite = ({r,g,b}) => (r>245 && g>245 && b>245);
  const isNearBlack = ({r,g,b}) => (r<10 && g<10 && b<10);

  const lighten = ({r,g,b}, amount=0.86) => {
    // amount: 0..1 -> meng met wit
    const lr = Math.round(r + (255 - r) * amount);
    const lg = Math.round(g + (255 - g) * amount);
    const lb = Math.round(b + (255 - b) * amount);
    return {r:lr, g:lg, b:lb};
  };

  const dominantColorFromSvgText = (svgText) => {
    if (!svgText) return null;
    const counts = new Map();

    const addColor = (raw) => {
      const rgb = parseColorToRgb(raw);
      if (!rgb) return;
      if (isNearWhite(rgb) || isNearBlack(rgb)) return; // negeer wit/zwart
      const key = `${rgb.r},${rgb.g},${rgb.b}`;
      counts.set(key, (counts.get(key)||0) + 1);
    };

    // attributes fill/stroke
    const attrRe = /(fill|stroke)\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = attrRe.exec(svgText)) !== null) {
      const val = m[2];
      if (!val || val.startsWith('url(')) continue;
      addColor(val);
    }

    // inline style: fill:#...; stroke:...
    const styleRe = /(fill|stroke)\s*:\s*([^;\}]+)\s*[;\}]/gi;
    while ((m = styleRe.exec(svgText)) !== null) {
      const val = m[2];
      if (!val || String(val).trim().startsWith('url(')) continue;
      addColor(val);
    }

    let best = null;
    let bestN = 0;
    for (const [k,n] of counts.entries()) {
      if (n > bestN) { bestN = n; best = k; }
    }
    if (!best) return null;
    const [r,g,b] = best.split(',').map(x=>parseInt(x,10));
    return {r,g,b};
  };

  const applyDominantTint = async (svgUrl) => {
    if (!uitlegTextEl) return;
    try {
      const res = await fetch(svgUrl, { cache: 'no-store' });
      const txt = await res.text();
      const dom = dominantColorFromSvgText(txt);
      if (!dom) {
        uitlegTextEl.style.background = '#F4F4F4';
        return;
      }
      const lite = lighten(dom, 0.88);
      uitlegTextEl.style.background = `rgb(${lite.r}, ${lite.g}, ${lite.b})`;
    } catch (e) {
      uitlegTextEl.style.background = '#F4F4F4';
    }
  };

  const getDesc = (key) => {
    const v = (uitlegData && typeof uitlegData === 'object') ? uitlegData[key] : '';
    return (v == null ? '' : String(v)).trim();
  };

  const render = () => {
    const s = slides[index];
    imgEl.src = s.src;
    imgEl.alt = s.alt;
    descEl.textContent = getDesc(s.key);
    applyDominantTint(s.src);

    // Themanaam midden op kaart (behalve voorkant)
    if (kaartThemaEl) {
      if (s.key === 'voorkant') {
        kaartThemaEl.textContent = '';
        kaartThemaEl.style.display = 'none';
      } else {
        kaartThemaEl.style.display = 'block';
        kaartThemaEl.textContent = s.alt || '';
      }
    }

    // Thema tonen op alle kaarten behalve de voorkant
    if (themeEl) {
      if (s.key === 'cover') {
        themeEl.style.display = 'none';
        themeEl.textContent = '';
      } else {
        themeEl.textContent = themeName;
        themeEl.style.display = 'inline-block';
      }
    }
  };

  const go = (delta) => {
    index = Math.max(0, Math.min(slides.length - 1, index + delta));
    render();
  };

  const requestClose = () => {
    // In iframe/modal: vraag parent om te sluiten
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'pk_close_help' }, '*');
      return;
    }
    location.href = '../index.html';
  };

  // Data laden (mag falen; SVG moet sowieso al werken)
  fetch(v(uitlegPath), { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : {}))
    .then((json) => { uitlegData = json || {}; render(); })
    .catch(() => { uitlegData = {}; render(); });
  // UI
  if (closeHelp) closeHelp.addEventListener('click', requestClose);


  // Navigatie zonder pijltjes: tik links/rechts op de kaart
  if (cardTapEl) {
    cardTapEl.addEventListener('click', (e) => {
      const rect = cardTapEl.getBoundingClientRect();
      const x = (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 0);
      const rel = x - rect.left;
      if (rel < rect.width * 0.5) go(-1);
      else go(1);
    });
  }

  if (backLink) {
    backLink.addEventListener('click', (e) => {
      if (window.parent && window.parent !== window) {
        e.preventDefault();
        requestClose();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'Escape') requestClose();
  });
})();


/* ---- v3.7.1.8 patch: map uitleg.json keys + apply dominant tint ---- */
function fileKey(file){
  var f = String(file||'').toLowerCase();
  if(f.indexOf('voorkant') !== -1) return 'cover';
  f = f.replace('.svg','');
  return f; // verkennen, duiden, ...
}

function setDescText(text){
  if(descEl) descEl.textContent = text || '';
}

function setThemeLabel(file){
  if(!themaEl) return;
  var f = String(file||'').toLowerCase();
  if(f.indexOf('voorkant') !== -1){
    themaEl.style.display = 'none';
  }else{
    themaEl.style.display = 'block';
    themaEl.textContent = (fileKey(file) || '').charAt(0).toUpperCase() + (fileKey(file)||'').slice(1);
  }
}

function setCard(file, text){
  if(imgEl) imgEl.src = cardUrl(file) + (cardUrl(file).indexOf('?')===-1?'?':'&') + 'v=3.7.1.8';
  setDescText(text);
  setThemeLabel(file);
  applyTintFromSVG(file);
}

// override init: load uitleg.json then show voorkant with cover text
function init(){
  // Remove arrows if any accidentally exist
  var arrows = document.querySelectorAll('.navArrow, .arrow, .navBtn');
  for(var i=0;i<arrows.length;i++) arrows[i].style.display='none';

  loadUitleg().then(function(data){
    var file = pickDefaultCard();
    var key = fileKey(file);
    var text = '';
    if(data && typeof data === 'object' && !Array.isArray(data)){
      text = data[key] || '';
    }else if(typeof data === 'string'){
      text = data;
    }
    setCard(file, text);
  }).catch(function(){
    setCard(pickDefaultCard(), '');
  });
}
/* ---- end patch ---- */

