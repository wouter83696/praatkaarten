# Praatkaartjes – fool-proof structuur

## Mapstructuur
- index.html (kaartensets overzicht)
- kaarten.html (kaartenpagina per set)
- css/cards.css (gedeeld)
- css/index.css (index grid)
- css/menu.css (topbar + menu)
- css/uitleg.css (uitleg pagina)
- js/
- js/core/ (gedeelde helpers)
  - config.js
  - query.js
  - net.js
  - color.js
- js/pages/ (pagina scripts)
  - index.js
  - uitleg.js
- sets/ (kaartensets)
  - index.json
  - samenwerken/
    - meta.json
    - questions.json
    - uitleg.json
    - intro.json
    - cards/ (svg's)

## Belangrijk (zodat je altijd de kaartjes ziet)
- Publiceer de **inhoud** van deze map (zodat `index.html` in de root staat).
- Alles gebruikt **relatieve paden** (dus werkt in elke subdirectory).
- Als je lokaal opent via `file://`, kunnen `fetch()` calls blokkeren.
  - Test dan via een simpele lokale server (bijv. VSCode Live Server) of via GitHub Pages.

## App later (Capacitor / Cordova)
Deze structuur is direct bruikbaar: HTML + CSS + JS + JSON + SVG assets.
