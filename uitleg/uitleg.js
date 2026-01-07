(async function(){
  // Let op: deze uitleg draait in een iframe (helpModal) en gebruikt daarom absolute paden
  // naar je GitHub Pages submap.
  const BASE = "/praatkaarten";

  const slides = [
    { key:"cover", src:`${BASE}/voorkant.svg`, alt:"Voorkant" },
    { key:"verkennen", src:`${BASE}/cards/verkennen.svg`, alt:"Verkennen" },
    { key:"duiden", src:`${BASE}/cards/duiden.svg`, alt:"Duiden" },
    { key:"verbinden", src:`${BASE}/cards/verbinden.svg`, alt:"Verbinden" },
    { key:"verdiepen", src:`${BASE}/cards/verdiepen.svg`, alt:"Verhelderen" },
    { key:"vertragen", src:`${BASE}/cards/vertragen.svg`, alt:"Vertragen" },
    { key:"bewegen", src:`${BASE}/cards/bewegen.svg`, alt:"Bewegen" }
  ];

  let data = {};
  try{
    const res = await fetch(`${BASE}/uitleg-data.json`, { cache:'no-store' });
    data = await res.json();
  }catch(e){
    data = {};
  }

  const stage = document.getElementById('stage');
  const descEl = document.getElementById('desc');
  if(!stage || !descEl) return;

  const track = document.createElement('div');
  track.className = 'slideTrack';
  stage.appendChild(track);

  slides.forEach((s)=>{
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.innerHTML = `<img src="${s.src}" alt="${s.alt}">`;
    track.appendChild(slide);
  });

  let index = 0;
  let startX=0, startY=0, dx=0;
  let isDown=false, isSwiping=false;

  function getDesc(key){
    return ((data && data[key]) ? String(data[key]) : "").trim();
  }

  function renderMeta(){
    const s = slides[index];
    const txt = getDesc(s.key);
    descEl.textContent = txt; // geen placeholders / koppen
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

  stage.addEventListener('pointerdown', (e)=>{
    isDown = true; isSwiping = false;
    startX = e.clientX; startY = e.clientY; dx = 0;
    stage.setPointerCapture(e.pointerId);
    track.style.transition = 'none';
  });

  stage.addEventListener('pointermove', (e)=>{
    if(!isDown) return;
    const moveX = e.clientX - startX;
    const moveY = e.clientY - startY;

    if(!isSwiping){
      if(Math.abs(moveX) > 8 && Math.abs(moveX) > Math.abs(moveY)){
        isSwiping = true;
      }else if(Math.abs(moveY) > 10){
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
    dx = 0; isSwiping = false;
  });

  stage.addEventListener('pointercancel', ()=>{
    if(!isDown) return;
    isDown = false;
    snapTo(index);
    dx = 0; isSwiping = false;
  });

  window.addEventListener('resize', onResize);

  renderMeta();
  onResize();
})();
