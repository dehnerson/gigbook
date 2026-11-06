# Gigbook

Song library, setlists, and jam rooms.

```bash
vp install
vp dev
```

UI strings live in `messages/en.json`. `messages/de.json` is the German catalog; missing keys fall back to English. `project.inlang/settings.json` tells Paraglide where those files are. `src/paraglide` is generated from them.

Vite+ runs Bun, the package manager this repo was created with. `bun.lock` is the lockfile `vp install` updates.

## Deploy

The server is built with Nitro, which picks the host's preset on its own (Netlify, Vercel, or a plain Node server in `.output/`). `netlify.toml` builds with `convex deploy`, which pushes the Convex functions and sets `VITE_CONVEX_URL` for that deployment before `vp build` runs.

Set these on the host: `CONVEX_DEPLOY_KEY` (from the Convex dashboard of the deployment to target), `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_JWT_ISSUER_DOMAIN`.

Set these on the Convex deployment itself (`vpx convex env set` or the dashboard): `CLERK_JWT_ISSUER_DOMAIN` and `AI_KEY_ENCRYPTION_SECRET`. Keep the encryption secret unchanged once people have saved AI keys; a new secret cannot decrypt the old ones.
