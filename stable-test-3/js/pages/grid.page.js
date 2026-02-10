// Praatkaartjes – kaartensets index (ES5)
// Doel: simpele, voorspelbare sets-pagina zonder gedeelde "carousel" classes
// die elders ook gebruikt worden (en daardoor onverwachte styling/scroll gedrag geven).
(function(w){
  'use strict';

  var PK = w.PK = w.PK || {};
  PK.pages = PK.pages || {};
  var doc = w.document;

  var carousel = doc.getElementById('setsCarousel'); // .setsHeroCarousel
  var grid = doc.getElementById('setsGrid');
  var dots = doc.getElementById('setsDots');
  if(!carousel && !grid) return;

  var menuList = doc.getElementById('menuList');
  var menuTitle = doc.getElementById('menuSetTitle');
  var pillText = doc.getElementById('themePillText');
  var contrastBtn = doc.getElementById('menuContrastToggle');
  var shuffleBtn = doc.getElementById('menuShuffleToggle');
  var menuInfoBtn = doc.getElementById('menuInfoBtn');
  var heroSection = doc.querySelector ? doc.querySelector('.setsHero') : null;
  var gridSection = doc.querySelector ? doc.querySelector('.setsGridSection') : null;

  var CONTRAST = 'light';
  var lastIndexConfig = null;
  var dotsBound = false;
  var bgBandsBound = false;
  var bgBandsTimer = 0;

  // Menu wiring
  var pillBtn = doc.getElementById('themePill');
  var overlay = doc.getElementById('themeMenuOverlay');
  var menuEl = doc.getElementById('themeMenu');
  var menuApi = null;
  if(PK.createMenu){
    menuApi = PK.createMenu({ menu: menuEl, overlay: overlay, trigger: pillBtn });
  }

  // Main-index kaartpalet (referentie uit ontwerp-SVG):
  // - BASE is standaard op main index
  // - LIGHT spaarzaam als zachte variatie
  // - DEEP alleen als reserve/highlight (niet standaard in grid/carrousel)
  var MAIN_INDEX_CARD_PALETTE = {
    light: [
      '#CFE6DF', '#DDE8F6', '#E7E1F5', '#F3DCE4', '#F8E4D2',
      '#E3E9D5', '#D6ECEA', '#F3E6D8', '#EEEFF4'
    ],
    base: [
      '#9EC7B6', '#6C9BD2', '#8F6ED5', '#E07A8A', '#E88A3D',
      '#8FAE5D', '#4F8F8C', '#CFA77F', '#B8BCCF'
    ],
    deep: [
      '#6FAE9A', '#4C7FB8', '#6A63C2', '#C9657A', '#C96A24',
      '#6F9E4E', '#2F5F63', '#8E5E3B', '#7A7F99'
    ]
  };

  function trim(s){
    return String(s || '').replace(/^\s+|\s+$/g,'');
  }

  function toCsvPalette(hexList){
    var out = [];
    for(var i=0;i<(hexList || []).length;i++){
      var csv = parseHexToRgbCsv(hexList[i]);
      if(csv) out.push(csv);
    }
    return out;
  }

  var MAIN_INDEX_CARD_PALETTE_CSV = {
    light: toCsvPalette(MAIN_INDEX_CARD_PALETTE.light),
    base: toCsvPalette(MAIN_INDEX_CARD_PALETTE.base),
    deep: toCsvPalette(MAIN_INDEX_CARD_PALETTE.deep)
  };

  function palettePick(group, idx){
    var list = MAIN_INDEX_CARD_PALETTE_CSV[group] || [];
    if(!list.length) return '223,238,232';
    var n = Math.abs(parseInt(idx, 10) || 0);
    return list[n % list.length];
  }

  function buildMainIndexPlaceholderTints(count, offset){
    var total = parseInt(count, 10) || 0;
    if(total < 1) return [];

    var start = parseInt(offset, 10) || 0;
    if(start < 0) start = 0;

    // Regelset (main index):
    // - BASE als standaard
    // - LIGHT spaarzaam
    // - DEEP niet standaard in grid/carrousel
    var lightTarget = (total >= 3 ? 1 : 0);
    var lightPos = -1;

    if(lightTarget === 1){
      lightPos = Math.max(1, Math.min(total - 1, Math.floor(total * 0.18)));
    }

    var out = [];
    for(var i=0;i<total;i++){
      var slot = start + i;
      if(lightPos === i){
        out.push(palettePick('light', slot));
      }else{
        out.push(palettePick('base', slot));
      }
    }
    return out;
  }

  function parseHexToRgbCsv(input){
    var hex = String(input || '').replace(/^\s+|\s+$/g,'').replace('#','');
    if(hex.length === 3){
      hex = hex.charAt(0)+hex.charAt(0)+hex.charAt(1)+hex.charAt(1)+hex.charAt(2)+hex.charAt(2);
    }
    if(hex.length !== 6) return '';
    var r = parseInt(hex.slice(0,2),16);
    var g = parseInt(hex.slice(2,4),16);
    var b = parseInt(hex.slice(4,6),16);
    if(!isFinite(r) || !isFinite(g) || !isFinite(b)) return '';
    return r + ', ' + g + ', ' + b;
  }

  function parseRgbFuncToCsv(input){
    var m = String(input || '').match(/rgba?\(([^)]+)\)/i);
    if(!m || !m[1]) return '';
    var p = m[1].split(',');
    if(p.length < 3) return '';
    var r = Math.max(0, Math.min(255, parseFloat(String(p[0]).replace(/^\s+|\s+$/g,''))));
    var g = Math.max(0, Math.min(255, parseFloat(String(p[1]).replace(/^\s+|\s+$/g,''))));
    var b = Math.max(0, Math.min(255, parseFloat(String(p[2]).replace(/^\s+|\s+$/g,''))));
    if(!isFinite(r) || !isFinite(g) || !isFinite(b)) return '';
    return Math.round(r) + ', ' + Math.round(g) + ', ' + Math.round(b);
  }

  function colorToRgbCsv(input){
    var raw = trim(input || '');
    if(!raw) return '';
    if(raw.charAt(0) === '#') return parseHexToRgbCsv(raw);
    if(/^rgba?\(/i.test(raw)) return parseRgbFuncToCsv(raw);
    if(/^\d+\s*,\s*\d+\s*,\s*\d+/.test(raw)) return raw.replace(/\s+/g,'');
    return '';
  }

  function resolveMenuBaseRgb(meta){
    var candidates = [];
    var cssVars = (meta && meta.cssVars && typeof meta.cssVars === 'object') ? meta.cssVars : null;
    if(cssVars){
      candidates.push(cssVars['--pk-set-bg']);
      candidates.push(cssVars['pk-set-bg']);
      candidates.push(cssVars['--bg-base-color']);
      candidates.push(cssVars['bg-base-color']);
      candidates.push(cssVars['--setsBaseBg']);
      candidates.push(cssVars['setsBaseBg']);
      candidates.push(cssVars['--pk-set-card']);
      candidates.push(cssVars['pk-set-card']);
    }
    try{
      var rs = w.getComputedStyle ? w.getComputedStyle(doc.documentElement) : null;
      if(rs){
        candidates.push(rs.getPropertyValue('--pk-set-bg'));
        candidates.push(rs.getPropertyValue('--bg-base-color'));
        candidates.push(rs.getPropertyValue('--setsBaseBg'));
        candidates.push(rs.getPropertyValue('--setsHeaderBg'));
      }
    }catch(_eRs){}
    candidates.push('#FAFAF8');
    for(var i=0;i<candidates.length;i++){
      var csv = colorToRgbCsv(candidates[i]);
      if(csv) return csv;
    }
    return '250, 250, 248';
  }

  function applyMenuSurfaceTint(meta){
    var root = doc && doc.documentElement;
    if(!root || !root.style || !root.style.setProperty) return;
    var rgb = resolveMenuBaseRgb(meta);
    try{
      root.style.setProperty('--menuSurface', rgb);
      root.style.setProperty('--menuTintRgb', rgb);
      root.style.setProperty('--menuSurfaceAlpha', '0.82');
      root.style.setProperty('--menuSheetAlpha', '0.82');
      root.style.setProperty('--menuBtnAlpha', '0.86');
    }catch(_eSet){}
  }

  function renderDots(count){
    if(!dots) return;
    dots.innerHTML = '';
    if(!count || count < 1){
      dots.style.display = 'none';
      return;
    }
    dots.style.display = 'flex';
    for(var i=0;i<count;i++){
      var d = doc.createElement('span');
      d.className = 'setsDot' + (i === 0 ? ' is-active' : '');
      dots.appendChild(d);
    }
  }

  function getIndexLayout(){
    var body = doc && doc.body;
    var l = body && body.getAttribute ? body.getAttribute('data-index-layout') : '';
    l = String(l || '').toLowerCase();
    if(l === 'hero-grid' || l === 'herogrid') return 'hero-grid';
    if(l === 'grid') return 'grid';
    if(l === 'empty') return 'empty';
    return 'carousel';
  }

  function applyIndexLayout(){
    var layout = getIndexLayout();
    var showHero = (layout === 'carousel' || layout === 'hero-grid');
    var showGrid = (layout === 'hero-grid' || layout === 'grid');
    if(heroSection) heroSection.hidden = !showHero;
    if(gridSection) gridSection.hidden = !showGrid;
    return { layout: layout, showHero: showHero, showGrid: showGrid };
  }

  function resolveBuildVersion(){
    var v = '';
    try{ v = String(w.PK_ASSET_V || ''); }catch(_eV){}
    if(v) return v;
    try{
      var scripts = doc.getElementsByTagName('script');
      for(var i=0;i<scripts.length;i++){
        var src = scripts[i] && scripts[i].getAttribute ? String(scripts[i].getAttribute('src') || '') : '';
        if(src.indexOf('js/main.js') === -1) continue;
        var m = src.match(/[?&]v=([^&]+)/);
        if(m && m[1]) return decodeURIComponent(m[1]);
      }
    }catch(_eS){}
    return '';
  }

  function renderBuildStamp(){
    if(!doc || !doc.body) return;
    if(!doc.body.classList || !doc.body.classList.contains('setsIndex')) return;
    var el = doc.getElementById('pkBuildStamp');
    if(!el){
      el = doc.createElement('div');
      el.id = 'pkBuildStamp';
      el.className = 'pkBuildStamp';
      el.setAttribute('aria-hidden', 'true');
      doc.body.appendChild(el);
    }
    var v = resolveBuildVersion();
    el.textContent = v ? ('build ' + v) : 'build ?';
  }

  function updateBackgroundBandsNow(){
    if(!doc || !doc.documentElement || !doc.body) return;
    if(!doc.body.classList || !doc.body.classList.contains('setsIndex')) return;

    var scrollTop = w.pageYOffset || doc.documentElement.scrollTop || doc.body.scrollTop || 0;
    var heroEnd = 0;

    if(gridSection && !gridSection.hidden && gridSection.getBoundingClientRect){
      heroEnd = Math.round(scrollTop + gridSection.getBoundingClientRect().top);
    }else if(heroSection && !heroSection.hidden && heroSection.getBoundingClientRect){
      heroEnd = Math.round(scrollTop + heroSection.getBoundingClientRect().bottom);
    }else{
      heroEnd = Math.round(scrollTop + (w.innerHeight || 0) * 0.62);
    }

    if(!isFinite(heroEnd) || heroEnd < 220) heroEnd = 220;
    doc.documentElement.style.setProperty('--setsBandHeroEnd', heroEnd + 'px');
  }

  function scheduleBackgroundBands(){
    if(bgBandsTimer) w.clearTimeout(bgBandsTimer);
    bgBandsTimer = w.setTimeout(function(){
      updateBackgroundBandsNow();
      if(lastIndexConfig) applyBackground(lastIndexConfig);
      syncHeroCardStates();
      syncGridCardStates();
    }, 48);
  }

  function ensureBackgroundBandSync(){
    if(bgBandsBound) return;
    bgBandsBound = true;
    w.addEventListener('resize', scheduleBackgroundBands, { passive:true });
    w.addEventListener('orientationchange', scheduleBackgroundBands, { passive:true });
    w.addEventListener('load', scheduleBackgroundBands, { passive:true });
  }

  function getCardsPage(){
    if(PK && PK.PATHS && PK.PATHS.cardsPage) return PK.PATHS.cardsPage;
    return './kaarten.html';
  }

  function getGridLimit(){
    var limit = 0;
    try{
      var cfg = PK && PK.UI_ACTIVE;
      if(cfg && cfg.index && cfg.index.gridLimit !== undefined && cfg.index.gridLimit !== null){
        var n = parseInt(cfg.index.gridLimit, 10);
        if(isFinite(n) && n > 0) limit = n;
      }
    }catch(_e){}
    return limit;
  }

  function getVisitCounts(){
    try{
      var raw = w.localStorage.getItem('pk_set_counts') || '';
      var data = raw ? JSON.parse(raw) : {};
      if(!data || typeof data !== 'object') return {};
      return data;
    }catch(_e){}
    return {};
  }

  function getLastVisitedId(sets, fallbackId){
    var last = '';
    try{ last = trim(w.localStorage.getItem('pk_last_set') || ''); }catch(_eLast){}
    if(last){
      for(var i=0;i<sets.length;i++){
        if(trim((sets[i] || {}).id || '') === last) return last;
      }
    }
    if(fallbackId){
      for(var j=0;j<sets.length;j++){
        if(trim((sets[j] || {}).id || '') === fallbackId) return fallbackId;
      }
    }
    return (sets[0] && sets[0].id) ? trim(sets[0].id) : '';
  }

  function getDefaultOrder(idx, activeSetId){
    var sets = (idx && Array.isArray(idx.sets)) ? idx.sets : [];
    var ordered = [];
    if(activeSetId) ordered.push(activeSetId);
    for(var i=0;i<sets.length;i++){
      var sid = trim((sets[i] || {}).id || '');
      if(sid && sid !== activeSetId) ordered.push(sid);
    }
    return ordered;
  }

  function getHeroSetOrder(idx, activeSetId, limit){
    var sets = (idx && Array.isArray(idx.sets)) ? idx.sets : [];
    var ids = [];
    var orderMap = {};
    for(var i=0;i<sets.length;i++){
      var id = trim((sets[i] || {}).id || '');
      if(!id) continue;
      orderMap[id] = ids.length;
      ids.push(id);
    }
    var last = getLastVisitedId(sets, activeSetId);
    var counts = getVisitCounts();
    var rest = [];
    for(var j=0;j<ids.length;j++){
      if(ids[j] === last) continue;
      rest.push({
        id: ids[j],
        count: parseInt(counts[ids[j]], 10) || 0,
        order: orderMap[ids[j]]
      });
    }
    rest.sort(function(a,b){
      if(b.count !== a.count) return b.count - a.count;
      return a.order - b.order;
    });
    var out = [];
    if(last) out.push(last);
    for(var k=0;k<rest.length;k++){
      if(limit > 0 && out.length >= limit) break;
      out.push(rest[k].id);
    }
    if(limit > 0 && out.length < limit){
      for(var m=0;m<ids.length;m++){
        if(out.indexOf(ids[m]) !== -1) continue;
        out.push(ids[m]);
        if(out.length >= limit) break;
      }
    }
    return out;
  }

  function isHeroInfinite(){
    return !!(carousel && carousel.getAttribute && carousel.getAttribute('data-infinite') === '1');
  }

  function getHeroSlides(){
    return carousel ? carousel.querySelectorAll('.setsHeroSlide') : null;
  }

  function getHeroSlideWidth(){
    var slides = getHeroSlides();
    if(!slides || !slides.length) return 0;
    var idx = isHeroInfinite() ? 1 : 0;
    if(!slides[idx]) idx = 0;
    var r = slides[idx].getBoundingClientRect();
    return (r && r.width) ? r.width : 0;
  }

  function getHeroRealCount(){
    var slides = getHeroSlides();
    if(!slides || !slides.length) return 0;
    var n = slides.length;
    if(isHeroInfinite() && n >= 2) n = n - 2;
    return n;
  }

  function setActiveDot(idx){
    if(!dots || dots.style.display === 'none') return;
    var kids = dots.children;
    if(!kids || !kids.length) return;
    var n = kids.length;
    if(idx < 0) idx = 0;
    if(idx >= n) idx = n - 1;
    for(var i=0;i<n;i++){
      if(i === idx) kids[i].classList.add('is-active');
      else kids[i].classList.remove('is-active');
    }
  }

  function setCardState(cardEl, active){
    if(!cardEl || !cardEl.classList) return;
    if(active){
      cardEl.classList.add('is-active');
      cardEl.classList.remove('is-muted');
    }else{
      cardEl.classList.remove('is-active');
      cardEl.classList.add('is-muted');
    }
  }

  function syncHeroCardStates(){
    if(!carousel || !carousel.querySelectorAll) return;
    var cards = carousel.querySelectorAll('.setsHeroCard');
    if(!cards || !cards.length) return;

    var best = null;
    var bestDist = Infinity;
    var hostRect = carousel.getBoundingClientRect ? carousel.getBoundingClientRect() : null;
    var centerX = hostRect ? (hostRect.left + hostRect.width / 2) : 0;

    for(var i=0;i<cards.length;i++){
      var c = cards[i];
      if(!c || !c.getBoundingClientRect) continue;
      var r = c.getBoundingClientRect();
      var mid = r.left + r.width / 2;
      var d = Math.abs(mid - centerX);
      if(d < bestDist){
        bestDist = d;
        best = c;
      }
    }

    for(var j=0;j<cards.length;j++){
      setCardState(cards[j], !!(best && cards[j] === best));
    }
  }

  function syncGridCardStates(){
    if(!grid || !grid.querySelectorAll) return;
    var cards = grid.querySelectorAll('.setGridCard');
    if(!cards || !cards.length) return;
    for(var i=0;i<cards.length;i++){
      setCardState(cards[i], false);
    }
  }

  function bindDots(){
    if(!carousel || dotsBound) return;
    dotsBound = true;
    var ticking = false;
    carousel.addEventListener('scroll', function(){
      if(ticking) return;
      ticking = true;
      w.requestAnimationFrame(function(){
        ticking = false;
        var sw = getHeroSlideWidth() || 1;
        var nReal = getHeroRealCount();
        if(!nReal) return;
        var idx = Math.round((carousel.scrollLeft || 0) / sw);
        if(isHeroInfinite()) idx = idx - 1;
        if(idx < 0) idx = nReal - 1;
        if(idx >= nReal) idx = 0;
        setActiveDot(idx);
        syncHeroCardStates();
      });
    }, { passive:true });
  }

  function resetPositions(){
    // iOS/Safari kan scrollposities terugzetten bij refresh/back (bfcache).
    // We willen dat de sets-pagina altijd netjes bovenaan begint + op slide 0.
    try{ w.scrollTo(0, 0); }catch(_e0){}
    if(carousel){
      try{
        var sw = getHeroSlideWidth();
        if(isHeroInfinite() && sw){
          if(carousel.scrollTo) carousel.scrollTo(sw, 0);
          carousel.scrollLeft = sw;
        }else{
          if(carousel.scrollTo) carousel.scrollTo(0, 0);
          carousel.scrollLeft = 0;
        }
      }catch(_e1){}
    }
    setActiveDot(0);
    syncHeroCardStates();
    syncGridCardStates();
  }

  function enableInfiniteCarousel(container, slideClass){
    if(!container) return { hasClones:false };
    var slides = container.querySelectorAll('.' + slideClass);
    if(!slides || slides.length < 2) return { hasClones:false };
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

    w.requestAnimationFrame(function(){
      var w1 = slideWidth();
      if(w1) container.scrollLeft = w1;
    });

    if(container._pkInfiniteBound) return { hasClones:true };
    container._pkInfiniteBound = true;
    var jumping = false;
    container.addEventListener('scroll', function(){
      if(jumping) return;
      var all = container.querySelectorAll('.' + slideClass);
      if(!all || all.length < 3) return;
      var sw = slideWidth();
      if(!sw) return;
      var nReal = all.length - 2;
      var left = container.scrollLeft || 0;

      if(left <= sw * 0.25){
        jumping = true;
        container.scrollLeft = sw * nReal;
        w.requestAnimationFrame(function(){ jumping = false; });
        return;
      }
      if(left >= sw * (nReal + 1 - 0.25)){
        jumping = true;
        container.scrollLeft = sw;
        w.requestAnimationFrame(function(){ jumping = false; });
      }
    }, { passive:true });

    return { hasClones:true };
  }

  // pageshow vuurt ook bij bfcache "back" — dan wil je juist resetten.
  w.addEventListener('pageshow', function(){
    w.setTimeout(function(){
      resetPositions();
      scheduleBackgroundBands();
    }, 0);
  });

  function pickDefaultSet(idx){
    var sets = (idx && Array.isArray(idx.sets)) ? idx.sets : [];

    // 1) laatste bezochte set (kaarten.html)
    var last = '';
    try{ last = trim(w.localStorage.getItem('pk_last_set') || ''); }catch(_eLast){}
    if(last){
      for(var i=0;i<sets.length;i++){
        var sid = trim((sets[i] || {}).id || '');
        if(sid === last) return sid;
      }
    }

    // 2) default uit index.json
    var def = trim(idx && idx.default ? idx.default : '');
    if(def){
      for(var j=0;j<sets.length;j++){
        var sid2 = trim((sets[j] || {}).id || '');
        if(sid2 === def) return sid2;
      }
    }

    // 3) eerste beschikbare
    for(var k=0;k<sets.length;k++){
      var sid3 = trim((sets[k] || {}).id || '');
      if(sid3) return sid3;
    }

    return last || def || 'samenwerken';
  }

  function buildHeroSlide(args){
    var slide = doc.createElement('div');
    slide.className = 'setsHeroSlide';

    var innerWrap = doc.createElement('div');
    innerWrap.className = 'setsHeroSlideInner';

    var card = doc.createElement(args.href ? 'a' : 'div');
    card.className = 'setsHeroCard card is-muted' + (args.placeholder ? ' is-placeholder' : '');
    if(args.href){
      card.href = args.href;
      card.setAttribute('aria-label', args.label || 'Kaartenset');
    }else{
      card.setAttribute('aria-hidden','true');
    }
    if(args.rgb){
      card.style.setProperty('--ph-rgb', args.rgb);
    }

    var inner = doc.createElement('div');
    inner.className = 'cardInner';

    if(!args.placeholder){
      var img = doc.createElement('img');
      img.className = 'bg';
      var basePath = (PK && PK.PATHS && PK.PATHS.setsDir) ? PK.PATHS.setsDir : '.';
      var rectSrc = (PK && PK.pathForSet) ? PK.pathForSet(args.setId, 'cards_rect/' + args.file) : (basePath + '/' + encodeURIComponent(args.setId) + '/cards_rect/' + args.file);
      var fullSrc = (PK && PK.pathForSet) ? PK.pathForSet(args.setId, 'cards/' + args.file) : (basePath + '/' + encodeURIComponent(args.setId) + '/cards/' + args.file);
      img.src = PK.withV ? PK.withV(rectSrc) : rectSrc;
      img.onerror = function(){
        if(this.getAttribute('data-fallback') === '1') return;
        this.setAttribute('data-fallback','1');
        this.src = PK.withV ? PK.withV(fullSrc) : fullSrc;
      };
      img.alt = '';
      inner.appendChild(img);
    }

    card.appendChild(inner);
    innerWrap.appendChild(card);
    slide.appendChild(innerWrap);
    return slide;
  }

  function buildGridCard(args){
    var el = doc.createElement(args.href ? 'a' : 'div');
    el.className = 'setGridCard is-muted' + (args.placeholder ? ' is-placeholder' : '');
    if(args.href){
      el.href = args.href;
      el.setAttribute('aria-label', args.label || 'Kaart');
    }else{
      el.setAttribute('aria-hidden','true');
    }
    if(args.rgb){
      el.style.setProperty('--ph-rgb', args.rgb);
    }

    var inner = doc.createElement('div');
    inner.className = 'cardInner';

    if(!args.placeholder){
      var img = doc.createElement('img');
      img.className = 'bg';
      var basePath = (PK && PK.PATHS && PK.PATHS.setsDir) ? PK.PATHS.setsDir : '.';
      var rectSrc = (PK && PK.pathForSet) ? PK.pathForSet(args.setId, 'cards_rect/' + args.file) : (basePath + '/' + encodeURIComponent(args.setId) + '/cards_rect/' + args.file);
      var fullSrc = (PK && PK.pathForSet) ? PK.pathForSet(args.setId, 'cards/' + args.file) : (basePath + '/' + encodeURIComponent(args.setId) + '/cards/' + args.file);
      img.src = PK.withV ? PK.withV(rectSrc) : rectSrc;
      img.onerror = function(){
        if(this.getAttribute('data-fallback') === '1') return;
        this.setAttribute('data-fallback','1');
        this.src = PK.withV ? PK.withV(fullSrc) : fullSrc;
      };
      img.alt = '';
      inner.appendChild(img);
    }

    el.appendChild(inner);
    return el;
  }

  function renderMenuForIndex(idx){
    if(!menuList) return;
    menuList.innerHTML = '';
    var sets = (idx && Array.isArray(idx.sets)) ? idx.sets : [];
    for(var i=0;i<sets.length;i++){
      var s = sets[i] || {};
      var id = trim(s.id || '');
      if(!id) continue;
      var label = String(s.title || id);
      var coverFile = 'voorkant.svg';
      if(PK.createMenuItem){
        menuList.appendChild(PK.createMenuItem({
          setId: id,
          key: id,
          label: label,
          cardFile: coverFile,
          cover: coverFile
        }));
      }else{
        var btn = doc.createElement('button');
        btn.className = 'menuItem themeItem';
        btn.type = 'button';
        btn.setAttribute('data-set', id);
        btn.textContent = label;
        menuList.appendChild(btn);
      }
    }
  }

  function renderHero(idx, activeSetId, activeMeta){
    if(!carousel) return;
    var layout = getIndexLayout();
    if(layout === 'empty' || layout === 'grid'){
      carousel.innerHTML = '';
      if(dots) dots.innerHTML = '';
      return;
    }
    carousel.innerHTML = '';
    try{ carousel.removeAttribute('data-infinite'); }catch(_eInf){}

    var sets = (idx && Array.isArray(idx.sets)) ? idx.sets : [];
    var titleMap = {};
    for(var i=0;i<sets.length;i++){
      var sid = trim((sets[i] || {}).id || '');
      if(!sid) continue;
      titleMap[sid] = String((sets[i] || {}).title || sid);
    }

    var heroLimit = 6;
    var ordered = getHeroSetOrder(idx, activeSetId, heroLimit);
    var count = 0;
    for(var o=0;o<ordered.length;o++){
      var id = ordered[o];
      var label = titleMap[id] || id;
      var file = (id === activeSetId && activeMeta && activeMeta.cover) ? String(activeMeta.cover) : 'voorkant.svg';
      var cardsPage = getCardsPage();
      carousel.appendChild(buildHeroSlide({
        setId: id,
        file: file,
        href: cardsPage + '?set=' + encodeURIComponent(id),
        label: label
      }));
      count++;
    }

    // placeholders voor vaste 6-slides feel
    var minSlides = heroLimit;
    var phNeeded = Math.max(0, minSlides - count);
    var heroTints = buildMainIndexPlaceholderTints(phNeeded, count);
    for(var k=0;k<phNeeded;k++){
      carousel.appendChild(buildHeroSlide({
        placeholder: true,
        rgb: heroTints[k]
      }));
    }

    renderDots(minSlides);
    enableInfiniteCarousel(carousel, 'setsHeroSlide');
    bindDots();
    resetPositions();
    syncHeroCardStates();
  }

  function renderGrid(idx, activeSetId, activeMeta){
    if(!grid) return;
    var layout = getIndexLayout();
    if(layout === 'empty' || layout === 'carousel'){
      grid.innerHTML = '';
      return;
    }
    grid.innerHTML = '';

    var sets = (idx && Array.isArray(idx.sets)) ? idx.sets : [];
    var titleMap = {};
    for(var i=0;i<sets.length;i++){
      var sid = trim((sets[i] || {}).id || '');
      if(!sid) continue;
      titleMap[sid] = String((sets[i] || {}).title || sid);
    }

    var maxItems = getGridLimit();
    var ordered = maxItems > 0 ? getHeroSetOrder(idx, activeSetId, maxItems) : getDefaultOrder(idx, activeSetId);
    var count = 0;
    for(var k=0;k<ordered.length;k++){
      if(maxItems > 0 && count >= maxItems) break;
      var id = ordered[k];
      var label = titleMap[id] || id;
      var file = (id === activeSetId && activeMeta && activeMeta.cover) ? String(activeMeta.cover) : 'voorkant.svg';
      var cardsPage = getCardsPage();
      grid.appendChild(buildGridCard({
        setId: id,
        file: file,
        label: label,
        href: cardsPage + '?set=' + encodeURIComponent(id)
      }));
      count++;
    }

    // Vaste minimum "grid feel" met lege kaarten (met mooie tinten)
    var minGrid = maxItems > 0 ? maxItems : 6;
    var phNeeded = Math.max(0, minGrid - count);
    var gridTints = buildMainIndexPlaceholderTints(phNeeded, count);
    for(var m=0;m<phNeeded;m++){
      grid.appendChild(buildGridCard({
        placeholder: true,
        rgb: gridTints[m]
      }));
    }
    syncGridCardStates();
  }

  function applyBackground(idx){
    var bgApi = (PK && PK.gridBackground && PK.gridBackground.render)
      ? PK.gridBackground
      : (PK && PK.indexBackground && PK.indexBackground.render ? PK.indexBackground : null);
    if(!bgApi) return;
    var bg = (idx && idx.indexPage && idx.indexPage.background)
      ? idx.indexPage.background
      : ((idx && idx.uiDefaults && idx.uiDefaults.index && idx.uiDefaults.index.background)
        ? idx.uiDefaults.index.background
        : null);
    var palette = bg && Array.isArray(bg.palette) ? bg.palette : [
      '#67C5BB', '#7FD1C8', '#93DCD4', '#B1E8E1'
    ];
    var darkPalette = bg && Array.isArray(bg.darkPalette) ? bg.darkPalette : null;
    var isDark = false;
    try{
      isDark = (doc && doc.documentElement && doc.documentElement.getAttribute('data-contrast') === 'dark');
    }catch(_e){ isDark = false; }
    var paletteUse = (isDark && darkPalette && darkPalette.length) ? darkPalette : palette;
    // Main index default: 5-6 grote blobs met zichtbare intensiteitsverschillen.
    // (Alleen fallback; per set kan dit nog steeds via index.json overschreven worden.)
    var blobCount = bg && typeof bg.blobCount === 'number'
      ? bg.blobCount
      : (((w.innerWidth || 0) < 900) ? 5 : 6);
    var alphaBoost = bg && typeof bg.alphaBoost === 'number' ? bg.alphaBoost : 1.12;
    var sizeScale = bg && typeof bg.sizeScale === 'number' ? bg.sizeScale : 1.34;
    var darkSizeScale = bg && typeof bg.darkSizeScale === 'number' ? bg.darkSizeScale : 1.25;
    var darkAlphaBoost = bg && typeof bg.darkAlphaBoost === 'number' ? bg.darkAlphaBoost : 0.9;
    var darkMix = bg && typeof bg.darkMix === 'number' ? bg.darkMix : undefined;
    var blobIrregularity = bg && typeof bg.blobIrregularity === 'number' ? bg.blobIrregularity : undefined;
    var blobPointsMin = bg && typeof bg.blobPointsMin === 'number' ? bg.blobPointsMin : undefined;
    var blobPointsMax = bg && typeof bg.blobPointsMax === 'number' ? bg.blobPointsMax : undefined;
    var baseWash = bg && bg.baseWash === false ? false : false;
    var blobWash = bg && typeof bg.blobWash === 'number' ? bg.blobWash : 0;
    var shapeWash = bg && typeof bg.shapeWash === 'number' ? bg.shapeWash : undefined;
    var shapeAlphaBoost = bg && typeof bg.shapeAlphaBoost === 'number' ? bg.shapeAlphaBoost : undefined;
    var blobAlphaCap = bg && typeof bg.blobAlphaCap === 'number' ? bg.blobAlphaCap : 0.26;
    var blobAlphaCapDark = bg && typeof bg.blobAlphaCapDark === 'number' ? bg.blobAlphaCapDark : 0.28;
    var shapeEnabled = bg && typeof bg.shapeEnabled === 'boolean' ? bg.shapeEnabled : false;
    var blobSpread = bg && typeof bg.blobSpread === 'string' ? bg.blobSpread : undefined;
    var blobSpreadMargin = bg && typeof bg.blobSpreadMargin === 'number' ? bg.blobSpreadMargin : undefined;
    var sizeLimit = bg && typeof bg.sizeLimit === 'number' ? bg.sizeLimit : 1.9;
    // Geen vaste light-alpha als default; daardoor ontstaan natuurlijke verschillen.
    var blobAlphaFixed = bg && typeof bg.blobAlphaFixed === 'number' ? bg.blobAlphaFixed : undefined;
    var customLightBlobs = (bg && Array.isArray(bg.customLightBlobs) && bg.customLightBlobs.length)
      ? bg.customLightBlobs
      : undefined;
    var customLightViewBox = (bg && bg.customLightViewBox) ? bg.customLightViewBox : undefined;
    var customLightOpacityScale = (bg && typeof bg.customLightOpacityScale === 'number')
      ? bg.customLightOpacityScale
      : 1;
    var surfaceZones = null;
    if(!isDark){
      var vpH = w.innerHeight || 0;
      var scrollTop = w.pageYOffset || doc.documentElement.scrollTop || doc.body.scrollTop || 0;
      var topEndPx = NaN;
      var heroEndPx = NaN;
      var heroStyle = null;
      var rootStyle = null;
      var zoneTopColor = '#F5F7F6';
      var zoneHeroColor = '#EDF2F1';
      var zoneGridColor = '#F3F6F5';
      try{
        heroStyle = (heroSection && w.getComputedStyle) ? w.getComputedStyle(heroSection) : null;
        rootStyle = w.getComputedStyle ? w.getComputedStyle(doc.documentElement) : null;
        var heroPadTop = heroStyle ? parseFloat(String(heroStyle.paddingTop || '')) : NaN;
        var heroExtra = rootStyle ? parseFloat(String(rootStyle.getPropertyValue('--setsHeroPadExtra') || '')) : NaN;
        if(isFinite(heroPadTop) && isFinite(heroExtra)){
          topEndPx = heroPadTop - heroExtra;
        }
      }catch(_eTop){}
      if(rootStyle){
        var cssTop = trim(rootStyle.getPropertyValue('--setsHeaderBg'));
        var cssHero = trim(rootStyle.getPropertyValue('--setsHeroBg'));
        var cssGrid = trim(rootStyle.getPropertyValue('--setsGridBg'));
        if(cssTop) zoneTopColor = cssTop;
        if(cssHero) zoneHeroColor = cssHero;
        if(cssGrid) zoneGridColor = cssGrid;
      }
      if(!isFinite(topEndPx) || topEndPx < 0){
        topEndPx = vpH ? (vpH * 0.12) : 88;
      }
      try{
        if(gridSection && !gridSection.hidden && gridSection.getBoundingClientRect){
          heroEndPx = scrollTop + gridSection.getBoundingClientRect().top;
        }else if(heroSection && !heroSection.hidden && heroSection.getBoundingClientRect){
          heroEndPx = scrollTop + heroSection.getBoundingClientRect().bottom;
        }
      }catch(_eHero){}
      if(!isFinite(heroEndPx)){
        heroEndPx = (vpH ? (vpH * 0.58) : (topEndPx + 320)) + scrollTop;
      }
      if(heroEndPx < topEndPx) heroEndPx = topEndPx;
      surfaceZones = {
        topColor: zoneTopColor,
        heroColor: zoneHeroColor,
        gridColor: zoneGridColor,
        topEndPx: topEndPx,
        heroEndPx: heroEndPx
      };
    }

    var baseId = (idx && idx.default) ? idx.default : ((idx && idx.sets && idx.sets[0]) ? idx.sets[0].id : 'samenwerken');
    var cardBase = (PK.pathForSet
      ? PK.pathForSet(baseId, 'cards_rect/')
      : ((PK.PATHS && PK.PATHS.setsDir ? PK.PATHS.setsDir : '.') + '/' + encodeURIComponent(baseId) + '/cards_rect/'));
    bgApi.render({
      cardBase: cardBase,
      palette: paletteUse,
      darkPalette: darkPalette,
      blobCount: blobCount,
      alphaBoost: alphaBoost,
      darkAlphaBoost: darkAlphaBoost,
      sizeScale: sizeScale,
      darkSizeScale: darkSizeScale,
      darkMix: darkMix,
      blobIrregularity: blobIrregularity,
      blobPointsMin: blobPointsMin,
      blobPointsMax: blobPointsMax,
      baseWash: baseWash,
      blobWash: blobWash,
      shapeWash: shapeWash,
      shapeAlphaBoost: shapeAlphaBoost,
      blobAlphaCap: blobAlphaCap,
      blobAlphaCapDark: blobAlphaCapDark,
      shapeEnabled: shapeEnabled,
      blobSpread: blobSpread,
      blobSpreadMargin: blobSpreadMargin,
      sizeLimit: sizeLimit,
      blobAlphaFixed: blobAlphaFixed,
      customLightBlobs: customLightBlobs,
      customLightViewBox: customLightViewBox,
      customLightOpacityScale: customLightOpacityScale,
      surfaceZones: surfaceZones
    });
  }

  function applyContrast(mode){
    CONTRAST = (mode === 'dark') ? 'dark' : 'light';
    try{ w.sessionStorage.setItem('pk_contrast_session', CONTRAST); }catch(_e){}
    if(doc && doc.documentElement){
      doc.documentElement.setAttribute('data-contrast', CONTRAST);
    }
    if(contrastBtn) contrastBtn.setAttribute('aria-pressed', (CONTRAST === 'dark') ? 'true' : 'false');
    if(lastIndexConfig) applyBackground(lastIndexConfig);
  }

  function setShuffleEnabled(on){
    on = !!on;
    if(shuffleBtn) shuffleBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if(doc && doc.body && doc.body.classList){
      doc.body.classList.toggle('shuffleOn', on);
    }
    try{ w.localStorage.setItem('pk_shuffle', on ? '1' : '0'); }catch(_e){}
  }

  function init(){
    resetPositions();
    renderBuildStamp();
    if(!PK.loadJson && !PK.getJson) return;

    function normalizeIndex(idx){
      idx = idx || {};
      if(!Array.isArray(idx.sets) || !idx.sets.length){
        if(Array.isArray(idx.available) && idx.available.length){
          idx.sets = idx.available.map(function(s){
            return { id: String((s||{}).id||''), title: String((s||{}).title||'') };
          }).filter(function(s){ return !!s.id; });
        }
      }
      if(!Array.isArray(idx.sets) || !idx.sets.length){
        var fallbackId = (idx && idx.default) ? String(idx.default) : 'samenwerken';
        idx.sets = [{ id: fallbackId, title: fallbackId }];
      }
      return idx;
    }

    var getJson = PK.getJson || PK.loadJson;

    function fallbackState(){
      var fallbackId = 'samenwerken';
      var fallbackIdx = {
        default: fallbackId,
        sets: [{ id: fallbackId, title: 'Samen onderzoeken' }],
        uiDefaults: { index: { layout: 'hero-grid', gridLimit: 6 } }
      };
      return { idx: fallbackIdx, setId: fallbackId, meta: {} };
    }

    getJson(PK.PATHS.setsIndex).then(function(idx){
      idx = normalizeIndex(idx);
      var setId = pickDefaultSet(idx);
      lastIndexConfig = idx;

      try{
        if(menuTitle) menuTitle.textContent = 'Kaartensets';
        if(pillText) pillText.textContent = 'Kaartensets';
      }catch(_e0){}

      renderMenuForIndex(idx);

      // active meta (voor cover)
      var basePath = (PK && PK.PATHS && PK.PATHS.setsDir) ? PK.PATHS.setsDir : '.';
      var metaUrl = (PK && PK.pathForSet) ? PK.pathForSet(setId, 'meta.json') : (basePath + '/' + encodeURIComponent(setId) + '/meta.json');
      return getJson(metaUrl).then(function(meta){
        return { idx: idx, setId: setId, meta: meta || {} };
      });
    }).then(function(state){
      // UI config (menu knoppen, evt. per-set css vars)
      try{
        if(PK.applyUiConfig){
          var defaults = (state.idx && state.idx.uiDefaults) ? state.idx.uiDefaults : {};
          var metaUi = (state.meta && state.meta.ui) ? state.meta.ui : {};
          PK.applyUiConfig(state.setId, metaUi, defaults);
          // Index: info-knop mag zichtbaar blijven, maar zonder actie.
          try{ if(menuInfoBtn) menuInfoBtn.removeAttribute('hidden'); }catch(_eShow){}
        }
      }catch(_eCfg){}

      // Per-set CSS vars (meta.cssVars)
      try{
        if(PK.shell && PK.shell.applyCssVars && state.meta && state.meta.cssVars){
          PK.shell.applyCssVars(state.meta.cssVars);
        }
      }catch(_eVars){}
      try{ applyMenuSurfaceTint(state.meta); }catch(_eTint){}

      // Viewer template hint (voor CSS)
      try{
        if(state.meta && state.meta.viewerTemplate && doc && doc.body){
          doc.body.setAttribute('data-viewer-template', String(state.meta.viewerTemplate));
        }
      }catch(_eTpl){}

      try{
        if(PK.DEBUG && w.console && w.console.log){
          w.console.log('[DEBUG] active set', state.setId);
          w.console.log('[DEBUG] viewer template', (state.meta && state.meta.viewerTemplate) ? state.meta.viewerTemplate : 'classic');
        }
      }catch(_eDbg){}

      applyIndexLayout();
      ensureBackgroundBandSync();

      renderHero(state.idx, state.setId, state.meta);
      renderGrid(state.idx, state.setId, state.meta);
      scheduleBackgroundBands();
      w.requestAnimationFrame(function(){
        updateBackgroundBandsNow();
        if(lastIndexConfig) applyBackground(lastIndexConfig);
        w.requestAnimationFrame(function(){
          updateBackgroundBandsNow();
          if(lastIndexConfig) applyBackground(lastIndexConfig);
        });
      });

      // Menu klikken -> naar set
      if(menuList){
        menuList.addEventListener('click', function(e){
          var btn = e.target && (e.target.closest ? e.target.closest('button[data-set]') : null);
          if(!btn) return;
          var targetSet = trim(btn.getAttribute('data-set') || '');
          if(!targetSet) return;
          try{ if(menuApi && menuApi.close) menuApi.close(); }catch(_eClose){}
          w.location.href = getCardsPage() + '?set=' + encodeURIComponent(targetSet);
        });
      }

      // Achtergrond blobs (1× render)
      applyBackground(lastIndexConfig);

      // Contrast toggle
      if(contrastBtn){
        var savedC = 'light';
        try{ savedC = w.sessionStorage.getItem('pk_contrast_session') || 'light'; }catch(_eC){}
        applyContrast(savedC === 'dark' ? 'dark' : 'light');
        contrastBtn.onclick = function(ev){
          if(ev && ev.preventDefault) ev.preventDefault();
          applyContrast(CONTRAST === 'dark' ? 'light' : 'dark');
        };
      }

      // Shuffle toggle (alleen state bewaren; kaartenpagina gebruikt dit ook)
      if(shuffleBtn){
        var savedS = '0';
        try{ savedS = w.localStorage.getItem('pk_shuffle') || '0'; }catch(_eS){}
        setShuffleEnabled(savedS === '1');
        shuffleBtn.onclick = function(ev){
          if(ev && ev.preventDefault) ev.preventDefault();
          var isOn = shuffleBtn.getAttribute('aria-pressed') === 'true';
          setShuffleEnabled(!isOn);
        };
      }

      // Nogmaals forceren na layout (Safari)
      w.requestAnimationFrame(function(){
        resetPositions();
      });
    }).catch(function(){
      var fb = fallbackState();
      try{
        if(menuTitle) menuTitle.textContent = 'Kaartensets';
        if(pillText) pillText.textContent = 'Kaartensets';
      }catch(_e0){}
      try{
        if(PK.applyUiConfig){
          var defaults = (fb.idx && fb.idx.uiDefaults) ? fb.idx.uiDefaults : {};
          PK.applyUiConfig(fb.setId, null, defaults);
        }
      }catch(_eCfg){}
      try{ applyMenuSurfaceTint(fb.meta); }catch(_eTint2){}
      applyIndexLayout();
      ensureBackgroundBandSync();
      renderHero(fb.idx, fb.setId, fb.meta);
      renderGrid(fb.idx, fb.setId, fb.meta);
      scheduleBackgroundBands();
      applyBackground(fb.idx);
    });
  }

  PK.pages.initGrid = init;
})(window);
