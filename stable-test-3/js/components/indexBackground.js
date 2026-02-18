// Legacy compat shim: routeer oude `indexBackground` calls naar de nieuwe APIs.
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};
  PK.indexBackground = PK.indexBackground || {
    render: function(opts){
      if(PK.gridBackground && PK.gridBackground.render){
        return PK.gridBackground.render(opts || {});
      }
      if(PK.cardsBackground && PK.cardsBackground.render){
        return PK.cardsBackground.render(opts || {});
      }
      return null;
    }
  };
})(window);
