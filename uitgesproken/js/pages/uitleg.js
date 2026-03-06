// Praatkaartjes – uitleg pagina

export function initUitleg() {
  
  // --- elements ---
  var imgEl = document.getElementById('uitlegImg');
  var kaartThemaEl = document.getElementById('kaartThema');
  var descEl = document.getElementById('desc');
  var closeHelp = document.getElementById('closeHelp');
  var uitlegTextEl = document.querySelector ? document.querySelector('.uitlegText') : null;
  var cardTapEl = document.querySelector ? document.querySelector('.uitlegCardInner') : null;
  
  if(!imgEl || !descEl) return;
  
  var setName = (window.PK.getQueryParam('set') || 'samenwerken');
  setName = String(setName).replace(/^\s+|\s+$/g,'') || 'samenwerken';
  var encSet = encodeURIComponent(setName);
  
  // embed-mode (in bottom sheet): transparant + geen extra UI
  var isEmbed = String(window.PK.getQueryParam('embed') || '').replace(/\s+/g,'') === '1';
  try{
    if(isEmbed && document && document.body && document.body.classList){
      document.body.classList.add('embed');
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
      t === 'Teamrollen van Belbin' ||
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
      var heading = getInfoHeadingText(lineParts[0]);
      if(heading && lineParts.length === 1){
        cls = ' class="infoTextSubhead"';
        body = '<strong>' + escapeHtml(heading) + '</strong>';
      }else if(!introAssigned){
        cls = ' class="infoTextIntro"';
        introAssigned = true;
      }
      if(!body){
        var rendered = [];
        var startIdx = 0;
        if(heading && lineParts.length > 1){
          startIdx = 1;
        }
        for(k = startIdx; k < lineParts.length; k++){
          rendered.push(formatInlineInfoText(lineParts[k]));
        }
        body = rendered.join('<br>');
        if(heading && lineParts.length > 1){
          body = '<strong class="infoTextHeading">' + escapeHtml(heading) + '</strong><br>' + body;
        }
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
        para.push('**' + headingLine + '**');
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
      isDark = !!(document && document.documentElement && document.documentElement.getAttribute('data-contrast') === 'dark');
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
    try{ window.setTimeout(reportHeight, 0); }catch(_e){}
  
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
    if(window.parent && window.parent !== w && window.parent.postMessage){
      window.parent.postMessage({ type:'pk_close_help' }, '*');
      return;
    }
    window.location.href = '../kaarten/?set=' + encodeURIComponent(setName);
  }
  
  function buildSlidesFromMeta(meta){
    var out = [];
    var coverFile = (meta && meta.cover) ? meta.cover : 'voorkant.svg';
    out.push({ key:'cover', src: window.PK.withV(cardPathRect(coverFile)), fallback: window.PK.withV(cardPathSquare(coverFile)), alt:'Voorkant' });
  
    if(meta && Array.isArray(meta.themes)){
      for(var i=0;i<meta.themes.length;i++){
        var t = meta.themes[i] || {};
        var key = String(t.key||'').replace(/^\s+|\s+$/g,'');
        if(!key) continue;
        var label = (t.label || key);
        var file = t.card || (key + '.svg');
        out.push({ key: key, src: window.PK.withV(cardPathRect(file)), fallback: window.PK.withV(cardPathSquare(file)), alt: label });
      }
    }
    return out;
  }
  
  function loadMeta(){
    return window.PK.getJson(window.PK.withV(BASE + '/sets/' + encSet + '/meta.json'));
  }
  
  // data laden (mag falen)
  Promise.all([
    loadMeta(),
    window.PK.getJson(window.PK.withV(uitlegPath)).catch(function(){ return {}; })
  ]).then(function(res){
    var meta = res && res[0] ? res[0] : {};
    uitlegData = res && res[1] ? res[1] : {};
    slides = buildSlidesFromMeta(meta);
    if(!slides.length){ slides = [{ key:'cover', src: window.PK.withV(cardPathRect('voorkant.svg')), fallback: window.PK.withV(cardPathSquare('voorkant.svg')), alt:'Voorkant' }]; }
    index = 0;
    render();
  }).catch(function(){
    slides = [{ key:'cover', src: window.PK.withV(cardPathRect('voorkant.svg')), fallback: window.PK.withV(cardPathSquare('voorkant.svg')), alt:'Voorkant' }];
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
}
