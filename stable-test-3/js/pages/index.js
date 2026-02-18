// Legacy compat shim: oude index-boot gebruikte `js/pages/index.js`.
(function(w){
  'use strict';
  var d = w.document;
  if(!d) return;
  if(d.body && d.body.setAttribute && !d.body.getAttribute('data-page')){
    d.body.setAttribute('data-page', 'grid');
  }
  if(w.PK && w.PK.pages && w.PK.pages.initGrid){
    try{ w.PK.pages.initGrid(); }catch(_eInit){}
    return;
  }
  if(d.querySelector('script[data-pk-main-bridge="1"]')) return;
  var s = d.createElement('script');
  s.setAttribute('data-pk-main-bridge', '1');
  s.src = './js/main.js?v=0.65';
  s.defer = true;
  d.head.appendChild(s);
})(window);
