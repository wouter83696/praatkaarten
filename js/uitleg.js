// uitleg.js (ES5 / Android-safe)
// Doel:
// - 1 SVG tonen in hetzelfde frame als het grid (img in cardInner)
// - uitlegtekst eronder tonen
// - tik links/rechts op de kaart om te navigeren
// - tekstvak pakt een lichte tint van de dominante kleur uit de SVG

(function(){
  'use strict';

  var VERSION = (window.PK && window.PK.VERSION) ? window.PK.VERSION : '3.7.1';

  function withV(url){
    return url + (url.indexOf('?')===-1 ? '?' : '&') + 'v=' + encodeURIComponent(VERSION);
  }

  // --- query parsing (geen URLSearchParams) ---
  function getQueryParam(name){
    var s = window.location.search || '';
    if(s.charAt(0)==='?') s = s.substring(1);
    var parts = s.split('&');
    for(var i=0;i<parts.length;i++){
      var kv = parts[i].split('=');
      if(decodeURIComponent(kv[0]||'')===name) return decodeURIComponent(kv[1]||'');
    }
    return '';
  }

  function prettifySetName(s){
    s = String(s || '').replace(/[._-]+/g,' ').replace(/^\s+|\s+$/g,'');
    if(!s) return '';
    var words = s.split(/\s+/);
    for(var i=0;i<words.length;i++){
      var w = words[i];
      words[i] = w ? (w.charAt(0).toUpperCase() + w.slice(1)) : '';
    }
    return words.join(' ');
  }

  // --- fetch JSON/text met fallback XHR ---
  function getText(url){
    if(window.fetch){
      return fetch(url, { cache:'no-store' }).then(function(r){ return r.text(); });
    }
    return new Promise(function(resolve, reject){
      try{
        var x = new XMLHttpRequest();
        x.open('GET', url, true);
        x.onreadystatechange = function(){
          if(x.readyState===4){
            if(x.status>=200 && x.status<300) resolve(x.responseText);
            else reject(new Error('HTTP '+x.status));
          }
        };
        x.send(null);
      }catch(e){ reject(e); }
    });
  }

  function getJson(url){
    return getText(url).then(function(t){
      try{ return JSON.parse(t); }catch(e){ return {}; }
    }, function(){
      return {};
    });
  }

  // --- dominante kleur uit SVG (simpel + robuust) ---
  function parseHexToRgb(hex){
    var h = String(hex||'').replace('#','').trim();
    if(h.length===3){ h = h.charAt(0)+h.charAt(0)+h.charAt(1)+h.charAt(1)+h.charAt(2)+h.charAt(2); }
    if(h.length!==6) return null;
    var r = parseInt(h.slice(0,2),16);
    var g = parseInt(h.slice(2,4),16);
    var b = parseInt(h.slice(4,6),16);
    if(isNaN(r)||isNaN(g)||isNaN(b)) return null;
    return {r:r,g:g,b:b};
  }

  function parseRgbFunc(c){
    var m = String(c||'').match(/^rgba?\(([^)]+)\)$/i);
    if(!m) return null;
    var p = m[1].split(',');
    if(p.length<3) return null;
    var r = Math.max(0, Math.min(255, parseFloat(String(p[0]).trim())));
    var g = Math.max(0, Math.min(255, parseFloat(String(p[1]).trim())));
    var b = Math.max(0, Math.min(255, parseFloat(String(p[2]).trim())));
    if(isNaN(r)||isNaN(g)||isNaN(b)) return null;
    return {r:Math.round(r), g:Math.round(g), b:Math.round(b)};
  }

  function parseColorToRgb(c){
    if(!c) return null;
    c = String(c).trim().toLowerCase();
    if(c==='none' || c==='transparent') return null;
    if(c.indexOf('url(')===0) return null;
    if(c.charAt(0)==='#') return parseHexToRgb(c);
    if(c.indexOf('rgb')===0) return parseRgbFunc(c);
    return null;
  }

  function isNearWhite(rgb){ return rgb.r>245 && rgb.g>245 && rgb.b>245; }
  function isNearBlack(rgb){ return rgb.r<10 && rgb.g<10 && rgb.b<10; }

  function lighten(rgb, amount){
    // amount 0..1 meng met wit
    if(amount==null) amount = 0.88;
    return {
      r: Math.round(rgb.r + (255-rgb.r)*amount),
      g: Math.round(rgb.g + (255-rgb.g)*amount),
      b: Math.round(rgb.b + (255-rgb.b)*amount)
    };
  }

  function dominantColorFromSvgText(svgText){
    if(!svgText) return null;
    var counts = {}; // key -> count

    function addColor(raw){
      var rgb = parseColorToRgb(raw);
      if(!rgb) return;
      if(isNearWhite(rgb) || isNearBlack(rgb)) return;
      var key = rgb.r+','+rgb.g+','+rgb.b;
      counts[key] = (counts[key]||0) + 1;
    }

    // fill/stroke attributes
    var attrRe = /(fill|stroke)\s*=\s*["']([^"']+)["']/gi;
    var m;
    while((m = attrRe.exec(svgText))){
      addColor(m[2]);
    }
    // inline styles
    var styleRe = /(fill|stroke)\s*:\s*([^;\}]+)\s*[;\}]/gi;
    while((m = styleRe.exec(svgText))){
      addColor(m[2]);
    }

    var bestKey = null;
    var bestN = 0;
    for(var k in counts){
      if(counts.hasOwnProperty(k) && counts[k] > bestN){
        bestN = counts[k];
        bestKey = k;
      }
    }
    if(!bestKey) return null;
    var parts = bestKey.split(',');
    return { r: parseInt(parts[0],10), g: parseInt(parts[1],10), b: parseInt(parts[2],10) };
  }

  // --- elements ---
  var imgEl = document.getElementById('uitlegImg');
  var kaartThemaEl = document.getElementById('kaartThema');
  var descEl = document.getElementById('desc');
  var closeHelp = document.getElementById('closeHelp');
  var uitlegTextEl = document.querySelector ? document.querySelector('.uitlegText') : null;
  var cardTapEl = document.querySelector ? document.querySelector('.uitlegCardInner') : null;

  if(!imgEl || !descEl) return;

  var setName = (getQueryParam('set') || 'samenwerken');
  setName = String(setName).replace(/^\s+|\s+$/g,'') || 'samenwerken';
  var encSet = encodeURIComponent(setName);
  var themeName = prettifySetName(setName);

  // paden
  var BASE = '..';
  var setsDir = (window.PK && window.PK.PATHS && window.PK.PATHS.setsDir) ? window.PK.PATHS.setsDir : (BASE + '/');
  function cardPath(file){ return setsDir + '/' + encSet + '/cards/' + file; }
  var uitlegPath = setsDir + '/' + encSet + '/uitleg.json';

  // slides
  var slides = [
    { key:'cover',       src: withV(cardPath('voorkant.svg')),    alt:'Voorkant' },
    { key:'verkennen',   src: withV(cardPath('verkennen.svg')),   alt:'Verkennen' },
    { key:'duiden',      src: withV(cardPath('duiden.svg')),      alt:'Duiden' },
    { key:'verbinden',   src: withV(cardPath('verbinden.svg')),   alt:'Verbinden' },
    { key:'verhelderen', src: withV(cardPath('verhelderen.svg')), alt:'Verhelderen' },
    { key:'vertragen',   src: withV(cardPath('vertragen.svg')),   alt:'Vertragen' },
    { key:'bewegen',     src: withV(cardPath('bewegen.svg')),     alt:'Bewegen' }
  ];

  var uitlegData = {};
  var index = 0;

  function getDesc(key){
    var v = (uitlegData && typeof uitlegData==='object') ? uitlegData[key] : '';
    v = (v==null) ? '' : String(v);
    return v.replace(/^\s+|\s+$/g,'');
  }

  function applyDominantTint(svgUrl){
    if(!uitlegTextEl) return;
    // default
    uitlegTextEl.style.background = '#F4F4F4';
    getText(svgUrl).then(function(txt){
      var dom = dominantColorFromSvgText(txt);
      if(!dom) return;
      var lite = lighten(dom, 0.88);
      uitlegTextEl.style.background = 'rgb(' + lite.r + ', ' + lite.g + ', ' + lite.b + ')';
    }, function(){
      // keep default
    });
  }

  function render(){
    var s = slides[index];
    imgEl.src = s.src;
    imgEl.alt = s.alt;
    descEl.textContent = getDesc(s.key);
    applyDominantTint(s.src);

    // Themanaam midden op kaart (behalve voorkant)
    if(kaartThemaEl){
      if(s.key==='cover'){
        kaartThemaEl.textContent = '';
        kaartThemaEl.style.display = 'none';
      }else{
        kaartThemaEl.style.display = 'block';
        kaartThemaEl.textContent = s.alt || '';
      }
    }
  }

  function go(delta){
    index = index + delta;
    if(index<0) index = 0;
    if(index>slides.length-1) index = slides.length-1;
    render();
  }

  function requestClose(){
    // als het ooit embedded wordt
    if(window.parent && window.parent !== window && window.parent.postMessage){
      window.parent.postMessage({ type:'pk_close_help' }, '*');
      return;
    }
    var cardsPage = (window.PK && PK.PATHS && PK.PATHS.cardsPage) ? PK.PATHS.cardsPage : '../kaarten.html';
    window.location.href = cardsPage + '?set=' + encodeURIComponent(setName);
  }

  // data laden (mag falen)
  getJson(withV(uitlegPath)).then(function(json){
    uitlegData = json || {};
    render();
  }, function(){
    uitlegData = {};
    render();
  });

  if(closeHelp){ closeHelp.onclick = requestClose; }

  // tik links/rechts op de kaart
  if(cardTapEl && cardTapEl.addEventListener){
    cardTapEl.addEventListener('click', function(e){
      var rect = cardTapEl.getBoundingClientRect ? cardTapEl.getBoundingClientRect() : null;
      if(!rect) return;
      var x = (e && typeof e.clientX==='number') ? e.clientX : 0;
      var rel = x - rect.left;
      if(rel < rect.width * 0.5) go(-1); else go(1);
    });
  }

})();
