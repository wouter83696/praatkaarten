const cards = [
  { img: "cards/kaart1.svg", text: "Wat valt op aan onze samenwerking?" },
  { img: "cards/kaart2.svg", text: "Welke patronen zien we steeds terug?" },
  { img: "cards/kaart3.svg", text: "Wat schuiven we liever voor ons uit?" }
];

let current = 0;

const grid = document.getElementById("grid");
const lightbox = document.getElementById("lightbox");
const bigImage = document.getElementById("bigImage");
const bigText = document.getElementById("bigText");

const nextBtn = document.getElementById("next");
const prevBtn = document.getElementById("prev");
const closeBtn = document.getElementById("close");

cards.forEach((card, i) => {
  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `<img src="${card.img}"><div class="q">${card.text}</div>`;
  el.onclick = () => openCard(i);
  grid.appendChild(el);
});

function openCard(i) {
  current = i;
  bigImage.src = cards[i].img;
  bigText.textContent = cards[i].text;
  lightbox.classList.add("open");
}

function next() {
  openCard((current + 1) % cards.length);
}

function prev() {
  openCard((current - 1 + cards.length) % cards.length);
}

nextBtn.onclick = next;
prevBtn.onclick = prev;
closeBtn.onclick = () => lightbox.classList.remove("open");

lightbox.addEventListener("click", e => {
  if (e.target === lightbox) lightbox.classList.remove("open");
});
