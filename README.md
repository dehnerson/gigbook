# Gigbook

Song library, setlists, and jam rooms.

## Ownership

A song is a folder: a title, a subtitle, and the versions people have chosen to keep together. It has no owner. A version has one owner, you or one band. You see a song when you can read at least one of its versions, and each screen lists only the versions you can read. A bandmate sees the band's chart and does not see your personal chart of the same song.

Copy clones a version onto that same song and leaves every setlist on the original. Move is that same clone, then a delete of the original, so the moved chart has a new id. Move is only available to the current owner. Copy to a band is only available to the current owner, and only into a band they can edit. Copy into your library is available for any version you can read. Moving a band chart to yourself makes the new row yours.

A setlist item, a jam room, a jam member's chosen chart, and a public share all store a version id. The new chart is in no setlist until someone adds it. The share link of the old chart stops working. An import draft aimed at the old chart has its target cleared by that same delete.

Anyone who can edit a version in the folder can rename the title and subtitle. The new name shows on every version in the folder. Creating from the library, or adding a version on the song page, makes a version you own. Creating from a band page makes a version that band owns. Picking an existing title joins the folder you can already see. A public share copy joins one of the copier's own visible songs with that exact title, or creates a new folder when they have none.

Two versions in one folder may share a name when they have different owners. A duplicate for the same owner still gets a distinct name.

Deleting a version removes that chart, its sections, and every setlist row that points at it. A jam room on that row lands on the chart that slides into its place. When the song has no versions left, the folder is deleted. When any version remains, the folder stays. A band delete removes the versions that band owns and the setlists of that band. Personal copies on the same song stay. An account delete removes personal versions and personal setlists. A band is deleted only when the user was its last member. Otherwise the next member becomes the owner, and band charts stay with the band.

The mark beside a version is how the screen shows this. A muted person glyph means the chart is yours. A band's two letters, on a hue taken from the band name, mean the chart belongs to that band. The song title has no mark.

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
