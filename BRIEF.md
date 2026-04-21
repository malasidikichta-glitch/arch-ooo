# arch.ooo — redesign brief

## 1. ce qu'est arch

**arch** — *label / events / network / studio*
Collectif basé à clermont-ferrand, actif à paris, lyon, nantes, bordeaux, etc.
4 artistes : **xo · duno · mau_v · limak**
Organise des soirées "arch club" dans les meilleures salles de france (la gaîté lyrique, transbordeur, la coopé de mai, etc.)
Édite 11 plugins audio VST3 (shard, keys, grain, fmnt, cmpr, eqls, dist, sprd, clpr, dly, dck)
Vend du merch (t-shirt).

## 2. ce qui existe aujourd'hui — structure

| url | rôle | notes |
|---|---|---|
| `/` | home | hero "arch" + prochaine date + message box |
| `/music` | sorties + 4 artistes | 2 embeds spotify en haut (xo + duno) + grille 4 artistes avec socials |
| `/events` | concerts | synced depuis shotgun.live/fr/venues/arch-inc (via facebookbot UA) · upcoming + past avec badge "sold out" |
| `/shop` | merch | 1 t-shirt 30€ · sélecteur S/M/L/XL · stripe checkout |
| `/plugins` | store plugins VST3 | 11 plugins · cart · promo codes · stripe · video youtube previews · email collection |
| `/contact` | email + socials | contact@arch-inc.fr |
| `/data` | admin dashboard (privé) | password `j'aimelesdatas` · revenue · visites · emails · orders · events CRUD |
| `/55asky` | doc confidentiel | password `arch_balobi` · gate + noindex |
| `/breakeven` | PWA calculateur budget label | existant, ne pas toucher |
| `/plugins/success`, `/shop/success` | post-checkout | stripe callbacks |

## 3. preview gate

**tout le site neuf est derrière un password côté client** (sauf /plugins, /breakeven, /data, /55asky, /stats qui ont leur propre logique).
- fichier : `public/_gate.js`
- mot de passe : `xoxo`
- modifiable en 1 ligne (constante `PASSWORD`)
- à retirer quand le redesign est prêt à être public

## 4. stack technique (**immuable pour le redesign**)

- **hébergement** : Cloudflare Pages (static + Pages Functions)
- **DNS** : Cloudflare (zone active · NS crystal/trey.ns.cloudflare.com)
- **registrar** : Gandi
- **storage** : Cloudflare KV (7 namespaces : visits, emails, messages, downloads, redemptions, events, releases)
- **object storage** : Cloudflare R2 (bucket `plugin-binaries` · custom domain `plugins.arch.ooo`)
- **paiement** : Stripe Checkout (live key en env)
- **pas de framework** : HTML + CSS + vanilla JS (pas de React/Next, pas de build step)
- **functions** : Pages Functions en `.js` ESM dans `/functions/api/v2/*`
- **deploy** : `wrangler pages deploy public`

## 5. design tokens actuels (à garder ou à remplacer mais consistants)

```css
--bg:         #0f0f0f
--surface:    #151515
--surface-alt:#1a1a1a
--border:     rgba(255,255,255,0.07)
--border-h:   rgba(255,255,255,0.16)
--text:       #e8e6e3
--muted:      #8a8680
--dim:        #4a4743
--accent:     #d4d2cd
--danger:     #ff5b4a
--success:    #7dd87d
```

**fonts** :
- **Geist Mono** (300/400/500) — tout le texte corps, nav, UI
- **Instrument Serif** (400, italic) — titres, logo, noms d'artistes

**direction actuelle** : dark · minimal · editorial · monospace-forward · tout en lowercase (aucune majuscule sur le site)

## 6. contenu / données (backend live via `/api/v2/*`)

- **events** : 11 events actuels (3 upcoming + 8 past) — synchronisables depuis shotgun via bouton sync
- **releases** : 4 artistes · xo + duno ont des albums spotify embed
- **socials par artiste** : instagram, tiktok, soundcloud, shotgun, youtube
- **collectif arch** : instagram `vsop.arch`, tiktok `vsop.arch`, soundcloud `arch-53544829`, youtube `vsop_arch`, shotgun `arch-inc`
- **stats** : 832+ visites tracked, 39 emails, 19 achats plugins (905€), 3 messages

## 7. contraintes fonctionnelles à PRÉSERVER

- password gate (xoxo) sur les pages publiques neuves
- tracking visite auto via `/_track.js`
- cart state localStorage `arch-cart2` sur /plugins
- stripe flows (plugins + merch)
- R2 URL pattern `plugins.arch.ooo/{plugin}/arch-audio-{plugin}-installer.{pkg|exe}`
- events fetched dynamically from KV
- releases fetched from `/api/v2/releases`
- le dashboard /data doit rester fonctionnel pour l'admin

## 8. ce que je veux du redesign

*(zone à remplir par toi avant d'envoyer à claude design)*

- [ ] direction visuelle : ...
- [ ] pages à refondre en priorité : ...
- [ ] références / moodboard : ...
- [ ] ce qui t'énerve dans la v actuelle : ...
- [ ] animations / transitions souhaitées : ...
- [ ] mobile-first ? desktop-first ? les deux ? : ...

## 9. assets

- **logo** : à uploader (graffiti-style "arch" blanc sur fond transparent)
- **covers releases** : servies automatiquement via Spotify embed
- **photos événements** : actuellement via OG images shotgun (cloudinary)
- **pas de photos artistes** pour l'instant

## 10. repo code

**github** : `https://github.com/malasidikichta-glitch/arch-ooo` (privé)
**live** : `https://arch.ooo`
**preview subdomain (pas gated)** : `https://arch-ooo.pages.dev`
