# Cloudflare bindings for arch.ooo

## Account
- Account ID: `2c0a18728822d55c0fd2cd580339044a`
- Zone ID (arch.ooo): `bba3c1dcf62c0c97e9d3fc479ae8bc27`

## R2
- `R2_PLUGINS` → bucket `arch-plugins`

## KV namespaces
| Binding | Namespace | ID |
|---|---|---|
| `KV_VISITS` | arch-visits | `70e3a454aff44f10a871073ab36e1c91` |
| `KV_EMAILS` | arch-emails | `0a187b1dc8f344ee9c2422deaa34a8c9` |
| `KV_MESSAGES` | arch-messages | `d48a6a29306a4264b13cdf9c8057e4e6` |
| `KV_DOWNLOADS` | arch-downloads | `33e38733cee1409180f942853b0a6846` |
| `KV_REDEMPTIONS` | arch-redemptions | `993fb63217f445fcbc16d4ba9decbc07` |

## Env vars (secrets)
- `STRIPE_SECRET_KEY` — set via Pages dashboard → Settings → Environment variables

## Nameservers (set at Gandi)
- `crystal.ns.cloudflare.com`
- `trey.ns.cloudflare.com`
