# Ekin US + EU in one Vercel project

- US site: files at the project root. Public URL /us/... (or no prefix for Canada + Latin America).
- EU site: files in /eu (copied from the Ekin EU project). Public URL /eu/... (or no prefix for all other countries).
- Routing: middleware.js (country from x-vercel-ip-country). US → /us, Europe (EEA + GB + CH) → /eu, Canada + Latin America → US content at ekin.com/..., everyone else → EU content at ekin.com/....
- Shared: /api (forms → Mint, careers → Bloom), vercel.json, env vars.
- Not deployed: /eu/api, /eu/lib, /eu/uploads, /eu/docs, /eu/scraps, all Traffic pages (both sites).

## Updating the EU site
1. Make the change in the Ekin EU project.
2. In this project ask: "EU'yu senkronla" — the EU html/js/assets/images are re-copied into /eu.
3. Push this project.

## Manuals (QR codes) — no deploy needed
- Blob store: ekin-manuals (public), connected to the project with env prefix MANUALS (MANUALS_READ_WRITE_TOKEN).
- Upload to: manuals/<product>/<country>/<lang>/<any-name>.pdf  — e.g. manuals/bike-patrol/us/en/v1.0.261126.pdf
  (English may also sit directly in manuals/<product>/<country>/).
- QR address: https://ekin.com/manual/<product>/<country>/<lang> → 307 → newest PDF in that folder (versioned name visible).
- New version: upload the new file into the same folder. The QR opens the newest automatically.
- Every /manuals/ response gets X-Robots-Tag: noindex. Country routing never touches /manual/ or /manuals/.
- Fallback when nothing is in Blob: /manuals/<product>/<country>/<lang>.pdf bundled in the site (patrol-g2/my/en.pdf).
