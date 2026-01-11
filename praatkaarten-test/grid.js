
fetch('questions.json')
  .then(r => r.json())
  .then(data => {
    const grid = document.getElementById('grid');
    if(!grid) return;

    const themes = Object.keys(data);

    themes.forEach(theme => {
      data[theme].forEach((q, i) => {
        const btn = document.createElement('button');
        btn.className = 'card';
        btn.textContent = q;
        btn.dataset.theme = theme;
        grid.appendChild(btn);
      });
    });
  })
  .catch(err => {
    console.error('Grid load failed:', err);
  });
