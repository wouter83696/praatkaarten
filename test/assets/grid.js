// assets/grid.js – grid + lightbox (v3.6.5)
import { VERSION } from "./data.js";

const $ = (id) => document.getElementById(id);

export function setVersionBadge(){
  const el = $("versionBadge");
  if(el) el.textContent = VERSION;
}

export function renderGrid(items, onOpenCard){
  const grid = $("grid");
  if(!grid) throw new Error("#grid ontbreekt");

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

    btn.appendChild(img);

    // labels (thema + index)
    const label = document.createElement("div");
    label.className = "cardLabel";

    const themePill = document.createElement("div");
    themePill.className = "cardTheme";
    themePill.textContent = it.theme;

    label.appendChild(themePill);

    const idxTag = document.createElement("div");
    idxTag.className = "cardIndex";
    idxTag.textContent = String(it.index);

    btn.appendChild(label);
    btn.appendChild(idxTag);

    btn.addEventListener("click", () => onOpenCard(it), { passive: true });
    frag.appendChild(btn);
  });

  grid.appendChild(frag);
}

export function setupLightbox(){
  const lb = $("lb");
  const lbImg = $("lbImg");
  const lbText = $("lbText");
  const lbClose = $("lbClose");
  const lbCloseHitbox = $("lbCloseHitbox");

  function close(){
    if(!lb) return;
    lb.classList.remove("open");
    document.body.classList.remove("lb-open");
  }

  function open(payload){
    if(!lb || !lbImg) return;
    lbImg.src = payload.img || "";
    if(lbText) lbText.textContent = payload.text || "";
    lb.classList.add("open");
    document.body.classList.add("lb-open");
  }

  lbClose?.addEventListener("click", close, { passive: true });
  lbCloseHitbox?.addEventListener("click", close, { passive: true });
  lb?.addEventListener("click", (e) => {
    if(e.target === lb) close();
  });

  return { open, close };
}
