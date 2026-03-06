// Praatkaartjes – centrale paden (relatief)

const _base = (() => {
  try {
    const p = window.location && window.location.pathname ? window.location.pathname : '';
    if (p.indexOf('/uitleg/') !== -1 || p.indexOf('/kaarten/') !== -1) return '..';
  } catch (_e) {}
  return '.';
})();

export const VERSION = '4.2.17';

export const PATHS = {
  base:      _base,
  setsIndex: _base + '/sets/index.json',
  setsDir:   _base + '/sets',
  assetsDir: _base + '/assets',
  gridPage:  _base + '/index.html',
  cardsPage: _base + '/kaarten/',
};

export function withV(url) {
  const u = String(url || '');
  return u + (u.indexOf('?') === -1 ? '?' : '&') + 'v=' + encodeURIComponent(VERSION);
}

// Cache-bust index.json zodat wijzigingen direct zichtbaar zijn
PATHS.setsIndex = withV(PATHS.setsIndex);

export function pathForSet(setId, rel) {
  const s = String(setId || '').trim() || 'samenwerken';
  const r = String(rel || '').replace(/^\//, '');
  return PATHS.setsDir + '/' + encodeURIComponent(s) + '/' + r;
}

export function pathForAsset(rel) {
  const r = String(rel || '').replace(/^\//, '');
  return PATHS.assetsDir + '/' + r;
}

const _q = window.location && window.location.search ? window.location.search : '';
export const DEBUG = _q.indexOf('debug=1') !== -1;
