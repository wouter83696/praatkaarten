(async function(){
  const slides = [
    { key:"cover", title:"Samen onderzoeken", src:"../voorkant.svg", overlayTitle:true },
    { key:"verkennen", title:"Verkennen", src:"../cards/verkennen.svg", overlayTitle:true },
    { key:"duiden", title:"Duiden", src:"../cards/duiden.svg", overlayTitle:true },
    { key:"verbinden", title:"Verbinden", src:"../cards/verbinden.svg", overlayTitle:true },
    { key:"verdiepen", title:"Verhelderen", src:"../cards/verdiepen.svg", overlayTitle:true },
    { key:"vertragen", title:"Vertragen", src:"../cards/vertragen.svg", overlayTitle:true },
    { key:"bewegen", title:"Bewegen", src:"../cards/bewegen.svg", overlayTitle:true }
  ];

  let data = {};
  try{
    const res = await fetch('uitleg-data.json', { cache:'no-store' });
    data = await res.json();
  }catch(e){ data = {}; }

  const stage = document.getElementById('stage');
  const themeEl = document.getElementById('theme');
  const descEl = document.getElementById('desc');
  const dotsEl = document.getElementById('dots');
  if(!stage || !themeEl || !descEl || !dotsEl) return;

  const track = document.createElement('div');
  track.className = 'slideTrack';
  stage.appendChild(track);

  slides.forEach((s)=>{
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.innerHTML = `<img src="${s.src}" alt="${s.title}">`;
    track.appendChild(slide);
  });

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = '<span></span>';
  stage.appendChild(overlay);
  const overlaySpan = overlay.querySelector('span');

  slides.forEach((_, i)=>{
    const d = document.createElement('div');
    d.className = 'dot' + (i===0 ? ' on':'') ;
    dotsEl.appendChild(d);
  });

  let index = 0;
  let startX = 0, startY = 0, dx = 0;
  let isDown = false;
  let isSwiping = false;

  function setDot(i){
    [...dotsEl.children].forEach((el, j)=>{
      el.classList.toggle('on', j===i);
    });
  }

  function getDesc(s){
    const t = (data[s.key] || '').trim();
    return t;
  }

  function renderMeta(){
    const s = slides[index];
    themeEl.textContent = s.title;

    const txt = getDesc(s);
    if(txt){
      descEl.textContent = txt;
      descEl.classList.remove('placeholder');
    }else{
      descEl.textContent = '— tekst later invullen —';
      descEl.classList.add('placeholder');
    }

    overlay.style.display = s.overlayTitle ? 'grid' : 'none';
    overlaySpan.textContent = s.title;

    setDot(index);
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
    // houd current slide netjes in beeld bij resize
    const w = stage.getBoundingClientRect().width;
    track.style.transition = 'none';
    track.style.transform = `translateX(${-index*w}px)`;
  }

  stage.addEventListener('pointerdown', (e)=>{
    isDown = true;
    isSwiping = false;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    stage.setPointerCapture(e.pointerId);
    track.style.transition = 'none';
  });

  stage.addEventListener('pointermove', (e)=>{
    if(!isDown) return;
    const moveX = e.clientX - startX;
    const moveY = e.clientY - startY;

    // pas na kleine drempel bepalen of we horizontaal swipen
    if(!isSwiping){
      if(Math.abs(moveX) > 8 && Math.abs(moveX) > Math.abs(moveY)){
        isSwiping = true;
      }else if(Math.abs(moveY) > 10){
        // user scrollt verticaal; laat los
        isDown = false;
        try{ stage.releasePointerCapture(e.pointerId); }catch(_){}
        return;
      }
    }

    if(isSwiping){
      dx = moveX;
      dragTo(dx);
      e.preventDefault();
    }
  }, { passive:false });

  stage.addEventListener('pointerup', (e)=>{
    if(!isDown) return;
    isDown = false;
    try{ stage.releasePointerCapture(e.pointerId); }catch(_){}

    const w = stage.getBoundingClientRect().width;
    const threshold = Math.min(90, w * 0.18);

    if(isSwiping && Math.abs(dx) > threshold){
      snapTo(index + (dx < 0 ? 1 : -1));
    }else{
      snapTo(index);
    }
    dx = 0;
    isSwiping = false;
  });

  stage.addEventListener('pointercancel', (e)=>{
    if(!isDown) return;
    isDown = false;
    try{ stage.releasePointerCapture(e.pointerId); }catch(_){}
    snapTo(index);
    dx = 0;
    isSwiping = false;
  });

  window.addEventListener('resize', onResize);

  // init
  renderMeta();
  onResize();
})();