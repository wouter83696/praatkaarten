const VERSION = '2.5.1';
const withV = (u) => (u.includes('?') ? u + '&v=' + VERSION : u + '?v=' + VERSION);
const grid = document.getElementById('grid');
  const lb = document.getElementById('lb');
  const lbImg = document.getElementById('lbImg');
  const closeBtn = document.getElementById('close');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');

  const initial = Array.from(grid.children).map(n => n.outerHTML);

  function titleCase(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function applyThemes(){
    for(const btn of cards()){
      const src = btn.getAttribute('data-src')||'';
      const m = src.match(/cards\/([a-zA-ZÀ-ſ-]+?)(?:-\d+)?\.svg$/);
      if(!m) continue;
      const raw = m[1].split('-')[0];
      btn.dataset.theme = titleCase(raw);
    }
  }

  // init theme labels
  applyThemes();

  const canHover = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  let currentIndex = -1;
  let uiTimer = null;

  function cards(){
    return Array.from(grid.querySelectorAll('button.card'));
  }

  function showUI(){
    lb.classList.add('show-ui');
    clearTimeout(uiTimer);
    const hideMs = canHover ? 900 : 1100; // sneller weg, maar nog wel leesbaar
    uiTimer = setTimeout(() => lb.classList.remove('show-ui'), hideMs);
  }

  function openLbAt(index){
    const list = cards();
    currentIndex = ((index % list.length) + list.length) % list.length;
    lbImg.src = list[currentIndex].getAttribute('data-src');
    lb.classList.add('open');
    document.body.classList.add('lb-open');
    document.body.style.overflow = 'hidden';
    showUI();
  }

  function closeLb(){
    lb.classList.remove('open');
    lb.classList.remove('show-ui');
    document.body.classList.remove('lb-open');
    lbImg.src = '';
    document.body.style.overflow = '';
    currentIndex = -1;
  }

  function go(delta){
    if (currentIndex < 0) return;
    const total = filtered.length;
    let next = currentIndex + delta;
    if (next < 0) next = total - 1;
    if (next >= total) next = 0;
    openAt(next);
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('button.card');
    if(!btn) return;
    const list = cards();
    const idx = list.indexOf(btn);
    if(idx > -1) openLbAt(idx);
  });

  lb.addEventListener('click', (e) => { if(e.target === lb) closeLb(); });
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeLb(); });

  function shuffle(nodes){
    for(let i=nodes.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [nodes[i],nodes[j]]=[nodes[j],nodes[i]]; }
    return nodes;
  }
  document.getElementById('shuffle').addEventListener('click', () => {
    const nodes = Array.from(grid.children);
    shuffle(nodes);
    nodes.forEach(n => grid.appendChild(n));
    window.scrollTo({top:0, behavior:'smooth'});
  });
  document.getElementById('reset').addEventListener('click', () => {
    grid.innerHTML = initial.join('');
    applyThemes();
    window.scrollTo({top:0, behavior:'smooth'});
  });

  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); go(-1); });
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); go(1); });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if(!lb.classList.contains('open')) return;
    if(e.key === 'ArrowLeft') go(-1);
    if(e.key === 'ArrowRight') go(1);
  });

  // Swipe / drag overal (ook op de grijze achtergrond):
  // - links/rechts = vorige/volgende
  // - omlaag = sluiten
  let startX = 0, startY = 0, startT = 0;
  let pointerDown = false;

  lb.addEventListener('pointerdown', (e) => {
    if(!lb.classList.contains('open')) return;
    if(e.target.closest('.chev, .close')) return;
    pointerDown = true;
    startX = e.clientX;
    startY = e.clientY;
    startT = performance.now();
    lb.setPointerCapture?.(e.pointerId);
    showUI();
  });

  lb.addEventListener('pointerup', (e) => {
    if(!pointerDown) return;
    pointerDown = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const dt = performance.now() - startT;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);

    // snelle veeg of duidelijke afstand
    const fast = dt < 420;
    const thrX = fast ? 40 : 60;
    const thrY = fast ? 50 : 80;

    if(ay > ax && dy > thrY){
      closeLb();
      return;
    }
    if(ax > ay && ax > thrX){
      go(dx > 0 ? -1 : 1);
      return;
    }
  });

  // UI tonen bij interactie
  lb.addEventListener('mousemove', showUI);
  lb.addEventListener('pointermove', () => { if(!canHover) showUI(); });
