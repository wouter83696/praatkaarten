// Legacy compat shim: oudere uitleg-pagina's laadden `js/uitleg.js`.
// Deze shim stuurt door naar de nieuwe centrale loader.
(function(w){
  'use strict';
  var d = w.document;
  if(!d) return;

  function ensurePage(){
    var body = d.body;
    if(!body || !body.setAttribute) return;
    if(body.getAttribute('data-page')) return;
    body.setAttribute('data-page', 'uitleg');
  }

  function loadMain(){
    if(d.querySelector('script[data-pk-main-bridge="1"]')) return;
    var base = '.';
    try{
      var p = (w.location && w.location.pathname) ? w.location.pathname : '';
      if(p.indexOf('/uitleg/') !== -1 || p.indexOf('/kaarten/') !== -1) base = '..';
    }catch(_eBase){}
    var s = d.createElement('script');
    s.setAttribute('data-pk-main-bridge', '1');
    s.src = base + '/js/main.js?v=0.65';
    s.defer = true;
    d.head.appendChild(s);
  }

  ensurePage();
  loadMain();
})(window);
