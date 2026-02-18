// Legacy compat shim: oudere kaarten-pagina's laadden `js/app.js`.
// Deze shim stuurt altijd door naar de nieuwe centrale loader.
(function(w){
  'use strict';
  var d = w.document;
  if(!d) return;

  function detectPage(){
    var body = d.body;
    var current = body && body.getAttribute ? body.getAttribute('data-page') : '';
    if(current) return current;
    var p = '';
    try{ p = (w.location && w.location.pathname) ? w.location.pathname : ''; }catch(_e){}
    if(p.indexOf('/kaarten/') !== -1 || /\/kaarten\.html$/i.test(p)) return 'kaarten';
    if(p.indexOf('/uitleg/') !== -1 || /\/uitleg\.html$/i.test(p)) return 'uitleg';
    return 'grid';
  }

  function ensurePageAttr(){
    var body = d.body;
    if(!body || !body.setAttribute) return;
    if(body.getAttribute('data-page')) return;
    body.setAttribute('data-page', detectPage());
  }

  function loadMain(){
    if(d.querySelector('script[data-pk-main-bridge="1"]')) return;
    var base = '.';
    try{
      var p = (w.location && w.location.pathname) ? w.location.pathname : '';
      if(p.indexOf('/kaarten/') !== -1 || p.indexOf('/uitleg/') !== -1){
        base = '..';
      }
    }catch(_eBase){}
    var s = d.createElement('script');
    s.setAttribute('data-pk-main-bridge', '1');
    s.src = base + '/js/main.js?v=0.65';
    s.defer = true;
    d.head.appendChild(s);
  }

  ensurePageAttr();
  loadMain();
})(window);
