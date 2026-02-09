// Praatkaartjes – dynamische achtergrond achter index grid (ES5)
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};

  // Firefox (met name desktop) kan bij blur + veel SVG nodes sneller vastlopen.
  // Daarom automatisch een "lite" profiel: minder shapes + minder blur.
  function isFirefox(){
    try{ return /firefox/i.test(navigator.userAgent||''); }catch(e){ return false; }
  }

  // Kleine, deterministische PRNG zodat we bij resize exact dezelfde "random" krijgen
  // zolang de pagina open blijft.
  function mulberry32(seed){
    var a = seed >>> 0;
    return function(){
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v,min,max){ return v<min?min:(v>max?max:v); }

  function normHex(h){
    h = String(h||'').replace('#','').trim();
    if(h.length===3){ return '#' + h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; }
    if(h.length===4){ // rgba #RGBA -> ignore alpha
      return '#' + h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    }
    if(h.length===6){ return '#' + h; }
    if(h.length===8){ return '#' + h.slice(0,6); } // ignore alpha
    return null;
  }

  function rgbToHex(r,g,b){
    var rr = clamp(r|0,0,255).toString(16); if(rr.length<2) rr='0'+rr;
    var gg = clamp(g|0,0,255).toString(16); if(gg.length<2) gg='0'+gg;
    var bb = clamp(b|0,0,255).toString(16); if(bb.length<2) bb='0'+bb;
    return '#' + rr + gg + bb;
  }

  function parseColors(svgText){
    var counts = {};
    function add(c){
      if(!c) return;
      c = String(c).toLowerCase();
      if(c==='none' || c==='transparent' || c==='currentcolor') return;
      counts[c] = (counts[c]||0) + 1;
    }

    // hex colors (#fff, #ffffff, #ffffffff, #rgba)
    var hexRe = /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
    var m;
    while((m = hexRe.exec(svgText))){ add(normHex(m[0])); }

    // rgb(...) and rgba(...)
    var rgbRe = /rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})(?:\s*,\s*([0-9.]+))?\s*\)/g;
    while((m = rgbRe.exec(svgText))){
      var a = (m[4]==null)?1:parseFloat(m[4]);
      if(a===0) continue;
      add(rgbToHex(parseInt(m[1],10), parseInt(m[2],10), parseInt(m[3],10)));
    }

    // sort by frequency
    var arr = [];
    for(var k in counts){ if(counts.hasOwnProperty(k)) arr.push({c:k, n:counts[k]}); }
    arr.sort(function(a,b){ return b.n-a.n; });
    var out=[];
    for(var i=0;i<arr.length;i++){
      out.push(arr[i].c);
      if(out.length>=6) break;
    }
    return out;
  }

  function mixWithWhite(hex, amt){ // amt 0..1, where 1 => white
    hex = normHex(hex);
    if(!hex) return '#ffffff';
    var r = parseInt(hex.slice(1,3),16);
    var g = parseInt(hex.slice(3,5),16);
    var b = parseInt(hex.slice(5,7),16);
    r = Math.round(r + (255-r)*amt);
    g = Math.round(g + (255-g)*amt);
    b = Math.round(b + (255-b)*amt);
    return rgbToHex(r,g,b);
  }

  function hexToRgb(hex){
    hex = normHex(hex);
    if(!hex) return {r:255,g:255,b:255};
    return {
      r: parseInt(hex.slice(1,3),16),
      g: parseInt(hex.slice(3,5),16),
      b: parseInt(hex.slice(5,7),16)
    };
  }

  function rgbToHsl(r,g,b){
    r/=255; g/=255; b/=255;
    var max = Math.max(r,g,b), min = Math.min(r,g,b);
    var h=0, s=0, l=(max+min)/2;
    if(max!==min){
      var d = max-min;
      s = l>0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h = (g-b)/d + (g<b?6:0); break;
        case g: h = (b-r)/d + 2; break;
        case b: h = (r-g)/d + 4; break;
      }
      h *= 60;
    }
    return {h:h, s:s, l:l};
  }

  // Kies een neutrale basis voor de "wash" zodat warme/paarse kleuren (roze gloed)
  // niet de hele achtergrond gaan domineren.
  function pickNeutralBase(palette){
    if(!palette || !palette.length) return '#dfe7ef';
    var best = null;
    var bestScore = 1e9;
    for(var i=0;i<palette.length;i++){
      var c = palette[i];
      var rgb = hexToRgb(c);
      var hsl = rgbToHsl(rgb.r,rgb.g,rgb.b);

      // Warm/roze/magenta ranges extra afstraffen.
      var h = hsl.h;
      var warmPenalty = 0;
      // rood/oranje (0..70)
      if(h >= 0 && h <= 70) warmPenalty = 1.2;
      // magenta/roze (290..360)
      if(h >= 290 && h <= 360) warmPenalty = 1.6;

      // Score: lage saturatie + liever niet warm
      var score = (hsl.s * 3.0) + warmPenalty;

      // Heel donkere kleuren niet als basis gebruiken.
      if(hsl.l < 0.20) score += 0.8;

      if(score < bestScore){
        bestScore = score;
        best = c;
      }
    }
    return best || palette[0];
  }

  function softenForBg(hex){
    var rgb = hexToRgb(hex);
    var hsl = rgbToHsl(rgb.r,rgb.g,rgb.b);
    var h = hsl.h;
    var warm = (h >= 0 && h <= 70) || (h >= 290 && h <= 360);
    // Minder uitwassen dan voorheen: de blobs mogen "poppen".
    // amt = menging met wit (1 => wit). Lager = meer kleur.
    var amt = warm ? 0.28 : 0.22;
    // Als het al heel licht is: iets rustiger, maar nog steeds zichtbaar
    if(hsl.l > 0.75) amt = warm ? 0.36 : 0.32;
    return mixWithWhite(hex, amt);
  }

  function uniq(list){
    var seen={}, out=[];
    for(var i=0;i<list.length;i++){
      var k=list[i];
      if(!k || seen[k]) continue;
      seen[k]=1; out.push(k);
    }
    return out;
  }

  function pickFiles(meta){
    var files = ['voorkant.svg'];
    if(meta && Array.isArray(meta.themes)){
      for(var i=0;i<meta.themes.length;i++){
        var t = meta.themes[i] || {};
        if(t.card) files.push(String(t.card));
        else if(t.key) files.push(String(t.key)+'.svg');
      }
    }
    // keep it small and diverse
    files = uniq(files);
    if(files.length>10) files = files.slice(0,10);
    return files;
  }

  function resizeCanvasToCSS(canvas){
    var rect = canvas.getBoundingClientRect();
    var dpr = w.devicePixelRatio || 1;
    var cw = Math.max(1, Math.floor(rect.width * dpr));
    var ch = Math.max(1, Math.floor(rect.height * dpr));
    if(canvas.width!==cw) canvas.width = cw;
    if(canvas.height!==ch) canvas.height = ch;
    return {w: cw, h: ch, dpr: dpr, cssW: rect.width, cssH: rect.height};
  }

  function drawBlob(ctx, cx, cy, r, rnd, shape){
    rnd = rnd || Math.random;
    var minPts = shape && typeof shape.minPts === 'number' ? shape.minPts : 8;
    var maxPts = shape && typeof shape.maxPts === 'number' ? shape.maxPts : 12;
    if(maxPts < minPts){
      var t = maxPts;
      maxPts = minPts;
      minPts = t;
    }
    var pts = minPts + Math.floor(rnd() * (maxPts - minPts + 1));
    var step = (Math.PI*2)/pts;
    var irr = (shape && typeof shape.irr === 'number') ? shape.irr : 0.35;
    if(irr < 0.05) irr = 0.05;
    if(irr > 0.65) irr = 0.65;
    ctx.beginPath();
    for(var i=0;i<=pts;i++){
      var a = i*step;
      var rr = r * (1 - irr/2 + rnd()*irr);
      var x = cx + Math.cos(a)*rr;
      var y = cy + Math.sin(a)*rr;
      if(i===0) ctx.moveTo(x,y);
      else {
        var cpA = a - step/2;
        var cpR = r * (1 - irr/2 + rnd()*irr);
        var cpx = cx + Math.cos(cpA)*cpR;
        var cpy = cy + Math.sin(cpA)*cpR;
        ctx.quadraticCurveTo(cpx, cpy, x, y);
      }
    }
    ctx.closePath();
  }

  function buildGridPositions(count, rnd, margin){
    var out = [];
    var cols = Math.ceil(Math.sqrt(count));
    var rows = Math.ceil(count / cols);
    if(!rows) rows = 1;
    if(!cols) cols = 1;
    margin = (typeof margin === 'number') ? margin : 0.08;
    for(var i=0;i<count;i++){
      var row = Math.floor(i / cols);
      var col = i % cols;
      var x = (col + 0.2 + rnd()*0.6) / cols;
      var y = (row + 0.2 + rnd()*0.6) / rows;
      // allow outside viewport for soft cut-offs
      x = x * (1 + 2*margin) - margin;
      y = y * (1 + 2*margin) - margin;
      out.push({ x: x, y: y });
    }
    return out;
  }

  
  function ensureSvgLayer(canvas){
    var parent = canvas && canvas.parentNode;
    if(!parent) return null;
    var existing = parent.querySelector && parent.querySelector('#indexBgSvg');
    if(existing) return existing;
    var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('id','indexBgSvg');
    svg.setAttribute('class','indexBgSvg');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('preserveAspectRatio','none');
    // fixed coord space, easier for random placement
    svg.setAttribute('viewBox','0 0 1000 1000');
    // insert directly after canvas so it sits above it
    if(canvas.nextSibling) parent.insertBefore(svg, canvas.nextSibling);
    else parent.appendChild(svg);
    return svg;
  }

  function parseViewBox(root){
    if(!root) return {x:0,y:0,w:1000,h:1000};
    var vb = root.getAttribute && root.getAttribute('viewBox');
    if(vb){
      var p = vb.replace(/,/g,' ').trim().split(/\s+/);
      if(p.length===4){
        var x = parseFloat(p[0]), y = parseFloat(p[1]), w = parseFloat(p[2]), h = parseFloat(p[3]);
        if(isFinite(x)&&isFinite(y)&&isFinite(w)&&isFinite(h)&&w>0&&h>0) return {x:x,y:y,w:w,h:h};
      }
    }
    // fallback to width/height
    var wAttr = root.getAttribute && root.getAttribute('width');
    var hAttr = root.getAttribute && root.getAttribute('height');
    var w = wAttr ? parseFloat(String(wAttr).replace(/[^0-9.]/g,'')) : 0;
    var h = hAttr ? parseFloat(String(hAttr).replace(/[^0-9.]/g,'')) : 0;
    if(isFinite(w)&&isFinite(h)&&w>0&&h>0) return {x:0,y:0,w:w,h:h};
    return {x:0,y:0,w:1000,h:1000};
  }

  function isWarmHex(hex){
    var rgb = hexToRgb(hex);
    var hsl = rgbToHsl(rgb.r,rgb.g,rgb.b);
    var h = hsl.h;
    return (h >= 0 && h <= 70) || (h >= 290 && h <= 360);
  }

  // Groen/teal tinten kunnen een algehele 'groenige waas' geven.
  // We houden de vormen, maar trekken groene kleuren richting een neutrale basis.
  function isGreenishHex(hex){
    var rgb = hexToRgb(hex);
    var hsl = rgbToHsl(rgb.r,rgb.g,rgb.b);
    var h = hsl.h;
    return (h >= 70 && h <= 170);
  }

  function mixHex(a, b, t){ // t 0..1, where 1 => b
    a = normHex(a); b = normHex(b);
    if(!a) a = '#ffffff';
    if(!b) b = '#ffffff';
    var ar = parseInt(a.slice(1,3),16), ag = parseInt(a.slice(3,5),16), ab = parseInt(a.slice(5,7),16);
    var br = parseInt(b.slice(1,3),16), bg = parseInt(b.slice(3,5),16), bb = parseInt(b.slice(5,7),16);
    var r = Math.round(ar + (br-ar)*t);
    var g = Math.round(ag + (bg-ag)*t);
    var b2 = Math.round(ab + (bb-ab)*t);
    return rgbToHex(r,g,b2);
  }


  function collectShapesFromSvgText(svgText){
    var out = [];
    if(!svgText) return out;
    try{
      var dp = new DOMParser();
      var doc = dp.parseFromString(svgText, 'image/svg+xml');
      var root = doc && doc.documentElement;
      if(!root) return out;
      var vb = parseViewBox(root);
      // pick basic shape elements
      var nodes = root.querySelectorAll ? root.querySelectorAll('path,circle,rect,ellipse,polygon,polyline') : [];
      for(var i=0;i<nodes.length;i++){
        var el = nodes[i];
        if(!el || !el.tagName) continue;
        var tag = el.tagName.toLowerCase();
        // skip invisible
        var disp = el.getAttribute('display');
        if(disp && disp.toLowerCase()==='none') continue;
        var op = el.getAttribute('opacity');
        if(op!=null && parseFloat(op)===0) continue;
        var fill = el.getAttribute('fill');
        var stroke = el.getAttribute('stroke');
        if(fill && String(fill).toLowerCase()==='none' && (!stroke || String(stroke).toLowerCase()==='none')) continue;

        var attrs = {};
        // keep only geometry attrs
        if(tag==='path'){
          var d = el.getAttribute('d');
          if(!d) continue;
          attrs.d = d;
        }else if(tag==='circle'){
          attrs.cx = el.getAttribute('cx')||'0';
          attrs.cy = el.getAttribute('cy')||'0';
          attrs.r  = el.getAttribute('r')||'0';
          if(parseFloat(attrs.r)<=0) continue;
        }else if(tag==='ellipse'){
          attrs.cx = el.getAttribute('cx')||'0';
          attrs.cy = el.getAttribute('cy')||'0';
          attrs.rx = el.getAttribute('rx')||'0';
          attrs.ry = el.getAttribute('ry')||'0';
          if(parseFloat(attrs.rx)<=0 || parseFloat(attrs.ry)<=0) continue;
        }else if(tag==='rect'){
          attrs.x = el.getAttribute('x')||'0';
          attrs.y = el.getAttribute('y')||'0';
          attrs.width  = el.getAttribute('width')||'0';
          attrs.height = el.getAttribute('height')||'0';
          if(parseFloat(attrs.width)<=0 || parseFloat(attrs.height)<=0) continue;
          var rx = el.getAttribute('rx'); var ry = el.getAttribute('ry');
          if(rx) attrs.rx = rx;
          if(ry) attrs.ry = ry;
        }else if(tag==='polygon' || tag==='polyline'){
          var pts = el.getAttribute('points');
          if(!pts) continue;
          attrs.points = pts;
        }
        // keep transform if present (rare but helpful)
        var tf = el.getAttribute('transform');
        if(tf) attrs._t = tf;

        out.push({tag:tag, attrs:attrs, vb:vb});
      }
    }catch(e){
      // ignore parse errors
    }
    return out;
  }

  function svgEl(tag){
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
  }

  function setAttrs(el, attrs){
    for(var k in attrs){
      if(!attrs.hasOwnProperty(k)) continue;
      if(k==='_t') continue;
      el.setAttribute(k, attrs[k]);
    }
  }

  function renderSvgLayer(svg, shapes, palette, rnd, lite, opts){
    rnd = rnd || Math.random;
    if(!svg) return;
    // clear
    while(svg.firstChild) svg.removeChild(svg.firstChild);

    // defs: blur (duur in Firefox). In lite-modus géén SVG blur filter gebruiken.
    var useSvgBlur = !lite;
    if(useSvgBlur){
      var defs = svgEl('defs');
      var flt = svgEl('filter');
      flt.setAttribute('id','pkBgBlur');
      flt.setAttribute('x','-20%');
      flt.setAttribute('y','-20%');
      flt.setAttribute('width','140%');
      flt.setAttribute('height','140%');
      var g = svgEl('feGaussianBlur');
      // Minder blur: kleuren blijven minder "diffuus".
      g.setAttribute('stdDeviation', '6');
      defs.appendChild(flt);
      flt.appendChild(g);
      svg.appendChild(defs);
    }


    if(!shapes || !shapes.length) return;

    // choose shapes (lite: minder nodes)
    var count = (lite ? 10 : 6) + Math.floor(rnd() * (lite ? 6 : 7)); // lite: 10..15 zonder blur
    var maxPick = Math.min(count, shapes.length);

    // shuffle indices
    var idxs = [];
    for(var i=0;i<shapes.length;i++) idxs.push(i);
    for(var j=idxs.length-1;j>0;j--){
      var r = Math.floor(rnd()*(j+1));
      var tmp = idxs[j]; idxs[j]=idxs[r]; idxs[r]=tmp;
    }

    var shapeWash = (opts && typeof opts.shapeWash === 'number') ? opts.shapeWash : null;
    if(shapeWash !== null) shapeWash = clamp(shapeWash, 0, 0.95);
    var shapeAlphaBoost = (opts && typeof opts.shapeAlphaBoost === 'number') ? opts.shapeAlphaBoost : 1;
    if(shapeAlphaBoost < 0.2) shapeAlphaBoost = 0.2;
    if(shapeAlphaBoost > 3) shapeAlphaBoost = 3;

    for(var n=0;n<maxPick;n++){
      var sObj = shapes[idxs[n]];
      if(!sObj) continue;

      // color: from palette, heavily washed but not white
      var col = palette && palette.length ? palette[Math.floor(rnd()*palette.length)] : '#cfd8dc';
      // Minder wit wassen zodat de vormkleuren echt zichtbaar zijn.
      var wash = (shapeWash !== null) ? shapeWash : (0.34 + rnd()*0.16);
      col = mixWithWhite(col, wash);

      // warm colors are allowed but more subtle
      var warm = isWarmHex(col);
      // Hogere opacity: vormen duidelijker (zonder te schreeuwen).
      var opacity = (warm ? (lite ? 0.10 : 0.14) : (lite ? 0.12 : 0.18)) + rnd()*(warm ? (lite ? 0.06 : 0.10) : (lite ? 0.06 : 0.12));
      opacity = opacity * shapeAlphaBoost;
      if(opacity > 0.6) opacity = 0.6;

      // normalize svg coordinates into 1000x1000 space, then scale 2..6
      var vb = sObj.vb || {x:0,y:0,w:1000,h:1000};
      var norm = 1000 / Math.max(1, Math.max(vb.w, vb.h));
      var sc = norm * ((lite ? 2 : 2) + rnd()*(lite ? 3 : 4));
      var tx = rnd()*1000;
      var ty = rnd()*1000;
      var rot = (rnd()*360);

      var cx = vb.x + vb.w/2;
      var cy = vb.y + vb.h/2;

      var grp = svgEl('g');
      grp.setAttribute('opacity', String(opacity));
      if(useSvgBlur) grp.setAttribute('filter','url(#pkBgBlur)');
      grp.setAttribute('transform', 'translate('+tx+' '+ty+') rotate('+rot+') scale('+sc+') translate('+(-cx)+' '+(-cy)+')');

      var el = svgEl(sObj.tag);
      setAttrs(el, sObj.attrs);
      // apply original transform inside if present
      if(sObj.attrs && sObj.attrs._t) el.setAttribute('transform', sObj.attrs._t);

      el.setAttribute('fill', col);
      el.setAttribute('stroke','none');

      grp.appendChild(el);
      svg.appendChild(grp);
    }
  }


  function renderCanvas(canvas, palette, rnd, lite, opts){
    rnd = rnd || Math.random;
    var info = resizeCanvasToCSS(canvas);
    var ctx = canvas.getContext('2d');
    if(!ctx) return;

    // Contrastmodus: light = rustige, heldere blobs op echt wit.
    // dark = 80/90's neon blobs op een gekleurde (niet-zwarte) achtergrond.
    var isDark = false;
    try{
      isDark = (w.document && w.document.documentElement && w.document.documentElement.getAttribute('data-contrast') === 'dark');
    }catch(_e){ isDark = false; }

    // Light: canvas bouwt de blobs-laag.
    // Dark: canvas mag GEEN eigen "wash" tekenen (anders wordt de gekleurde background overschilderd).
    var base = pickNeutralBase(palette) || '#dfe7ef';
    ctx.clearRect(0,0,info.w,info.h);

    var skipWash = !!(opts && opts.baseWash === false);
    if(!isDark && !skipWash){
      // base wash (heel subtiel; echte achtergrond is wit via CSS)
      var bg = mixWithWhite(base, 0.995);
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,info.w,info.h);

      // ultrazachte gradient – voorkomt "platte" hoeken, maar geen waas.
      var g = ctx.createLinearGradient(0,0,info.w,info.h);
      g.addColorStop(0, mixWithWhite(base, 0.985));
      g.addColorStop(1, mixWithWhite(base, 0.97));
      ctx.globalAlpha = 0.015;
      ctx.fillStyle = g;
      ctx.fillRect(0,0,info.w,info.h);
      ctx.globalAlpha = 1;
    }

    // blobs
    // Minder blobs: kaart blijft leidend.
    var blobCount = (lite ? 6 : 5) + Math.floor(rnd() * 3); // 5..7 / 6..8
    if(opts && typeof opts.blobCount === 'number'){
      blobCount = Math.max(3, Math.round(opts.blobCount));
      if(lite && blobCount > 7) blobCount = 7;
      if(!lite && blobCount > 12) blobCount = 12;
    }
    var alphaBoost = (opts && typeof opts.alphaBoost === 'number') ? opts.alphaBoost : 1;
    var alphaBoostDark = (opts && typeof opts.darkAlphaBoost === 'number') ? opts.darkAlphaBoost : alphaBoost;
    var sizeScale = (opts && typeof opts.sizeScale === 'number') ? opts.sizeScale : 1;
    var sizeScaleDark = (opts && typeof opts.darkSizeScale === 'number') ? opts.darkSizeScale : sizeScale;
    var sizeLimit = (opts && typeof opts.sizeLimit === 'number') ? opts.sizeLimit : 1.4;
    if(sizeLimit < 1) sizeLimit = 1;
    if(sizeLimit > 2.6) sizeLimit = 2.6;
    if(sizeScale < 0.5) sizeScale = 0.5;
    if(sizeScale > sizeLimit) sizeScale = sizeLimit;
    if(sizeScaleDark < 0.5) sizeScaleDark = 0.5;
    if(sizeScaleDark > sizeLimit) sizeScaleDark = sizeLimit;
    var shape = {
      irr: (opts && typeof opts.blobIrregularity === 'number') ? opts.blobIrregularity : 0.35,
      minPts: (opts && typeof opts.blobPointsMin === 'number') ? opts.blobPointsMin : 8,
      maxPts: (opts && typeof opts.blobPointsMax === 'number') ? opts.blobPointsMax : 12
    };
    var darkPalette = (opts && Array.isArray(opts.darkPalette)) ? opts.darkPalette : null;
    var darkMix = (opts && typeof opts.darkMix === 'number') ? opts.darkMix : 0.25;
    // Dark mode: vaste neon palette (80/90's vibe), elke blob eigen kleur.
    var neon = ['#ff2bd6','#00e5ff','#a855f7','#ffe600','#ff7a00','#2aff8f','#ff4d4d'];
    var spread = (opts && opts.blobSpread) ? String(opts.blobSpread) : '';
    var spreadMargin = (opts && typeof opts.blobSpreadMargin === 'number') ? opts.blobSpreadMargin : 0.08;
    var spreadPositions = null;
    if(spread === 'grid'){
      spreadPositions = buildGridPositions(blobCount, rnd, spreadMargin);
    }

    for(var i=0;i<blobCount;i++){
      var raw = isDark
        ? ((darkPalette && darkPalette.length) ? darkPalette[i % darkPalette.length] : neon[i % neon.length])
        : ((palette && palette.length) ? palette[i % palette.length] : base);

      var rgb = hexToRgb(raw);
      var hsl = rgbToHsl(rgb.r,rgb.g,rgb.b);
      var h = hsl.h;
      var warm = (h >= 0 && h <= 70) || (h >= 290 && h <= 360);

      // Light: iets uitwassen zodat het achtergrond blijft.
      // Dark: neon iets temperen door te mengen met de vaste indigo-nachtbasis.
      // Zo blijft de 80/90's vibe aanwezig, maar minder "poppend" en serieuzer.
      var blobWash = (opts && typeof opts.blobWash === 'number') ? opts.blobWash : null;
      if(blobWash !== null) blobWash = clamp(blobWash, 0, 0.95);
      var blobAlphaCap = (opts && typeof opts.blobAlphaCap === 'number') ? opts.blobAlphaCap : null;
      var blobAlphaCapDark = (opts && typeof opts.blobAlphaCapDark === 'number') ? opts.blobAlphaCapDark : null;
      var blobAlphaFixed = (opts && typeof opts.blobAlphaFixed === 'number') ? opts.blobAlphaFixed : null;
      if(blobAlphaCap !== null) blobAlphaCap = clamp(blobAlphaCap, 0.05, 1);
      if(blobAlphaCapDark !== null) blobAlphaCapDark = clamp(blobAlphaCapDark, 0.05, 1);
      if(blobAlphaFixed !== null) blobAlphaFixed = clamp(blobAlphaFixed, 0.02, 0.9);
      var c = isDark ? mixHex(raw, '#18123c', darkMix) : ((blobWash !== null) ? mixWithWhite(raw, blobWash) : softenForBg(raw));

      // Alpha + size tuning
      var alpha;
      if(isDark){
        // Neon: contrastrijk, maar duidelijk achtergrond.
        // Iets lager dan de vorige IP zodat het rustiger kijkt.
        alpha = (lite ? 0.18 : 0.22) + rnd()*0.10;
      }else{
        var alphaBase = warm ? (lite ? 0.15 : 0.19) : (lite ? 0.18 : 0.24);
        var alphaVar  = warm ? 0.06 : 0.10;
        alpha = alphaBase + rnd()*alphaVar;
      }
      alpha = alpha * (isDark ? alphaBoostDark : alphaBoost);
      if(blobAlphaFixed !== null) alpha = blobAlphaFixed;
      var cap = isDark ? blobAlphaCapDark : blobAlphaCap;
      if(cap === null) cap = 0.6;
      if(alpha > cap) alpha = cap;

      var rr = (Math.min(info.w, info.h) * (isDark ? (0.11 + rnd()*0.20) : (0.10 + rnd()*0.18)));
      rr = rr * (isDark ? sizeScaleDark : sizeScale);
      var cx, cy;
      if(spreadPositions && spreadPositions[i]){
        cx = spreadPositions[i].x * info.w;
        cy = spreadPositions[i].y * info.h;
      }else{
        cx = (rnd()*1.10 - 0.05) * info.w;
        cy = (rnd()*1.10 - 0.05) * info.h;
      }

      if(i===1){
        rr *= 1.08;
        cx = info.w * 1.02;
        cy = info.h * 0.12;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = c;
      // Geen grijze filters; in dark mode geven we een subtiele "glow" via shadow.
      if('filter' in ctx) ctx.filter = 'none';
      if(isDark){
        ctx.shadowColor = c;
        // Nog iets minder blur: minder glow = minder "pop".
        ctx.shadowBlur = lite ? 14 : 22;
      }else{
        ctx.shadowBlur = 0;
      }
      drawBlob(ctx, cx, cy, rr, rnd, shape);
      ctx.fill();
      ctx.restore();
    }

    // Light: ultrazachte vignette om randen te kalmeren (geen grijze waas).
    // Als baseWash uit staat, slaan we ook de vignette over.
    if(!isDark && !skipWash){
      var vg = ctx.createRadialGradient(info.w*0.55, info.h*0.45, 0, info.w*0.55, info.h*0.45, Math.max(info.w,info.h)*0.75);
      vg.addColorStop(0, 'rgba(255,255,255,0)');
      vg.addColorStop(1, 'rgba(255,255,255,0.010)');
      ctx.fillStyle = vg;
      ctx.fillRect(0,0,info.w,info.h);
    }

    // geef info terug zodat we dimensies kunnen onthouden
    return info;
  }

  
  function buildAssets(opts){
    var meta = opts && opts.meta;
    var cardBase = (opts && opts.cardBase) || '';
    var files = pickFiles(meta);
    var paletteOverride = (opts && Array.isArray(opts.palette)) ? opts.palette : null;

    var promises = [];
    for(var i=0;i<files.length;i++){
      (function(file){
        promises.push(
          PK.getText(cardBase + file).then(function(txt){
            return {
              colors: parseColors(txt),
              shapes: collectShapesFromSvgText(txt)
            };
          }).catch(function(){
            return { colors: [], shapes: [] };
          })
        );
      })(files[i]);
    }

    return Promise.all(promises).then(function(list){
      var flatColors = [];
      var flatShapes = [];
      for(var j=0;j<list.length;j++){
        var item = list[j] || {};
        var cs = item.colors || [];
        var sh = item.shapes || [];
        for(var k=0;k<cs.length;k++) flatColors.push(cs[k]);
        for(var s=0;s<sh.length;s++) flatShapes.push(sh[s]);
      }

      flatColors = uniq(flatColors);
      if(paletteOverride && paletteOverride.length){
        var pal = [];
        for(var p=0;p<paletteOverride.length;p++){
          var nh = normHex(paletteOverride[p]);
          if(nh) pal.push(nh);
        }
        if(pal.length) flatColors = pal;
      }
      if(flatColors.length<3){
        // fallback: zachte perzik-zand (geen blauw/groen)
        flatColors = ['#F2C9A5','#F6D4B4','#F7E2C8'];
      }
      if(flatColors.length>6) flatColors = flatColors.slice(0,6);

      // keep shapes reasonably bounded (avoid huge DOM)
      if(flatShapes.length>80) flatShapes = flatShapes.slice(0,80);

      return { palette: flatColors, shapes: flatShapes };
    });
  }


  var lastToken = 0;
  var cache = null; // { key, seed, assets, lite }

  PK.indexBackground = {
    render: function(opts){
      var canvas = w.document.getElementById('indexBg');
      if(!canvas) return;

      // 1x genereren per tab/page load: assets + seed cachen.
      // Bij resize opnieuw tekenen met dezelfde seed (dus geen nieuwe random).
      var lite = isFirefox();
      var palKey = (opts && Array.isArray(opts.palette)) ? opts.palette.join(',') : '';
      var blobKey = (opts && typeof opts.blobCount === 'number') ? String(opts.blobCount) : '';
      var alphaKey = (opts && typeof opts.alphaBoost === 'number') ? String(opts.alphaBoost) : '';
      var sizeKey = (opts && typeof opts.sizeScale === 'number') ? String(opts.sizeScale) : '';
      var washKey = (opts && typeof opts.blobWash === 'number') ? String(opts.blobWash) : '';
      var shapeKey = (opts && typeof opts.shapeWash === 'number') ? String(opts.shapeWash) : '';
      var shapeAlphaKey = (opts && typeof opts.shapeAlphaBoost === 'number') ? String(opts.shapeAlphaBoost) : '';
      var capKey = (opts && typeof opts.blobAlphaCap === 'number') ? String(opts.blobAlphaCap) : '';
      var capDarkKey = (opts && typeof opts.blobAlphaCapDark === 'number') ? String(opts.blobAlphaCapDark) : '';
      var shapeEnabledKey = (opts && opts.shapeEnabled === false) ? '0' : '1';
      var spreadKey = (opts && opts.blobSpread) ? String(opts.blobSpread) : '';
      var spreadMarginKey = (opts && typeof opts.blobSpreadMargin === 'number') ? String(opts.blobSpreadMargin) : '';
      var sizeLimitKey = (opts && typeof opts.sizeLimit === 'number') ? String(opts.sizeLimit) : '';
      var alphaFixedKey = (opts && typeof opts.blobAlphaFixed === 'number') ? String(opts.blobAlphaFixed) : '';
      var key = String((opts && opts.cardBase) || '') + '|' + (lite ? 'lite' : 'full') + '|' + palKey + '|' + blobKey + '|' + alphaKey + '|' + sizeKey + '|' + washKey + '|' + shapeKey + '|' + shapeAlphaKey + '|' + capKey + '|' + capDarkKey + '|' + shapeEnabledKey + '|' + spreadKey + '|' + spreadMarginKey + '|' + sizeLimitKey + '|' + alphaFixedKey;

      var token = ++lastToken;

      function doRender(assets, seed){
        if(token !== lastToken) return;
        var svg = ensureSvgLayer(canvas);
        var rnd = mulberry32(seed);
        // onthoud de canvas/viewport maat van de eerste echte render.
        var info = renderCanvas(canvas, assets.palette, rnd, lite, opts);
        if(cache){
          cache._lastCssW = info && info.cssW ? info.cssW : cache._lastCssW;
          cache._lastCssH = info && info.cssH ? info.cssH : cache._lastCssH;
        }
        if(opts && opts.shapeEnabled === false){
          if(svg){
            while(svg.firstChild) svg.removeChild(svg.firstChild);
          }
          return;
        }
        // aparte rnd zodat canvas+svg altijd dezelfde output houden
        var rnd2 = mulberry32(seed ^ 0xA5A5A5A5);
        renderSvgLayer(svg, assets.shapes, assets.palette, rnd2, lite, opts);
      }

      function ensureCache(){
        if(cache && cache.key===key && cache.assets && cache.seed){
          return Promise.resolve(cache);
        }
        var seed = (Date.now() ^ ((Math.random()*0xffffffff)>>>0)) >>> 0;
        return buildAssets(opts).then(function(assets){
          cache = { key:key, seed:seed, assets:assets, lite:lite };
          return cache;
        });
      }

      ensureCache().then(function(c){
        doRender(c.assets, c.seed);
      });

      // re-render on resize (debounced) – zónder nieuwe random
      var t = 0;
      function onResize(){
        if(t) w.clearTimeout(t);
        t = w.setTimeout(function(){
          if(!cache || cache.key!==key) return;
          // Op sommige browsers triggert scroll (address bar / layout) een resize.
          // De gebruiker wil: eenmaal geladen = niet meer veranderen bij scroll.
          // Daarom negeren we 'resize' events die alleen (klein) de hoogte aanpassen.
          var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
          if(!rect){
            doRender(cache.assets, cache.seed);
            return;
          }
          var cw = rect.width || 0;
          var ch = rect.height || 0;
          var lastW = cache._lastCssW || 0;
          var lastH = cache._lastCssH || 0;

          var dw = Math.abs(cw - lastW);
          var dh = Math.abs(ch - lastH);

          // Redraw alleen bij:
          // - duidelijke breedte verandering (desktop resize / rotatie)
          // - of grote hoogte verandering (rotatie)
          // Kleine hoogte-shifts door scroll → overslaan.
          if(dw >= 2 || dh >= 140){
            doRender(cache.assets, cache.seed);
          }
        }, 120);
      }

      if(!canvas._pkBgBound){
        canvas._pkBgBound = true;
        w.addEventListener('resize', onResize, { passive:true });
      }
    }
  };
})(window);
