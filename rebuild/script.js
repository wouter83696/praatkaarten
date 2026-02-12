(function(){
  const modal = document.getElementById('desktopModal');
  const openBtn = document.getElementById('openWebApp');

  function isDesktopLike(){
    // Desktop-ish: wider screens OR fine pointer/hover
    return window.matchMedia('(min-width: 900px)').matches ||
           window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  function openModal(){
    if(!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
  }

  function closeModal(){
    if(!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
  }

  // Desktop warning on load
  window.addEventListener('load', () => {
    if (isDesktopLike()) openModal();
  });

  // Button behavior
  if(openBtn){
    openBtn.addEventListener('click', () => {
      if (isDesktopLike()) {
        openModal();
      } else {
        // mobiele route: hier kun jij later je web-app link zetten
        // window.location.href = './cards/';
        alert('Mobiele web-app komt hier.');
      }
    });
  }

  // Close handlers
  if(modal){
    modal.addEventListener('click', (e) => {
      const t = e.target;
      if (t && (t.hasAttribute('data-close') || t.closest('[data-close]'))) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }
})();