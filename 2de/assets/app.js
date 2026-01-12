// app.js – bootstrap (v3.6.2)
import { loadQuestions } from "./data.js";
import { setVersionBadge, renderGrid, setupLightbox } from "./grid.js";
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

  const lb = setupLightbox();
  const sheet = setupIntroSheet();
  await renderUitleg();

  let items = await loadQuestions();

  const openCard = (it) => {
    lb?.open({
      img: it.img,
      theme: it.theme,
      index: it.index,
      text: it.text
    });
  };

  renderGrid(items, openCard);

  const shuffleBtn = document.getElementById("shuffleBtn");
  shuffleBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    items = shuffleInPlace(items.slice());
    renderGrid(items, openCard);
  }, { passive: true });
});
