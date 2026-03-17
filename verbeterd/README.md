# Uitgesproken

Gesprekskaartjes-webapp. Kaartensets zijn volledig modulair — elke set is een zelfstandige map onder `sets/`.

---

## Structuur

```
uitgesproken/
├── index.html              ← Kaartensets-overzicht
├── kaarten/index.html      ← Kaartenviewer
├── uitleg/index.html       ← Uitleg (intern iframe)
│
├── css/
│   ├── shell.css           ← Importeert menu.css + cards.css
│   ├── menu.css            ← Menu, topbar, sheet (alle pagina's)
│   ├── cards.css           ← Kaarten-layout + flip-animatie
│   ├── index.css           ← Kaartenviewer specifiek
│   ├── sets.css            ← Kaartensets-overzicht specifiek
│   └── uitleg.css          ← Uitleg-pagina specifiek
│
├── templates/
│   ├── ui-base.css         ← Gedeelde CSS-tokens (menu, sheet)
│   ├── main-index.css      ← Achtergrondkleuren overzicht
│   └── cards-index.css     ← Achtergrondkleur kaartenviewer
│
├── js/
│   ├── main.js             ← Bootstrap + PK-global
│   ├── core/               ← Utilities: paths, net, query, color, state, ui
│   ├── components/         ← UI: menu, sheet, background, cardRenderer
│   └── pages/              ← Pagina-logica: grid.page.js, kaarten.page.js
│
├── sets/
│   ├── index.json          ← Set-registry + globale UI-defaults ← HIER begin je
│   ├── _template/          ← Startpunt voor nieuwe sets
│   └── samenwerken/        ← "Samen onderzoeken" (voorbeeld)
│
├── scripts/
│   └── new-set.sh          ← Nieuwe set scaffolden
│
└── docs/
    ├── ui-overrides.md     ← Alle meta.json UI-opties uitgelegd
    └── main-index-kaarten-palette-reference.svg
```

---

## Nieuwe kaartenset toevoegen

### Stap 1 — Scaffold

```bash
./scripts/new-set.sh teamreflectie "Team reflectie"
```

Dit kopieert `sets/_template/`, vult de ID en titel in, en registreert de set in `sets/index.json`.

### Stap 2 — Inhoud invullen

`sets/teamreflectie/` bevat:

| Bestand | Wat aanpassen |
|---|---|
| `meta.json` | Thema-namen, accentkleur, UI-opties |
| `questions.json` | Vragen per thema |
| `uitleg.json` | Uitleg-tekst per thema |
| `intro.json` | Intro-kaarttekst |
| `theme.css` | Set-specifieke stijlen (optioneel) |
| `cards/*.svg` | Kaartafbeeldingen (85×55 viewBox) |
| `cards_rect/*.svg` | Portret-thumbnails voor menu |

### Stap 3 — Volgorde bepalen

Pas `sets/index.json` aan:

```json
{
  "default": "samenwerken",
  "sets": [
    { "id": "samenwerken",    "title": "Samen onderzoeken" },
    { "id": "teamreflectie",  "title": "Team reflectie" }
  ]
}
```

De volgorde in de array = volgorde op het scherm.

### Minimale `meta.json`

```json
{
  "id": "teamreflectie",
  "title": "Team reflectie",
  "themes": [
    { "key": "verkennen",  "label": "Verkennen" },
    { "key": "verbinden",  "label": "Verbinden" }
  ]
}
```

Alle opties staan in `docs/ui-overrides.md`.

---

## Lokaal draaien

```bash
npx serve .
# of
python3 -m http.server 3000
```

---

## CMS toevoegen?

De data is bewust platte JSON + SVG, zodat je altijd zonder tooling kunt werken.

**Zonder CMS (aanbevolen voor kleine teams):** gebruik `new-set.sh` + een teksteditor. Werkt direct.

**Met CMS (handig bij meerdere redacteuren):** [Decap CMS](https://decapcms.org/) werkt direct op een GitHub-repo zonder backend. Je voegt een `static/admin/config.yml` toe en krijgt een `/admin`-interface. De relevante content-types zijn:
- `sets/index.json` — set-volgorde
- `sets/*/meta.json` — labels, kleuren, thema's
- `sets/*/questions.json` — vragen per thema

---

## Admin-paneel (`/admin`)

Open `admin/index.html` in je browser om kaartensets visueel te beheren.

**Wat je nodig hebt:**
- Je GitHub-repository staat online (bijv. GitHub Pages)
- Een GitHub Personal Access Token met `repo`-rechten

**Wat je kunt doen in het paneel:**
- Sets toevoegen, hernoemen en verwijderen
- Thema's aanmaken en herordenen
- Vragen bewerken per thema
- Uitleg-teksten aanpassen
- Intro-slides bewerken

Alle wijzigingen worden direct via de GitHub API opgeslagen als commits.
