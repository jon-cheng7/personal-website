// scripts/photos/store — where variants live. Same interface for both targets:
//   has(key) · put(key, buffer, contentType) · list(prefix) → keys · remove(keys)
// local → public/photos-cdn/<key> (dev, gitignored) · r2 → Cloudflare R2 via S3 API (prod).

import { mkdir, writeFile, access, readdir, unlink, rm } from "node:fs/promises";
import path from "node:path";

/** pick store by config.target */
export async function createStore(config) {
  if (config.target === "r2") return r2Store(config);
  if (config.target === "local") return localStore(config);
  throw new Error(`photos: unknown PHOTOS_TARGET "${config.target}" (local | r2)`);
}

function localStore({ localDir }) {
  const abs = (key) => path.join(localDir, ...key.split("/"));
  return {
    label: `local (${localDir})`,
    has: (key) => access(abs(key)).then(() => true, () => false),
    async put(key, buffer) {
      await mkdir(path.dirname(abs(key)), { recursive: true });
      await writeFile(abs(key), buffer);
    },
    async list(prefix) {
      const root = abs(prefix);
      const entries = await readdir(root, { recursive: true, withFileTypes: true }).catch(() => []);
      return entries
        .filter((e) => e.isFile())
        .map((e) => path.relative(localDir, path.join(e.parentPath ?? e.path, e.name)).split(path.sep).join("/"));
    },
    async remove(keys) {
      const dirs = new Set();
      for (const k of keys) {
        await unlink(abs(k)).catch(() => {});
        dirs.add(path.dirname(abs(k)));
      }
      // tidy emptied version dirs (+ id dirs)
      for (const d of dirs) {
        await rm(d, { recursive: false }).catch(() => {});
        await rm(path.dirname(d), { recursive: false }).catch(() => {});
      }
    },
  };
}

async function r2Store({ cacheControl }) {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  const missing = Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET }).filter(([, v]) => !v);
  if (missing.length) throw new Error(`photos: missing env ${missing.map(([k]) => k).join(", ")}`);

  const s3 = await import("@aws-sdk/client-s3");
  const client = new s3.S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  const Bucket = R2_BUCKET;

  return {
    label: `r2 (${Bucket})`,
    has: (Key) => client.send(new s3.HeadObjectCommand({ Bucket, Key })).then(() => true, () => false),
    put: (Key, Body, ContentType) =>
      client.send(new s3.PutObjectCommand({ Bucket, Key, Body, ContentType, CacheControl: cacheControl })),
    async list(Prefix) {
      const keys = [];
      let ContinuationToken;
      do {
        const r = await client.send(new s3.ListObjectsV2Command({ Bucket, Prefix, ContinuationToken }));
        keys.push(...(r.Contents ?? []).map((o) => o.Key));
        ContinuationToken = r.IsTruncated ? r.NextContinuationToken : undefined;
      } while (ContinuationToken);
      return keys;
    },
    async remove(keys) {
      for (let i = 0; i < keys.length; i += 1000) {
        const Objects = keys.slice(i, i + 1000).map((Key) => ({ Key }));
        await client.send(new s3.DeleteObjectsCommand({ Bucket, Delete: { Objects, Quiet: true } }));
      }
    },
  };
}
