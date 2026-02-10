// Praatkaartjes – uitleg pagina (ES5)
// Doel:
// - 1 SVG tonen in hetzelfde frame als het grid (img in cardInner)
// - uitlegtekst eronder tonen
// - tik links/rechts op de kaart om te navigeren
// - tekstvak pakt een lichte tint van de dominante kleur uit de SVG

(function(w){
  'use strict';
  var PK = w.PK || {};

  // --- elements ---
  var imgEl = w.document.getElementById('uitlegImg');
  var kaartThemaEl = w.document.getElementById('kaartThema');
  var descEl = w.document.getElementById('desc');
  var closeHelp = w.document.getElementById('closeHelp');
  var uitlegTextEl = w.document.querySelector ? w.document.querySelector('.uitlegText') : null;
  var cardTapEl = w.document.querySelector ? w.document.querySelector('.uitlegCardInner') : null;

  if(!imgEl || !descEl) return;

  var setName = (PK.getQueryParam('set') || 'samenwerken');
  setName = String(setName).replace(/^\s+|\s+$/g,'') || 'samenwerken';
  var encSet = encodeURIComponent(setName);

  // embed-mode (in bottom sheet): transparant + geen extra UI
  var isEmbed = String(PK.getQueryParam('embed') || '').replace(/\s+/g,'') === '1';
  try{
    if(isEmbed && w.document && w.document.body && w.document.body.classList){
      w.document.body.classList.add('embed');
    }
  }catch(_e){}

  // paden
  var BASE = '..';
  function cardPathRect(file){ return BASE + '/sets/' + encSet + '/cards_rect/' + file; }
  function cardPathSquare(file){ return BASE + '/sets/' + encSet + '/cards/' + file; }
  var uitlegPath = BASE + '/sets/' + encSet + '/uitleg.json';

  // slides (wordt opgebouwd uit meta.json zodat elke set werkt)
  var slides = [];

  var uitlegData = {};
  var index = 0;

  function getDesc(key){
    var v = (uitlegData && typeof uitlegData==='object') ? uitlegData[key] : '';
    v = (v==null) ? '' : String(v);
    return v.replace(/^\s+|\s+$/g,'');
  }

  function applyDominantTint(svgUrl){
    if(PK.applyDominantTint){
      PK.applyDominantTint(uitlegTextEl, svgUrl, '#F4F4F4');
      return;
    }
    if(!uitlegTextEl) return;
    uitlegTextEl.style.background = '#F4F4F4';
  }

  function render(){
    var s = slides[index];
    if(!s){ return; }
    // Prefer rect variant; fallback naar cards/ als rect niet bestaat
    imgEl.onerror = null;
    imgEl.src = s.src;
    if(s.fallback){
      imgEl.onerror = function(){
        this.onerror = null;
        this.src = s.fallback;
        applyDominantTint(s.fallback);
      };
    }
    imgEl.alt = s.alt;
    descEl.textContent = getDesc(s.key);
    applyDominantTint(s.src);
    // update sheet hoogte (in embed)
    try{ w.setTimeout(reportHeight, 0); }catch(_e){}

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
    if(w.parent && w.parent !== w && w.parent.postMessage){
      w.parent.postMessage({ type:'pk_close_help' }, '*');
      return;
    }
    w.location.href = '../kaarten.html?set=' + encodeURIComponent(setName);
  }

  function buildSlidesFromMeta(meta){
    var out = [];
    var coverFile = (meta && meta.cover) ? meta.cover : 'voorkant.svg';
    out.push({ key:'cover', src: PK.withV(cardPathRect(coverFile)), fallback: PK.withV(cardPathSquare(coverFile)), alt:'Voorkant' });

    if(meta && Array.isArray(meta.themes)){
      for(var i=0;i<meta.themes.length;i++){
        var t = meta.themes[i] || {};
        var key = String(t.key||'').replace(/^\s+|\s+$/g,'');
        if(!key) continue;
        var label = (t.label || key);
        var file = t.card || (key + '.svg');
        out.push({ key: key, src: PK.withV(cardPathRect(file)), fallback: PK.withV(cardPathSquare(file)), alt: label });
      }
    }
    return out;
  }

  function loadMeta(){
    return PK.getJson(PK.withV(BASE + '/sets/' + encSet + '/meta.json'));
  }

  // data laden (mag falen)
  Promise.all([
    loadMeta(),
    PK.getJson(PK.withV(uitlegPath)).catch(function(){ return {}; })
  ]).then(function(res){
    var meta = res && res[0] ? res[0] : {};
    uitlegData = res && res[1] ? res[1] : {};
    slides = buildSlidesFromMeta(meta);
    if(!slides.length){ slides = [{ key:'cover', src: PK.withV(cardPathRect('voorkant.svg')), fallback: PK.withV(cardPathSquare('voorkant.svg')), alt:'Voorkant' }]; }
    index = 0;
    render();
  }).catch(function(){
    slides = [{ key:'cover', src: PK.withV(cardPathRect('voorkant.svg')), fallback: PK.withV(cardPathSquare('voorkant.svg')), alt:'Voorkant' }];
    uitlegData = {};
    index = 0;
    render();
  });

  if(closeHelp) closeHelp.onclick = requestClose;

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
})(window);
