// Praatkaartjes – uitleg pagina
// - 1 SVG tonen in hetzelfde frame als het grid (img in cardInner)
// - uitlegtekst eronder tonen
// - tik links/rechts op de kaart om te navigeren

import { getQueryParam, getActiveSet } from '../core/query.js';
import { getJson, getText } from '../core/net.js';
import { withV } from '../core/paths.js';

export function initUitleg() {
  const imgEl       = document.getElementById('uitlegImg');
  const kaartThemaEl = document.getElementById('kaartThema');
  const descEl      = document.getElementById('desc');
  const closeHelp   = document.getElementById('closeHelp');
  const uitlegTextEl = document.querySelector('.uitlegText');
  const cardTapEl   = document.querySelector('.uitlegCardInner');

  if (!imgEl || !descEl) return;

  const setName = (getQueryParam('set') || 'samenwerken').trim() || 'samenwerken';
  const encSet  = encodeURIComponent(setName);

  const isEmbed = String(getQueryParam('embed') || '').replace(/\s+/g, '') === '1';
  if (isEmbed && document.body) document.body.classList.add('embed');

  const BASE       = '..';
  const uitlegPath = `${BASE}/sets/${encSet}/uitleg.json`;

  const cardPathRect   = f => `${BASE}/sets/${encSet}/cards_rect/${f}`;
  const cardPathSquare = f => `${BASE}/sets/${encSet}/cards/${f}`;

  let slides = [];
  let uitlegData = {};
  let index = 0;

  function getDesc(key) {
    const v = uitlegData && typeof uitlegData === 'object' ? uitlegData[key] : '';
    return String(v == null ? '' : v).trim();
  }

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatInlineInfoText(raw, opts = {}) {
    let txt = escapeHtml(raw).replace(/\s+/g, ' ').trim();
    if (!txt) return '';
    txt = txt.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (opts.boldLead) {
      const m = txt.match(/^([^\n]{1,90}?)\s*(?:-|–|—)\s*(.+)$/);
      if (m) txt = `<strong>${m[1].trim()}</strong> - ${m[2].trim()}`;
    }
    return txt;
  }

  function getInfoHeadingText(line) {
    const t = String(line || '').replace(/\s+/g, ' ').trim();
    const m = t.match(/^\*\*(.+?)\*\*$/);
    const candidate = (m && m[1]) ? m[1].replace(/\s+/g, ' ').trim() : t;
    const known = ['Systemisch werken', 'Rollen van Belbin', 'In beweging', 'Waarom werkwoorden?', 'Samen onderzoeken'];
    return known.includes(candidate) ? candidate : '';
  }

  function setDescContent(el, raw) {
    if (!el) return;
    const lines = String(raw == null ? '' : raw).replace(/\r\n?/g, '\n').split('\n');
    const html = [];
    let para = [];
    let introAssigned = false;

    function flushParagraph() {
      if (!para.length) return;
      const joined = para.map(p => p.trim()).filter(Boolean).join('\n').trim();
      para = [];
      if (!joined) return;
      const lineParts = joined.split('\n');
      const heading = getInfoHeadingText(lineParts[0]);
      let cls = '', body = '';
      if (heading && lineParts.length === 1) {
        cls = ' class="infoTextSubhead"';
        body = `<strong>${escapeHtml(heading)}</strong>`;
      } else if (!introAssigned) {
        cls = ' class="infoTextIntro"';
        introAssigned = true;
      }
      if (!body) {
        const startIdx = (heading && lineParts.length > 1) ? 1 : 0;
        const rendered = lineParts.slice(startIdx).map(p => formatInlineInfoText(p)).join('<br>');
        body = heading && lineParts.length > 1
          ? `<strong class="infoTextHeading">${escapeHtml(heading)}</strong><br>${rendered}`
          : rendered;
      }
      html.push(`<p${cls}>${body}</p>`);
    }

    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) { flushParagraph(); i++; continue; }
      const heading = getInfoHeadingText(line);
      if (heading) { flushParagraph(); para.push(`**${heading}**`); i++; continue; }
      if (/^[*•-]\s+/.test(line)) {
        flushParagraph();
        const items = [];
        while (i < lines.length) {
          const liLine = lines[i].trim();
          if (!/^[*•-]\s+/.test(liLine)) break;
          items.push(`<li>${formatInlineInfoText(liLine.replace(/^[*•-]\s+/, ''), { boldLead: true })}</li>`);
          i++;
        }
        if (items.length) html.push(`<ul class="infoTextList">${items.join('')}</ul>`);
        continue;
      }
      para.push(line);
      i++;
    }
    flushParagraph();
    el.innerHTML = html.join('');
  }

  function applyDominantTint() {
    if (!uitlegTextEl) return;
    const isDark = !!(document.documentElement && document.documentElement.getAttribute('data-contrast') === 'dark');
    uitlegTextEl.style.background = isDark
      ? 'rgba(23, 22, 50, 0.86)'
      : 'rgba(255, 255, 255, 0.975)';
  }

  function render() {
    const s = slides[index];
    if (!s) return;
    imgEl.onerror = null;
    imgEl.src = s.src;
    if (s.fallback) {
      imgEl.onerror = function() {
        this.onerror = null;
        this.src = s.fallback;
        applyDominantTint();
      };
    }
    imgEl.alt = s.alt;
    setDescContent(descEl, getDesc(s.key));
    applyDominantTint();
    try { setTimeout(reportHeight, 0); } catch {}
    if (kaartThemaEl) {
      if (s.key === 'cover') {
        kaartThemaEl.textContent = '';
        kaartThemaEl.style.display = 'none';
      } else {
        kaartThemaEl.style.display = 'block';
        kaartThemaEl.textContent = s.alt || '';
      }
    }
  }

  function go(delta) {
    index = Math.max(0, Math.min(slides.length - 1, index + delta));
    render();
  }

  function requestClose() {
    if (window.parent && window.parent !== window && window.parent.postMessage) {
      window.parent.postMessage({ type: 'pk_close_help' }, '*');
      return;
    }
    window.location.href = `../kaarten/?set=${encodeURIComponent(setName)}`;
  }

  function buildSlidesFromMeta(meta) {
    const out = [];
    const coverFile = (meta && meta.cover) ? meta.cover : 'voorkant.svg';
    out.push({ key: 'cover', src: withV(cardPathRect(coverFile)), fallback: withV(cardPathSquare(coverFile)), alt: 'Voorkant' });
    if (meta && Array.isArray(meta.themes)) {
      for (const t of meta.themes) {
        const key = String(t.key || '').trim();
        if (!key) continue;
        const label = t.label || key;
        const file  = t.card || (key + '.svg');
        out.push({ key, src: withV(cardPathRect(file)), fallback: withV(cardPathSquare(file)), alt: label });
      }
    }
    return out;
  }

  // Data laden
  Promise.all([
    getJson(withV(`${BASE}/sets/${encSet}/meta.json`)),
    getJson(withV(uitlegPath)).catch(() => ({})),
  ]).then(([meta, uitleg]) => {
    uitlegData = uitleg || {};
    slides = buildSlidesFromMeta(meta || {});
    if (!slides.length) slides = [{ key: 'cover', src: withV(cardPathRect('voorkant.svg')), fallback: withV(cardPathSquare('voorkant.svg')), alt: 'Voorkant' }];
    index = 0;
    render();
  }).catch(() => {
    slides = [{ key: 'cover', src: withV(cardPathRect('voorkant.svg')), fallback: withV(cardPathSquare('voorkant.svg')), alt: 'Voorkant' }];
    uitlegData = {};
    index = 0;
    render();
  });

  if (closeHelp) closeHelp.onclick = requestClose;

  if (cardTapEl) {
    cardTapEl.addEventListener('click', e => {
      const rect = cardTapEl.getBoundingClientRect();
      if (!rect) return;
      const rel = (typeof e.clientX === 'number' ? e.clientX : 0) - rect.left;
      go(rel < rect.width * 0.5 ? -1 : 1);
    });
  }
}
