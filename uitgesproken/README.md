# Uitgesproken – Praatkaartjes

Gesprekskaarten web-app. Werkt op desktop, mobiel en als PWA.

## Mapstructuur

```
index.html              ← kaartensets overzicht (grid/carousel)
kaarten/index.html      ← kaartenpagina per set
uitleg/index.html       ← uitlegpagina per set
favicon.ico

assets/
  icons/sprite.svg      ← UI iconen
  logo-icons/           ← app logo's en favicons

css/
  shell.css             ← skip-links, gedeelde basis
  menu.css              ← topbar, pill, menu, bottomsheet
  cards.css             ← kaartenpagina
  index.css             ← grid/carousel pagina
  sets.css              ← sets hero en grid
  uitleg.css            ← uitlegpagina

js/
  main.js               ← bootstrap: imports, PK-object, boot
  core/
    paths.js            ← paden, VERSION, withV()
    net.js              ← getText / getJson / loadJson
    query.js            ← getQueryParam, getActiveSet, prettyName
    color.js            ← dominantColorFromSvgText, lighten
    state.js            ← activeSet / activeTheme state
    ui.js               ← mergeDeep, applyUiConfig, validateUiConfig
  shell/
    initShell.js        ← applyCssVars, initShell
  components/
    menu.js             ← createMenu
    bottomSheet.js      ← createBottomSheet
    cardRenderer.js     ← createGridCard, createMenuItem, applyDominantTint
    gridBackground.js   ← gridBackground.render()
    cardsBackground.js  ← cardsBackground.render()
  pages/
    grid.page.js        ← index pagina logica
    kaarten.page.js     ← kaartenpagina logica
    uitleg.js           ← uitlegpagina logica
  templates/
    index.js            ← viewer templates registry

templates/
  ui-base.css           ← gedeelde menu/sheet CSS tokens
  main-index.css        ← index achtergrond banden
  cards-index.css       ← kaarten achtergrond

sets/
  index.json            ← lijst van alle sets + globale uiDefaults
  _template/            ← startpunt voor nieuwe sets
  samenwerken/          ← voorbeeld set
    meta.json
    questions.json
    uitleg.json
    intro.json
    theme.css
    cards/              ← SVG kaarten (vierkant)
    cards_rect/         ← SVG kaarten (rechthoek)
    cards_square/       ← SVG kaarten (vierkant variant)

docs/
  ui-overrides.md       ← uitleg over menu/sheet/layout config per set
  set-meta-template.json
  main-index-kaarten-palette-reference.svg

scripts/
  new-set.sh            ← nieuw set aanmaken via terminal
```

## Nieuwe set maken

```bash
./scripts/new-set.sh <set-id> "Titel"
```

Voorbeeld:

```bash
./scripts/new-set.sh teamreflectie "Team reflectie"
```

Dit maakt `sets/teamreflectie/` aan vanuit `sets/_template/` en voegt de set toe aan `sets/index.json`.

Daarna vervang je in `sets/teamreflectie/`:
- `cards/*.svg` en `cards_rect/*.svg` — de kaartafbeeldingen
- `questions.json` — de vragen
- `meta.json` — titel, kleur, ui-instellingen
- `theme.css` — optionele per-set stijl

Zie `docs/ui-overrides.md` voor alle configuratie-opties.

## Technische opzet

Alle JS is geschreven als **ES modules** — geen bundler, geen build stap.
`main.js` importeert alle modules direct en vult `window.PK` voor backward compatibility.

Vereist een HTTP-server (niet `file://`). Lokaal testen:

```bash
npx serve .
```

Daarna open je `http://localhost:3000`.

## Deployen

Publiceer de inhoud van deze map zodat `index.html` in de root staat.
Werkt direct op **GitHub Pages**, Netlify, Vercel of elke statische host.
