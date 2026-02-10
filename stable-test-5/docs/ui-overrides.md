# UI Overrides (menu / sheet / index)

Dit project gebruikt **1 centrale template** (bijv. `kaarten.html`) en laat per set kleine afwijkingen toe via config. Daardoor kun je de look & feel globaal aanpassen zonder elke set handmatig te wijzigen.

## 1. Globale defaults (voor alle sets)
Bewerk `sets/index.json` onder `uiDefaults`.

Voorbeeld:
```json
"uiDefaults": {
  "menu": {
    "showInfo": true,
    "showShuffle": true,
    "showAllSets": true
  },
  "sheet": {
    "enabled": true,
    "defaultMode": "cards"
  },
  "index": {
    "layout": "carousel"
  }
}
```

## 2. Per‑set overrides
Bewerk `sets/<set>/meta.json` en voeg een `ui`‑blok toe.
Alleen afwijkingen hoeven erin.

Voorbeeld:
```json
"ui": {
  "menu": {
    "showAllSets": false
  },
  "sheet": {
    "defaultMode": "help"
  },
  "index": {
    "layout": "grid"
  },
  "themeCss": true,
  "vars": {
    "accent": "#7fcfc9",
    "menuTintRgb": "127, 207, 201"
  }
}
```

## 3. Beschikbare opties

### menu
- `showInfo` (boolean)
- `showShuffle` (boolean)
- `showAllSets` (boolean)

### sheet
- `enabled` (boolean)
- `defaultMode` ("cards" | "help")

### index
- `layout` ("carousel" | "hero-grid" | "empty" | "grid") → wordt als `data-index-layout` op `<body>` gezet.
  - `carousel`: alleen hero/carrousel (standaard).
  - `hero-grid`: hero bovenaan + grid eronder.
  - `empty`: geen hero/grid, alleen achtergrond + topbar.
  - `grid`: alleen grid (legacy/optioneel).
- `gridLimit` (number, optioneel) → max. aantal kaarten in het grid.
  - Handig voor `hero-grid` als je op de front page bijv. 6 tegels wilt.
  - `0` of weglaten = geen limiet (alle sets tonen).
- `background` (object, optioneel) → palette/instellingen voor blobs.
  - `palette` (array of hex)
  - `darkPalette` (array of hex)
  - `blobCount`, `alphaBoost`, `darkAlphaBoost`, `sizeScale`, `darkSizeScale`,
    `blobIrregularity`, `blobPointsMin`, `blobPointsMax`, `darkMix`

### themeCss
- `true` → laadt automatisch `sets/<set>/theme.css`
- of geef een pad als string: `"themeCss": "custom/theme.css"`

### vars
- CSS‑variabelen die je wilt zetten op `:root`.
  Schrijf zonder `--`, dat wordt automatisch toegevoegd.

## 4. Wat dit oplevert
- **Globale wijzigingen** (menu, sheet, index) doe je in 1 plek (CSS/JS)
- **Per set** kun je alleen afwijken waar nodig
- Je hoeft geen losse templates per set bij te houden
