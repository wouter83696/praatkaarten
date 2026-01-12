// introSheet.js – uitleg bottom-sheet (v3.6.2)
import { VERSION, loadUitlegSlides } from "./data.js";

function $(id) { return document.getElementById(id); }

export async function renderUitleg() {
  const track = $("introTrack");
  if (!track) return;

  let data = await loadUitlegSlides();
  const slides = Array.isArray(data) ? data : (data.slides || data.items || []);

  track.innerHTML = "";
  const frag = document.createDocumentFragment();

  slides.forEach((s) => {
    const card = document.createElement("div");
    card.className = "introCard";

    const img = document.createElement("img");
    img.className = "introImg";
    img.alt = "";
    img.draggable = false;
    img.loading = "lazy";
    img.src = s.img || s.src || s.image ? (s.img||s.src||s.image) : "";
    if (img.src) img.src = img.src.includes("?") ? img.src : img.src + `?v=${VERSION}`;

    const t = document.createElement("div");
    t.className = "introTitle";
    t.textContent = s.title || s.kop || s.heading || "";

    const d = document.createElement("div");
    d.className = "introDesc";
    d.textContent = s.desc || s.tekst || s.text || "";

    card.appendChild(img);
    card.appendChild(t);
    card.appendChild(d);
    frag.appendChild(card);
  });

  track.appendChild(frag);
}

export function setupIntroSheet() {
  const sheet = $("mobileIntro");
  const openBtn = $("uitlegBtn");
  const closeBtn = $("introClose");
  if (!sheet) return { open: () => {}, close: () => {} };

  const offY = () => Math.round(window.innerHeight * 1.03);

  function open() {
    document.body.classList.add('show-intro');
    document.body.classList.add("show-intro");
    sheet.style.transition = `transform 165ms cubic-bezier(.2,.9,.2,1)`;
    sheet.style.transform = `translateY(0px)`;
  }

  function close() {
    sheet.style.transition = `transform 150ms cubic-bezier(.2,.9,.2,1)`;
    sheet.style.transform = `translateY(${offY()}px)`;
    window.setTimeout(() => {
      document.body.classList.remove("show-intro");
    }, 170);
  }

  // init closed position
  sheet.style.transform = `translateY(${offY()}px)`;

  openBtn?.addEventListener("click", (e) => { e.preventDefault(); open(); }, { passive: false });
  closeBtn?.addEventListener("click", (e) => { e.preventDefault(); close(); }, { passive: false });

  return { open, close };
}
