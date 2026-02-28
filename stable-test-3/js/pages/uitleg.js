// Praatkaartjes – uitleg pagina (ES5)
// Doel:
// - 1 SVG tonen in hetzelfde frame als het grid (img in cardInner)
// - uitlegtekst eronder tonen
// - tik links/rechts op de kaart om te navigeren
// - tekstvak gebruikt een vaste, rustige sheet-kleur (geen dominante kaart-tint)

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

  function escapeHtml(v){
    var s = String(v == null ? '' : v);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatInlineInfoText(raw, opts){
    var txt = escapeHtml(raw).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    if(!txt) return '';
    txt = txt.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if(opts && opts.boldLead){
      var m = txt.match(/^([^\n]{1,90}?)\s*(?:-|–|—)\s*(.+)$/);
      if(m){
        txt = '<strong>' + m[1].replace(/^\s+|\s+$/g, '') + '</strong> - ' + m[2].replace(/^\s+|\s+$/g, '');
      }
    }
    return txt;
  }

  function getInfoHeadingText(line){
    var t = String(line || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    var m = t.match(/^\*\*(.+?)\*\*$/);
    if(m && m[1]){
      t = String(m[1]).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    }
    if(
      t === 'Systemisch werken' ||
      t === 'Rollen van Belbin' ||
      t === 'In beweging' ||
      t === 'Waarom werkwoorden?' ||
      t === 'Samen onderzoeken'
    ){
      return t;
    }
    return '';
  }

  function isInfoHeadingLine(line){
    return !!getInfoHeadingText(line);
  }

  function setDescContent(el, raw){
    if(!el) return;
    var text = String(raw == null ? '' : raw).replace(/\r\n?/g, '\n');
    var lines = text.split('\n');
    var html = [];
    var para = [];
    var introAssigned = false;

    function flushParagraph(){
      if(!para.length) return;
      var lineParts = [];
      var k;
      for(k = 0; k < para.length; k++){
        var part = String(para[k] || '').replace(/^\s+|\s+$/g, '');
        if(part) lineParts.push(part);
      }
      var joined = lineParts.join('\n').replace(/^\s+|\s+$/g, '');
      para = [];
      if(!joined) return;
      var cls = '';
      var body = '';
      var heading = (lineParts.length === 1) ? getInfoHeadingText(lineParts[0]) : '';
      if(heading){
        cls = ' class="infoTextSubhead"';
        body = '<strong>' + escapeHtml(heading) + '</strong>';
      }else if(!introAssigned){
        cls = ' class="infoTextIntro"';
        introAssigned = true;
      }
      if(!body){
        var rendered = [];
        for(k = 0; k < lineParts.length; k++){
          rendered.push(formatInlineInfoText(lineParts[k]));
        }
        body = rendered.join('<br>');
      }
      html.push('<p' + cls + '>' + body + '</p>');
    }

    var i = 0;
    while(i < lines.length){
      var line = String(lines[i] || '').replace(/^\s+|\s+$/g, '');
      if(!line){
        flushParagraph();
        i += 1;
        continue;
      }
      var headingLine = getInfoHeadingText(line);
      if(headingLine){
        flushParagraph();
        html.push('<p class="infoTextSubhead"><strong>' + escapeHtml(headingLine) + '</strong></p>');
        i += 1;
        continue;
      }
      if(/^[*•-]\s+/.test(line)){
        flushParagraph();
        var items = [];
        while(i < lines.length){
          var liLine = String(lines[i] || '').replace(/^\s+|\s+$/g, '');
          if(!/^[*•-]\s+/.test(liLine)) break;
          liLine = liLine.replace(/^[*•-]\s+/, '');
          items.push('<li>' + formatInlineInfoText(liLine, { boldLead: true }) + '</li>');
          i += 1;
        }
        if(items.length){
          html.push('<ul class="infoTextList">' + items.join('') + '</ul>');
        }
        continue;
      }
      para.push(line);
      i += 1;
    }
    flushParagraph();
    el.innerHTML = html.join('');
  }

  function applyDominantTint(svgUrl){
    if(!uitlegTextEl) return;
    var isDark = false;
    try{
      isDark = !!(w.document && w.document.documentElement && w.document.documentElement.getAttribute('data-contrast') === 'dark');
    }catch(_eDark){}
    uitlegTextEl.style.background = isDark
      ? 'rgba(23, 22, 50, 0.86)'
      : 'rgba(255, 255, 255, 0.975)';
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
    setDescContent(descEl, getDesc(s.key));
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
    w.location.href = '../kaarten/?set=' + encodeURIComponent(setName);
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
