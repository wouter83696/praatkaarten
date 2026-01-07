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

  // Maak het "witte vlak" onder de kaart zo compact mogelijk:
  // - bepaal de maximale teksthoogte over alle slides
  // - zet de desc container op (max) die hoogte
  // - cap zodat heel lange teksten nog kunnen scrollen
  function fitDescHeight(){
    const prev = descEl.textContent;
    // reset om eerlijk te meten
    descEl.style.height = 'auto';
    descEl.style.maxHeight = 'none';

    let maxH = 0;
    for(const s of slides){
      descEl.textContent = getDesc(s.key);
      // force reflow
      const h = descEl.scrollHeight;
      if(h > maxH) maxH = h;
    }

    // restore
    descEl.textContent = prev;

    // cap: blijf clean, maar laat scrollen toe als teksten later langer worden
    const cap = Math.min(260, Math.round(window.innerHeight * 0.34));
    const finalH = Math.min(maxH, cap);
    descEl.style.height = finalH + 'px';
    descEl.style.maxHeight = cap + 'px';
    descEl.style.overflowY = (maxH > cap) ? 'auto' : 'hidden';
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
    fitDescHeight();
  }

  // Swipe mag overal in de uitleg werken, behalve wanneer je in de tekst aan het scrollen bent.
  const swipeSurface = document.body;

  swipeSurface.addEventListener('pointerdown', (e)=>{
    // laat verticale scroll in de beschrijving gewoon werken
    if(e.target && e.target.closest && e.target.closest('#desc')) return;
    isDown = true; isSwiping = false;
    startX = e.clientX; startY = e.clientY; dx = 0;
    try{ swipeSurface.setPointerCapture(e.pointerId); }catch(_){/* ok */}
    track.style.transition = 'none';
  });

  swipeSurface.addEventListener('pointermove', (e)=>{
    if(!isDown) return;
    const moveX = e.clientX - startX;
    const moveY = e.clientY - startY;

    if(!isSwiping){
      if(Math.abs(moveX) > 8 && Math.abs(moveX) > Math.abs(moveY)){
        isSwiping = true;
      }else if(Math.abs(moveY) > 10){
        isDown = false;
        try{ swipeSurface.releasePointerCapture(e.pointerId); }catch(_){/* ok */}
        return;
      }
    }
    if(isSwiping){
      dx = moveX;
      dragTo(dx);
      e.preventDefault();
    }
  }, { passive:false });

  swipeSurface.addEventListener('pointerup', (e)=>{
    if(!isDown) return;
    isDown = false;
    try{ swipeSurface.releasePointerCapture(e.pointerId); }catch(_){}

    const w = stage.getBoundingClientRect().width;
    const threshold = Math.min(90, w * 0.18);

    if(isSwiping && Math.abs(dx) > threshold){
      snapTo(index + (dx < 0 ? 1 : -1));
    }else{
      snapTo(index);
    }
    dx = 0; isSwiping = false;
  });

  swipeSurface.addEventListener('pointercancel', ()=>{
    if(!isDown) return;
    isDown = false;
    snapTo(index);
    dx = 0; isSwiping = false;
  });

  window.addEventListener('resize', onResize);

  renderMeta();
  fitDescHeight();
  onResize();
})();
