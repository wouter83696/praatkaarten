# UI Overrides — menu / sheet / layout / achtergrond

Per set kun je kleine afwijkingen instellen via `meta.json`. Globale defaults staan in `sets/index.json`.

## 1. Globale defaults (voor alle sets)

Bewerk `sets/index.json` onder `uiDefaults`:

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

## 2. Per-set overrides

Voeg een `ui`-blok toe aan `sets/<set>/meta.json`. Alleen wat afwijkt hoeft erin:

```json
"ui": {
  "menu": {
    "showAllSets": false
  },
  "sheet": {
    "defaultMode": "help"
  },
  "index": {
    "layout": "hero-grid",
    "gridLimit": 6
  },
  "themeCss": true,
  "vars": {
    "accent": "#7fcfc9",
    "menuTintRgb": "127, 207, 201"
  }
}
```

## 3. Alle opties

### menu
| Optie | Type | Omschrijving |
|---|---|---|
| `showInfo` | boolean | Toon info-knop in menu |
| `showShuffle` | boolean | Toon shuffle-schakelaar |
| `showAllSets` | boolean | Toon "Alle kaartensets" link |

### sheet
| Optie | Type | Omschrijving |
|---|---|---|
| `enabled` | boolean | Sheet aan/uit |
| `defaultMode` | `"cards"` \| `"help"` | Standaard tabblad |

### index
| Optie | Type | Omschrijving |
|---|---|---|
| `layout` | zie hieronder | Lay-out van de index pagina |
| `gridLimit` | number | Max. sets in grid (0 = geen limiet) |

**Layout opties:**
- `carousel` — alleen hero/carrousel (standaard)
- `hero-grid` — hero bovenaan + grid eronder
- `grid` — alleen grid
- `empty` — geen hero/grid, alleen achtergrond en topbar

### themeCss
- `true` → laadt `sets/<set>/theme.css` automatisch
- of een pad als string: `"themeCss": "custom/theme.css"`

### vars
CSS-variabelen op `:root`. Schrijf zonder `--`, dat wordt automatisch toegevoegd.

### background (onder index)
Optionele blob-achtergrond instellingen:

```json
"index": {
  "background": {
    "palette": ["#7fcfc9", "#f5a623"],
    "darkPalette": ["#3d8a85", "#c47800"],
    "blobCount": 5,
    "alphaBoost": 1.0,
    "sizeScale": 1.0
  }
}
```
