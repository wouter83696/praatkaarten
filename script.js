/* Praatkaarten — script.js
   - laadt questions.json
   - bouwt deck (thema + vraag)
   - grid tiles + overlay
   - swipe, toetsen, klik buiten kaart = sluiten
*/

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const THEME_ORDER = ["verkennen","verbinden","bewegen","duiden","verdiepen","vertragen"];

let deck = [];
let deckOriginal = [];
let currentIndex = 0;

function titleCase(s){
  return (s||"").toUpperCase();
}

function shuffle(array){
  for(let i=array.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [array[i],array[j]]=[array[j],array[i]];
  }
  return array;
}

function buildDeck(q){
  const out = [];
  for(const theme of THEME_ORDER){
    const arr = q[theme] || [];
    for(const question of arr){
      out.push({ theme, question });
    }
  }
  return out;
}

function renderGrid(){
  const grid = $("#grid");
  grid.innerHTML = "";
  deck.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "tile";
    div.tabIndex = 0;
    div.setAttribute("role","button");
    div.setAttribute("aria-label", `${titleCase(item.theme)} kaart openen`);
    div.innerHTML = `
      <div class="theme">${titleCase(item.theme)}</div>
      <div class="q">${item.question}</div>
    `;
    div.addEventListener("click", () => openAt(idx));
    div.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        openAt(idx);
      }
    });
    grid.appendChild(div);
  });
}

function renderOverlay(){
  const item = deck[currentIndex];
  $("#overlayTheme").textContent = titleCase(item.theme);
  $("#overlayQuestion").textContent = item.question;
  $("#pos").textContent = `${currentIndex+1}/${deck.length}`;
}

function openAt(idx){
  currentIndex = Math.max(0, Math.min(deck.length-1, idx));
  renderOverlay();
  $("#lb").classList.add("open");

  // hint fade: alleen telefoon portrait, maar we trigger op load ook
  maybeFadeHint();
}

function closeOverlay(){
  $("#lb").classList.remove("open");
}

function prev(){
  currentIndex = (currentIndex - 1 + deck.length) % deck.length;
  renderOverlay();
}
function next(){
  currentIndex = (currentIndex + 1) % deck.length;
  renderOverlay();
}

function isPhonePortrait(){
  return window.matchMedia &&
    window.matchMedia('(hover: none) and (pointer: coarse) and (orientation: portrait)').matches;
}

let hintFaded = false;
function maybeFadeHint(){
  if(hintFaded) return;
  if(!isPhonePortrait()) return;
  const hint = $(".help");
  if(!hint) return;
  setTimeout(() => {
    hint.classList.add("is-hidden");
    hintFaded = true;
  }, 3500);
}

function attachEvents(){
  // overlay close on outside click
  $("#lb").addEventListener("click", (e) => {
    // click on backdrop closes; click on card does not
    if(e.target.id === "lb") closeOverlay();
  });

  // buttons
  $("#btnClose").addEventListener("click", closeOverlay);
  $("#btnPrev").addEventListener("click", prev);
  $("#btnNext").addEventListener("click", next);

  // keyboard
  window.addEventListener("keydown", (e) => {
    const open = $("#lb").classList.contains("open");
    if(!open) return;
    if(e.key === "Escape") closeOverlay();
    if(e.key === "ArrowLeft") prev();
    if(e.key === "ArrowRight") next();
  });

  // bottom bar
  $("#btnShuffle").addEventListener("click", () => {
    deck = shuffle([...deck]);
    renderGrid();
  });
  $("#btnReset").addEventListener("click", () => {
    deck = [...deckOriginal];
    renderGrid();
  });

  // swipe gestures (works on overlay anywhere)
  let sx=0, sy=0, active=false;
  const threshold = 40;

  const start = (x,y) => { sx=x; sy=y; active=true; };
  const end = (x,y) => {
    if(!active) return;
    active=false;
    const dx = x - sx;
    const dy = y - sy;
    if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold){
      if(dx < 0) next();
      else prev();
    }
  };

  // We listen on the overlay (lb) AND document so user can swipe "naast" de kaart
  const listenEl = document;
  listenEl.addEventListener("touchstart", (e) => {
    if(!$("#lb").classList.contains("open")) return;
    const t = e.touches[0];
    start(t.clientX, t.clientY);
  }, {passive:true});
  listenEl.addEventListener("touchend", (e) => {
    if(!$("#lb").classList.contains("open")) return;
    const t = (e.changedTouches && e.changedTouches[0]) || null;
    if(!t) return;
    end(t.clientX, t.clientY);
  }, {passive:true});
}

async function init(){
  const res = await fetch("./questions.json", { cache: "no-store" });
  const q = await res.json();
  deckOriginal = buildDeck(q);
  deck = [...deckOriginal];
  renderGrid();
  attachEvents();

  // hint fade on first page load if on phone portrait
  maybeFadeHint();
}

init().catch(err => {
  console.error(err);
  alert("Kon questions.json niet laden of verwerken. Check structuur/bestandsnaam.");
});
