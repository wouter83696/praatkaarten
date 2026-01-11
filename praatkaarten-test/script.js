/* v3.3.47 – OFFLINE / NO-FETCH STABIELE LIGHTBOX
   Fix: iOS/phone laadt vaak wel index maar fetch('questions.json') faalt (file:// of cache).
   Daarom: vragen zijn nu inline in JS. Grid wordt altijd gerenderd.
   Alleen: open + close + shuffle. Geen swipe/drag.
*/
(() => {
  const QUESTIONS = {"verkennen": ["Wat zien we op dit moment gebeuren in onze samenwerking?", "Wat valt ons op in onze manier van samenwerken?", "Herkennen we patronen in onze manier van samenwerken?", "Waar zijn we aan gewend geraakt?", "Wat krijgt nu minder aandacht?", "Blijven er dingen onbesproken?"], "duiden": ["Wat proberen we als team goed te doen?", "Wat nemen we wel of niet als vanzelfsprekend aan?", "Wanneer helpt afstemming ons, en wanneer belemmert het ons?", "Wat maakt dat onze kwaliteiten wel of niet tot hun recht komen?", "Welke patronen blijven we terugzien in onze samenwerking?", "Welke factoren blijven onbenoemd, terwijl ze wel invloed hebben?"], "verbinden": ["Waar worden we enthousiast van?", "Wanneer voel jij je echt onderdeel van het team?", "Mogen er verschillen bestaan in ons team?", "Hoe kunnen we elkaar uitdagen en andere kanten belichten?", "Wat helpt ons om onszelf te laten zien in de samenwerking?", "Wat helpt om eerlijk te zijn, zonder de verbinding te verliezen?"], "vertragen": ["Wanneer nemen we in onze samenwerking eigenlijk de tijd?", "Wat verandert er in onze samenwerking wanneer we een reactie uitstellen?", "Wat gebeurt er in onze samenwerking wanneer we het tempo bewust verlagen?", "Welke patronen worden zichtbaar wanneer de druk toeneemt?", "Welke rol nemen we automatisch aan in momenten van spanning?", "Wanneer merken we dat vertragen helpend zou zijn?"], "bewegen": ["Wat doen we met ideeën die ontstaan?", "Wanneer komt er beweging in het team?", "Wat helpt ons om van praten naar doen te gaan?", "Welke ideeën blijven liggen, en waarom?", "Wat houdt ons tegen om in actie te komen?", "Wat laten we liggen, terwijl het eigenlijk aandacht vraagt?"]};

  const $ = (s, r=document) => r.querySelector(s);

  const grid = $('#grid') || document.querySelector('.grid');
  const lb = $('#lb');
  const lbImg = $('#lbImg') || $('#lbSvg');
  const lbText = $('#lbText');
  const lbHelpTitle = $('#lbHelpTitle');
  const lbHelpDesc = $('#lbHelpDesc');
  const closeBtn = $('#close');
  const closeHitbox = $('#closeHitbox');
  const shuffleBtn = $('#shuffleBtn');
  const uitlegBtn = $('#uitlegBtn') || document.querySelector('[aria-label="Info"]');

  let data = [];
  let currentIndex = -1;

  function buildData() {
    const out = [];
    out.push({ key:'cover', theme:'', text:'', svg:'voorkant.svg' });

    const themes = ['verkennen','duiden','verbinden','verdiepen','vertragen','bewegen'];
    themes.forEach((t) => {
      const list = (QUESTIONS && QUESTIONS[t]) ? QUESTIONS[t] : [];
      list.forEach((q, i) => {
        out.push({
          key: t + '_' + (i+1),
          theme: t,
          text: q,
          svg: 'cards/' + t + '.svg'
        });
      });
    });
    return out;
  }

  function renderGrid(items) {
    if(!grid) return;
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();

    items.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card';
      btn.dataset.index = String(idx);

      const inner = document.createElement('div');
      inner.className = 'cardInner';

      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = item.svg;

      inner.appendChild(img);
      btn.appendChild(inner);

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openAt(idx);
      }, {passive:false});

      frag.appendChild(btn);
    });

    grid.appendChild(frag);
  }

  function openAt(i) {
    currentIndex = i;
    const item = data[i];
    if(!item || !lb) return;

    if(lbImg) lbImg.src = item.svg;

    if(lbHelpTitle) lbHelpTitle.textContent = '';
    if(lbHelpDesc) lbHelpDesc.textContent = item.text || '';

    if(lbText) lbText.textContent = item.theme || '';

    lb.classList.add('open');
    lb.setAttribute('aria-hidden','false');
    positionCloseHitbox();
  }

  function closeLb() {
    if(!lb) return;
    lb.classList.remove('open','dragging','closing','is-dragging','is-swiping');
    lb.style.transform = '';
    lb.setAttribute('aria-hidden','true');
  }

  function positionCloseHitbox() {
    try{
      if(!closeHitbox || !closeBtn) return;
      const r = closeBtn.getBoundingClientRect();
      closeHitbox.style.top = Math.round(r.top - 10) + 'px';
      closeHitbox.style.left = Math.round(r.left - 10) + 'px';
    } catch(_e){}
  }

  function onClose(e) {
    if(e) {
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
    closeLb();
  }

  // Close bindings
  [closeBtn, closeHitbox].forEach((el) => {
    if(!el) return;
    el.addEventListener('touchstart', onClose, {capture:true, passive:false});
    el.addEventListener('pointerdown', onClose, {capture:true});
    el.addEventListener('click', onClose, {capture:true});
  });

  window.addEventListener('resize', positionCloseHitbox, {passive:true});
  window.addEventListener('scroll', positionCloseHitbox, {passive:true});

  // Backdrop close
  lb && lb.addEventListener('pointerdown', (e) => {
    const insidePanel = e.target && e.target.closest && e.target.closest('.panel');
    const isClose = e.target && e.target.closest && e.target.closest('#close,#closeHitbox');
    if(!insidePanel && !isClose) onClose(e);
  }, true);

  // SHUFFLE HARD BIND v3.3.47
  function doShuffle(e){
    if(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
    if(!data.length) return;
    const i = Math.floor(Math.random() * data.length);
    openAt(i);
  }
  if(shuffleBtn){
    ['touchstart','pointerdown','click'].forEach((ev)=>{
      shuffleBtn.addEventListener(ev, doShuffle, {capture:true, passive:false});
    });
  }

  // Info opens cover
  uitlegBtn && uitlegBtn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    openAt(0);
  }, true);

  // Init
  data = buildData();
  renderGrid(data);

  // Expose
  window.closeLb = closeLb;
  window.openAt = openAt;
})();
