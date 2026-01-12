// grid.js – render grid (mobile-first) – cleaned (v3.6.3)
import { VERSION } from "./data.js";

function $(id) { return document.getElementById(id); }

export function setVersionBadge() {
  const el = $("versionBadge");
  if (el) el.textContent = VERSION;
}

// onOpenCard is optional; if omitted, cards do nothing when pressed.
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

    const themePill = document.createElement("div");
    themePill.className = "cardTheme";
    themePill.textContent = it.theme;

    const idxTag = document.createElement("div");
    idxTag.className = "cardIndex";
    idxTag.textContent = String(it.index);

    label.appendChild(themePill);
    label.appendChild(idxTag);

    btn.appendChild(img);
    btn.appendChild(label);

    if (typeof onOpenCard === "function") {
      btn.addEventListener("click", () => onOpenCard(it), { passive: true });
    } else {
      btn.style.cursor = "default";
    }

    frag.appendChild(btn);
  });

  grid.appendChild(frag);
}
