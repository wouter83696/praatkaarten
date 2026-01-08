(async function(){
  const VERSION = '2.2';
  // Let op: deze uitleg draait in een iframe (helpModal) en gebruikt daarom absolute paden
  // naar je GitHub Pages submap.
  const BASE = "/praatkaarten";

  const withV = (url) => url + (url.includes('?') ? '&' : '?') + `v=${encodeURIComponent(VERSION)}`;

  const slides = [
    { key:"cover", src:withV(`${BASE}/voorkant.svg`), alt:"Voorkant" },
    { key:"verkennen", src:withV(`${BASE}/cards/verkennen.svg`), alt:"Verkennen" },
    { key:"duiden", src:withV(`${BASE}/cards/duiden.svg`), alt:"Duiden" },
    { key:"verbinden", src:withV(`${BASE}/cards/verbinden.svg`), alt:"Verbinden" },
    { key:"verdiepen", src:withV(`${BASE}/cards/verdiepen.svg`), alt:"Verhelderen" },
    { key:"vertragen", src:withV(`${BASE}/cards/vertragen.svg`), alt:"Vertragen" },
    { key:"bewegen", src:withV(`${BASE}/cards/bewegen.svg`), alt:"Bewegen" }
  ];

  let data = {};
  try{
    const res = await fetch(withV(`${BASE}/uitleg-data.json`), { cache:'no-store' });
    data = await res.json();
  }catch(e){
    data = {};
  }

  const stage = document.getElementById('stage');
  const cardShell = document.querySelector('.cardShell');
  const prevBtn = document.getElementById('prevSlide');
  const nextBtn = document.getElementById('nextSlide');
  const closeHelp = document.getElementById('closeHelp');
  const backLink = document.getElementById('backLink');
  const navHint = document.getElementById('navHint');
  if(!stage || !cardShell) return;

  // Nav hint (zelfde gedrag als hoofdpagina):
  // - Alleen voor touch/pen
  // - Eén keer per sessie
  let hintTimer = null;
  const HINT_KEY = 'pk_nav_hint_shown_uitleg';
  function showNavHint(){
    if(!navHint) return;
    document.body.classList.add('show-hint');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => document.body.classList.remove('show-hint'), 8000);
  }
  function maybeShowNavHintOnce(pointerType){
    if(pointerType === 'mouse') return;
    try{
      if(sessionStorage.getItem(HINT_KEY) === '1') return;
      sessionStorage.setItem(HINT_KEY,'1');
    }catch(_e){}
    showNavHint();
  }

  function getDesc(key){
    return ((data && data[key]) ? String(data[key]) : "").trim();
  }

  const track = document.createElement('div');
  track.className = 'slideTrack';
  stage.appendChild(track);

  slides.forEach((s)=>{
    const slide = document.createElement('div');
    slide.className = 'slide';

    const stageEl = document.createElement('div');
    stageEl.className = 'stage';

    const img = document.createElement('img');
    img.src = s.src;
    img.alt = s.alt;
    stageEl.appendChild(img);

    const meta = document.createElement('div');
    meta.className = 'meta';

    const desc = document.createElement('div');
    desc.className = 'desc';
    desc.textContent = getDesc(s.key);
    meta.appendChild(desc);

    slide.appendChild(stageEl);
    slide.appendChild(meta);
    track.appendChild(slide);
  });

  let index = 0;
  let startX=0, startY=0, startT=0, dx=0;
  let isDown=false, isSwiping=false;

  function syncCardShell(){
    const slide = track.children[index];
    if(!slide) return;
    const height = slide.getBoundingClientRect().height;
    if(height){
      cardShell.style.height = `${height}px`;
    }
    const stageEl = slide.querySelector('.stage');
    if(stageEl){
      const stageHeight = stageEl.getBoundingClientRect().height;
      if(stageHeight){
        cardShell.style.setProperty('--stage-center', `${stageHeight / 2}px`);
      }
    }
  }

  function snapTo(i){
    index = Math.max(0, Math.min(slides.length-1, i));
    const w = stage.getBoundingClientRect().width;
    track.style.transition = 'transform 240ms ease';
    track.style.transform = `translateX(${-index*w}px)`;
    syncCardShell();
  }

  function dragTo(px){
    const w = stage.getBoundingClientRect().width;
    track.style.transition = 'none';
    track.style.transform = `translateX(${(-index*w)+px}px)`;
  }

  function onResize(){
    const w = stage.getBoundingClientRect().width;
    track.style.transition = 'none';
    track.style.transform = `translateX(${-index*w}px)`;
    syncCardShell();
  }

  // Swipe overal in de uitleg (ook op de tekst) —
  // verticaal scrollen blijft gewoon mogelijk.
  const swipeRoot = document.querySelector('.viewer') || document.body;

  function isInsideControls(el){
    return !!el && (el.closest?.('.controlsBar') || el.closest?.('button') || el.closest?.('a'));
  }

  swipeRoot.addEventListener('pointerdown', (e)=>{
    if(isInsideControls(e.target)) return;
    maybeShowNavHintOnce(e.pointerType);
    isDown = true; isSwiping = false;
    startX = e.clientX; startY = e.clientY; startT = performance.now(); dx = 0;
    try{ swipeRoot.setPointerCapture(e.pointerId); }catch(_e){}
    track.style.transition = 'none';
  });

  swipeRoot.addEventListener('pointermove', (e)=>{
    if(!isDown) return;
    const moveX = e.clientX - startX;
    const moveY = e.clientY - startY;

    if(!isSwiping){
      if(Math.abs(moveX) > 8 && Math.abs(moveX) > Math.abs(moveY)){
        isSwiping = true;
      }else if(Math.abs(moveY) > 10){
        // verticaal: laat scrollen doorlopen
        isDown = false;
        try{ swipeRoot.releasePointerCapture(e.pointerId); }catch(_e){}
        return;
      }
    }

    if(isSwiping){
      dx = moveX;
      dragTo(dx);
      e.preventDefault();
    }
  }, { passive:false });

  swipeRoot.addEventListener('pointerup', (e)=>{
    if(!isDown) return;
    isDown = false;
    try{ swipeRoot.releasePointerCapture(e.pointerId); }catch(_e){}

    const w = stage.getBoundingClientRect().width;
    const threshold = Math.min(90, w * 0.18);

    if(isSwiping && Math.abs(dx) > threshold){
      snapTo(index + (dx < 0 ? 1 : -1));
    }else{
      // Tap-to-close op touch/pen (zelfde gedrag als de kaartjes lightbox)
      // Alleen als:
      // - het geen swipe was
      // - de beweging klein was
      // - de tik op de kaart/stage was (niet op de tekst)
      // - pointerType geen mouse is
      const dt = performance.now() - startT;
      const isTap = !isSwiping && Math.abs(dx) < 10 && dt < 350;
      const onStage = !!e.target?.closest?.('.stage');
      if(isTap && onStage && (e.pointerType === 'touch' || e.pointerType === 'pen')){
        requestClose();
        dx = 0; isSwiping = false;
        return;
      }
      snapTo(index);
    }
    dx = 0; isSwiping = false;
  });

  swipeRoot.addEventListener('pointercancel', ()=>{
    if(!isDown) return;
    isDown = false;
    snapTo(index);
    dx = 0; isSwiping = false;
  });

  // Desktop knoppen
  prevBtn?.addEventListener('click', ()=> snapTo(index-1));
  nextBtn?.addEventListener('click', ()=> snapTo(index+1));

  // Sluiten / terug:
  // - In modal (iframe): stuur bericht naar de parent
  // - Losse pagina: ga terug naar index
  function requestClose(){
    if(window.parent && window.parent !== window){
      window.parent.postMessage({type:'pk_close_help'}, '*');
      return;
    }
    window.location.href = '../index.html';
  }
  closeHelp?.addEventListener('click', requestClose);
  backLink?.addEventListener('click', (e)=>{
    // In modal is "Kaarten" logisch als sluiten
    if(window.parent && window.parent !== window){
      e.preventDefault();
      requestClose();
    }
  });

  // Toetsen (desktop)
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowLeft') snapTo(index-1);
    if(e.key === 'ArrowRight') snapTo(index+1);
    if(e.key === 'Escape') requestClose();
  });

  window.addEventListener('resize', onResize);

  onResize();
})();
