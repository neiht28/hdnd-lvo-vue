# Balatro Clone (Web)

A browser-based Balatro-inspired poker roguelike prototype implemented with vanilla HTML/CSS/JS.

## Run

Because this is a static app, you can open `index.html` directly or serve it:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Implemented systems

- 52-card deck with shuffling and redraw
- Select up to 5 cards from an 8-card hand
- Poker hand detection (high card through straight flush)
- Chip × Mult scoring model
- Hands/discards economy per blind
- Ante + blind progression and scaling score targets
- Joker shop with passive modifiers

## Notes

This is a compact, original implementation inspired by Balatro mechanics and flow.
