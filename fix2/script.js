// Minimal mobile-first grid renderer (clean build)
// - Geen desktop code
// - Geen lightbox / click gedrag

(function(){
  'use strict';

  function setVh(){
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }
  setVh();
  window.addEventListener('resize', setVh);
  window.addEventListener('orientationchange', setVh);

  var grid = document.getElementById('grid');
  if (!grid) return;

  function readQuestions(){
    var el = document.getElementById('questions-json');
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch(e) { return null; }
  }

  function buildData(q){
    var themes = [
      { key:'verkennen',   bg:'cards/verkennen.svg' },
      { key:'duiden',      bg:'cards/duiden.svg' },
      { key:'verbinden',   bg:'cards/verbinden.svg' },
      { key:'verhelderen', bg:'cards/verhelderen.svg' },
      { key:'vertragen',   bg:'cards/vertragen.svg' },
      { key:'bewegen',     bg:'cards/bewegen.svg' }
    ];

    var out = [];
    for (var t=0; t<themes.length; t++){
      var key = themes[t].key;
      var arr = (q && Array.isArray(q[key])) ? q[key] : [];
      for (var i=0; i<arr.length; i++){
        out.push({
          id: key + '-' + String(i+1).padStart(2,'0'),
          q: String(arr[i] || ''),
          bg: themes[t].bg
        });
      }
    }
    return out;
  }

  function render(items){
    grid.innerHTML = '';
    var frag = document.createDocumentFragment();

    for (var i=0; i<items.length; i++){
      var item = items[i];

      var card = document.createElement('div');
      card.className = 'card';

      var inner = document.createElement('div');
      inner.className = 'cardInner';

      var img = document.createElement('img');
      img.className = 'bg';
      img.src = item.bg;
      img.alt = '';

      var q = document.createElement('div');
      q.className = 'q';

      var qText = document.createElement('span');
      qText.className = 'qText';
      qText.textContent = item.q;

      q.appendChild(qText);
      inner.appendChild(img);
      inner.appendChild(q);
      card.appendChild(inner);
      frag.appendChild(card);
    }

    grid.appendChild(frag);
  }

  var q = readQuestions();
  if (!q){
    grid.innerHTML = '<div style="padding:24px;font-family:system-ui;">Kon vragen niet laden.</div>';
    return;
  }

  render(buildData(q));
})();
