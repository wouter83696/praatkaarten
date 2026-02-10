// Praatkaartjes – CardRenderer component (ES5)
// Doel: één plek voor het bouwen van kaart-UI (grid kaarten + menu thumbnails)
// en voor het toepassen van de dominante tint (uitleg tekstvlak).

(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};

  PK.createGridCard = function(item){
    // item: { theme, themeLabel, q, bg }
    var btn = w.document.createElement('button');
    btn.className = 'card';
    btn.type = 'button';
    if(item && item.theme) btn.setAttribute('data-theme', item.theme);

    var inner = w.document.createElement('div');
    inner.className = 'cardInner';

    var img = w.document.createElement('img');
    img.className = 'bg';
    var rectSrc = item.bg || '';
    var fullSrc = rectSrc.indexOf('/cards_rect/') !== -1 ? rectSrc.replace('/cards_rect/','/cards/') : rectSrc;
    img.setAttribute('data-src-rect', rectSrc);
    img.setAttribute('data-src-full', fullSrc);
    img.src = PK.withV ? PK.withV(rectSrc) : rectSrc;
    img.onerror = function(){
      if(this.getAttribute('data-fallback') === '1') return;
      this.setAttribute('data-fallback','1');
      var next = this.getAttribute('data-src-full') || '';
      if(next && next !== this.src){
        this.src = PK.withV ? PK.withV(next) : next;
      }
    };
    img.alt = '';

    var q = w.document.createElement('div');
    q.className = 'q';

    // Thema label in de index is niet nodig (rustiger). Bewust weggelaten.

    var span = w.document.createElement('span');
    span.className = 'qText';
    span.textContent = item.q || '';
    q.appendChild(span);

    inner.appendChild(img);
    inner.appendChild(q);
    btn.appendChild(inner);

    return btn;
  };

  PK.createMenuItem = function(args){
    // args: { setId, key, label, cardFile }
    var btn = w.document.createElement('button');
    btn.className = 'menuItem themeItem';
    btn.type = 'button';
    btn.setAttribute('data-set', args.key);

    var lab = w.document.createElement('span');
    lab.className = 'miLabel';
    lab.textContent = args.label || args.key;

    var thumb = w.document.createElement('span');
    thumb.className = 'miThumbRight';
    thumb.setAttribute('aria-hidden','true');

    var mini = w.document.createElement('div');
    mini.className = 'menuThumbCard';

    var miniImg = w.document.createElement('img');
    miniImg.className = 'bg';
    var cardFile = (args.cardFile || (args.key + '.svg'));
    var coverFile = args.cover || 'voorkant.svg';
    var basePath = (PK && PK.pathForSet) ? null : ((PK && PK.PATHS && PK.PATHS.setsDir) ? PK.PATHS.setsDir : '.');
    var srcRect = (PK && PK.pathForSet) ? PK.pathForSet(args.setId, 'cards_rect/' + cardFile) : (basePath + '/' + encodeURIComponent(args.setId) + '/cards_rect/' + cardFile);
    var srcFull = (PK && PK.pathForSet) ? PK.pathForSet(args.setId, 'cards/' + cardFile) : (basePath + '/' + encodeURIComponent(args.setId) + '/cards/' + cardFile);
    var coverRect = (PK && PK.pathForSet) ? PK.pathForSet(args.setId, 'cards_rect/' + coverFile) : (basePath + '/' + encodeURIComponent(args.setId) + '/cards_rect/' + coverFile);
    var coverFull = (PK && PK.pathForSet) ? PK.pathForSet(args.setId, 'cards/' + coverFile) : (basePath + '/' + encodeURIComponent(args.setId) + '/cards/' + coverFile);
    miniImg.setAttribute('data-fallback-step','0');
    miniImg.setAttribute('data-src-rect', srcRect);
    miniImg.setAttribute('data-src-full', srcFull);
    miniImg.setAttribute('data-cover-rect', coverRect);
    miniImg.setAttribute('data-cover-full', coverFull);
    miniImg.src = PK.withV ? PK.withV(srcRect) : srcRect;
    miniImg.onerror = function(){
      var step = parseInt(this.getAttribute('data-fallback-step') || '0', 10);
      var next = '';
      if(step === 0) next = this.getAttribute('data-src-full') || '';
      else if(step === 1) next = this.getAttribute('data-cover-rect') || '';
      else if(step === 2) next = this.getAttribute('data-cover-full') || '';
      else return;
      this.setAttribute('data-fallback-step', String(step + 1));
      if(next && next !== this.src){
        this.src = PK.withV ? PK.withV(next) : next;
      }
    };
    miniImg.alt = '';

    mini.appendChild(miniImg);
    thumb.appendChild(mini);

    btn.appendChild(lab);
    btn.appendChild(thumb);

    return btn;
  };

  PK.applyDominantTint = function(targetEl, svgUrl, defaultBg){
    if(!targetEl) return;
    var DEBUG_TINT = false; // TEMP: show tint outline for verification
    // NOTE (fix): niet meer via inline background zetten.
    // Inline styles "winnen" van dark/light CSS, waardoor het tekstvak soms niet goed omschakelt.
    // We sturen nu met CSS-variabelen, zodat de mode altijd leidend blijft.

    var base = defaultBg || 'rgba(255,255,255,0.82)';
    try{
      targetEl.style.setProperty('--pkTextBg', base);
    }catch(_e){
      // fallback (heel oud): als variabelen niet werken
      targetEl.style.background = base;
    }
    if(DEBUG_TINT && targetEl && targetEl.classList && targetEl.classList.contains('infoSlideText')){
      try{
        targetEl.style.outline = '2px solid rgba(255,0,255,0.65)';
        targetEl.style.outlineOffset = '0px';
      }catch(_e0){}
    }

    // In dark mode geen "licht" tinten berekenen (wordt snel flets/raar).
    // We houden dan gewoon de base (die door caller al dark/light gekozen wordt).
    var root = w.document && w.document.documentElement;
    var isDark = false;
    try{
      isDark = !!(root && root.getAttribute && root.getAttribute('data-contrast') === 'dark');
    }catch(_e2){}

    // Clear eerdere tint, zodat wisselen van mode altijd meteen klopt.
    // (We gebruiken 1 variabele: --pkTextBg)

    if(isDark) return;

    if(!PK.getText || !PK.dominantColorFromSvgText || !PK.lighten) return;

    PK.getText(svgUrl).then(function(txt){
      var dom = PK.dominantColorFromSvgText(txt);
      if(!dom) return;
      // Subtiel meekleuren: nét zichtbaar, maar nog steeds rustig.
      // Zelfde gevoel als de index-kaarten.
      var lite = PK.lighten(dom, 0.90);
      var rgb = 'rgba(' + lite.r + ', ' + lite.g + ', ' + lite.b + ', 0.22)';
      try{
        targetEl.style.setProperty('--pkTextBg', rgb);
      }catch(_e4){
        targetEl.style.background = rgb;
      }
      if(DEBUG_TINT && targetEl && targetEl.classList && targetEl.classList.contains('infoSlideText')){
        try{
          targetEl.style.outline = '2px solid ' + rgb;
          targetEl.style.outlineOffset = '0px';
        }catch(_e5){}
      }
    }, function(){
      // keep base
    });
  };
})(window);
