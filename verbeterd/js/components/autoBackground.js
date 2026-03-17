// Praatkaartjes – gedeelde cards-index background defaults + overrides

function isObj(v){
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function clone(v){
  if(Array.isArray(v)) return v.slice();
  if(isObj(v)){
    var out = {};
    for(var k in v){ if(Object.prototype.hasOwnProperty.call(v,k)) out[k] = clone(v[k]); }
    return out;
  }
  return v;
}

function mergeDeep(base, override){
  var out = clone(base || {});
  if(!isObj(override)) return out;
  for(var k in override){
    if(!Object.prototype.hasOwnProperty.call(override, k)) continue;
    var next = override[k];
    if(isObj(next) && isObj(out[k])) out[k] = mergeDeep(out[k], next);
    else out[k] = clone(next);
  }
  return out;
}

function normalizeHex(input){
  var v = String(input || '').trim();
  if(!v) return '';
  if(/^#([0-9a-f]{3})$/i.test(v)) return '#' + v.charAt(1)+v.charAt(1)+v.charAt(2)+v.charAt(2)+v.charAt(3)+v.charAt(3);
  if(/^#([0-9a-f]{6})$/i.test(v)) return v.toLowerCase();
  return '';
}

var DEFAULT_CARDS_INDEX_BACKGROUND = {
  blobCount: 7,
  alphaBoost: 1.05,
  blobIrregularity: 0.35,
  blobPointsMin: 8,
  blobPointsMax: 12,
  sizeScale: 0.85,
  blobSpread: 'grid',
  blobSpreadMargin: 0.08,
  sizeLimit: 1.4,
  baseWash: false,
  shapeEnabled: false,
  autoMode: true
};


var BACKGROUND_SHAPE_OPTIONS = [
  {v:'organic',l:'Organisch'},
  {v:'circle',l:'Cirkel'},
  {v:'rounded',l:'Afgerond'},
  {v:'oval',l:'Ovaal'},
  {v:'pill',l:'Pil'},
  {v:'triangle',l:'Driehoek'},
  {v:'diamond',l:'Ruit'},
  {v:'star',l:'Ster'},
  {v:'heart',l:'Hart'},
  {v:'hexagon',l:'Zeshoek'},
  {v:'octagon',l:'Achthoek'},
  {v:'cloud',l:'Wolk'},
  {v:'leaf',l:'Blad'},
  {v:'drop',l:'Druppel'},
  {v:'arch',l:'Boog'},
  {v:'spark',l:'Spark'},
  {v:'burst',l:'Burst'},
  {v:'grid',l:'Raster'}
];

var BACKGROUND_SHAPE_WEIGHT = {
  organic: 1,
  circle: 1,
  rounded: 0.95,
  oval: 0.9,
  pill: 0.9,
  triangle: 0.9,
  diamond: 0.82,
  star: 0.52,
  heart: 0.46,
  hexagon: 0.8,
  octagon: 0.78,
  cloud: 0.58,
  leaf: 0.62,
  drop: 0.62,
  arch: 0.7,
  spark: 0.56,
  burst: 0.42,
  grid: 0.35
};

function normalizeBackgroundShapeType(type){
  var v = String(type || '').toLowerCase().trim();
  if(!v) return '';
  var map = {
    blob:'organic',
    band:'rounded',
    bar:'rounded',
    column:'pill',
    side:'oval',
    hill:'arch',
    star4:'star',
    spark4:'spark',
    petal:'leaf',
    crescent:'organic',
    slope:'triangle',
    cornerwide:'rounded',
    corner:'rounded',
    shield:'rounded',
    parallelogram:'diamond',
    plus:'diamond',
    wave:'organic',
    arrow:'diamond'
  };
  return map[v] || v;
}

function backgroundShapeWeight(type){
  var key = normalizeBackgroundShapeType(type);
  return Object.prototype.hasOwnProperty.call(BACKGROUND_SHAPE_WEIGHT, key) ? BACKGROUND_SHAPE_WEIGHT[key] : 0;
}

function expandWeightedShapes(shapeCount){
  var entries = Object.keys(shapeCount || {}).map(function(key){
    var normalized = normalizeBackgroundShapeType(key);
    return {
      shape: normalized,
      count: shapeCount[key] || 0,
      weight: backgroundShapeWeight(normalized)
    };
  }).filter(function(item){ return !!item.shape && item.weight > 0 && item.count > 0; });

  entries.sort(function(a,b){ return (b.count * b.weight) - (a.count * a.weight); });
  var ordered = entries.map(function(item){ return item.shape; });
  var expanded = [];
  entries.forEach(function(item){
    var repeats = Math.max(1, Math.min(5, Math.round(item.count * item.weight)));
    for(var i=0;i<repeats;i++) expanded.push(item.shape);
  });
  if(!expanded.length) expanded = ['organic'];
  return { ordered: ordered.slice(0, 8), expanded: expanded.slice(0, 24) };
}

function getMetaBackground(meta){
  var ui = meta && meta.ui;
  if(ui && ui.cardsIndex && ui.cardsIndex.background) return ui.cardsIndex.background;
  if(ui && ui.index && ui.index.background) return ui.index.background; // legacy admin path
  if(meta && meta.cardsIndexPage && meta.cardsIndexPage.background) return meta.cardsIndexPage.background;
  return null;
}

function getActiveBackground(activeUi){
  if(activeUi && activeUi.cardsIndex && activeUi.cardsIndex.background) return activeUi.cardsIndex.background;
  if(activeUi && activeUi.index && activeUi.index.background) return activeUi.index.background; // legacy
  return null;
}

function normalizeBackgroundConfig(cfg){
  var out = mergeDeep({}, cfg || {});
  if(Array.isArray(out.palette)){
    out.palette = out.palette.map(normalizeHex).filter(Boolean);
    if(!out.palette.length) delete out.palette;
  }
  if(Array.isArray(out.darkPalette)){
    out.darkPalette = out.darkPalette.map(normalizeHex).filter(Boolean);
    if(!out.darkPalette.length) delete out.darkPalette;
  }
  return out;
}

function resolveCardsIndexBackground(input){
  input = input || {};
  var cfg = mergeDeep(DEFAULT_CARDS_INDEX_BACKGROUND, input.defaults || null);
  cfg = mergeDeep(cfg, input.legacyPageBg || null);
  cfg = mergeDeep(cfg, getMetaBackground(input.setMeta) || null);
  cfg = mergeDeep(cfg, getActiveBackground(input.activeUi) || null);
  cfg = mergeDeep(cfg, input.explicit || null);
  return normalizeBackgroundConfig(cfg);
}

function derivePaletteAndShapesFromLayers(input){
  input = input || {};
  var meta = input.meta || {};
  var getCardShapeLayers = input.getCardShapeLayers;
  var fallbackPalette = Array.isArray(input.fallbackPalette) && input.fallbackPalette.length ? input.fallbackPalette.slice() : ['#CFE6DF'];
  var themeKeys = ((meta.themes || [])).map(function(th){ return th && th.key; }).filter(Boolean);
  var shapeStore = (typeof input.cardShapeStore === 'function') ? (input.cardShapeStore() || {}) : (input.cardShapeStore || {});
  var shapeKeys = Object.keys(shapeStore).filter(function(key){
    if(typeof getCardShapeLayers === 'function') return ((getCardShapeLayers(key) || []).length > 0);
    var arr = shapeStore[key];
    return Array.isArray(arr) && arr.length > 0;
  });
  themeKeys = themeKeys.concat(shapeKeys.filter(function(key){ return themeKeys.indexOf(key) < 0; }));
  if(!themeKeys.length && typeof getCardShapeLayers === 'function' && (getCardShapeLayers('algemeen') || []).length) themeKeys = ['algemeen'];
  var paletteCount = {};
  var shapeCount = {};
  function bump(map,key){ if(key) map[key] = (map[key] || 0) + 1; }
  themeKeys.forEach(function(key){
    var layers = (typeof getCardShapeLayers === 'function' ? (getCardShapeLayers(key) || []) : (shapeStore[key] || [])) || [];
    layers.forEach(function(layer){
      var fill = normalizeHex(layer && layer.fill);
      var stroke = normalizeHex(layer && layer.stroke);
      if(fill) bump(paletteCount, fill);
      if(stroke && String(layer.stroke || '').toLowerCase() !== 'transparent') bump(paletteCount, stroke);
      if(layer && layer.type) bump(shapeCount, String(layer.type));
    });
  });
  var palette = Object.keys(paletteCount).sort(function(a,b){ return paletteCount[b]-paletteCount[a]; }).slice(0,6);
  var expandedShapes = expandWeightedShapes(shapeCount);
  var shapes = expandedShapes.ordered;
  var weightedShapes = expandedShapes.expanded;
  if(!palette.length) palette = fallbackPalette.slice();
  if(!shapes.length) shapes = ['organic'];
  if(!weightedShapes.length) weightedShapes = ['organic'];
  return {
    palette: palette,
    shapes: shapes,
    weightedShapes: weightedShapes,
    seedKey: themeKeys.join('|') + '__' + palette.join('|') + '__' + weightedShapes.join('|')
  };
}

const autoBackground = {
  DEFAULT_CARDS_INDEX_BACKGROUND: DEFAULT_CARDS_INDEX_BACKGROUND,
  mergeDeep: mergeDeep,
  normalizeBackgroundConfig: normalizeBackgroundConfig,
  getMetaBackground: getMetaBackground,
  resolveCardsIndexBackground: resolveCardsIndexBackground,
  derivePaletteAndShapesFromLayers: derivePaletteAndShapesFromLayers,
  normalizeBackgroundShapeType: normalizeBackgroundShapeType,
  backgroundShapeWeight: backgroundShapeWeight,
  BACKGROUND_SHAPE_OPTIONS: BACKGROUND_SHAPE_OPTIONS
};

if(typeof window !== 'undefined'){
  window.PK = window.PK || {};
  window.PK.autoBackground = autoBackground;
}

export { DEFAULT_CARDS_INDEX_BACKGROUND, normalizeBackgroundConfig, getMetaBackground, resolveCardsIndexBackground, derivePaletteAndShapesFromLayers, normalizeBackgroundShapeType, backgroundShapeWeight, BACKGROUND_SHAPE_OPTIONS, autoBackground };
