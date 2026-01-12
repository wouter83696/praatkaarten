// grid.js – render grid + lightbox (v3.6.2)
import { VERSION } from "./data.js";

function $(id) { return document.getElementById(id); }

export function setVersionBadge() {
  const el = $("versionBadge");
  if (el) el.textContent = VERSION;
}

export function renderGrid(items) {
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

    btn.appendChild(img);

    // Overlay labels (thema + index)