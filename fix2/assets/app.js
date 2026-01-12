// app.js – bootstrap (v3.6.3)
import { loadQuestions } from "./data.js";
import { setVersionBadge, renderGrid } from "./grid.js";
import { renderUitleg, setupIntroSheet } from "./introSheet.js";

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

document.addEventListener("DOMContentLoaded", async () => {
  setVersionBadge();

  // Uitleg-sheet (werkt los van grid)
  setupIntroSheet();
  await renderUitleg();

  let items = await loadQuestions();

  // Voor nu: GEEN click/open gedrag op grid-kaarten
  renderGrid(items);

  const shuffleBtn = document.getElementById("shuffleBtn");
  shuffleBtn?.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      items = shuffleInPlace(items.slice());
      renderGrid(items);
    },
    { passive: true }
  );
});
