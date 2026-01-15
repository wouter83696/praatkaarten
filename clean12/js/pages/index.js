// Praatkaartjes – index pagina (ES5)
(function(w){
  'use strict';
  var PK = w.PK || {};

  var grid = w.document.getElementById('grid');
  if(!grid) return;

  var THEMES = [];
  var CARD_BASE = 'sets/samenwerken/cards/';
  var CURRENT_SET = 'samenwerken';
  var CURRENT_META = null;
  var sheetAPI = null;

  function setThemePillText(txt){
    var pillText = w.document.getElementById('themePillText');
    if(pillText) pillText.textContent = (txt || PK.prettyName(PK.getActiveSet()));
  }

  function openMenu(){
  if(sheetAPI && sheetAPI.open){ sheetAPI.open(); return; }
  var menu = w.document.getElementById('themeMenu');
  var overlay = w.document.getElementById('themeMenuOverlay');
  var pill = w.document.getElementById('themePill');
  if(menu) menu.hidden = false;
  if(overlay) overlay.hidden = false;
  if(pill) pill.setAttribute('aria-expanded','true');
}

function closeMenu(){
  if(sheetAPI && sheetAPI.close){ sheetAPI.close(); return; }
  var menu = w.document.getElementById('themeMenu');
  var overlay = w.document.getElementById('themeMenuOverlay');
  var pill = w.document.getElementById('themePill');
  if(menu) menu.hidden = true;
  if(overlay) overlay.hidden = true;
  if(pill) pill.setAttribute('aria-expanded','false');
}


  function parseInlineQuestions(){
    try{
      var el = w.document.getElementById('questions-json');
      if(el && el.textContent && el.textContent.replace(/\s+/g,'').length) return JSON.parse(el.textContent);
    }catch(e){}
    return null;
  }

  function resolveActiveSet(){
    var fromUrl = (PK.getQueryParam('set') || PK.getQueryParam('s') || '').replace(/\s+$/,'').replace(/^\s+/,'');
    return PK.loadJson(PK.PATHS ? PK.PATHS.setsIndex : 'sets/index.json').then(function(idx){
      var sets = Array.isArray(idx.sets) ? idx.sets : [];
      var available = sets.map(function(x){ return x.id; });
      var def = (idx.default || '').replace(/\s+/g,' ').replace(/^\s+|\s+$/g,'');
      if(fromUrl && available.indexOf(fromUrl)!==-1) return fromUrl;
      if(def && available.indexOf(def)!==-1) return def;
      if(available.length) return available[0];
      return fromUrl || 'samenwerken';
    }).catch(function(){
      return fromUrl || 'samenwerken';
    });
  }

  function applySetMeta(setId, meta){
    CURRENT_SET = setId;
    CURRENT_META = meta || null;
    CARD_BASE = 'sets/' + encodeURIComponent(setId) + '/cards/';

    var icon = w.document.getElementById('setCoverIcon');
    if(icon){
      var cover = (meta && meta.cover) ? meta.cover : 'voorkant.svg';
      icon.setAttribute('src', CARD_BASE + cover);
    }

    var pill = w.document.getElementById('themePill');
    if(pill){ pill.setAttribute('aria-label', (meta && meta.name) ? meta.name : setId); }

    THEMES = [];
    if(meta && Array.isArray(meta.themes)){
      for(var i=0;i<meta.themes.length;i++){
        var k = String((meta.themes[i]||{}).key||'').replace(/^\s+|\s+$/g,'');
        if(k) THEMES.push(k);
      }
    }

    var menuList = w.document.getElementById('menuList');
    if(menuList){
      menuList.innerHTML = '';
      if(meta && Array.isArray(meta.themes)){
        for(var j=0;j<meta.themes.length;j++){
          var th = meta.themes[j] || {};
          var key = String(th.key||'').replace(/^\s+|\s+$/g,'');
          if(!key) continue;
var cardFile = th.card || (key + '.svg');
if(PK.createMenuItem){
  menuList.appendChild(PK.createMenuItem({ setId: setId, key: key, label: (th.label || key), cardFile: cardFile }));
}else{
  var btn = w.document.createElement('button');
  btn.className = 'menuItem themeItem';
  btn.type = 'button';
  btn.setAttribute('data-set', key);

  var lab = w.document.createElement('span');
  lab.className = 'miLabel';
  lab.textContent = (th.label || key);

  var thumb = w.document.createElement('span');
  thumb.className = 'miThumbRight';
  thumb.setAttribute('aria-hidden','true');

  var mini = w.document.createElement('div');
  mini.className = 'menuThumbCard';

  var miniImg = w.document.createElement('img');
  miniImg.className = 'bg';
  miniImg.src = 'sets/' + encodeURIComponent(setId) + '/cards/' + cardFile;
  miniImg.alt = '';

  mini.appendChild(miniImg);
  thumb.appendChild(mini);

  btn.appendChild(lab);
  btn.appendChild(thumb);
  menuList.appendChild(btn);
}
        }
      }
    }
  }

  function loadMeta(setId){
    return PK.loadJson(PK.pathForSet ? PK.pathForSet(setId, 'meta.json') : ('sets/' + encodeURIComponent(setId) + '/meta.json'));
  }

  function loadQuestions(setId){
    return PK.loadJson(PK.pathForSet ? PK.pathForSet(setId, 'questions.json') : ('sets/' + encodeURIComponent(setId) + '/questions.json')).catch(function(){
      return parseInlineQuestions();
    });
  }

  function cardUrl(themeKey){
    var file = themeKey + '.svg';
    if(CURRENT_META && Array.isArray(CURRENT_META.themes)){
      for(var i=0;i<CURRENT_META.themes.length;i++){
        var t = CURRENT_META.themes[i] || {};
        if(String(t.key||'').replace(/^\s+|\s+$/g,'')===themeKey){ file = (t.card || file); break; }
      }
    }
    return CARD_BASE + file;
  }

  function buildData(qObj){
    var out=[];
    for(var t=0;t<THEMES.length;t++){
      var theme=THEMES[t];
      var arr=(qObj && qObj[theme]) ? qObj[theme] : [];
      for(var i=0;i<arr.length;i++){
        out.push({ theme: theme, q: String(arr[i]||''), bg: cardUrl(theme) });
      }
    }
    return out;
  }

  function showError(msg){
    grid.innerHTML = '<div style="padding:24px;font-family:system-ui;color:#444;">'+msg+'</div>';
  }

  function render(items){
    grid.innerHTML = '';
    var frag = w.document.createDocumentFragment();
    for(var k=0;k<items.length;k++){
      var it = items[k];
      if(PK.createGridCard){
        frag.appendChild(PK.createGridCard(it));
      }else{
        var btn = w.document.createElement('button');
        btn.className = 'card';
        btn.setAttribute('data-theme', it.theme);
        btn.type = 'button';

        var inner = w.document.createElement('div');
        inner.className = 'cardInner';

        var img = w.document.createElement('img');
        img.className = 'bg';
        img.src = PK.withV(it.bg);
        img.alt = '';

        var q = w.document.createElement('div');
        q.className = 'q';
        var span = w.document.createElement('span');
        span.className = 'qText';
        span.textContent = it.q;
        q.appendChild(span);

        inner.appendChild(img);
        inner.appendChild(q);
        btn.appendChild(inner);
        frag.appendChild(btn);
      }
    }
    grid.appendChild(frag);
  }

  function scrollToTheme(themeKey){
    var target = grid.querySelector('.card[data-theme="' + themeKey + '"]');
    closeMenu();
    w.setTimeout(function(){
      if(target && target.scrollIntoView){
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  }

  // init
  resolveActiveSet()
    .then(function(setId){
      if(PK.setActiveSet) PK.setActiveSet(setId);
      return loadMeta(setId).then(function(meta){
        applySetMeta(setId, meta);
        return loadQuestions(setId);
      });
    })
    .then(function(qObj){
      if(!qObj){ showError('Fout bij laden.'); return; }
      var items = buildData(qObj);
      if(!items.length){ showError('Geen kaarten gevonden.'); return; }
      render(items);
    })
    .catch(function(e){
      showError('Fout bij laden.');
      if(w.console && w.console.error) w.console.error(e);
    });

  setThemePillText();

  // Menu wiring
  var pillBtn = w.document.getElementById('themePill');
  var overlay = w.document.getElementById('themeMenuOverlay');
  var menuEl = w.document.getElementById('themeMenu');
  if(PK.createBottomSheet){
    sheetAPI = PK.createBottomSheet({ sheet: menuEl, overlay: overlay, trigger: pillBtn });
  }else if(pillBtn){
    pillBtn.onclick = function(){
      var expanded = pillBtn.getAttribute('aria-expanded') === 'true';
      if(expanded) closeMenu(); else openMenu();
    };
    if(overlay) overlay.onclick = closeMenu;
  }


  var menuList = w.document.getElementById('menuList');
  if(menuList){
    menuList.addEventListener('click', function(e){
      var btn = e.target && (e.target.closest ? e.target.closest('button[data-set]') : null);
      if(!btn) return;
      var themeKey = (btn.getAttribute('data-set') || '').replace(/^\s+|\s+$/g,'');
      if(!themeKey) return;

      if(PK.setActiveTheme) PK.setActiveTheme(themeKey);

      var labelEl = btn.querySelector('.miLabel');
      var labelTxt = labelEl ? (labelEl.textContent || '').replace(/^\s+|\s+$/g,'') : PK.prettyName(themeKey);
      setThemePillText(labelTxt);

      scrollToTheme(themeKey);
    });
  }


  var naarOverzicht = w.document.getElementById('naarOverzicht');
  if(naarOverzicht){
    naarOverzicht.onclick = function(){
      closeMenu();
      w.location.href = 'index.html';
    };
  }

  var shuffleBtn = w.document.getElementById('shuffleBtn');
  if(shuffleBtn){
    shuffleBtn.onclick = function(){
      var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
      for(var i=cards.length-1;i>0;i--){
        var j = Math.floor(Math.random()*(i+1));
        var tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp;
      }
      grid.innerHTML='';
      for(var k2=0;k2<cards.length;k2++) grid.appendChild(cards[k2]);
    };
  }

  var uitlegBtn = w.document.getElementById('uitlegBtn');
  if(uitlegBtn){
    uitlegBtn.onclick = function(){
      w.location.href = 'uitleg/uitleg.html?set=' + encodeURIComponent(PK.getActiveSet());
    };
  }
})(window);
