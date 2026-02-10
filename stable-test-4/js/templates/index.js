// Praatkaartjes – viewer templates registry
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};
  PK.templates = PK.templates || {};
  PK.templates.viewer = PK.templates.viewer || {
    classic: { name: 'classic' },
    compact: { name: 'compact' }
  };

  PK.templates.resolveViewer = function(name){
    var key = String(name || 'classic');
    return PK.templates.viewer[key] || PK.templates.viewer.classic;
  };
})(window);
