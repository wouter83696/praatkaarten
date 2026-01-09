
const toggle = document.getElementById('toggleUitleg');
const container = document.getElementById('uitlegContainer');
const text = document.getElementById('uitlegText');

text.textContent = "Deze kaarten nodigen je uit om samen te kijken naar wat er speelt, zichtbaar wordt en onbesproken blijft.";

toggle.addEventListener('click', () => {
  container.classList.toggle('expanded');
  container.classList.toggle('collapsed');
  toggle.textContent = container.classList.contains('expanded') ? 'Verberg uitleg' : 'Toon uitleg';
});
