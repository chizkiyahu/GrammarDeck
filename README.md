# GrammarDeck

Static English grammar practice app.

## Production build

```bash
npm install
npm run build
```

This generates:

- `css/tailwind.css` — compiled Tailwind utilities used by the app (generated from `css/tailwind.input.css`)
- `js/app.bundle.js` — bundled browser JavaScript
- `dist/` — the production-ready site uploaded by GitHub Pages

## Development notes

- Source entry point: `js/app.js`
- Production entry point: `js/app.bundle.js`
- Tailwind source file: `css/tailwind.input.css`
- Generated Tailwind output: `css/tailwind.css` (do not edit directly)
- Custom styles stay in `css/style.css`

The GitHub Pages workflow runs the same build before publishing.

