# Set Template

Deze map is het startpunt voor nieuwe sets.

Aanbevolen workflow:

1. Run `./scripts/new-set.sh <set-id> "Titel"`.
2. Vervang daarna in `sets/<set-id>/`:
   - `cards/*.svg`, `cards_rect/*.svg`, `cards_square/*.svg`
   - `cards_rect/*.json` (vragen)
   - `uitleg.json`, `intro.json`, `theme.css`
3. Commit en publish.

Belangrijk:
- `sets/index.json` wordt door het script automatisch bijgewerkt.
- `meta.json` gebruikt `cover: "voorkant.svg"` als veilige default.
