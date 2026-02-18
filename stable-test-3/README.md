# Praatkaartjes – fool-proof structuur

## Mapstructuur
- index.html (kaartensets overzicht)
- kaarten/ (kaartenpagina per set)
- uitleg/ (uitlegpagina per set)
- css/cards.css (gedeeld)
- css/index.css (index grid)
- css/menu.css (topbar + menu)
- css/uitleg.css (uitleg pagina)
- js/
- js/main.js (centrale loader)
- js/core/ (gedeelde helpers)
  - paths.js
  - config.js
  - state.js
  - query.js
  - net.js
  - color.js
- js/pages/ (actieve pagina scripts)
  - grid.page.js
  - kaarten.page.js
  - uitleg.js
- sets/ (kaartensets)
  - index.json
  - _template/ (startpunt voor nieuwe sets)
  - samenwerken/
    - meta.json
    - questions.json
    - uitleg.json
    - intro.json
    - cards/ (svg's)
- templates/ (gedeelde pagina-templates; centraal, niet per set kopiëren)

## Nieuwe set maken (snel)
Gebruik:

`./scripts/new-set.sh <set-id> "Titel"`

Voorbeeld:

`./scripts/new-set.sh teamreflectie "Team reflectie"`

Wat dit doet:
- maakt `sets/<set-id>/` vanuit `sets/_template/`
- zet `id` en `title` in `meta.json`
- voegt de set direct toe aan `sets/index.json`

## Belangrijk (zodat je altijd de kaartjes ziet)
- Publiceer de **inhoud** van deze map (zodat `index.html` in de root staat).
- Alles gebruikt **relatieve paden** (dus werkt in elke subdirectory).
- Als je lokaal opent via `file://`, kunnen `fetch()` calls blokkeren.
  - Test dan via een simpele lokale server (bijv. VSCode Live Server) of via GitHub Pages.

## App later (Capacitor / Cordova)
Deze structuur is direct bruikbaar: HTML + CSS + JS + JSON + SVG assets.
