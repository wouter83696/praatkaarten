const THEMES = ["verkennen","verbinden","bewegen","duiden","verdiepen","vertragen"];

  const grid = document.getElementById('grid');
  const lb = document.getElementById('lb');
  const lbImg = document.getElementById('lbImg');
  const lbText = document.getElementById('lbText');
  const lbCard = document.getElementById('lbCard');
  const themeTag = document.getElementById('themeTag');

  const closeBtn = document.getElementById('close');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');

  const shuffleBtn = document.getElementById('shuffle');
  const resetBtn = document.getElementById('reset');

  let data = [];       // full list
  let filtered = [];   // current order
  let currentIndex = -1;

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

    prevBtn.disabled = currentIndex <= 0;
    nextBtn.disabled = currentIndex >= filtered.length - 1;
  }

  function closeLb(){
    lb.setAttribute('aria-hidden','true');
    lb.classList.remove('open');
    document.body.classList.remove('lb-open');
    lbImg.src = "";
    lbText.textContent = "";
    currentIndex = -1;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  // Swipe / drag overal (ook op de grijze achtergrond):
  // - links/rechts: vorige/volgende
  // - omlaag: sluiten
  let startX = 0, startY = 0, startT = 0;
  let pointerDown = false;
  let gestureArmed = false;

  lb.addEventListener('pointerdown', (e) => {
    if(!lb.classList.contains('open')) return;
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

  lb.addEventListener('pointerup', (e) => {
    if(!pointerDown) return;
    pointerDown = false;
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

  function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  }

  // events (iconen op de kaart)
  // Belangrijk: klikken op de kaart (of knoppen) mag nooit als "klik op achtergrond" tellen (Firefox/Safari).
  lbCard.addEventListener('click', (e) => e.stopPropagation());
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeLb(); });
  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); go(-1); showUI(); });
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); go(1); showUI(); });

  lb.addEventListener('mousemove', showUI);
  lb.addEventListener('touchstart', showUI, {passive:true});
  lb.addEventListener('click', (e) => { if(e.target === lb) closeLb(); else showUI(); });

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


// ===== INSTRUCTION FADE (phone portrait only) =====
(function(){
  let done = false;
  function isPhonePortrait(){
    return window.matchMedia &&
      window.matchMedia('(hover: none) and (pointer: coarse) and (orientation: portrait)').matches;
  }
  function run(){
    if(done) return;
    if(!isPhonePortrait()) return;
    const hint = document.querySelector('.controlsBar .help');
    if(!hint) return;
    setTimeout(()=>hint.classList.add('is-hidden'), 3500);
    done = true;
  }
  window.addEventListener('load', run, { once:true });
})();
