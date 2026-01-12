// assets/introSheet.js – uitleg bottom-sheet (v3.6.5)
import { VERSION, loadUitlegSlides } from "./data.js";

const $ = (id) => document.getElementById(id);

export async function renderUitleg(){
  const track = $("introTrack");
  if(!track) return;

  const data = await loadUitlegSlides();
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
    const raw = (s.img || s.src || s.image || "");
    img.src = raw ? (raw.includes("?") ? raw : raw + `?v=${VERSION}`) : "";

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

export function setupIntroSheet(){
  const sheet = $("mobileIntro");
  const openBtn = $("uitlegBtn");
  const closeBtn = $("introClose");

  if(!sheet) return { open: () => {}, close: () => {} };

  const OPEN_MS = 165;
  const CLOSE_MS = 150;
  const EASE = "cubic-bezier(.2,.9,.2,1)";
  const offY = () => Math.round(window.innerHeight * 1.03);

  let isOpen = false;
  let animating = false;

  function setOffscreen(){
    sheet.style.transition = "none";
    sheet.style.transform = `translateY(${offY()}px)`;
  }

  setOffscreen();

  function open(){
    if(animating || isOpen) return;
    animating = true;
    isOpen = true;

    document.body.classList.add("show-intro");

    // iOS/Safari-proof: startpositie + reflow + RAF
    sheet.style.transition = "none";
    sheet.style.transform = `translateY(${offY()}px)`;
    sheet.getBoundingClientRect();

    requestAnimationFrame(() => {
      sheet.style.transition = `transform ${OPEN_MS}ms ${EASE}`;
      sheet.style.transform = "translateY(-8px)";
      requestAnimationFrame(() => {
        sheet.style.transform = "translateY(0px)";
      });

      window.setTimeout(() => {
        animating = false;
      }, OPEN_MS + 30);
    });
  }

  function close(){
    if(animating || !isOpen) return;
    animating = true;
    isOpen = false;

    sheet.style.transition = `transform ${CLOSE_MS}ms ${EASE}`;
    sheet.style.transform = `translateY(${offY()}px)`;

    const done = () => {
      document.body.classList.remove("show-intro");
      setOffscreen();
      animating = false;
    };

    sheet.addEventListener("transitionend", done, { once: true });
    window.setTimeout(done, CLOSE_MS + 60);
  }

  openBtn?.addEventListener("click", (e) => { e.preventDefault(); open(); }, { passive: false });
  closeBtn?.addEventListener("click", (e) => { e.preventDefault(); close(); }, { passive: false });

  return { open, close };
}
