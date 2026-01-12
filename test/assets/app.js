// assets/app.js – bootstrap (v3.6.5)
import { loadQuestions } from "./data.js";
import { setVersionBadge, renderGrid, setupLightbox } from "./grid.js";
import { renderUitleg, setupIntroSheet } from "./introSheet.js";

function shuffleInPlace(arr){
  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function setFatal(err){
  console.error(err);
  const grid = document.getElementById("grid");
  if(grid) {
    grid.innerHTML = `<div style="padding:14px;opacity:.7;font-size:14px;line-height:1.4">
      <strong>Er ging iets mis met laden.</strong><br/>
      Open de console voor details.
    </div>`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    setVersionBadge();

    const lb = setupLightbox();
    setupIntroSheet();
    await renderUitleg();

    let items = await loadQuestions();

    const openCard = (it) => {
      lb?.open({
        img: it.img,
        text: it.text || ""
      });
    };

    renderGrid(items, openCard);

    const shuffleBtn = document.getElementById("shuffleBtn");
    shuffleBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      items = shuffleInPlace(items.slice());
      renderGrid(items, openCard);
    }, { passive: true });

  } catch(err) {
    setFatal(err);
  }
});
