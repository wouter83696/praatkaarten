
const toggle = document.getElementById('toggleUitleg');
const container = document.getElementById('uitlegContainer');
const card = document.getElementById('card');
const text = document.getElementById('uitlegText');
const prev = document.getElementById('prev');
const next = document.getElementById('next');

const data = [{"title": "Voorkant", "text": "Dit is de voorkant van de praatkaartjes. Ze nodigen uit tot open gesprek."}, {"title": "Verkennen", "text": "Vragen om samen te onderzoeken wat er speelt."}, {"title": "Duiden", "text": "Vragen die helpen betekenis te geven aan wat je ziet of hoort."}, {"title": "Verbinden", "text": "Vragen die relaties, perspectieven en samenwerking versterken."}, {"title": "Verdiepen", "text": "Vragen die helpen om een laag dieper te gaan."}, {"title": "Vertragen", "text": "Vragen die rust brengen en tempo verlagen."}, {"title": "Bewegen", "text": "Vragen die uitnodigen tot actie of verandering."}];
let index = 0;

function render() {
  card.textContent = data[index].title;
  text.textContent = data[index].text;
}

render();

toggle.addEventListener('click', () => {
  container.classList.toggle('expanded');
  container.classList.toggle('collapsed');
  toggle.textContent = container.classList.contains('expanded') ? 'Verberg uitleg' : 'Toon uitleg';
});

prev.addEventListener('click', () => {
  index = (index - 1 + data.length) % data.length;
  render();
});

next.addEventListener('click', () => {
  index = (index + 1) % data.length;
  render();
});
