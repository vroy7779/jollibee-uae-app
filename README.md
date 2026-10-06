# Jollibee UAE Mobile App UI

Interactive prototype of the Jollibee UAE mobile app: store selection, menu, cart, checkout, payment, order status, Jolli Club loyalty, gift cards and receipt claims. Everything runs in the browser with sample data; nothing calls a backend.

The original Figma project is at https://www.figma.com/design/b0zYsfb3C98pPFAbdSkYKL/Jollibee-UAE-Mobile-App-UI.

## Running the code

```bash
npm i
npm run dev
```

## Deploying

Pushing to `main` builds the app and publishes it to GitHub Pages through `.github/workflows/deploy.yml`.

## Design

Tokens are in `src/styles/theme.css`, shared components in `src/app/components/ds.tsx`, and the rules in `guidelines/Guidelines.md`.
