// Praatkaartjes – CardRenderer component
import { withV, pathForSet, PATHS } from '../core/paths.js';
import { getText } from '../core/net.js';
import { dominantColorFromSvgText, lighten } from '../core/color.js';

export function createGridCard(item) {
  // item: { theme, themeLabel, q, bg }
  var btn = document.createElement('button');
  btn.className = 'card';
  btn.type = 'button';
  if(item && item.theme) btn.setAttribute('data-theme', item.theme);

  var inner = document.createElement('div');
  inner.className = 'cardInner';

  var img = document.createElement('img');
  img.className = 'bg';
  img.loading = 'lazy';
  img.decoding = 'async';
  var rectSrc = item.bg || '';
  var fullSrc = rectSrc.indexOf('/cards_rect/') !== -1 ? rectSrc.replace('/cards_rect/','/cards/') : rectSrc;
  img.setAttribute('data-src-rect', rectSrc);
  img.setAttribute('data-src-full', fullSrc);
  img.src = withV(rectSrc);
  img.onerror = function(){
    if(this.getAttribute('data-fallback') === '1') return;
    this.setAttribute('data-fallback','1');
    var next = this.getAttribute('data-src-full') || '';
    if(next && next !== this.src){
      this.src = withV(next);
    }
  };
  img.alt = '';

  var q = document.createElement('div');
  q.className = 'q';

  // Thema label in de index is niet nodig (rustiger). Bewust weggelaten.

  var span = document.createElement('span');
  span.className = 'qText';
  span.textContent = item.q || '';
  q.appendChild(span);

  inner.appendChild(img);
  inner.appendChild(q);
  btn.appendChild(inner);

  return btn;
};

export function createMenuItem(args) {
  // args: { setId, key, label, cardFile }
  var isDisabled = !!(args && args.disabled);
  var btn = document.createElement(isDisabled ? 'div' : 'button');
  btn.className = 'menuItem themeItem' + (isDisabled ? ' is-dummy' : '');
  if(!isDisabled){
    btn.type = 'button';
    btn.setAttribute('data-set', args.key);
  }else{
    btn.setAttribute('aria-disabled', 'true');
  }

  var lab = document.createElement('span');
  lab.className = 'miLabel';
  lab.textContent = args.label || args.key;

  var thumb = document.createElement('span');
  thumb.className = 'miThumbRight';
  thumb.setAttribute('aria-hidden','true');

  var mini = document.createElement('div');
  mini.className = 'menuThumbCard';

  var miniImg = document.createElement('img');
  miniImg.className = 'bg';
  miniImg.loading = 'lazy';
  miniImg.decoding = 'async';
  var cardFile = (args.cardFile || (args.key + '.svg'));
  var coverFile = args.cover || 'voorkant.svg';
  var thumbFile = String(args.thumbFile || '').replace(/^\s+|\s+$/g,'').replace(/^\//,'');
  var basePath = PATHS.setsDir;
  var srcRect = thumbFile
    ? pathForSet(args.setId, thumbFile)
    : pathForSet(args.setId, 'cards_rect/' + cardFile);
  var srcFull = thumbFile
    ? srcRect
    : pathForSet(args.setId, 'cards/' + cardFile);
  var coverRect = pathForSet(args.setId, 'cards_rect/' + coverFile);
  var coverFull = pathForSet(args.setId, 'cards/' + coverFile);
  miniImg.setAttribute('data-fallback-step','0');
  miniImg.setAttribute('data-src-rect', srcRect);
  miniImg.setAttribute('data-src-full', srcFull);
  miniImg.setAttribute('data-cover-rect', coverRect);
  miniImg.setAttribute('data-cover-full', coverFull);
  miniImg.src = withV(srcRect);
  miniImg.onerror = function(){
    var step = parseInt(this.getAttribute('data-fallback-step') || '0', 10);
    var next = '';
    if(step === 0) next = this.getAttribute('data-src-full') || '';
    else if(step === 1) next = this.getAttribute('data-cover-rect') || '';
    else if(step === 2) next = this.getAttribute('data-cover-full') || '';
    else return;
    this.setAttribute('data-fallback-step', String(step + 1));
    if(next && next !== this.src){
      this.src = withV(next);
    }
  };
  miniImg.alt = '';

  mini.appendChild(miniImg);
  thumb.appendChild(mini);

  btn.appendChild(lab);
  btn.appendChild(thumb);

  return btn;
};

export function applyDominantTint(targetEl, svgUrl, defaultBg) {
  if(!targetEl) return;
  var DEBUG_TINT = false; // TEMP: show tint outline for verification
  // NOTE (fix): niet meer via inline background zetten.
  // Inline styles "winnen" van dark/light CSS, waardoor het tekstvak soms niet goed omschakelt.
  // We sturen nu met CSS-variabelen, zodat de mode altijd leidend blijft.

  var base = defaultBg || 'rgba(255, 255, 255, 0.975)';
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
  var root = document && document.documentElement;
  var isDark = false;
  try{
    isDark = !!(root && root.getAttribute && root.getAttribute('data-contrast') === 'dark');
  }catch(_e2){}

  // Clear eerdere tint, zodat wisselen van mode altijd meteen klopt.
  // (We gebruiken 1 variabele: --pkTextBg)

  if(isDark) return;

  if(!getText || !dominantColorFromSvgText || !lighten) return;

  getText(svgUrl).then(function(txt){
    var dom = dominantColorFromSvgText(txt);
    if(!dom) return;
    // Subtiel meekleuren: nét zichtbaar, maar nog steeds rustig.
    // Zelfde gevoel als de index-kaarten.
    var lite = lighten(dom, 0.95);
    var tintAlpha = 0.12;
    try{
      var root = document && document.documentElement;
      var rs = root && window.getComputedStyle ? window.getComputedStyle(root) : null;
      if(rs){
        var n = parseFloat(String(rs.getPropertyValue('--menuSheetAlpha') || '').replace(/^\s+|\s+$/g,''));
        if(isFinite(n)) tintAlpha = Math.max(0.10, Math.min(0.18, n * 0.16));
      }
    }catch(_eA){}
    var rgb = 'rgba(' + lite.r + ', ' + lite.g + ', ' + lite.b + ', ' + tintAlpha + ')';
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
