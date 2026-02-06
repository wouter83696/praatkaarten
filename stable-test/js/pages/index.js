// Praatkaartjes – index pagina (ES5)
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};
  var DEBUG_BUILD = '';

  // Desktop/iPad landing: app niet initialiseren
  try{
    var dl = w.document && w.document.documentElement && w.document.documentElement.getAttribute('data-layout');
    if(dl === 'landing') return;
  }catch(_e){}

  var mainCarousel = w.document.getElementById('mainCarousel');
  if(!mainCarousel) return;

  // debug badge removed

  var THEMES = [];
  var THEME_LABELS = {};

  function pathForSet(setId, rel){
    if(PK.pathForSet) return PK.pathForSet(setId, rel);
    var s = String(setId||'').replace(/^\s+|\s+$/g,'') || 'samenwerken';
    var r = String(rel||'').replace(/^\//,'');
    var base = (PK.PATHS && PK.PATHS.setsDir) ? PK.PATHS.setsDir : '.';
    return base + '/' + encodeURIComponent(s) + '/' + r;
  }

  var CARD_BASE = pathForSet('samenwerken', 'cards_rect/');

  var CURRENT_SET = 'samenwerken';
  var CURRENT_META = null;
  var CURRENT_COVER = 'voorkant.svg';
  var CURRENT_BACK_MODE = 'mirror';
  var PENDING_THEME = '';
  try{
    PENDING_THEME = (PK.getQueryParam && PK.getQueryParam('theme')) ? String(PK.getQueryParam('theme')) : '';
    PENDING_THEME = PENDING_THEME.replace(/^\s+|\s+$/g,'');
  }catch(_eTheme){ PENDING_THEME = ''; }
  // Huidige data-volgorde (grid + carrousel)
  var ITEMS = [];
  // Originele volgorde om terug te kunnen als shuffle uitgaat
  var ORIGINAL_ITEMS = [];
  // Shuffle state (komt uit localStorage + toggle)
  var SHUFFLE_ON = false;
  var sheetAPI = null;
  var infoAPI = null;
  var UI_DEFAULTS = {};

  function trackSetVisit(setId){
    var id = String(setId || '').replace(/^\s+|\s+$/g,'');
    if(!id) return;
    try{
      var raw = w.localStorage.getItem('pk_set_counts') || '';
      var data = raw ? JSON.parse(raw) : {};
      if(!data || typeof data !== 'object') data = {};
      var cur = parseInt(data[id], 10);
      if(!isFinite(cur)) cur = 0;
      data[id] = cur + 1;
      w.localStorage.setItem('pk_set_counts', JSON.stringify(data));
    }catch(_e){}
  }

  function getIndexBackgroundConfig(){
    var cfg = null;
    try{
      if(PK && PK.UI_ACTIVE && PK.UI_ACTIVE.index && PK.UI_ACTIVE.index.background){
        cfg = PK.UI_ACTIVE.index.background;
      }else if(UI_DEFAULTS && UI_DEFAULTS.index && UI_DEFAULTS.index.background){
        cfg = UI_DEFAULTS.index.background;
      }
    }catch(_e){}
    return cfg || null;
  }

  function renderIndexBackground(){
    if(!(PK.indexBackground && PK.indexBackground.render)) return;
    var opts = { cardBase: CARD_BASE };
    var bg = getIndexBackgroundConfig();
    if(bg){
      if(Array.isArray(bg.palette)) opts.palette = bg.palette;
      if(Array.isArray(bg.darkPalette)) opts.darkPalette = bg.darkPalette;
      if(bg.baseWash === false) opts.baseWash = false;
      if(typeof bg.blobCount === 'number') opts.blobCount = bg.blobCount;
      if(typeof bg.alphaBoost === 'number') opts.alphaBoost = bg.alphaBoost;
      if(typeof bg.darkAlphaBoost === 'number') opts.darkAlphaBoost = bg.darkAlphaBoost;
      if(typeof bg.sizeScale === 'number') opts.sizeScale = bg.sizeScale;
      if(typeof bg.darkSizeScale === 'number') opts.darkSizeScale = bg.darkSizeScale;
      if(typeof bg.blobIrregularity === 'number') opts.blobIrregularity = bg.blobIrregularity;
      if(typeof bg.blobPointsMin === 'number') opts.blobPointsMin = bg.blobPointsMin;
      if(typeof bg.blobPointsMax === 'number') opts.blobPointsMax = bg.blobPointsMax;
      if(typeof bg.darkMix === 'number') opts.darkMix = bg.darkMix;
      if(typeof bg.blobWash === 'number') opts.blobWash = bg.blobWash;
      if(typeof bg.shapeWash === 'number') opts.shapeWash = bg.shapeWash;
      if(typeof bg.shapeAlphaBoost === 'number') opts.shapeAlphaBoost = bg.shapeAlphaBoost;
      if(typeof bg.blobAlphaCap === 'number') opts.blobAlphaCap = bg.blobAlphaCap;
      if(typeof bg.blobAlphaCapDark === 'number') opts.blobAlphaCapDark = bg.blobAlphaCapDark;
      if(typeof bg.blobSpread === 'string') opts.blobSpread = bg.blobSpread;
      if(typeof bg.blobSpreadMargin === 'number') opts.blobSpreadMargin = bg.blobSpreadMargin;
      if(typeof bg.sizeLimit === 'number') opts.sizeLimit = bg.sizeLimit;
      if(typeof bg.blobAlphaFixed === 'number') opts.blobAlphaFixed = bg.blobAlphaFixed;
    }
    PK.indexBackground.render(opts);
  }


  function fisherYates(arr){
    var a = (arr || []).slice();
    for(var i=a.length-1; i>0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // Infinite scroll helper (clones first/last)
  function enableInfiniteCarousel(container, slideClass){
    if(!container) return { hasClones:false };
    var slides = container.querySelectorAll('.' + slideClass);
    if(!slides || slides.length < 2) return { hasClones:false };
    // voorkom dubbel toepassen
    if(container.getAttribute('data-infinite') === '1') return { hasClones:true };

    var first = slides[0].cloneNode(true);
    var last  = slides[slides.length-1].cloneNode(true);
    first.classList.add('is-clone');
    last.classList.add('is-clone');

    container.insertBefore(last, slides[0]);
    container.appendChild(first);
    container.setAttribute('data-infinite','1');

    function slideWidth(){
      var all = container.querySelectorAll('.' + slideClass);
      if(!all || all.length < 3) return 0;
      var r = all[1].getBoundingClientRect();
      return (r && r.width) ? r.width : 0;
    }

    // Start op eerste echte slide
    w.requestAnimationFrame(function(){
      var w1 = slideWidth();
      if(w1) container.scrollLeft = w1;
    });

    var jumping = false;
    container.addEventListener('scroll', function(){
      if(jumping) return;
      var all = container.querySelectorAll('.' + slideClass);
      if(!all || all.length < 3) return;
      var sw = slideWidth();
      if(!sw) return;
      var nReal = all.length - 2;
      var left = container.scrollLeft || 0;

      // dicht bij clone links
      if(left <= sw * 0.25){
        jumping = true;
        container.scrollLeft = sw * nReal;
        w.requestAnimationFrame(function(){ jumping = false; });
        return;
      }
      // dicht bij clone rechts
      if(left >= sw * (nReal + 1 - 0.25)){
        jumping = true;
        container.scrollLeft = sw;
        w.requestAnimationFrame(function(){ jumping = false; });
      }
    }, { passive:true });

    return { hasClones:true };
  }

  function applyShuffleToUI(){
    // Houd ORIGINAL_ITEMS intact, pas alleen ITEMS + render aan.
    var next = SHUFFLE_ON ? fisherYates(ORIGINAL_ITEMS) : ORIGINAL_ITEMS.slice();
    ITEMS = next;
    render(ITEMS);
    // Als de sheet al kaarten bevat: opnieuw vullen met dezelfde volgorde.
    if(cardsCarousel && cardsCarousel.children && cardsCarousel.children.length){
      renderCards(ITEMS);
      // terug naar eerste kaart (voorspelbaar)
      w.setTimeout(function(){ goToCardIndex(0); }, 30);
    }
  }

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
    return PK.loadJson(PK.PATHS.setsIndex).then(function(idx){
      UI_DEFAULTS = (idx && idx.uiDefaults) ? idx.uiDefaults : {};
      try{ PK.UI_DEFAULTS = UI_DEFAULTS; }catch(_eU){}
      try{ renderIndexBackground(); }catch(_eBg1){}
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
    CURRENT_COVER = (meta && meta.cover) ? meta.cover : 'voorkant.svg';
    CURRENT_BACK_MODE = normalizeBackMode(meta && meta.backMode);
    CARD_BASE = pathForSet(setId, 'cards_rect/');
    try{ w.localStorage.setItem('pk_last_set', String(setId || '').replace(/^\s+|\s+$/g,'')); }catch(_eStore){}

    var icon = w.document.getElementById('setCoverIcon');
    var brandIcon = false;
    try{
      brandIcon = !!(w.document && w.document.body && w.document.body.getAttribute('data-brand-icon') === '1');
    }catch(_e0){}
    if(icon && !brandIcon){
      icon.setAttribute('src', CARD_BASE + CURRENT_COVER);
    }

    var pill = w.document.getElementById('themePill');
    if(pill){ pill.setAttribute('aria-label', (meta && meta.name) ? meta.name : setId); }

    // Menu titel: kaartenset naam (ipv "Thema's")
    var menuTitle = w.document.getElementById('menuSetTitle');
    if(menuTitle){
      menuTitle.textContent = (meta && meta.name) ? meta.name : PK.prettyName(setId);
    }
    trackSetVisit(setId);

    THEMES = [];
    THEME_LABELS = {};
    if(meta && Array.isArray(meta.themes)){
      for(var i=0;i<meta.themes.length;i++){
        var k = String((meta.themes[i]||{}).key||'').replace(/^\s+|\s+$/g,'');
        if(k) THEMES.push(k);
        if(k){
          var th = meta.themes[i] || {};
          THEME_LABELS[k] = String(th.label || k);
        }
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
  menuList.appendChild(PK.createMenuItem({ setId: setId, key: key, label: (th.label || key), cardFile: cardFile, cover: CURRENT_COVER }));
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
  var miniSrc = pathForSet(setId, 'cards_rect/' + cardFile);
  miniImg.src = PK.withV ? PK.withV(miniSrc) : miniSrc;
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

    // UI overrides: defaults uit sets/index.json + per-set meta.ui
    if(PK.applyUiConfig){
      try{ PK.applyUiConfig(setId, meta && meta.ui ? meta.ui : null, UI_DEFAULTS); }catch(_eUi){}
    }
    try{ renderIndexBackground(); }catch(_eBg){}
  }

  function normalizeBackMode(v){
    var s = String(v || '').toLowerCase();
    if(s === 'none' || s === 'empty' || s === 'leeg' || s === 'blank') return 'none';
    if(s === 'cover' || s === 'voorkant' || s === 'front') return 'cover';
    if(s === 'mirror' || s === 'spiegel' || s === 'mirrored') return 'mirror';
    return 'mirror'; // default
  }

  function loadMeta(setId){
    return PK.loadJson(PK.pathForSet ? PK.pathForSet(setId, 'meta.json') : pathForSet(setId, 'meta.json'));
  }

  function loadQuestions(setId){
    return PK.loadJson(PK.pathForSet ? PK.pathForSet(setId, 'questions.json') : pathForSet(setId, 'questions.json')).catch(function(){
      return parseInlineQuestions();
    });
  }

  function loadBacks(setId){
    return PK.loadJson(PK.pathForSet ? PK.pathForSet(setId, 'backs.json') : pathForSet(setId, 'backs.json')).catch(function(){
      return null;
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

  function normalizeQuestionEntry(entry){
    if(entry === null || entry === undefined) return { q:'', back:'' };
    var t = typeof entry;
    if(t === 'string' || t === 'number'){ return { q: String(entry), back:'' }; }
    if(t === 'object'){
      var q = entry.voorkant || entry.q || entry.front || entry.vraag || entry.text || '';
      var back = entry.achterkant || entry.back || entry.backText || entry.achter || '';
      return { q: String(q || ''), back: String(back || '') };
    }
    return { q: String(entry), back:'' };
  }

  function buildData(qObj, backObj){
    var out=[];
    for(var t=0;t<THEMES.length;t++){
      var theme=THEMES[t];
      var arr=(qObj && qObj[theme]) ? qObj[theme] : [];
      var backArr=(backObj && backObj[theme]) ? backObj[theme] : null;
      for(var i=0;i<arr.length;i++){
        var norm = normalizeQuestionEntry(arr[i]);
        var backTxt = norm.back;
        if(!backTxt && backArr && backArr[i] !== undefined && backArr[i] !== null){
          backTxt = String(backArr[i] || '');
        }
        out.push({
          theme: theme,
          themeLabel: (THEME_LABELS[theme] || PK.prettyName(theme)),
          q: norm.q,
          voorkant: norm.q,
          back: backTxt,
          achterkant: backTxt,
          bg: cardUrl(theme)
        });
      }
    }
    return out;
  }

  function showError(msg){
    mainCarousel.innerHTML = '<div role="status" aria-live="polite" aria-atomic="true" style="padding:24px;font-family:system-ui;color:#444;">'+msg+'</div>';
  }

  function render(items){
    ITEMS = items || [];
    renderCards(ITEMS);
  }

  function scrollToTheme(themeKey){
    closeMenu();
    // Scroll in de centrale carrousel naar de eerste kaart van dit thema.
    var idx = -1;
    for(var i=0;i<(ITEMS||[]).length;i++){
      if((ITEMS[i]||{}).theme === themeKey){ idx = i; break; }
    }
    if(idx >= 0){
      w.setTimeout(function(){ goToCardIndex(idx); }, 40);
    }
  }

  function applyThemeFromQuery(){
    var key = String(PENDING_THEME || '').replace(/^\s+|\s+$/g,'');
    if(!key) return;
    PENDING_THEME = '';
    if(PK.setActiveTheme) PK.setActiveTheme(key);
    var label = (THEME_LABELS && THEME_LABELS[key]) ? THEME_LABELS[key] : PK.prettyName(key);
    setThemePillText(label);
    scrollToTheme(key);
  }

  // init
  resolveActiveSet()
    .then(function(setId){
      if(PK.setActiveSet) PK.setActiveSet(setId);
      return loadMeta(setId).then(function(meta){
        applySetMeta(setId, meta);
        return Promise.all([loadQuestions(setId), loadBacks(setId)]);
      });
    })
    .then(function(res){
      var qObj = res ? res[0] : null;
      var backObj = res ? res[1] : null;
      if(!qObj){ showError('Fout bij laden.'); return; }
      var items = buildData(qObj, backObj);
      if(!items.length){ showError('Geen kaarten gevonden.'); return; }
      ORIGINAL_ITEMS = items.slice();
      // Pas shuffle-state toe (als die al aan stond via localStorage)
      ITEMS = SHUFFLE_ON ? fisherYates(ORIGINAL_ITEMS) : ORIGINAL_ITEMS.slice();
      render(ITEMS);
      applyThemeFromQuery();
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
  if(PK.createMenu){
    sheetAPI = PK.createMenu({ menu: menuEl, overlay: overlay, trigger: pillBtn });
  }else if(PK.createBottomSheet){
    sheetAPI = PK.createBottomSheet({ sheet: menuEl, overlay: overlay, trigger: pillBtn });
  }else if(pillBtn){
    pillBtn.onclick = function(){
      var expanded = pillBtn.getAttribute('aria-expanded') === 'true';
      if(expanded) closeMenu(); else openMenu();
    };
    if(overlay) overlay.onclick = closeMenu;
  }

  // Menu acties: info (open sheet in uitleg) + shuffle toggle (alleen state/UI)
  var menuInfoBtn = w.document.getElementById('menuInfoBtn');
  if(menuInfoBtn){
    menuInfoBtn.onclick = function(ev){
      if(ev && ev.preventDefault) ev.preventDefault();
      closeMenu();
      // Open uitleg-sheet
      try{ setSheetMode('help'); }catch(_e){}
      if(infoSheet) openInfo();
    };
  }

  // Contrast (licht/donker) – icon-only toggle in het menu
  var contrastBtn = w.document.getElementById('menuContrastToggle');
  var CONTRAST = 'light';
  function applyContrast(mode){
    CONTRAST = (mode === 'dark') ? 'dark' : 'light';
    // Session-only: default altijd LIGHT bij een nieuwe sessie,
    // maar na klikken mag DARK de rest van de sessie blijven.
    try{ w.sessionStorage.setItem('pk_contrast_session', CONTRAST); }catch(_e){}
    if(w.document && w.document.documentElement){
      w.document.documentElement.setAttribute('data-contrast', CONTRAST);
    }
    if(contrastBtn) contrastBtn.setAttribute('aria-pressed', (CONTRAST === 'dark') ? 'true' : 'false');

    // Zorg dat tekstvlakken in de uitleg-carrousel altijd mee-updaten bij mode-switch.
    // (Anders kan de bestaande DOM een oude tint houden tot de set opnieuw gerenderd wordt.)
    try{ retintInfoSlideTexts && retintInfoSlideTexts(); }catch(_e0){}
    // Re-apply tint voor de actieve kaart, zodat donker/licht echt anders voelt.
    // Let op: setActiveTintByIndex heeft een idx-guard (performance). Bij mode-switch
    // willen we echter ALTIJD opnieuw toepassen, ook als de index gelijk blijft.
    try{ __lastTintIdx = -1; }catch(_eX){}
    try{ setActiveTintByIndex && setActiveTintByIndex(getActiveCardIndex ? getActiveCardIndex() : 0); }catch(_e2){}
    // Herteken blobs: dark mode heeft een andere blob-palette.
    try{ renderIndexBackground(); }catch(_e3){}
  }
  if(contrastBtn){
    var savedC = 'light';
    try{ savedC = w.sessionStorage.getItem('pk_contrast_session') || 'light'; }catch(_e){}
    applyContrast(savedC === 'dark' ? 'dark' : 'light');
    contrastBtn.onclick = function(ev){
      if(ev && ev.preventDefault) ev.preventDefault();
      applyContrast(CONTRAST === 'dark' ? 'light' : 'dark');
    };
  }

  var shuffleBtn = w.document.getElementById('menuShuffleToggle');
  function setShuffleEnabled(on){
    on = !!on;
    SHUFFLE_ON = on;
    if(shuffleBtn) shuffleBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if(w.document && w.document.body && w.document.body.classList){
      w.document.body.classList.toggle('shuffleOn', on);
    }
    try{ w.localStorage.setItem('pk_shuffle', on ? '1' : '0'); }catch(_e){}
    // Echte shuffle: pas de volgorde aan in grid + carrousel.
    // (We gebruiken ORIGINAL_ITEMS als bron, zodat 'uit' weer exact terug kan.)
    if(ORIGINAL_ITEMS && ORIGINAL_ITEMS.length){
      applyShuffleToUI();
    }
  }
  if(shuffleBtn){
    var saved = '0';
    try{ saved = w.localStorage.getItem('pk_shuffle') || '0'; }catch(_e){}
    setShuffleEnabled(saved === '1');
    shuffleBtn.onclick = function(ev){
      if(ev && ev.preventDefault) ev.preventDefault();
      var cur = shuffleBtn.getAttribute('aria-pressed') === 'true';
      setShuffleEnabled(!cur);
    };
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
      if(PK.PATHS && PK.PATHS.gridPage){
        w.location.href = PK.PATHS.gridPage;
      }else{
        w.location.href = './index.html';
      }
    };
  }

  // ------------------------------------------------------------
  // ------------------------------------------------------------
  // Uitleg-sheet: subtiel aan de onderrand (Google Maps-achtig)
  // - geen info-knop
  // - sheet sluit nooit volledig (peek)
  // - swipe omlaag = naar peek
  // - swipe omhoog = open
  // - koppen boven kaartjes verwijderd
  // - tekstvlak kleurt mee op dominante kaartkleur
  // ------------------------------------------------------------

  var infoSheet = w.document.getElementById('infoSheet');
  var infoOverlay = w.document.getElementById('infoOverlay');
  var infoCarousel = w.document.getElementById('infoCarousel');
  // De kaarten-carrousel staat nu centraal op de pagina.
  var cardsCarousel = w.document.getElementById('mainCarousel');
  var sheetStack = w.document.getElementById('sheetStack');
  var sheetPageCards = w.document.getElementById('sheetPageCards');
  var sheetPageHelp = w.document.getElementById('sheetPageHelp');
  var sheetViewport = infoSheet ? infoSheet.querySelector('.sheetViewport') : null;
  var infoCard = infoSheet ? infoSheet.querySelector('.infoCard') : null;
  var handle = infoSheet ? infoSheet.querySelector('.sheetHandle') : null;
  var topPage = 'cards';

  // ------------------------------------------------------------
  // Scroll-lock (Google Maps-achtig)
  // - Als de sheet open is, mag de achtergrond (index grid) niet scrollen.
  // - iOS/Safari: overflow:hidden alleen is onbetrouwbaar; daarom body 'fixed'.
  // - In peek-stand blijft de pagina gewoon scrollbaar.
  // ------------------------------------------------------------
  var __pkScrollLock = { on:false, y:0 };
  function lockBackgroundScroll(enable){
    enable = !!enable;
    if(enable === __pkScrollLock.on) return;

    var docEl = w.document.documentElement;
    var body = w.document.body;

    if(enable){
      __pkScrollLock.on = true;
      __pkScrollLock.y = (w.pageYOffset || docEl.scrollTop || body.scrollTop || 0);

      // Zet body vast op huidige scrollpositie
      body.style.position = 'fixed';
      body.style.top = (-__pkScrollLock.y) + 'px';
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      // extra: voorkomt 'rubber band' op iOS
      docEl.style.overflow = 'hidden';
    }else{
      __pkScrollLock.on = false;
      // Body terugzetten
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      docEl.style.overflow = '';
      // Scroll herstellen
      try{ w.scrollTo(0, __pkScrollLock.y || 0); }catch(_e){}
    }
  }

  // --- Dynamic height helpers (compact kaarten -> max uitleg) ---
  function readCssPx(el, name, fallback){
    try{
      var v = w.getComputedStyle(el || w.document.documentElement).getPropertyValue(name);
      var n = parseFloat(String(v||'').replace('px',''));
      return isNaN(n) ? fallback : n;
    }catch(_e){ return fallback; }
  }

  function getMaxH(){
    // Max hoogte komt uit CSS var op .infoSheet (fallback op root var)
    return readCssPx(infoSheet || w.document.documentElement, '--sheetMaxH', readCssPx(w.document.documentElement, '--sheetPageH', 520));
  }
  function getCompactH(){
    return readCssPx(infoSheet || w.document.documentElement, '--sheetCompactH', Math.min(getMaxH(), 460));
  }
  function getCurH(){
    return readCssPx(infoSheet || w.document.documentElement, '--sheetCurH', getCompactH());
  }
  function setCurH(px){
    if(!infoSheet) return;
    infoSheet.style.setProperty('--sheetCurH', Math.max(220, px) + 'px');
  }
  function setCompactH(px){
    if(!infoSheet) return;
    infoSheet.style.setProperty('--sheetCompactH', Math.max(220, px) + 'px');
    // Bij init: start altijd compact
    setCurH(px);
  }

  var helpMeasureTimer = 0;
  function scheduleHelpMeasure(){
    if(!infoSheet) return;
    if(helpMeasureTimer) w.clearTimeout(helpMeasureTimer);
    helpMeasureTimer = w.setTimeout(function(){
      helpMeasureTimer = 0;
      setCurH(measureHelpH() || getMaxH());
    }, 60);
  }

  function setTopPage(which){
    which = (which==='help') ? 'help' : 'cards';
    topPage = which;
    if(infoCard) infoCard.setAttribute('data-top', which);
  }

  // ------------------------------------------------------------
  // Mode-switch (simpel en stabiel)
  // - default: kaarten
  // - info knop: uitleg
  // - sluiten: altijd terug naar kaarten
  // Geen pagina-wissel via drag.
  // ------------------------------------------------------------
  var sheetMode = 'cards'; // 'cards' | 'help'
  function setSheetMode(mode){
    mode = (mode === 'help') ? 'help' : 'cards';
    sheetMode = mode;

    if(sheetPageCards) sheetPageCards.style.display = (mode === 'cards') ? '' : 'none';
    if(sheetPageHelp)  sheetPageHelp.style.display  = (mode === 'help')  ? '' : 'none';

    // Visuele hint voor CSS indien gewenst
    if(infoCard) infoCard.setAttribute('data-mode', mode);

    // Viewport hoogte:
    // - kaarten = compact (kaart)
    // - uitleg  = "fit" (kaart + tekst), NIET altijd max hoogte
    //   -> voorkomt enorme lege ruimte boven de kaart en houdt de top mooi in lijn.
    var compactH = getCompactH();
    if(mode === 'help'){
      scheduleHelpMeasure();
      setTopPage('help');
    }else{
      setCurH(compactH);
      setTopPage('cards');
    }
  }
  try{ PK.setSheetMode = setSheetMode; }catch(_eSetMode){}

  // Meet de benodigde hoogte voor de uitleg-sheet (kaart + tekst) zodat
  // de bovenkant van de sheet niet onnodig hoog uitkomt.
  function measureHelpH(){
    if(!infoSheet) return 0;
    var slideInner = infoSheet.querySelector ? infoSheet.querySelector('.infoSlideInner') : null;
    if(!slideInner || !slideInner.getBoundingClientRect) return 0;
    var r = slideInner.getBoundingClientRect();
    if(!r || !r.height) return 0;
    // Handle + ondermarge + safe-area
    var handleH = 18;
    var pad = 18;
    // env(safe-area-inset-bottom) is niet betrouwbaar via getComputedStyle;
    // de CSS regelt safe-area al. Hier dus geen extra.
    var h = Math.round(r.height + handleH + pad);

    // Extra: zorg dat de sheet hoog genoeg is om de centrale index-kaart volledig te bedekken.
    // Top(sheet) = window.innerHeight - h. We willen: top(sheet) <= top(index-kaart).
    // => h >= window.innerHeight - top(index-kaart)
    try{
      var main = w.document.getElementById('mainCarousel');
      if(main){
        var slides = Array.prototype.slice.call(main.children || []);
        var cx = w.innerWidth / 2;
        var best = null;
        var bestDist = Infinity;
        for(var i=0;i<slides.length;i++){
          var sl = slides[i];
          if(!sl || sl.nodeType !== 1) continue;
          var rr = sl.getBoundingClientRect();
          var mx = rr.left + rr.width/2;
          var d = Math.abs(mx - cx);
          if(d < bestDist){ bestDist = d; best = sl; }
        }
        var mainCard = best && best.querySelector ? best.querySelector('.cardsSlideCard') : null;
        if(mainCard && mainCard.getBoundingClientRect){
          var rMain = mainCard.getBoundingClientRect();
          var needed = Math.round(w.innerHeight - rMain.top);
          // kleine extra marge zodat hij écht over de kaart valt
          needed += 14;
          if(needed > h) h = needed;
        }
      }
    }catch(_eCover){}

    var maxH = getMaxH();
    // Clamp: nooit kleiner dan 320 (stabiel) en nooit groter dan max.
    h = Math.max(320, Math.min(maxH, h));
    return h;
  }

  
  // --- Align uitleg-inhoud precies over de centrale kaart op de index ---
  // Belangrijk: de sheet zelf moet altijd aan de onderrand blijven 'haken'.
  // Daarom verplaatsen we NIET de hele sheet (dat gaf soms een gap op iOS),
  // maar schuiven we alleen de uitleg-inhoud (CSS var --helpShift).
  function alignInfoSheetToMainCard(){
    if(!infoSheet || !infoCarousel) return;

    // Centrale kaart (index)
    var main = w.document.getElementById('mainCarousel');
    if(!main) return;
    var mainSlides = Array.prototype.slice.call(main.children || []);
    if(!mainSlides.length) return;

    var cx = w.innerWidth / 2;
    var best = null;
    var bestDist = Infinity;
    for(var i=0;i<mainSlides.length;i++){
      var sl = mainSlides[i];
      if(!sl || sl.nodeType !== 1) continue;
      var r = sl.getBoundingClientRect();
      var mx = r.left + r.width/2;
      var d = Math.abs(mx - cx);
      if(d < bestDist){ bestDist = d; best = sl; }
    }
    var mainCard = best && best.querySelector ? best.querySelector('.cardsSlideCard') : null;
    if(!mainCard) return;
    var rMain = mainCard.getBoundingClientRect();

    // Zichtbare kaart (uitleg)
    var infoSlides = Array.prototype.slice.call(infoCarousel.children || []);
    if(!infoSlides.length) return;
    var bestI = null;
    var bestIDist = Infinity;
    for(var j=0;j<infoSlides.length;j++){
      var isl = infoSlides[j];
      if(!isl || isl.nodeType !== 1) continue;
      var ir = isl.getBoundingClientRect();
      var imx = ir.left + ir.width/2;
      var id = Math.abs(imx - cx);
      if(id < bestIDist){ bestIDist = id; bestI = isl; }
    }
    // Gebruik de kaart-container (niet het <img>) zodat de maat altijd gelijk is
    // aan de index-kaart (aspect-ratio) en niet varieert per SVG.
    var infoCardEl = bestI && bestI.querySelector ? bestI.querySelector('.infoSlideCard') : null;
    if(!infoCardEl) return;
    var rInfo = infoCardEl.getBoundingClientRect();

    // Doel: bovenkant van uitleg-kaart uitlijnen op de centrale index-kaart.
    // shift (px) = gewensteTop - huidigeTop.
    var shift = Math.round(rMain.top - rInfo.top);

    // Guardrails: laat de kaart nooit uit de sheet-viewport 'knippen'.
    // (Dit was de oorzaak van "alleen een strook" van de kaart zien.)
    if(sheetViewport && sheetViewport.getBoundingClientRect){
      var vp = sheetViewport.getBoundingClientRect();
      var pad = 12; // visuele marge boven/onder
      var topLimit = vp.top + pad;
      var bottomLimit = vp.bottom - pad;

      var topAfter = rInfo.top + shift;
      var bottomAfter = rInfo.bottom + shift;

      if(topAfter < topLimit){
        shift += (topLimit - topAfter);
      }
      if(bottomAfter > bottomLimit){
        shift -= (bottomAfter - bottomLimit);
      }
    }

    // Extra clamp tegen extreme values bij rare metingen (iOS rotate / rubberband)
    if(shift > 140) shift = 140;
    if(shift < -140) shift = -140;

    try{ infoSheet.style.setProperty('--helpShift', shift + 'px'); }catch(_e){}
  }

  // Zorg dat uitleg altijd op de voorkant start (voorspelbaar).
  function resetInfoCarouselToCover(){
    if(!infoCarousel) return;
    try{
      var all = infoCarousel.querySelectorAll('.infoSlide');
      if(!all || all.length < 1) return;
      // Infinite modus: clones aan begin/eind, eerste echte slide op 1 slideWidth.
      var hasClones = (infoCarousel.getAttribute('data-infinite') === '1');
      if(hasClones && all.length >= 3){
        var r = all[1].getBoundingClientRect();
        var w1 = (r && r.width) ? r.width : 0;
        if(w1) infoCarousel.scrollLeft = w1;
        else infoCarousel.scrollLeft = 0;
      }else{
        infoCarousel.scrollLeft = 0;
      }
    }catch(_e){}
  }


function openInfo(){
    if(!infoSheet) return;

    // Reset eventuele drag/transforms uit oude sessies
    infoSheet.style.transition = '';
    infoSheet.style.transform = '';

    // 1) Maak zichtbaar in 'closed' staat (translateY(100%)) zodat we eerst kunnen meten
    infoSheet.hidden = false;
    if(infoSheet.classList) infoSheet.classList.remove('open');
    if(infoOverlay){
      infoOverlay.hidden = false;
      infoOverlay.style.pointerEvents = 'auto';
      if(infoOverlay.classList) infoOverlay.classList.remove('open');
    }

    // 2) Zet meteen naar uitleg + cover, zodat DOM-sizes kloppen vóór de open-animatie
    try{ setSheetMode('help'); }catch(_e0){}
    try{ resetInfoCarouselToCover(); }catch(_e3){}

    // Force reflow zodat measureHelpH betrouwbare waarden geeft (ook op iOS)
    try{ infoSheet.offsetHeight; }catch(_eR){}

    // 3) Bepaal de definitieve sheet hoogte vóór het openen (voorkomt 'top-down' krimp)
    try{
      var h = measureHelpH();
      if(h) setCurH(h);
    }catch(_eH){}

    // 4) Open van onder naar boven (altijd bottom-up)
    w.requestAnimationFrame(function(){
      if(infoSheet.classList) infoSheet.classList.add('open');
      if(infoOverlay && infoOverlay.classList) infoOverlay.classList.add('open');

      // Init gestures 1x
      if(!w.__pkInfoDragInited){
        try{ initDrag(); }catch(_e){}
        w.__pkInfoDragInited = true;
      }

      // 5) Na het openen (transform=0) pas de optische align toe (zonder hoogte-wijziging)
      w.requestAnimationFrame(function(){
        try{ alignInfoSheetToMainCard(); }catch(_e2){}
      });
    });
  }
  function peekInfo(){
    // Sluit uitleg-sheet volledig (geen 'peek' meer)
    if(!infoSheet) return;
    if(infoSheet.classList) infoSheet.classList.remove('open');
    if(infoOverlay){
      infoOverlay.hidden = true;
      infoOverlay.style.pointerEvents = 'none';
    }
    // wacht transition uit en verberg dan echt
    w.setTimeout(function(){
      infoSheet.hidden = true;
      infoSheet.style.transform = '';
      infoSheet.style.transition = '';
      try{ infoSheet.style.setProperty('--helpShift','0px'); }catch(_e0){}
      lockBackgroundScroll(false);
    }, 220);
  }
  function isInfoOpen(){
    return !!(infoSheet && infoSheet.classList && infoSheet.classList.contains('open'));
  }

  function safeText(v){
    return (v===null || v===undefined) ? '' : String(v);
  }
  function cardPathRect(setId, file){
    return pathForSet(setId, 'cards_rect/' + file);
  }
  function cardPathSquare(setId, file){
    return pathForSet(setId, 'cards/' + file);
  }

  function buildSlides(setId, meta, uitleg){
    var slides = [];
    meta = meta || {};
    uitleg = uitleg || {};
    var coverFile = meta.cover || 'voorkant.svg';
    slides.push({
      key: 'cover',
      isCover: true,
      title: '',
      srcRect: (PK.withV ? PK.withV(cardPathRect(setId, coverFile)) : cardPathRect(setId, coverFile)),
      srcFallback: (PK.withV ? PK.withV(cardPathSquare(setId, coverFile)) : cardPathSquare(setId, coverFile)),
      text: safeText(uitleg.cover || '')
    });

    var themes = Array.isArray(meta.themes) ? meta.themes : [];
    for(var i=0;i<themes.length;i++){
      var t = themes[i] || {};
      var key = safeText(t.key || '').replace(/^\s+|\s+$/g,'');
      if(!key) continue;
      var label = safeText(t.label || key);
      var file = safeText(t.card || (key + '.svg'));
      slides.push({
        key: key,
        isCover: false,
        title: label,
        srcRect: (PK.withV ? PK.withV(cardPathRect(setId, file)) : cardPathRect(setId, file)),
        srcFallback: (PK.withV ? PK.withV(cardPathSquare(setId, file)) : cardPathSquare(setId, file)),
        text: safeText(uitleg[key] || '')
      });
    }
    return slides;
  }

  function renderSlides(slides){
    if(!infoCarousel) return;
    infoCarousel.innerHTML = '';
    for(var i=0;i<slides.length;i++){
      var s = slides[i];

      var slide = w.document.createElement('div');
      slide.className = 'infoSlide';

      var inner = w.document.createElement('div');
      inner.className = 'infoSlideInner';

      var card = w.document.createElement('div');
      card.className = 'infoSlideCard';

      var img = w.document.createElement('img');
      img.alt = s.isCover ? 'Voorkant' : (s.title || s.key);
      img.src = s.srcRect;
      img.onerror = function(){
        // fallback naar square
        if(this && this.dataset && this.dataset.fallback){
          this.onerror = null;
          this.src = this.dataset.fallback;
        }
      };
      img.dataset.fallback = s.srcFallback;

      card.appendChild(img);

      // Thema-naam in het midden (niet op de cover)
      if(!s.isCover && s.title){
        var mid = w.document.createElement('div');
        mid.className = 'infoSlideMidTitle';
        mid.textContent = s.title;
        card.appendChild(mid);
      }

      var text = w.document.createElement('div');
      text.className = 'infoSlideText';
      text.textContent = s.text;

      // Meekleuren: basis verschilt per modus (light vs dark), maar we tinten altijd.
      // Dit voorkomt dat het tekstvlak soms "achterblijft" bij een mode-switch.
      var isDark = (w.document && w.document.documentElement && w.document.documentElement.getAttribute("data-contrast") === "dark");
      if(PK.applyDominantTint){
        // Iets meer zichtbaar dan eerder: subtiel maar herkenbaar meekleuren.
        PK.applyDominantTint(text, s.srcRect, isDark ? "rgba(20,22,26,0.60)" : "rgba(255,255,255,0.72)");
      }
      inner.appendChild(card);
      inner.appendChild(text);

      slide.appendChild(inner);
      infoCarousel.appendChild(slide);
    }
    // Infinite loop (clone first/last)
    enableInfiniteCarousel(infoCarousel, 'infoSlide');
  }

  // Re-tint bestaande uitleg-tekstvlakken (infoSlideText) op basis van huidige modus.
  // Noodzakelijk bij light↔dark switch: de carrousel-DOM wordt niet altijd opnieuw opgebouwd.
  function retintInfoSlideTexts(){
    if(!PK.applyDominantTint) return;
    var isDark = (w.document && w.document.documentElement && w.document.documentElement.getAttribute('data-contrast') === 'dark');
    var base = isDark ? 'rgba(20,22,26,0.60)' : 'rgba(255,255,255,0.72)';
    var nodes = (w.document && w.document.querySelectorAll) ? w.document.querySelectorAll('.infoSlideText') : [];
    for(var i=0;i<nodes.length;i++){
      var t = nodes[i];
      // Zoek het bijbehorende kaartbeeld binnen dezelfde slide.
      var slide = t && t.closest ? t.closest('.infoSlide') : null;
      var img = slide && slide.querySelector ? slide.querySelector('.infoSlideCard img') : null;
      var src = img ? (img.getAttribute('src') || img.src) : null;
      if(src){
        try{ PK.applyDominantTint(t, src, base); }catch(_e){}
      }else{
        // Fallback: zet in elk geval een consistente basis.
        try{ t.style.background = base; }catch(_e2){}
      }
    }
  }

  function loadAndRender(){
    if(!PK.loadJson) return;
    var setId = (PK.getActiveSet ? PK.getActiveSet() : 'samenwerken') || 'samenwerken';
    var metaUrl = pathForSet(setId, 'meta.json');
    var uitlegUrl = pathForSet(setId, 'uitleg.json');

    return Promise.all([
      PK.loadJson(metaUrl).catch(function(){ return {}; }),
      PK.loadJson(uitlegUrl).catch(function(){ return {}; })
    ]).then(function(res){
      var slides = buildSlides(setId, res[0], res[1]);
      renderSlides(slides);
    });
  }

  // -----------------------------
  // KAARTEN carrousel (centraal op de pagina)
  // -----------------------------

  var __flipHandlersBound = false;
  function setFlipState(cardEl, on){
    if(!cardEl) return;
    if(on) cardEl.classList.add('is-flipped');
    else cardEl.classList.remove('is-flipped');
    cardEl.setAttribute('aria-pressed', on ? 'true' : 'false');

    // Extra zekerheid: hide front text during flip (iOS sometimes leaks it).
    try{
      var frontText = cardEl.querySelector('.cardsSlideQ');
      if(frontText){
        frontText.style.display = on ? 'none' : '';
      }
    }catch(_e){}
  }

  function toggleFlip(cardEl){
    if(!cardEl) return;
    var on = cardEl.classList.contains('is-flipped');
    setFlipState(cardEl, !on);
  }

  function ensureFlipHandlers(){
    if(__flipHandlersBound || !cardsCarousel) return;
    __flipHandlersBound = true;
    var start = null;

    cardsCarousel.addEventListener('pointerdown', function(ev){
      var card = ev.target && (ev.target.closest ? ev.target.closest('.pkFlip') : null);
      if(!card) return;
      start = { x: ev.clientX || 0, y: ev.clientY || 0, card: card };
    }, { passive:true });

    cardsCarousel.addEventListener('pointerup', function(ev){
      if(!start) return;
      var card = ev.target && (ev.target.closest ? ev.target.closest('.pkFlip') : null);
      var dx = Math.abs((ev.clientX || 0) - start.x);
      var dy = Math.abs((ev.clientY || 0) - start.y);
      if(card && card === start.card && dx < 8 && dy < 8){
        toggleFlip(card);
      }
      start = null;
    }, { passive:true });

    cardsCarousel.addEventListener('keydown', function(ev){
      var card = ev.target && (ev.target.closest ? ev.target.closest('.pkFlip') : null);
      if(!card) return;
      if(ev.key === 'Enter' || ev.key === ' '){
        ev.preventDefault();
        toggleFlip(card);
      }
    });
  }

  function renderCards(items){
    if(!cardsCarousel) return;
    try{ cardsCarousel.removeAttribute('data-infinite'); }catch(_eInf){}
    cardsCarousel.innerHTML = '';
    for(var i=0;i<(items||[]).length;i++){
      var it = items[i] || {};

      var slide = w.document.createElement('div');
      slide.className = 'cardsSlide';

      var inner = w.document.createElement('div');
      inner.className = 'cardsSlideInner';

      var card = w.document.createElement('div');
      card.className = 'cardsSlideCard pkFlip';
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');
      card.setAttribute('aria-pressed','false');

      var flip = w.document.createElement('div');
      flip.className = 'pkFlipInner';

      var front = w.document.createElement('div');
      front.className = 'pkFace pkFront';

      var img = w.document.createElement('img');
      img.className = 'bg';
      var rectSrc = it.bg || '';
      var fullSrc = rectSrc.indexOf('/cards_rect/') !== -1 ? rectSrc.replace('/cards_rect/','/cards/') : rectSrc;
      img.setAttribute('data-src-rect', rectSrc);
      img.setAttribute('data-src-full', fullSrc);
      img.src = PK.withV ? PK.withV(rectSrc) : rectSrc;
      img.onerror = function(){
        var tried1 = this.getAttribute('data-fallback') === '1';
        if(!tried1){
          this.setAttribute('data-fallback','1');
          var next = this.getAttribute('data-src-full') || '';
          if(next && next !== this.src){
            this.src = PK.withV ? PK.withV(next) : next;
            return;
          }
        }
        if(this.getAttribute('data-fallback2') === '1') return;
        this.setAttribute('data-fallback2','1');
        if(CURRENT_SET && CURRENT_COVER){
          var coverRect = pathForSet(CURRENT_SET, 'cards_rect/' + CURRENT_COVER);
          this.src = PK.withV ? PK.withV(coverRect) : coverRect;
        }
      };
      img.alt = '';

      // VRAAGTEKST hoort op de index-kaart (overlay), niet eronder.
      // (Uitleg heeft z'n eigen sheet.)
      front.appendChild(img);

      var frontText = (it && (it.q || it.voorkant)) ? (it.q || it.voorkant) : '';
      if(frontText){
        var q = w.document.createElement('div');
        q.className = 'cardsSlideQ';
        var qSpan = w.document.createElement('span');
        qSpan.className = 'cardsSlideQText';
        qSpan.textContent = safeText(frontText);
        q.appendChild(qSpan);
        front.appendChild(q);
      }

      var back = w.document.createElement('div');
      back.className = 'pkFace pkBack';

      var backMode = CURRENT_BACK_MODE || 'mirror';
      if(backMode !== 'none'){
        var backSrc = '';
        var backSrcRect = '';
        var mirrorBack = (backMode === 'mirror');

        if(backMode === 'cover'){
          backSrc = pathForSet(CURRENT_SET, 'cards/' + CURRENT_COVER);
          backSrcRect = pathForSet(CURRENT_SET, 'cards_rect/' + CURRENT_COVER);
          var backImg = w.document.createElement('img');
          backImg.className = 'bg pkBackImg';
          backImg.src = PK.withV ? PK.withV(backSrcRect) : backSrcRect;
          backImg.onerror = function(){
            this.onerror = null;
            this.src = PK.withV ? PK.withV(backSrc) : backSrc;
          };
          backImg.alt = '';
          back.appendChild(backImg);
        }else{
          // mirror (default): gebruik dezelfde kaart als voorkant
          backSrc = it.bg || (it.theme ? cardUrl(it.theme) : '');
          backSrcRect = '';
          if(backSrc.indexOf('/cards_rect/') !== -1){
            backSrcRect = backSrc.replace('/cards_rect/','/cards/');
          }else if(backSrc.indexOf('/cards/') !== -1){
            backSrcRect = backSrc.replace('/cards/','/cards_rect/');
          }

          var backImg2 = w.document.createElement('img');
          backImg2.className = 'bg pkBackImg' + (mirrorBack ? ' is-mirror' : '');
          backImg2.src = PK.withV ? PK.withV(backSrc) : backSrc;
          if(backSrcRect){
            backImg2.onerror = function(){
              this.onerror = null;
              this.src = PK.withV ? PK.withV(backSrcRect) : backSrcRect;
            };
          }
          backImg2.alt = '';
          back.appendChild(backImg2);
        }
      }

      var backText = (it && (it.back || it.achterkant)) ? (it.back || it.achterkant) : '';
      if(backText){
        var bt = w.document.createElement('div');
        bt.className = 'cardsSlideBackText';
        var btSpan = w.document.createElement('span');
        btSpan.className = 'cardsSlideBackTextInner';
        btSpan.textContent = safeText(backText);
        bt.appendChild(btSpan);
        back.appendChild(bt);
      }

      flip.appendChild(front);
      flip.appendChild(back);
      card.appendChild(flip);
      inner.appendChild(card);
      slide.appendChild(inner);
      cardsCarousel.appendChild(slide);
    }
    // Infinite loop (clone first/last)
    enableInfiniteCarousel(cardsCarousel, 'cardsSlide');
    ensureFlipHandlers();
    // Tint direct laten meekleuren met de eerste kaart.
    w.setTimeout(function(){ setActiveTintByIndex(0); }, 0);
    // Houd de sheet compact zolang alleen de kaart zichtbaar is.
    w.setTimeout(measureAndSetCompactH, 0);
  }

  // -----------------------------
  // Achtergrond-tint laten meekleuren met actieve kaart
  // -----------------------------
  var __tintCache = {}; // svgUrl -> "r,g,b" (CSS-ready)
  var __tintRgbCache = {}; // svgUrl -> {r,g,b} (raw)
  var __tintCanvas = null;
  var __tintCtx = null;
  var __lastTintIdx = -1;
  // Voorkom race-conditions bij snelle mode-switch of scroll.
  // Elke tint-berekening krijgt een oplopend request-id; alleen de laatste mag toepassen.
  var __tintReqId = 0;

  // Bepaal dominante kleur op basis van pixels (visueel dominant),
  // zodat de achtergrond echt meeloopt met de grootste kleurvlakken.
  // Werkt met same-origin SVG's (onze sets).
  function getDominantRgbFromSvgUrl(svgUrl){
    return new Promise(function(resolve){
      if(!svgUrl) return resolve(null);
      if(__tintRgbCache[svgUrl]) return resolve(__tintRgbCache[svgUrl]);

      try{
        if(!__tintCanvas){
          __tintCanvas = w.document.createElement('canvas');
          __tintCanvas.width = 64;
          __tintCanvas.height = 64;
          __tintCtx = __tintCanvas.getContext('2d', { willReadFrequently: true });
        }
      }catch(_e){
        return resolve(null);
      }

      var img = new Image();
      // same-origin; als dit ooit anders wordt, dan faalt canvas-sampling.
      img.onload = function(){
        try{
          __tintCtx.clearRect(0,0,64,64);
          __tintCtx.drawImage(img, 0, 0, 64, 64);
          var data = __tintCtx.getImageData(0,0,64,64).data;

          // quantize om snelheid te houden
          var counts = {};
          var bestKey = null;
          var bestN = 0;
          for(var i=0;i<data.length;i+=4){
            var a = data[i+3];
            if(a < 32) continue;
            var r = data[i], g = data[i+1], b = data[i+2];
            // ignore near-white/near-black
            if(r>245 && g>245 && b>245) continue;
            if(r<12 && g<12 && b<12) continue;
            // 5-bit quantization
            var rq = (r>>3)<<3;
            var gq = (g>>3)<<3;
            var bq = (b>>3)<<3;
            var key = rq+','+gq+','+bq;
            var n = (counts[key]||0) + 1;
            counts[key] = n;
            if(n > bestN){ bestN = n; bestKey = key; }
          }
          if(!bestKey) return resolve(null);
          var parts = bestKey.split(',');
          var rgb = { r: parseInt(parts[0],10), g: parseInt(parts[1],10), b: parseInt(parts[2],10) };
          __tintRgbCache[svgUrl] = rgb;
          resolve(rgb);
        }catch(_e2){
          resolve(null);
        }
      };
      img.onerror = function(){ resolve(null); };
      img.src = svgUrl;
    });
  }
  // Zet zowel de actieve achtergrondkleur (mode-afhankelijk) als de originele
  // dominante 'hue' kleur. In dark mode wordt --activeTintRgb donkerder gemaakt
  // (zelfde hue), maar voor de grote zachte 'meekleur-blob' willen we juist
  // de originele dominante kleur beschikbaar houden.
  function setCssTint(bgRgbCsv, hueRgbCsv){
    try{
      w.document.documentElement.style.setProperty('--activeTintRgb', bgRgbCsv || '255, 255, 255');
      w.document.documentElement.style.setProperty('--activeHueRgb', hueRgbCsv || bgRgbCsv || '255, 255, 255');
      // Backward compat (oude css gebruikte alpha). Niet meer leidend.
      w.document.documentElement.style.setProperty('--activeTintA','1');
    }catch(_e){}
  }

  // Kleine HSL helper (voor "donker maar kleurig")
  function rgbToHsl(r,g,b){
    r/=255; g/=255; b/=255;
    var max = Math.max(r,g,b), min = Math.min(r,g,b);
    var h, s, l = (max+min)/2;
    if(max===min){ h=0; s=0; }
    else{
      var d = max-min;
      s = l>0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h = (g-b)/d + (g<b ? 6 : 0); break;
        case g: h = (b-r)/d + 2; break;
        default: h = (r-g)/d + 4; break;
      }
      h /= 6;
    }
    return {h:h, s:s, l:l};
  }
  function hslToRgb(h,s,l){
    function hue2rgb(p,q,t){
      if(t<0) t+=1;
      if(t>1) t-=1;
      if(t<1/6) return p + (q-p)*6*t;
      if(t<1/2) return q;
      if(t<2/3) return p + (q-p)*(2/3-t)*6;
      return p;
    }
    var r,g,b;
    if(s===0){ r=g=b=l; }
    else{
      var q = l < 0.5 ? l*(1+s) : l + s - l*s;
      var p = 2*l - q;
      r = hue2rgb(p,q,h + 1/3);
      g = hue2rgb(p,q,h);
      b = hue2rgb(p,q,h - 1/3);
    }
    return {r:Math.round(r*255), g:Math.round(g*255), b:Math.round(b*255)};
  }

  function setActiveTintByIndex(idx){
    idx = Math.max(0, idx|0);
    if(idx === __lastTintIdx) return;
    __lastTintIdx = idx;
    var contrastAtCall = ((CONTRAST || 'light') === 'dark') ? 'dark' : 'light';
    var reqId = ++__tintReqId;
    var it = (ITEMS && ITEMS[idx]) ? ITEMS[idx] : null;
    if(!it || !it.bg){ setCssTint('255, 255, 255'); return; }
    var url = PK.withV ? PK.withV(it.bg) : it.bg;

    // cache per modus
    var cacheKey = url + '|' + contrastAtCall;
    if(__tintCache[cacheKey]){
      var cached = __tintCache[cacheKey];
      // cache kan "bg|hue" bevatten. Oud cacheformaat is alleen "bg".
      if(String(cached).indexOf('|')>-1){
        var parts0 = String(cached).split('|');
        setCssTint(parts0[0], parts0[1] || parts0[0]);
      }else{
        setCssTint(cached, cached);
      }
      return;
    }

    // 1) Visuele dominant via canvas-sampling (meest betrouwbaar)
    getDominantRgbFromSvgUrl(url).then(function(dom){
      if(!dom){
        // 2) Fallback: tekst-parsing
        if(PK.getText && PK.dominantColorFromSvgText){
          return PK.getText(url).then(function(txt){
            var d2 = PK.dominantColorFromSvgText(txt);
            return d2 || null;
          });
        }
        return null;
      }
      return dom;
    }).then(function(dom2){
      if(!dom2){
        // 3) Laatste fallback (Safari/iOS kan soms geen SVG->canvas dominantie pakken)
        //    Gebruik dan de themakleur, zodat de achtergrond ALTIJD meekleurt.
        var fallback = {
          verkennen:  {r:170,g:195,b:123},
          duiden:     {r:120,g:170,b:150},
          verbinden:  {r:150,g:205,b:195},
          verhelderen:{r: 48,g: 96,b:136},
          vertragen:  {r:120,g:200,b:205},
          bewegen:    {r:242,g:153,b: 74}
        };
        var th = it.theme;
        dom2 = fallback[th] || null;
        if(!dom2) return;
      }
      var out;
      // Alleen toepassen als dit nog de laatste aanvraag is.
      if(reqId !== __tintReqId) return;
      if((contrastAtCall || 'light') === 'dark'){
        // Donker maar kleurig: behoud hue, zet lichtheid omhoog t.o.v. zwart.
        var hsl = rgbToHsl(dom2.r, dom2.g, dom2.b);
        // Houd s minimaal zodat het niet grauw wordt
        var s = Math.max(0.34, Math.min(0.70, hsl.s * 1.10));
        // "Schemer" i.p.v. zwart: iets minder donker dan voorheen, maar duidelijk donkerder dan licht.
        var l = Math.max(0.28, Math.min(0.36, hsl.l * 0.50 + 0.14));
        out = hslToRgb(hsl.h, s, l);
      }else{
        // Licht: geen grijze waas, maar echt een zachte kleurtint.
        // Meer "papier" (witter) zodat blobs/kaarten het kleur-contrast geven.
        var k = 0.82; // aandeel wit (lager = meer kleur)
        out = {
          r: Math.round(dom2.r*(1-k) + 255*k),
          g: Math.round(dom2.g*(1-k) + 255*k),
          b: Math.round(dom2.b*(1-k) + 255*k)
        };
      }
      var bgCsv = out.r + ', ' + out.g + ', ' + out.b;
      var hueCsv = dom2.r + ', ' + dom2.g + ', ' + dom2.b;
      __tintCache[cacheKey] = bgCsv + '|' + hueCsv;
      // Nogmaals checken: voorkom dat een late promise de huidige modus overschrijft.
      if(reqId !== __tintReqId) return;
      if(((CONTRAST || 'light') === 'dark' ? 'dark' : 'light') !== contrastAtCall) return;
      setCssTint(bgCsv, hueCsv);
    });
  }

  function goToCardIndex(idx){
    if(!cardsCarousel) return;
    var slides = cardsCarousel.children || [];
    if(!slides.length) return;
    var hasClones = slides[0] && slides[0].classList && slides[0].classList.contains('is-clone');
    var target = idx|0;
    if(hasClones) target = target + 1;
    target = Math.max(0, Math.min(slides.length-1, target));
    var s = slides[target];
    var x = s ? (s.offsetLeft || 0) : 0;
    try{ cardsCarousel.scrollTo({ left: x, behavior: 'smooth' }); }
    catch(_e){ cardsCarousel.scrollLeft = x; }
  }

  function getActiveCardIndex(){
    if(!cardsCarousel) return 0;
    var slides = cardsCarousel.children || [];
    if(!slides.length) return 0;
    var center = (cardsCarousel.scrollLeft || 0) + (cardsCarousel.clientWidth || 0) / 2;
    var bestIdx = 0;
    var bestDist = 1e18;
    for(var i=0;i<slides.length;i++){
      var el = slides[i];
      var mid = (el.offsetLeft || 0) + (el.offsetWidth || 0) / 2;
      var d = Math.abs(mid - center);
      if(d < bestDist){ bestDist = d; bestIdx = i; }
    }

    // Als we clones gebruiken: vertaal naar echte index (0..n-1)
    var hasClones = slides[0] && slides[0].classList && slides[0].classList.contains('is-clone');
    if(hasClones && slides.length >= 3){
      var nReal = slides.length - 2;
      if(bestIdx == 0) return nReal - 1;
      if(bestIdx == slides.length - 1) return 0;
      return Math.max(0, Math.min(nReal-1, bestIdx - 1));
    }
    return bestIdx;
  }

  // Update tint terwijl je swipet/scrollt (gedebounced)
  if(cardsCarousel){
    var __tintRaf = 0;
    function scheduleTintUpdate(){
      if(__tintRaf) return;
      __tintRaf = w.requestAnimationFrame(function(){
        __tintRaf = 0;
        var idx = getActiveCardIndex();
        setActiveTintByIndex(idx);
        // Belangrijk: NIET continu de uitleg-sheet 'her-uitlijnen' tijdens horizontaal swipen.
        // Dat gaf op iOS soms een zichtbaar 'spring'-effect (inhoud schiet omhoog/omlaag).
        // We doen align alleen bij openen en bij resize/orientation.
      });
    }
    cardsCarousel.addEventListener('scroll', scheduleTintUpdate, { passive: true });
    w.addEventListener('resize', function(){
      w.setTimeout(function(){
        var idx = getActiveCardIndex();
        setActiveTintByIndex(idx);
      }, 30);
    });
  }

  // Landscape (telefoon) is nu pure CSS: we tonen dezelfde carrousel fullscreen.
  // Hierdoor klopt de actieve kaart altijd en blijft typografie identiek.

  // --- Sheet hoogte helpers (compact kaarten -> max uitleg) ---
  function getCssPx(el, name, fallback){
    try{
      var cs = w.getComputedStyle(el || w.document.documentElement);
      var v = cs.getPropertyValue(name);
      var n = parseFloat(String(v || '').replace('px',''));
      return isNaN(n) ? fallback : n;
    }catch(_e){ return fallback; }
  }

  function getSheetMaxH(){
    return getCssPx(infoSheet, '--sheetMaxH', getCssPx(w.document.documentElement, '--sheetPageH', 520) || 520);
  }

  function getSheetCurH(){
    return getCssPx(infoSheet, '--sheetCurH', getCssPx(infoSheet, '--sheetCompactH', 420));
  }

  function setSheetCurH(px){
    if(!infoSheet) return;
    infoSheet.style.setProperty('--sheetCurH', Math.max(240, px) + 'px');
  }

  function setSheetCompactH(px){
    if(!infoSheet) return;
    infoSheet.style.setProperty('--sheetCompactH', Math.max(240, px) + 'px');
    setSheetCurH(px);
  }

  function measureAndSetCompactH(){
    if(!infoSheet || !sheetViewport) return;
    // Neem de eerste slide als referentie (kaart + kleine marge)
    var first = cardsCarousel ? cardsCarousel.querySelector('.cardsSlideInner') : null;
    if(!first || !first.getBoundingClientRect) return;
    var rect = first.getBoundingClientRect();
    var handleH = 18;
    // zo min mogelijk witruimte: alleen een klein beetje "adem" onder de kaart
    var pad = 8;
    var compact = Math.round(rect.height + handleH + pad);
    var maxH = getSheetMaxH();
    compact = Math.min(compact, maxH);
    setSheetCompactH(compact);
  }



  // Drag handle (Google Maps-achtig): omhoog = open, omlaag = peek
  function initDrag(){
    if(!handle || !infoSheet) return;

    var dragging = false;
    var startY = 0;
    var startX = 0;
    var dy = 0;
    var dx = 0;
    var raf = 0;
    var startTime = 0;
    var baseSheetY = 0;
    var baseStackY = 0;
    var baseCurH = 0;
    var lastMoveT = 0;
    var lastMoveY = 0;
    var vY = 0; // gesmoothde eindsnelheid (px/ms)
    var cancelled = false;

    // In dit ontwerp is 'peek' gelijk aan volledig dicht (translateY(100%)).
    function getPeekPx(){ return 0; }

    function getY(ev){
      if(!ev) return 0;
      if(ev.touches && ev.touches.length) return ev.touches[0].clientY;
      if(typeof ev.clientY === 'number') return ev.clientY;
      return 0;
    }

    function getX(ev){
      if(!ev) return 0;
      if(ev.touches && ev.touches.length) return ev.touches[0].clientX;
      if(typeof ev.clientX === 'number') return ev.clientX;
      return 0;
    }

    function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

    // iOS-achtige weerstand bij overdrag
    function rubberBand(dist){
      var c = 160;
      var d = Math.abs(dist);
      var r = (c * d) / (c + d);
      return (dist < 0) ? -r : r;
    }

    function currentTranslateY(el){
      try{
        var st = w.getComputedStyle(el);
        var tr = st.transform || st.webkitTransform || 'none';
        if(!tr || tr === 'none') return 0;
        // matrix(a,b,c,d,tx,ty)
        var m = tr.match(/matrix\(([^)]+)\)/);
        if(m && m[1]){
          var parts = m[1].split(',');
          var ty = parseFloat(parts[5] || '0');
          return isNaN(ty) ? 0 : ty;
        }
        var m3 = tr.match(/matrix3d\(([^)]+)\)/);
        if(m3 && m3[1]){
          var p3 = m3[1].split(',');
          var ty3 = parseFloat(p3[13] || '0');
          return isNaN(ty3) ? 0 : ty3;
        }
      }catch(_e){}
      return 0;
    }

    function applySheet(y){
      infoSheet.style.transform = 'translate3d(0,' + y + 'px,0)';
    }

    function applyCurH(h){
      setSheetCurH(h);
    }

    function applyStack(y){
      if(!sheetStack) return;
      sheetStack.style.transform = 'translate3d(0,' + y + 'px,0)';
    }

    function pageH(){
      // Pagina's zijn altijd --sheetMaxH hoog (stabiel), viewport kan kleiner zijn.
      return getSheetMaxH();
    }

    function setInteractiveByStack(stackY){
      // stackY == 0 => cards boven, stackY == -pageH => help boven
      var h = pageH();
      var which = (stackY <= -h * 0.5) ? 'help' : 'cards';
      setTopPage(which);
    }

    function onDown(ev){
      var t = ev && ev.target;
      var inCarousel = !!(t && t.closest && (t.closest('.infoCarousel') || t.closest('.cardsCarousel')));
      var inHandle = !!(t && t.closest && t.closest('.sheetHandle'));
      if(inCarousel && !inHandle) return;

      dragging = true;
      cancelled = false;
      startX = getX(ev);
      startY = getY(ev);
      dy = 0;
      dx = 0;
      startTime = Date.now();
      lastMoveT = startTime;
      lastMoveY = startY;
      vY = 0;

      // base positions
      baseSheetY = currentTranslateY(infoSheet);
      baseStackY = sheetStack ? currentTranslateY(sheetStack) : 0;
      baseCurH = getSheetCurH();

      // kill transitions during drag
      infoSheet.style.transition = 'none';
      if(sheetStack) sheetStack.style.transition = 'none';

      // Tijdens drag: altijd achtergrond locken, anders krijg je "dubbel scroll".
      lockBackgroundScroll(true);

      if(ev && ev.preventDefault) ev.preventDefault();

      w.addEventListener('touchmove', onMove, { passive:false });
      w.addEventListener('touchend', onUp, { passive:true });
      w.addEventListener('pointermove', onMove);
      w.addEventListener('pointerup', onUp);
    }

    function onMove(ev){
      if(!dragging || cancelled) return;

      var y = getY(ev);
      var x = getX(ev);
      dy = (y - startY);
      dx = (x - startX);

      // horizontaal? laat de carrousel doen
      if(Math.abs(dx) > Math.abs(dy) * 1.15){
        cancelled = true;
        onUp();
        return;
      }

      var sheetH = infoSheet.getBoundingClientRect ? infoSheet.getBoundingClientRect().height : 520;
      var peekY = Math.max(0, sheetH - getPeekPx());
      var openY = 0;

      // Alleen sheet drag (geen pagina-wissel via drag)
      var targetY = baseSheetY + dy;
      if(targetY < openY){
        targetY = openY + rubberBand(targetY - openY);
        infoCard && infoCard.classList && infoCard.classList.add('pkOverTop');
      }else{
        infoCard && infoCard.classList && infoCard.classList.remove('pkOverTop');
      }
      if(targetY > peekY){
        targetY = peekY + rubberBand(targetY - peekY);
        infoCard && infoCard.classList && infoCard.classList.add('pkOverBottom');
      }else{
        infoCard && infoCard.classList && infoCard.classList.remove('pkOverBottom');
      }

      // velocity tracking (smooth)
      var now = Date.now();
      var dtv = now - lastMoveT;
      if(dtv > 0){
        var inst = (y - lastMoveY) / dtv;
        vY = (vY * 0.8) + (inst * 0.2);
        lastMoveY = y;
        lastMoveT = now;
      }

      if(ev && ev.preventDefault) ev.preventDefault();

      if(!raf){
        raf = w.requestAnimationFrame(function(){
          raf = 0;
          applySheet(targetY);
        });
      }
    }

    function onUp(){
      if(!dragging) return;
      dragging = false;

      // cleanup listeners
      w.removeEventListener('touchmove', onMove);
      w.removeEventListener('touchend', onUp);
      w.removeEventListener('pointermove', onMove);
      w.removeEventListener('pointerup', onUp);

      // Google Maps-achtig rubber-band gedrag:
      // - omhoog trekken geeft alleen weerstand en veert altijd terug naar open
      // - omlaag trekken kan sluiten (threshold of snelle swipe)
      var sheetH = infoSheet.getBoundingClientRect ? infoSheet.getBoundingClientRect().height : 520;
      var peekY = Math.max(0, sheetH - getPeekPx());
      var openY = 0;

      var sheetY = currentTranslateY(infoSheet);
      var v = vY; // px/ms

      var closeThreshold = 90; // px omlaag voordat we sluiten
      var sheetTargetY = openY;
      if(sheetY > closeThreshold || v > 0.85){
        sheetTargetY = peekY;
      }

      infoSheet.style.transition = 'transform 280ms cubic-bezier(0.2, 0.85, 0.2, 1)';
      applySheet(sheetTargetY);

      w.setTimeout(function(){
        infoSheet.style.transition = '';
        infoSheet.style.transform = '';
        if(infoCard && infoCard.classList){
          infoCard.classList.remove('pkOverTop');
          infoCard.classList.remove('pkOverBottom');
        }
        // Als we open blijven: niets resetten/alignen (voorkomt 'jump').
        // Als we sluiten: normale close-flow.
        if(sheetTargetY === peekY) peekInfo();
      }, 320);
    }

    // Drag op handle en op hele card (behalve horizontale carrousel)
    handle.addEventListener('touchstart', onDown, { passive:false });
    handle.addEventListener('pointerdown', onDown);
    if(infoCard){
      infoCard.addEventListener('touchstart', onDown, { passive:false });
      infoCard.addEventListener('pointerdown', onDown);
    }

    // Tap op handle toggles open/peek
    handle.addEventListener('click', function(){
      if(isInfoOpen()) peekInfo(); else openInfo();
    });
  }
  // Init: content laden. Sheet is standaard volledig dicht en opent alleen via info-knop.
  if(infoSheet){
    // start altijd volledig dicht; alleen openen via info-knop
    infoSheet.hidden = true;
    loadAndRender();
    // Kaartenpagina bestaat altijd: bouw de carrousel zodra items geladen zijn.
    // (Geen dynamisch mounten na interactie.)
    w.setTimeout(function(){
      if(cardsCarousel && !cardsCarousel.children.length && ITEMS && ITEMS.length){
        renderCards(ITEMS);
      }
    }, 260);
    // Overlay click = sluit volledig
    if(infoOverlay) infoOverlay.onclick = peekInfo;
    // Gestures activeren (Google Maps-achtig) zodra de sheet wordt geopend.
    // (We initialiseren hier alvast zodat de handle meteen werkt als de sheet open is.)
    try{ initDrag(); w.__pkInfoDragInited = true; }catch(_e){}
  }
})(window);
