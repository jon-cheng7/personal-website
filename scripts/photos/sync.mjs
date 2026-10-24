// scripts/photos/sync — one command keeps the site in step with the masters folder.
// add / replace / delete a file in PHOTOS_MASTERS_DIR → `pnpm photos` → encodes only what changed,
// uploads, prunes removed/stale variants, rewrites content/photos/manifest.json (commit that).
// Flags: --dry (plan only) · --force (re-encode everything)
// Keys: photos/<id>/<version>/<width>.<fmt> · version = hash(master bytes + encode settings) → immutable URLs.

import { readFile, readdir, writeFile, mkdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

try { process.loadEnvFile(".env.local"); } catch {}

const { config, encodeSettings } = await import("./config.mjs");
const { readMeta } = await import("./meta.mjs");
const { encode } = await import("./variants.mjs");
const { createStore } = await import("./store.mjs");

const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");

const sha = (x) => createHash("sha256").update(x).digest("hex").slice(0, 12);
/** filename → url-safe id ("DSC01234 copy.jpg" → "dsc01234-copy") */
const toId = (file) => path.parse(file).name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** run fn over items, n at a time */
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

// --- inputs ---
const { mastersDir, keyPrefix, manifestFile } = config;
if (!mastersDir) throw new Error("photos: set PHOTOS_MASTERS_DIR in .env.local");
if (!(await stat(mastersDir).catch(() => null))?.isDirectory()) throw new Error(`photos: masters folder not found: ${mastersDir}`);

const files = (await readdir(mastersDir))
  .filter((f) => !f.startsWith(".") && config.exts.includes(path.extname(f).toLowerCase()))
  .sort();
// guard: empty folder would prune the whole gallery
if (!files.length) throw new Error(`photos: no images in ${mastersDir} — refusing to sync (would delete everything)`);

const ids = new Map();
for (const f of files) {
  const id = toId(f);
  if (ids.has(id)) throw new Error(`photos: "${f}" and "${ids.get(id)}" map to the same id "${id}" — rename one`);
  ids.set(id, f);
}

const prev = JSON.parse(await readFile(manifestFile, "utf8").catch(() => "{}"));
const prevById = new Map((prev.photos ?? []).map((p) => [p.id, p]));
const settingsHash = sha(JSON.stringify(encodeSettings(config)));
const store = await createStore(config);

console.log(`photos: ${files.length} masters → ${store.label}${DRY ? " [dry run]" : ""}`);

// --- per photo ---
const counts = { added: 0, updated: 0, unchanged: 0 };
const photos = await pool(files, config.concurrency, async (file) => {
  const abs = path.join(mastersDir, file);
  const id = toId(file);
  const version = sha(sha(await readFile(abs)) + settingsHash);
  const base = `${keyPrefix}/${id}/${version}`;
  const old = prevById.get(id);

  // unchanged: same bytes + settings, and still present in the store
  if (!FORCE && old?.version === version && (await store.has(`${base}/${old.widths.at(-1)}.avif`))) {
    counts.unchanged++;
    return old;
  }

  const status = old ? "updated" : "added";
  counts[status]++;
  if (DRY) { console.log(`  ${status.padEnd(9)} ${id}`); return old ?? null; }

  const t = Date.now();
  const [v, meta] = await Promise.all([encode(abs, config), readMeta(abs, config)]);
  for (const f of v.files) await store.put(`${base}/${f.name}`, f.buffer, f.contentType);
  const kb = Math.round(v.files.reduce((s, f) => s + f.buffer.length, 0) / 1024);
  console.log(`  ${status.padEnd(9)} ${id}  ${v.widths.length} sizes · ${kb} KB · ${((Date.now() - t) / 1000).toFixed(1)}s`);

  return {
    id,
    version,
    file,
    width: v.width,
    height: v.height,
    widths: v.widths,
    formats: Object.keys(config.formats),
    color: v.color,
    placeholder: v.placeholder,
    ...meta,
  };
});

// --- prune: anything in the store not referenced by this manifest ---
const keep = new Set(photos.filter(Boolean).map((p) => `${keyPrefix}/${p.id}/${p.version}/`));
const stale = (await store.list(`${keyPrefix}/`)).filter((k) => ![...keep].some((pre) => k.startsWith(pre)));
const removedIds = [...prevById.keys()].filter((id) => !ids.has(id));
for (const id of removedIds) console.log(`  removed   ${id}`);

if (DRY) {
  console.log(`photos: [dry] +${counts.added} ~${counts.updated} =${counts.unchanged} −${removedIds.length} · ${stale.length} stale files`);
  process.exit(0);
}
if (stale.length) await store.remove(stale);

// --- manifest: newest first, undated last ---
const list = photos.filter(Boolean).sort((a, b) => (b.takenAt ?? "").localeCompare(a.takenAt ?? "") || a.id.localeCompare(b.id));
await mkdir(path.dirname(manifestFile), { recursive: true });
await writeFile(manifestFile, JSON.stringify({ keyPrefix, photos: list }, null, 2) + "\n");

const noGeo = list.filter((p) => !p.geo).length;
console.log(
  `photos: +${counts.added} ~${counts.updated} =${counts.unchanged} −${removedIds.length} · pruned ${stale.length} files · ` +
  `${list.length} in manifest (${noGeo} without geo)`,
);
