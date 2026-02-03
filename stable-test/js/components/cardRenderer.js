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
    img.src = PK.withV ? PK.withV(item.bg) : item.bg;
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
    var srcRect = 'sets/' + encodeURIComponent(args.setId) + '/cards_rect/' + (args.cardFile || (args.key + '.svg'));
    var src = 'sets/' + encodeURIComponent(args.setId) + '/cards/' + (args.cardFile || (args.key + '.svg'));
    miniImg.src = PK.withV ? PK.withV(srcRect) : srcRect;
    miniImg.onerror = function(){
      // Fallback als cards_rect niet bestaat (bij oudere sets)
      this.onerror = null;
      this.src = PK.withV ? PK.withV(src) : src;
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
      // (0.14 bleek op sommige schermen praktisch onzichtbaar.)
      var lite = PK.lighten(dom, 0.90);
      var rgb = 'rgba(' + lite.r + ', ' + lite.g + ', ' + lite.b + ', 0.22)';
      try{
        targetEl.style.setProperty('--pkTextBg', rgb);
      }catch(_e4){
        targetEl.style.background = rgb;
      }
    }, function(){
      // keep base
    });
  };
})(window);
