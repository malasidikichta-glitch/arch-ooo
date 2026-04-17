# arch.ooo

Source-of-truth repo for the `arch.ooo` website, deployed on Netlify.

## Routes

| Path | File | Notes |
|---|---|---|
| `/` | `public/plugins.html` | redirect → plugins |
| `/plugins` | `public/plugins.html` | v2 plugin store (Stripe cart) |
| `/plugins/success` | `public/success.html` | post-checkout download page |
| `/breakeven` | `public/breakeven/index.html` | label budget simulator (PWA) |
| `/data` | `public/data.html` | admin dashboard (password gated) |
| `/stats` | `public/stats.html` | legacy v1 stats page |
| `/55asky` | `public/55asky/index.html` | **private, gated** (user+pass) |

## Dev

```sh
npm install
netlify dev
```

## Deploy

Manual from CLI:

```sh
netlify deploy --prod
```

## Functions

The site uses Netlify serverless functions for Stripe checkout, download gating,
promo codes, visit tracking, email collection, and admin data. Source lives
in `netlify/functions/`.

## Confidential

`/55asky/` is a **private document** behind a client-side auth gate. It also
sets `X-Robots-Tag: noindex` via `netlify.toml` and `<meta name="robots">`.
Do not link to it from the main site.
