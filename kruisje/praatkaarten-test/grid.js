
(function(){
  const grid = document.getElementById('grid');
  if(!grid) return;

  function render(data){
    grid.innerHTML = '';
    const themes = Object.keys(data || {});
    themes.forEach(theme => {
      (data[theme] || []).forEach(q => {
        const btn = document.createElement('button');
        btn.className = 'card';
        btn.type = 'button';
        btn.textContent = q;
        btn.dataset.theme = theme;
        grid.appendChild(btn);
      });
    });
  }

  function readEmbedded(id){
    const el = document.getElementById(id);
    if(!el) return null;
    try{
      return JSON.parse(el.textContent);
    }catch(e){
      return null;
    }
  }

  // 1) Probeer embedded JSON (werkt ook bij file://)
  const embedded = readEmbedded('questions-json');
  if(embedded){
    render(embedded);
    return;
  }

  // 2) Fallback: fetch (werkt bij hosting zoals GitHub Pages)
  fetch('./questions.json')
    .then(r => r.json())
    .then(render)
    .catch(err => {
      console.error('Grid load failed:', err);
      // Laat een mini-debug zien i.p.v. leeg scherm
      grid.innerHTML = '<div style="padding:24px;font-family:system-ui;">Kon vragen niet laden.</div>';
    });
})();
