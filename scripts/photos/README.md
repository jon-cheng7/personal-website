# Photo pipeline

Masters folder → `pnpm photos` → sized AVIF/WebP on R2 + `content/photos/manifest.json` → `<Photo>`.

## Files
- `scripts/photos/sync.mjs`: entry point. Diffs the masters against the manifest, then encodes, uploads and prunes.
- `scripts/photos/config.mjs`: widths, quality, sharpening, privacy zones.
- `scripts/photos/meta.mjs`: reads EXIF/IPTC into manifest fields.
- `scripts/photos/variants.mjs`: sharp encoding.
- `scripts/photos/store.mjs`: storage (local folder or R2).
- `content/photos/manifest.json`: generated, commit it.
- `content/photos/overrides.json`: hand edits, no re-sync needed.
- `content/photos.ts`: data access and URLs.
- `components/ui/photo.tsx`: the `<Photo>` component.

## Day to day
| Want | Do |
|---|---|
| Add | Export from Lightroom into the masters folder → `pnpm photos` |
| Replace / re-edit | Re-export with the same filename (overwrite) → `pnpm photos` |
| Remove | Delete the file from masters → `pnpm photos` |
| Hide / feature / fix alt | `content/photos/overrides.json` → `{ "dsc01234": { "hidden": true } }` |
| Preview changes | `pnpm photos:dry` |
| Changed quality/widths | `pnpm photos`; everything re-encodes automatically |
| Something looks off | `pnpm photos --force` |

Then commit `content/photos/manifest.json` and deploy.

## Rules
- ID = filename, lowercased. Renaming a file makes it a new photo (new URL).
- Masters: JPEG/TIFF, sRGB, long edge ≥ 3840, Lightroom output sharpening off.
- An empty masters folder aborts the sync (so it never wipes the gallery).
- GPS: rounded in the manifest, removed inside `privateZones`, never in the image files.

## Env (`.env.local`)
```
PHOTOS_MASTERS_DIR=C:/Users/Jonat/Pictures/website-photos   # forward slashes
PHOTOS_TARGET=local            # or r2
NEXT_PUBLIC_PHOTOS_URL=/photos-cdn   # prod: https://img.joncheng.ca
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
```
