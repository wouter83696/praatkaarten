# Praatkaartjes – fool-proof structuur

## Mapstructuur
- index.html
- style.css
- js/
  - app.js (grid + lightbox)
  - uitleg.js (uitleg-pagina)
- data/
  - questions.json
  - intro.json
  - uitleg.json
- cards/ (6 thema SVG's + duiden)
- assets/ (voorkant.svg)

## Belangrijk (zodat je altijd de kaartjes ziet)
- Publiceer de **inhoud** van deze map (zodat `index.html` in de root staat).
- Alles gebruikt **relatieve paden** (dus werkt in elke subdirectory).
- Als je lokaal opent via `file://`, kunnen `fetch()` calls blokkeren.
  - Test dan via een simpele lokale server (bijv. VSCode Live Server) of via GitHub Pages.

## App later (Capacitor / Cordova)
Deze structuur is direct bruikbaar: HTML + CSS + JS + JSON + SVG assets.
