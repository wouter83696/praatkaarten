// introSheet.js – uitleg bottom-sheet (v3.6.3)
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

    // Beeld (met dezelfde wrapper-classes als de CSS verwacht)
    const imgWrap = document.createElement("div");
    imgWrap.className = "introImgWrap";

    const img = document.createElement("img");
    img.className = "introImg";
    img.alt = "";
    img.draggable = false;
    img.loading = "lazy";
    img.src = (s.img || s.src || s.image) ? (s.img || s.src || s.image) : "";
    if (img.src) img.src = img.src.includes("?") ? img.src : img.src + `?v=${VERSION}`;

    const theme = document.createElement("div");
    theme.className = "introTheme";
    theme.textContent = s.title || s.kop || s.heading || "";

    imgWrap.appendChild(img);
    imgWrap.appendChild(theme);

    // Tekst
    const text = document.createElement("div");
    text.className = "introText";
    const d = document.createElement("div");
    d.className = "introDesc";
    d.textContent = s.desc || s.tekst || s.text || "";
    text.appendChild(d);

    card.appendChild(imgWrap);
    card.appendChild(text);
    frag.appendChild(card);
  });

  track.appendChild(frag);
}

export function setupIntroSheet() {
  const sheet = $("mobileIntro");
  const openBtn = $("uitlegBtn");
  const closeBtn = $("introClose");
  if (!sheet) return { open: () => {}, close: () => {} };

  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const offY = () => Math.round(window.innerHeight * 1.03);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  let state = {
    open: false,
    dragging: false,
    mode: null, // 'x' | 'y'
    startX: 0,
    startY: 0,
    lastY: 0,
    lastT: 0,
    vy: 0,
    curY: offY(),
    anim: null
  };

  function stopAnim() {
    if (state.anim) {
      try { state.anim.cancel(); } catch(_) {}
      state.anim = null;
    }
  }

  function setStable(isStable) {
    sheet.classList.toggle("is-stable", !!isStable);
  }

  function setTransform(y) {
    state.curY = y;
    sheet.style.transform = `translateY(${Math.round(y)}px)`;
  }

  function open({ immediate = false } = {}) {
    stopAnim();
    state.open = true;
    state.dragging = false;
    state.mode = null;

    document.body.classList.add("show-intro");
    setStable(false);

    const from = immediate ? 0 : offY();
    const to = 0;
    setTransform(from);

    if (prefersReduced || immediate) {
      setTransform(to);
      setStable(true);
      return;
    }

    // WAAPI: mooi omhoog met een kleine overshoot
    state.anim = sheet.animate(
      [
        { transform: `translateY(${from}px)` },
        { transform: `translateY(-10px)` },
        { transform: `translateY(${to}px)` }
      ],
      {
        duration: 260,
        easing: "cubic-bezier(.2,.9,.2,1)",
        fill: "forwards"
      }
    );
    state.anim.onfinish = () => {
      state.anim = null;
      setTransform(to);
      setStable(true);
    };
  }

  function close({ immediate = false } = {}) {
    stopAnim();
    state.open = false;
    state.dragging = false;
    state.mode = null;
    setStable(false);

    const from = state.curY ?? 0;
    const to = offY();

    if (prefersReduced || immediate) {
      setTransform(to);
      document.body.classList.remove("show-intro");
      return;
    }

    state.anim = sheet.animate(
      [
        { transform: `translateY(${from}px)` },
        { transform: `translateY(${to}px)` }
      ],
      {
        duration: 210,
        easing: "cubic-bezier(.2,.9,.2,1)",
        fill: "forwards"
      }
    );
    state.anim.onfinish = () => {
      state.anim = null;
      setTransform(to);
      document.body.classList.remove("show-intro");
    };
  }

  function springBack(fromY) {
    stopAnim();
    setStable(false);

    if (prefersReduced) {
      setTransform(0);
      setStable(true);
      return;
    }

    state.anim = sheet.animate(
      [
        { transform: `translateY(${fromY}px)` },
        { transform: "translateY(-8px)" },
        { transform: "translateY(0px)" }
      ],
      {
        duration: 240,
        easing: "cubic-bezier(.2,.9,.2,1)",
        fill: "forwards"
      }
    );
    state.anim.onfinish = () => {
      state.anim = null;
      setTransform(0);
      setStable(true);
    };
  }

  // init closed position
  setTransform(offY());

  // Buttons
  openBtn?.addEventListener("click", (e) => { e.preventDefault(); open(); }, { passive: false });
  closeBtn?.addEventListener("click", (e) => { e.preventDefault(); close(); }, { passive: false });

  // Gesture: swipe/drag down
  const track = $("introTrack");
  const isInTrack = (el) => !!track && (el === track || track.contains(el));

  const onPointerDown = (e) => {
    if (!state.open) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    stopAnim();

    state.dragging = true;
    state.mode = null;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.lastY = e.clientY;
    state.lastT = performance.now();
    state.vy = 0;
    setStable(false);

    // NB: we zetten pas pointer-capture zodra we zeker weten dat dit een verticale drag is
  };

  const onPointerMove = (e) => {
    if (!state.dragging) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    // richting kiezen (zodat x-scroll niet "stropt")
    if (!state.mode) {
      // als je in de track begint, gun dan eerst horizontaal scrollen
      const startedInTrack = isInTrack(e.target);

      if (adx > 7 && adx > ady) {
        state.mode = "x";
        sheet.classList.add("x-scrolling");
        // korte debounce: na scrollen komt ✕ weer terug
        window.clearTimeout(sheet.__xScrollT);
        sheet.__xScrollT = window.setTimeout(() => sheet.classList.remove("x-scrolling"), 220);
        return;
      }

      if (ady > 7 && ady > adx) {
        // op de track mag verticaal draggen wél (voor swipe-down), maar pas als het echt verticaal is
        state.mode = "y";
        try { sheet.setPointerCapture(e.pointerId); } catch(_) {}
      } else {
        // nog geen duidelijke intent
        if (startedInTrack) return;
      }
    }

    if (state.mode !== "y") return;

    // Vertical drag: sheet volgt exact, met lichte weerstand naarmate je verder trekt
    e.preventDefault();

    const raw = Math.max(0, dy);
    const h = Math.max(1, window.innerHeight);
    const max = h * 0.95;
    // zachte weerstand (meer weerstand na 40% hoogte)
    const t = raw / max;
    const resisted = raw * (t < 0.4 ? 1 : (1 - (t - 0.4) * 0.55));
    const y = clamp(resisted, 0, max);
    setTransform(y);

    // velocity
    const now = performance.now();
    const dt = Math.max(8, now - state.lastT);
    state.vy = (e.clientY - state.lastY) / dt; // px per ms
    state.lastY = e.clientY;
    state.lastT = now;
  };

  const onPointerUp = () => {
    if (!state.dragging) return;
    const y = state.curY || 0;
    const h = Math.max(1, window.innerHeight);
    const threshold = Math.max(120, h * 0.22);
    const fast = state.vy > 0.9; // snelle swipe-down

    state.dragging = false;
    const mode = state.mode;
    state.mode = null;

    if (mode !== "y") {
      setStable(true);
      return;
    }

    if (y > threshold || fast) {
      close();
    } else {
      springBack(y);
    }
  };

  sheet.addEventListener("pointerdown", onPointerDown, { passive: true });
  sheet.addEventListener("pointermove", onPointerMove, { passive: false });
  sheet.addEventListener("pointerup", onPointerUp, { passive: true });
  sheet.addEventListener("pointercancel", onPointerUp, { passive: true });

  // fallback: als iemand hard aan het scrollen is, ✕ even weg
  track?.addEventListener("scroll", () => {
    if (!state.open) return;
    sheet.classList.add("x-scrolling");
    window.clearTimeout(sheet.__xScrollT);
    sheet.__xScrollT = window.setTimeout(() => sheet.classList.remove("x-scrolling"), 220);
  }, { passive: true });

  return { open, close };
}
