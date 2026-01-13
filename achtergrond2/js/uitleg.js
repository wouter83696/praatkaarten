(() => {
  const VERSION = '3.8.5';
  const withV = (url) => url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(VERSION);

  // Root = één niveau omhoog vanaf /uitleg/
  const ROOT = new URL('../', window.location.href);

  function getSetId(){
    try{
      const sp = new URL(window.location.href).searchParams;
      const own = (sp.get('set') || '').trim();
      if(own) return own;

      if (window.parent && window.parent !== window){
        const psp = new URL(window.parent.location.href).searchParams;
        const parentSet = (psp.get('set') || '').trim();
        if(parentSet) return parentSet;
      }
    }catch(_e){}
    return 'samenwerken';
  }

  const SET_ID = getSetId();

  const stage = document.getElementById('stage');
  const descEl = document.getElementById('desc');
  const prevBtn = document.getElementById('prevSlide');
  const nextBtn = document.getElementById('nextSlide');
  const closeHelp = document.getElementById('closeHelp');
  const backLink = document.getElementById('backLink');
  const navHint = document.getElementById('navHint');
  if(!stage || !descEl) return;

  async function fetchJson(url){
    const r = await fetch(withV(url), { cache:'no-store' });
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function loadUitleg(){
    try{
      return await fetchJson(new URL(`sets/${SET_ID}/uitleg.json`, ROOT).toString());
    }catch(_e){
      return {};
    }
  }

  function cardUrl(name){
    return withV(new URL(`sets/${SET_ID}/cards/${name}.svg`, ROOT).toString());
  }

  const slides = [
    { key:"cover",       src: cardUrl('voorkant'),    alt:"Voorkant" },
    { key:"verkennen",   src: cardUrl('verkennen'),   alt:"Verkennen" },
    { key:"duiden",      src: cardUrl('duiden'),      alt:"Duiden" },
    { key:"verbinden",   src: cardUrl('verbinden'),   alt:"Verbinden" },
    { key:"verhelderen", src: cardUrl('verhelderen'), alt:"Verhelderen" },
    { key:"vertragen",   src: cardUrl('vertragen'),   alt:"Vertragen" },
    { key:"bewegen",     src: cardUrl('bewegen'),     alt:"Bewegen" }
  ];

  // Opbouw: kaart-shell (mask) + art als background-image
  const track = document.createElement('div');
  track.className = 'pkSlideTrack';
  stage.appendChild(track);

  slides.forEach((s)=>{
    const slide = document.createElement('div');
    slide.className = 'pkSlide';
    slide.innerHTML = `
      <div class="pkCardPreview" role="img" aria-label="${s.alt}">
        <div class="pkCardArt" style="background-image:url('${s.src}')"></div>
      </div>
    `;
    track.appendChild(slide);
  });

  let index = 0;
  let data = {};
  let startX=0, startY=0, startT=0, dx=0;
  let isDown=false, isSwiping=false;

  function getDesc(key){
    return ((data && data[key]) ? String(data[key]) : "").trim();
  }

  function renderMeta(){
    const s = slides[index];
    descEl.textContent = getDesc(s.key);
  }

  function snapTo(i){
    index = Math.max(0, Math.min(slides.length-1, i));
    const w = stage.getBoundingClientRect().width;
    track.style.transition = 'transform 240ms ease';
    track.style.transform = `translateX(${-index*w}px)`;
    renderMeta();
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
  }

  // Nav hint: 1x per sessie, alleen touch/pen
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

  prevBtn?.addEventListener('click', ()=> snapTo(index-1));
  nextBtn?.addEventListener('click', ()=> snapTo(index+1));

  function requestClose(){
    if(window.parent && window.parent !== window){
      window.parent.postMessage({type:'pk_close_help'}, '*');
      return;
    }
    window.location.href = new URL(`index.html?set=${encodeURIComponent(SET_ID)}`, ROOT).toString();
  }

  closeHelp?.addEventListener('click', requestClose);

  backLink?.addEventListener('click', (e)=>{
    e.preventDefault();
    requestClose();
  });

  document.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowLeft') snapTo(index-1);
    if(e.key === 'ArrowRight') snapTo(index+1);
    if(e.key === 'Escape') requestClose();
  });

  window.addEventListener('resize', onResize);

  // Init
  loadUitleg().then((d)=>{
    data = d || {};
    renderMeta();
  });
  onResize();
})();