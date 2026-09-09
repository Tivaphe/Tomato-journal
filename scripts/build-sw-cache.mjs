import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shellFiles = [
  "index.html",
  "src/styles.css",
  "src/app.js",
  "src/photo-storage.js",
  "src/seed-catalog.js",
  "docs/verification-catalogue.md",
  "docs/enrichissement-catalogue.md",
  "assets/manifest.webmanifest",
  "assets/icon-192.png",
  "assets/icon-512.png",
];
const hash = createHash("sha256");
for (const file of shellFiles) hash.update(await readFile(join(root, file)));
const version = hash.digest("hex").slice(0, 12);
const cacheName = `tomato-journal-shell-${version}`;
const appShell = ["./", ...shellFiles.map((file) => `./${file}`)];
const serviceWorker = `const CACHE_NAME = ${JSON.stringify(cacheName)};
const APP_SHELL = ${JSON.stringify(appShell, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
  );
});
`;
await writeFile(join(root, "sw.js"), serviceWorker);

// Le README cite le cache courant : on le met à jour pour éviter le décalage
// de documentation (vérifié ensuite par scripts/check-consistency.mjs).
const readmePath = join(root, "README.md");
const readme = await readFile(readmePath, "utf8");
const updatedReadme = readme.replace(/tomato-journal-shell-[0-9a-f]{12}/g, cacheName);
if (updatedReadme !== readme) {
  await writeFile(readmePath, updatedReadme);
  console.log("README.md : nom du cache mis à jour");
}
console.log(`${cacheName} (${shellFiles.length} shell assets)`);
