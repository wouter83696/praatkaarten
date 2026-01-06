(async function(){
  const BASE = "/praatkaarten";
  const slides = [
    { key:"cover", title:"Samen onderzoeken", src:`${BASE}/voorkant.svg` },
    { key:"verkennen", title:"Verkennen", src:`${BASE}/cards/verkennen.svg` },
    { key:"duiden", title:"Duiden", src:`${BASE}/cards/duiden.svg` },
    { key:"verbinden", title:"Verbinden", src:`${BASE}/cards/verbinden.svg` },
    { key:"verdiepen", title:"Verhelderen", src:`${BASE}/cards/verdiepen.svg` },
    { key:"vertragen", title:"Vertragen", src:`${BASE}/cards/vertragen.svg` },
    { key:"bewegen", title:"Bewegen", src:`${BASE}/cards/bewegen.svg` }
  ];

  let data = {};
  try{
    const res = await fetch(`${BASE}/uitleg-data.json`, { cache:'no-store' });
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
  let startX=0, startY=0, dx=0;
  let isDown=false, isSwiping=false;

  function setDot(i){
    [...dotsEl.children].forEach((el,j)=> el.classList.toggle('on', j===i));
  }

  function getDesc(key){
    return ((data && data[key]) ? String(data[key]) : "").trim();
  }

  function renderMeta(){
    const s = slides[index];
    themeEl.textContent = s.title;
    overlaySpan.textContent = s.title;

    const txt = getDesc(s.key);
    if(txt){
      descEl.textContent = txt;
      descEl.classList.remove('placeholder');
    }else{
      descEl.textContent = '— tekst later invullen —';
      descEl.classList.add('placeholder');
    }
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