// Praatkaartjes – CardRenderer component (ES5)
// Doel: één plek voor het bouwen van kaart-UI (grid kaarten + menu thumbnails)
// en voor het toepassen van de dominante tint (uitleg tekstvlak).

(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};

  PK.createGridCard = function(item){
    // item: { theme, q, bg }
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
    var src = 'sets/' + encodeURIComponent(args.setId) + '/cards/' + (args.cardFile || (args.key + '.svg'));
    miniImg.src = PK.withV ? PK.withV(src) : src;
    miniImg.alt = '';

    mini.appendChild(miniImg);
    thumb.appendChild(mini);

    btn.appendChild(lab);
    btn.appendChild(thumb);

    return btn;
  };

  PK.applyDominantTint = function(targetEl, svgUrl, defaultBg){
    if(!targetEl) return;
    targetEl.style.background = defaultBg || '#F4F4F4';

    if(!PK.getText || !PK.dominantColorFromSvgText || !PK.lighten) return;

    PK.getText(svgUrl).then(function(txt){
      var dom = PK.dominantColorFromSvgText(txt);
      if(!dom) return;
      var lite = PK.lighten(dom, 0.88);
      targetEl.style.background = 'rgb(' + lite.r + ', ' + lite.g + ', ' + lite.b + ')';
    }, function(){
      // keep default
    });
  };
})(window);
