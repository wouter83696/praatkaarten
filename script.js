const cards = document.querySelectorAll(".card");
const lb = document.querySelector(".lb");
const lbImg = document.getElementById("lbImg");
const lbText = document.querySelector(".lbText");
const btnClose = document.querySelector(".close");
const btnPrev = document.querySelector(".chev.left");
const btnNext = document.querySelector(".chev.right");

let currentIndex = 0;
let uiTimeout = null;

/* ===============================
   OPEN / CLOSE
   =============================== */

function openLightbox(index) {
  currentIndex = index;
  updateLightbox();

  lb.classList.add("open");
  document.body.classList.add("lb-open"); // ✅ nodig voor landscape fix

  showUI();
}

function closeLightbox() {
  lb.classList.remove("open");
  document.body.classList.remove("lb-open"); // ✅ balk terug
}

/* ===============================
   UPDATE CONTENT
   =============================== */

function updateLightbox() {
  const card = cards[currentIndex];
  const img = card.querySelector("img");
  const text = card.querySelector(".q")?.innerText || "";

  lbImg.src = img.src;
  lbText.textContent = text;
}

/* ===============================
   UI AUTO HIDE
   =============================== */

function showUI() {
  lb.classList.add("show-ui");
  clearTimeout(uiTimeout);

  uiTimeout = setTimeout(() => {
    lb.classList.remove("show-ui");
  }, 800); // snel weg (rustiger)
}

/* ===============================
   NAVIGATION
   =============================== */

function prevCard() {
  currentIndex = (currentIndex - 1 + cards.length) % cards.length;
  updateLightbox();
  showUI();
}

function nextCard() {
  currentIndex = (currentIndex + 1) % cards.length;
  updateLightbox();
  showUI();
}

/* ===============================
   EVENTS
   =============================== */

// open
cards.forEach((card, index) => {
  card.addEventListener("click", () => openLightbox(index));
});

// close
btnClose.addEventListener("click", closeLightbox);

// navigation
btnPrev.addEventListener("click", (e) => {
  e.stopPropagation();
  prevCard();
});
btnNext.addEventListener("click", (e) => {
  e.stopPropagation();
  nextCard();
});

// toetsenbord
document.addEventListener("keydown", (e) => {
  if (!lb.classList.contains("open")) return;

  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") prevCard();
  if (e.key === "ArrowRight") nextCard();
});

// 🔴 klik naast de kaart = sluiten
lb.addEventListener("click", (e) => {
  if (e.target === lb) closeLightbox();
});

// 🟢 klik op kaart zelf mag NIET sluiten
const lbCard = document.querySelector(".lbCard");
if (lbCard) {
  lbCard.addEventListener("click", (e) => e.stopPropagation());
}

// toon UI bij beweging / tik
["mousemove", "touchstart"].forEach(evt => {
  lb.addEventListener(evt, showUI, { passive: true });
});
