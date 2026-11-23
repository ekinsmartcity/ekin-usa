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
