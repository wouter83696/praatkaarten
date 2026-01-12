// grid.js – render grid + lightbox (v3.6.2)
import { VERSION } from "./data.js";

function $(id) { return document.getElementById(id); }

export function setVersionBadge() {
  const el = $("versionBadge");
  if (el) el.textContent = VERSION;
}

export function renderGrid(items, onOpenCard) {
  const grid = $("grid");
  if (!grid) throw new Error("#grid ontbreekt in DOM");

  grid.classList.add("grid");
  grid.innerHTML = "";

  const frag = document.createDocumentFragment();

  items.forEach((it) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cardShell";
    btn.setAttribute("aria-label", `${it.theme} – kaart ${it.index}`);

    
    const img = document.createElement("img");
    img.className = "card";
    img.alt = "";
    img.draggable = false;
    img.loading = "lazy";
    img.src = it.img;

    const label = document.createElement("div");
    label.className = "cardLabel";
    label.innerHTML = `<span class="cardTheme">${it.theme}</span><span class="cardIndex">${it.index}</span>`;

    btn.appendChild(img);

    // Overlay labels (thema + index)
    const label = document.createElement("div");
    label.className = "cardLabel";

    const themePill = document.createElement("div");
    themePill.className = "cardTheme";
    themePill.textContent = it.theme;

    const idxTag = document.createElement("div");
    idxTag.className = "cardIndex";
    idxTag.textContent = String(it.index);

    label.appendChild(themePill);
    btn.appendChild(label);
    btn.appendChild(idxTag);
    btn.appendChild(label);

    btn.addEventListener("click", () => onOpenCard(it), { passive: true });

    frag.appendChild(btn);
    
  });

  grid.appendChild(frag);
}

// --- Lightbox (simple, mobile-first) ---
export function setupLightbox() {
  const lb = $("lb");
  const lbImg = $("lbImg");
  const lbText = $("lbText");
  const lbClose = $("lbClose");
  const lbCloseHitbox = $("lbCloseHitbox");

  function close() {
    if (!lb) return;
    lb.classList.remove("open");
    document.body.classList.remove("lb-open");
  }

  function open({ img, theme, index, text }) {
    if (!lb || !lbImg) return;
    lbImg.src = img;
    if (lbText) lbText.textContent = text || "";
    lb.classList.add("open");
    document.body.classList.add("lb-open");
  }

  if (lbClose) lbClose.addEventListener("click", close, { passive: true });
  if (lbCloseHitbox) lbCloseHitbox.addEventListener("click", close, { passive: true });
  lb?.addEventListener("click", (e) => {
    if (e.target === lb) close();
  });

  return { open, close };
}
