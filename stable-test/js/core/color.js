// Praatkaartjes – dominante kleur uit SVG + lichte tint (ES5)
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};

  function parseHexToRgb(hex){
    var h = String(hex||'').replace('#','').trim();
    if(h.length===3){ h = h.charAt(0)+h.charAt(0)+h.charAt(1)+h.charAt(1)+h.charAt(2)+h.charAt(2); }
    if(h.length!==6) return null;
    var r = parseInt(h.slice(0,2),16);
    var g = parseInt(h.slice(2,4),16);
    var b = parseInt(h.slice(4,6),16);
    if(isNaN(r)||isNaN(g)||isNaN(b)) return null;
    return {r:r,g:g,b:b};
  }

  function parseRgbFunc(c){
    var m = String(c||'').match(/^rgba?\(([^)]+)\)$/i);
    if(!m) return null;
    var p = m[1].split(',');
    if(p.length<3) return null;
    var r = Math.max(0, Math.min(255, parseFloat(String(p[0]).trim())));
    var g = Math.max(0, Math.min(255, parseFloat(String(p[1]).trim())));
    var b = Math.max(0, Math.min(255, parseFloat(String(p[2]).trim())));
    if(isNaN(r)||isNaN(g)||isNaN(b)) return null;
    return {r:Math.round(r), g:Math.round(g), b:Math.round(b)};
  }

  function parseColorToRgb(c){
    if(!c) return null;
    c = String(c).trim().toLowerCase();
    if(c==='none' || c==='transparent') return null;
    if(c.indexOf('url(')===0) return null;
    if(c.charAt(0)==='#') return parseHexToRgb(c);
    if(c.indexOf('rgb')===0) return parseRgbFunc(c);
    return null;
  }

  function isNearWhite(rgb){ return rgb.r>245 && rgb.g>245 && rgb.b>245; }
  function isNearBlack(rgb){ return rgb.r<10 && rgb.g<10 && rgb.b<10; }

  function lighten(rgb, amount){
    if(amount==null) amount = 0.88; // 0..1 meng met wit
    return {
      r: Math.round(rgb.r + (255-rgb.r)*amount),
      g: Math.round(rgb.g + (255-rgb.g)*amount),
      b: Math.round(rgb.b + (255-rgb.b)*amount)
    };
  }

  PK.dominantColorFromSvgText = function(svgText){
    if(!svgText) return null;
    var counts = {};

    function addColor(raw){
      var rgb = parseColorToRgb(raw);
      if(!rgb) return;
      if(isNearWhite(rgb) || isNearBlack(rgb)) return;
      var key = rgb.r+','+rgb.g+','+rgb.b;
      counts[key] = (counts[key]||0) + 1;
    }

    var attrRe = /(fill|stroke)\s*=\s*["']([^"']+)["']/gi;
    var m;
    while((m = attrRe.exec(svgText))){ addColor(m[2]); }

    var styleRe = /(fill|stroke)\s*:\s*([^;\}]+)\s*[;\}]/gi;
    while((m = styleRe.exec(svgText))){ addColor(m[2]); }

    var bestKey = null;
    var bestN = 0;
    for(var k in counts){
      if(counts.hasOwnProperty(k) && counts[k] > bestN){ bestN = counts[k]; bestKey = k; }
    }
    if(!bestKey) return null;
    var parts = bestKey.split(',');
    return { r: parseInt(parts[0],10), g: parseInt(parts[1],10), b: parseInt(parts[2],10) };
  };

  PK.lighten = lighten;
})(window);
