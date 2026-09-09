/* Collecte des fiches Tomatofifou dans data/enrichissement-2026/tomatofifou/.
 *
 *   npm run collect:tomatofifou -- --verify 25   # sonder 25 fiches, sans rien écrire
 *   npm run collect:tomatofifou                  # listing puis fiches manquantes
 *   npm run collect:tomatofifou -- --limit 100   # borné, pour une première passe
 *   npm run collect:tomatofifou -- --fresh       # repartir de zéro
 *
 * Le collecteur ne visite jamais une fiche dont le nom (ou un synonyme déclaré)
 * existe déjà dans src/seed-catalog.js : elle est simplement déclarée comme
 * variété connue dans identity-decisions.json, ce qui évite des milliers de
 * requêtes inutiles et garantit l'absence de doublon.
 *
 * Les voisinages incertains (« 1884 » / « 1884 Purple ») ne sont jamais
 * fusionnés : ils sont listés dans identity-review.json pour relecture.
 *
 * Les données collectées ne modifient pas le catalogue : lancer ensuite
 *   npm run build:enrich && npm run build:catalog
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import {
  CATEGORY_URL,
  PAGE_URL_TEMPLATE,
  PRODUCT_URL_TEMPLATE,
  SOURCE,
  findKnownEntry,
  findNeighbours,
  normalizeName,
  parseListingPage,
  parseProductPage,
  toProfile,
} from "./lib/tomatofifou.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Map(process.argv.slice(2).map((arg, index, all) => [arg.replace(/^--/, ""), all[index + 1]]));
const outDir = args.get("out") ? join(root, args.get("out")) : join(root, "data", "enrichissement-2026", SOURCE);
// --fixture <dir> rejoue des pages déjà enregistrées : utile pour revalider
// l'analyse sans solliciter le site, et pour les tests.
const FIXTURE = args.get("fixture") ? join(root, args.get("fixture")) : "";
const flag = (name) => args.has(name);
const numberOption = (name, fallback) => {
  const raw = Number(args.get(name));
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

const LIMIT = numberOption("limit", Infinity);
const VERIFY = flag("verify") ? numberOption("verify", 20) : 0;
const DELAY = numberOption("delay", 700);
const FRESH = flag("fresh");
const ONLY_LISTING = flag("only-listing");
const collectedAt = new Date().toISOString().slice(0, 10);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (message) => process.stdout.write(`${message}\n`);

async function get(url) {
  if (FIXTURE) {
    const slug = url.match(/\/produit\/([^/?]+)/)?.[1];
    const page = url.match(/\/page\/(\d+)\/$/)?.[1];
    const file = join(FIXTURE, slug ? `produit-${slug}.html` : `page-${page || 1}.html`);
    return readFile(file, "utf8");
  }
  const response = await fetch(url, {
    headers: { "user-agent": "TomatoJournal/1.0 (catalogue documentaire local; contact: dépôt GitHub)", accept: "text/html" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

// Trois tentatives : sur 3 000 fiches, une connexion perdue ne doit pas
// interrompre toute la collecte.
async function getWithRetry(url) {
  let last = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await get(url);
    } catch (error) {
      last = error;
      await sleep(DELAY * (attempt + 2));
    }
  }
  throw last;
}

function networkHint(error) {
  const reason = String(error?.cause?.code || error?.message || error);
  if (/ECONNRESET|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|fetch failed/i.test(reason)) {
    return `Impossible de joindre le site (${reason}). Le collecteur doit être lancé depuis une machine qui a accès à Internet ; la vérification hors ligne reste possible avec --fixture tests/fixtures/tomatofifou.`;
  }
  return reason;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(join(outDir, file), "utf8"));
  } catch {
    return fallback;
  }
}

/* --- Catalogue courant (source de vérité pour la déduplication) ------------- */
const seedContext = vm.createContext({ window: {} });
vm.runInContext(await readFile(join(root, "src", "seed-catalog.js"), "utf8"), seedContext);
const catalogue = seedContext.window.SEED_CATALOG;
console.log(`Catalogue de référence : ${catalogue.length} fiches.`);

await mkdir(outDir, { recursive: true });
const existingProfiles = FRESH ? {} : await readJson("profiles.json", {});
const decisions = FRESH ? { excluded: {}, aliases: {}, existing: {} } : await readJson("identity-decisions.json", { excluded: {}, aliases: {}, existing: {} });

/* --- 1. Listing ------------------------------------------------------------- */
let listing = [];
let manifest = FRESH ? null : await readJson("manifest.json", null);
if (manifest && !FRESH) {
  const rows = (await readFile(join(outDir, "listing.tsv"), "utf8")).trim().split(/\r?\n/).slice(1);
  listing = rows.map((line) => { const [page, slug, name] = line.split("\t"); return { page: Number(page), slug, name }; });
  console.log(`Listing repris depuis le disque : ${listing.length} fiches.`);
} else {
  console.log("Collecte du listing…");
  const pages = [];
  try {
  for (let page = 1; ; page += 1) {
    const url = page === 1 ? CATEGORY_URL : PAGE_URL_TEMPLATE.replace("{page}", String(page));
    const html = await getWithRetry(url);
    const { items, total } = parseListingPage(html, page);
    if (!items.length) break;
    pages.push({ page, url, productCount: items.length });
    listing.push(...items);
    process.stdout.write(`  page ${page} · ${listing.length}${total ? ` / ${total}` : ""}\r`);
    if (pages.length >= 400 || (total && listing.length >= total)) break;
    await sleep(DELAY);
  }
  } catch (error) {
    console.error(`\n${networkHint(error)}`);
    process.exit(1);
  }
  console.log(`\nListing collecté : ${listing.length} fiches sur ${pages.length} pages.`);
  manifest = {
    catalogueUrl: CATEGORY_URL,
    pageUrlTemplate: PRODUCT_URL_TEMPLATE,
    listingUrlTemplate: PAGE_URL_TEMPLATE,
    collectedAt,
    notes: "Boutique WooCommerce. 15 fiches par page, pagination /page/N/. Chaque fiche produit expose un tableau « Caractéristiques » (calibre, couleur, forme, précocité, climat, feuillage, croissance, origine, hauteur) utilisé tel quel. Une partie des fiches est purement informative (catégorie « Non Disponible ») : la mention est reportée dans la note documentaire.",
    advertisedProductCount: listing.length,
    pages,
  };
  await writeFile(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  await writeFile(join(outDir, "listing.tsv"), ["page\tslug\tname", ...listing.map((item) => `${item.page}\t${item.slug}\t${item.name}`)].join("\n") + "\n");
}

if (ONLY_LISTING) {
  console.log("Arrêt après le listing (--only-listing).");
  process.exit(0);
}

/* --- 2. Fiches produit ------------------------------------------------------ */
const known = [];
const review = [];
const todo = [];
for (const item of listing) {
  if (decisions.excluded[item.slug]) continue;
  const match = findKnownEntry(catalogue, item.name);
  if (match) {
    decisions.existing[item.slug] = { catalogId: match.id, reason: `Déjà présente dans le catalogue sous « ${match.name} ».` };
    known.push(item.slug);
    continue;
  }
  const neighbours = findNeighbours(catalogue, item.name);
  if (neighbours.length) review.push({ slug: item.slug, name: item.name, neighbours });
  todo.push(item);
}

console.log(`Déjà au catalogue : ${known.length} · à documenter : ${todo.length} · à relire (noms voisins) : ${review.length}.`);
await writeFile(join(outDir, "identity-decisions.json"), JSON.stringify(decisions, null, 2) + "\n");
await writeFile(join(outDir, "identity-review.json"), JSON.stringify({ generatedAt: collectedAt, note: "Noms voisins non fusionnés : cultivars distincts à confirmer par un humain.", entries: review }, null, 2) + "\n");

const queue = todo.filter((item) => !existingProfiles[item.slug] || FRESH).slice(0, VERIFY || LIMIT);
if (VERIFY) console.log(`Sondage de ${queue.length} fiche(s) — aucune écriture.`);

const failures = [];
const fieldStats = {};
let done = 0;
for (const item of queue) {
  const url = PRODUCT_URL_TEMPLATE.replace("{slug}", item.slug);
  try {
    const html = await getWithRetry(url);
    const product = parseProductPage(html);
    const profile = toProfile(product, { url, page: item.page, collectedAt });
    for (const [field, value] of Object.entries(profile)) {
      fieldStats[field] = fieldStats[field] || { filled: 0, total: 0 };
      fieldStats[field].total += 1;
      if (Array.isArray(value) ? value.length : String(value ?? "").trim()) fieldStats[field].filled += 1;
    }
    if (!VERIFY) existingProfiles[item.slug] = profile;
    done += 1;
    process.stdout.write(`  ${done}/${queue.length} · ${item.name}\r`);
    // Sauvegarde régulière : une collecte interrompue ne perd pas le travail.
    if (!VERIFY && done % 25 === 0) {
      await writeFile(join(outDir, "profiles.json"), JSON.stringify(existingProfiles, null, 2) + "\n");
      await writeFile(join(outDir, "progress.json"), JSON.stringify({ catalogueUrl: CATEGORY_URL, collectedAt, listed: listing.length, known: known.length, profiles: Object.keys(existingProfiles).length, pending: todo.length - Object.keys(existingProfiles).length }, null, 2) + "\n");
    }
  } catch (error) {
    failures.push({ slug: item.slug, name: item.name, url, reason: String(error?.message || error) });
  }
  await sleep(DELAY);
}
console.log(`\n${done} fiche(s) analysée(s), ${failures.length} en échec.`);

await writeFile(
  join(outDir, "progress.json"),
  JSON.stringify(
    { catalogueUrl: CATEGORY_URL, collectedAt, listed: listing.length, known: known.length, profiles: Object.keys(existingProfiles).length, pending: todo.length - Object.keys(existingProfiles).length, failures, fieldStats },
    null,
    2,
  ) + "\n",
);
if (!VERIFY) await writeFile(join(outDir, "profiles.json"), JSON.stringify(existingProfiles, null, 2) + "\n");

if (failures.length) {
  console.log("\nÉchecs (à corriger avant une collecte complète) :");
  failures.slice(0, 15).forEach((failure) => console.log(`  - ${failure.name} · ${failure.reason}`));
}
if (VERIFY) {
  console.log("\nTaux de remplissage par champ :");
  for (const [field, stats] of Object.entries(fieldStats)) {
    if (stats.total) console.log(`  ${field.padEnd(18)} ${Math.round((stats.filled / stats.total) * 100)} %`);
  }
  process.exitCode = failures.length ? 1 : 0;
}
