/*
  Dynamische achtergrond voor de grid (kaartenset-aware)
  - gebruikt optioneel: /sets/<set>/palette.json  -> { "palette": ["#...", ...] }
  - randomMode:
      "stable" : vast per kaartenset (consistent)
      "fresh"  : elke keer net anders

  Doel: duidelijke grafische vlakken achter het grid (kaartjes blijven 100% wit).
*/

(function(){
  'use strict';

  function getActiveSet(){
    try{
      const sp = new URL(location.href).searchParams;
      const s = (sp.get('set') || 'samenwerken').trim();
      return s || 'samenwerken';
    }catch(_e){
      return 'samenwerken';
    }
  }

  function hashString(str){
    let h = 2166136261;
    for(let i=0;i<str.length;i++){
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h>>>0);
  }

  function mulberry32(seed){
    return function(){
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(n,min,max){
    return Math.max(min, Math.min(max, n));
  }

  function ensureLayer(){
    let bg = document.getElementById('bgShapes');
    if(bg) return bg;

    bg = document.createElement('div');
    bg.id = 'bgShapes';
    bg.setAttribute('aria-hidden','true');
    document.body.prepend(bg);
    return bg;
  }

  // Optioneel palette.json per set
  async function loadPaletteForSet(setId){
    const rel = `sets/${setId}/palette.json`;
    const tries = [
      new URL(rel, new URL('./', location.href)).toString(),
      new URL(rel, location.origin + '/').toString()
    ];
    for(const url of tries){
      try{
        const r = await fetch(url, { cache: 'no-store' });
        if(!r.ok) continue;
        const j = await r.json();
        const pal = Array.isArray(j) ? j : (j && Array.isArray(j.palette) ? j.palette : null);
        if(pal && pal.length>=2) return pal;
      }catch(_e){
        // ignore
      }
    }
    return null;
  }

  // Fallback palette als er nog geen palette.json is
  // (past bij je huidige Parnassia-achtige stijl)
  function fallbackPalette(){
    return ['#5A87D2', '#5ABF9B', '#EBD28C', '#B6A7E6'];
  }

  function cssVarToColor(val){
    const v = String(val||'').trim();
    return v || null;
  }

  function readPaletteFromCSS(){
    // Als jij later CSS vars per set toevoegt, pakt dit die automatisch
    const root = getComputedStyle(document.documentElement);
    const vars = ['--bg1','--bg2','--bg3','--accent','--primary','--theme'];
    const out = [];
    for(const k of vars){
      const v = cssVarToColor(root.getPropertyValue(k));
      if(v) out.push(v);
    }
    return out.length>=2 ? out : null;
  }

  function rgba(hex, a){
    // accepteert #RGB/#RRGGBB
    const h = String(hex||'').replace('#','').trim();
    if(!h) return `rgba(90,135,210,${a})`;
    let r,g,b;
    if(h.length===3){
      r = parseInt(h[0]+h[0],16);
      g = parseInt(h[1]+h[1],16);
      b = parseInt(h[2]+h[2],16);
    }else{
      r = parseInt(h.slice(0,2),16);
      g = parseInt(h.slice(2,4),16);
      b = parseInt(h.slice(4,6),16);
    }
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  function makeShape(style){
    const el = document.createElement('div');
    el.className = 'bgShape';
    el.style.left = style.left;
    el.style.top = style.top;
    el.style.width = style.width;
    el.style.height = style.height;
    el.style.borderRadius = style.radius;
    el.style.background = style.background;
    el.style.filter = `blur(${style.blur}px)`;
    el.style.transform = `rotate(${style.rotate}deg)`;
    return el;
  }

  async function applyBackgroundForSet(setId, opts){
    const options = Object.assign({ randomMode: 'stable' }, opts||{});

    const bg = ensureLayer();
    bg.innerHTML = '';

    // palette: CSS-vars > palette.json > fallback
    const cssPal = readPaletteFromCSS();
    const filePal = await loadPaletteForSet(setId);
    const palette = cssPal || filePal || fallbackPalette();

    const seed = options.randomMode === 'fresh'
      ? Math.floor(Math.random()*1e9)
      : hashString(String(setId||'default'));

    const rnd = mulberry32(seed);

    // 3 grafische vlakken (duidelijk, maar kaartjes blijven leidend)
    // Opacity mag best, want kaartjes zijn niet transparant.
    const a1 = clamp(0.42 + rnd()*0.18, 0.42, 0.62);
    const a2 = clamp(0.40 + rnd()*0.18, 0.40, 0.60);
    const a3 = clamp(0.34 + rnd()*0.16, 0.34, 0.50);

    const c1 = palette[Math.floor(rnd()*palette.length)];
    const c2 = palette[Math.floor(rnd()*palette.length)];
    const c3 = palette[Math.floor(rnd()*palette.length)];

    const shapes = [
      {
        left: '-14%',
        top: `${Math.floor(rnd()*16)}%`,
        width: `${60 + Math.floor(rnd()*18)}%`,
        height: `${52 + Math.floor(rnd()*18)}%`,
        radius: `${120 + Math.floor(rnd()*80)}px`,
        blur: 10,
        rotate: (-6 + rnd()*12).toFixed(2),
        background: rgba(c1, a1)
      },
      {
        left: `${38 + Math.floor(rnd()*14)}%`,
        top: `${18 + Math.floor(rnd()*22)}%`,
        width: `${72 + Math.floor(rnd()*18)}%`,
        height: `${58 + Math.floor(rnd()*20)}%`,
        radius: `${140 + Math.floor(rnd()*90)}px`,
        blur: 10,
        rotate: (-6 + rnd()*12).toFixed(2),
        background: rgba(c2, a2)
      },
      {
        left: '-18%',
        top: `${76 + Math.floor(rnd()*8)}%`,
        width: `${120 + Math.floor(rnd()*10)}%`,
        height: `${30 + Math.floor(rnd()*10)}%`,
        radius: `${160 + Math.floor(rnd()*120)}px`,
        blur: 12,
        rotate: (-3 + rnd()*6).toFixed(2),
        background: rgba(c3, a3)
      }
    ];

    for(const s of shapes){
      bg.appendChild(makeShape(s));
    }
  }

  // Expose
  window.applyBackgroundForSet = applyBackgroundForSet;
  window.randomizeBackground = function(mode){
    const setId = getActiveSet();
    return applyBackgroundForSet(setId, { randomMode: mode || 'fresh' });
  };

  // Auto-run
  document.addEventListener('DOMContentLoaded', () => {
    const setId = getActiveSet();
    applyBackgroundForSet(setId, { randomMode: 'stable' });
  }, { once: true });

})();
