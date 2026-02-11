/* Praatkaartjes – minimale, stabiele grid + lightbox (v3.7.1)
   - Geen overbodige JS
   - Geen kruisje: sluiten door buiten de kaart te tikken of ESC
   - Grid is foolproof via inline JSON (#questions-json)
*/

(function(){
  'use strict';

  const VERSION = '3.7.1';
  const THEMES = ["verkennen","duiden","verbinden","verhelderen","vertragen","bewegen"];

  // Elements
  const grid = document.getElementById('grid');
  const lb = document.getElementById('lb');
  const panel = lb ? lb.querySelector('.panel') : null;
  const lbImg = document.getElementById('lbImg');
  const lbText = document.getElementById('lbText');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const uitlegBtn = document.getElementById('uitlegBtn');

  if(!grid){
    console.error('Grid element #grid ontbreekt.');
    return;
  }

  // Active set (default: samenwerken)
  function getActiveSet(){
    try{
      const sp = new URL(location.href).searchParams;
      const s = (sp.get('set') || 'samenwerken').trim();
      return s || 'samenwerken';
    }catch(_e){
      return 'samenwerken';
    }
  }

  const ACTIVE_SET = getActiveSet();
  const SET_BASE = `sets/${ACTIVE_SET}/`;
  const CARD_BASE = `${SET_BASE}cards/`;

  const withV = (url) => url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(VERSION);

  function cardUrl(theme){
    return withV(`${CARD_BASE}${theme}.svg`);
  }

  function showGridError(msg){
    grid.innerHTML = `<div style="padding:24px;font-family:system-ui;">${msg}</div>`;
  }

  async function loadQuestions(){
    // 1) Inline JSON (foolproof)
    try{
      const el = document.getElementById('questions-json');
      if(el && el.textContent && el.textContent.trim()){
        const parsed = JSON.parse(el.textContent);
        if(parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      }
    }catch(_e){ /* ignore */ }

    // 2) Fallback: set JSON
    try{
      const r = await fetch(withV(`${SET_BASE}questions.json`), { cache:'no-store' });
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const parsed = await r.json();
      if(parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    }catch(e){
      console.error('Kon vragenlijst niet laden:', e);
    }
    return {};
  }

  function buildData(questions){
    const out = [];
    for(const theme of THEMES){
      const qs = Array.isArray(questions[theme]) ? questions[theme] : [];
      for(let i=0; i<qs.length; i++){
        out.push({
          theme,
          num: i + 1,
          q: String(qs[i]),
          bg: cardUrl(theme),
          id: `${theme}-${String(i+1).padStart(2,'0')}`
        });
      }
    }
    return out;
  }

  function fisherYates(arr){
    const a = arr.slice();
    for(let i=a.length-1; i>0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // State
  let data = [];
  let current = [];
  let currentIndex = 0;

  function render(items){
    current = items;
    grid.innerHTML = '';
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
      img.alt = '';

      const q = document.createElement('div');
      q.className = 'q';
      const qText = document.createElement('span');
      qText.className = 'qText';
      qText.textContent = item.q;
      q.appendChild(qText);

      inner.appendChild(img);
      inner.appendChild(q);
      btn.appendChild(inner);

      btn.addEventListener('click', () => openAt(idx));
      frag.appendChild(btn);
    });

    grid.appendChild(frag);
  }

  function openAt(idx){
    if(!lb || !panel || !lbImg || !lbText) return;
    currentIndex = ((idx % current.length) + current.length) % current.length;

    const item = current[currentIndex];
    lbImg.src = item.bg;
    lbText.textContent = item.q;

    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  function closeLb(){
    if(!lb) return;
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  function step(delta){
    if(!current.length) return;
    openAt(currentIndex + delta);
  }

  // Controls
  shuffleBtn?.addEventListener('click', () => {
    if(!data.length) return;
    render(fisherYates(data));
  });

  uitlegBtn?.addEventListener('click', () => {
    location.href = `uitleg/uitleg.html?set=${encodeURIComponent(ACTIVE_SET)}`;
  });

  prevBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); step(-1); });
  nextBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); step(+1); });

  // Close by clicking outside the panel
  lb?.addEventListener('pointerdown', (e) => {
    if(!lb.classList.contains('open')) return;
    const inside = e.target && (e.target.closest ? e.target.closest('.panel') : null);
    if(!inside){
      e.preventDefault();
      closeLb();
    }
  });

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if(!lb || !lb.classList.contains('open')) return;
    if(e.key === 'Escape') closeLb();
    if(e.key === 'ArrowLeft') step(-1);
    if(e.key === 'ArrowRight') step(+1);
  });

  // Init
  (async function init(){
    try{
      const q = await loadQuestions();
      data = buildData(q);
      if(!data.length){
        showGridError('Geen kaarten gevonden (vragenlijst leeg).');
        return;
      }
      render(data);
    }catch(e){
      console.error(e);
      showGridError('Fout bij laden.');
    }
  })();

})();
