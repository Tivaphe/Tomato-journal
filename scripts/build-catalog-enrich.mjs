import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

// Enrichissement multi-sources du catalogue de référence.
// Chaque source vit dans data/enrichissement-2026/<source>/ avec :
//   manifest.json   -> { catalogueUrl, collectedAt, pages:[{page,url,productCount}], listed }
//   listing.tsv     -> page\tslug\tname  (slug = identifiant unique de la fiche produit)
//   profiles.json   -> { [reference]: { growth, colors, shape, weight, height, maturity,
//                          leaf, origin, description, fruit, sources[], breeder, aliases[],
//                          note, daysFromTransplant, status } }
//   identity-decisions.json -> { excluded:{}, aliases:{}, existing:{} }
// La base lue est le seed-catalog.js courant ; chaque passage est idempotent :
// ré-exécuter ne duplique jamais une entrée et ne réécrit jamais les fiches existantes.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcesDir = join(root, "data", "enrichissement-2026");
const { readdir } = await import("node:fs/promises");

const read = (file) => readFile(join(root, file), "utf8");
const normalize = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll("œ", "oe")
    .replaceAll("æ", "ae")
    .replace(/[^\p{L}\p{N}]/gu, "");
const context = vm.createContext({ window: {} });
vm.runInContext(await read("src/seed-catalog.js"), context);
const base = JSON.parse(JSON.stringify(context.window.SEED_CATALOG));
const baselineIds = new Set(base.map((entry) => entry.id));
const baselineNames = new Set(base.flatMap((entry) => [entry.name, ...(entry.aliases || [])].filter(Boolean).map(normalize)));
const maxIndex = Math.max(...base.map((entry) => Number(entry.catalogIndex) || 0));

const colorLabels = { red: "rouge", pink: "rose", orange: "orange", yellow: "jaune", green: "vert", purple: "pourpre", brown: "brun / acajou", cream: "blanc / crème", anthocyanin: "pigmentation bleu-violet" };
const shapeLabels = { poivron: "Fruit lobé creux, de type poivron", rond: "Fruit rond", aplati: "Fruit aplati", beefsteak: "Fruit charnu de type beefsteak", "côtelé": "Fruit côtelé", allongé: "Fruit allongé", prune: "Fruit de type prune", cœur: "Fruit cordiforme", poire: "Fruit en poire", ovale: "Fruit ovale", variable: "Forme variable selon le fruit ou le lot" };
const habits = { I: ["Indéterminée", "indeterminate"], D: ["Déterminée", "déterminée"], S: ["Déterminée", "semi-determinate"], B: ["Bush", "déterminée"], WI: ["Dwarf", "indeterminate"], WD: ["Dwarf", "déterminée"], WS: ["Dwarf", "semi-determinate"], WU: ["Dwarf", ""], M: ["Micro-naine", "déterminée"], U: ["Indéterminée", ""] };
const growthLabels = { indeterminate: "Indéterminée", déterminée: "Déterminée", "semi-determinate": "Semi-déterminée", "": "Non documentée" };
const missing = /non (?:document|précis|chiffr|établi)|inconnue?|à confirmer/i;
const sourceTitle = (url) => {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const titles = { "rareseeds.com": "Baker Creek Heirloom Seeds", "cultivetarue.fr": "Cultive ta rue", "merakiseeds.com": "Meraki Seeds", "tomatofifou.com": "Tomatofifou", "kokopelli-semences.fr": "Fiche du fournisseur" };
  return titles[host] || host;
};
function fruitSize(profile) {
  if (/cerise|cherry/i.test(profile.weight)) return "cerise";
  const weights = profile.weight.match(/\d+(?:[.,]\d+)?(?=\s*(?:à|–|-|g\b))/g)?.map((v) => Number(v.replace(",", "."))) || [];
  if (/\d\s*g\b/.test(profile.weight) && weights.length) {
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
    return avg < 50 ? "petit" : avg <= 200 ? "moyen" : "gros";
  }
  if (/beefsteak/.test(profile.shape)) return "gros";
  return "";
}

function makeEntry(source, ref, item, profile) {
  for (const key of ["growth", "shape", "weight", "height", "maturity", "leaf", "origin", "description"]) {
    if (!String(profile[key] || "").trim()) throw new Error(`${source}/${ref}: champ vide : ${key}`);
  }
  if (!habits[profile.growth] || !shapeLabels[profile.shape]) throw new Error(`${source}/${ref}: croissance ou forme invalide`);
  if (!profile.sources?.length || profile.sources.some((url) => !/^https?:\/\//.test(url))) throw new Error(`${source}/${ref}: sans source`);
  if (profile.colors.some((c) => !colorLabels[c]) || profile.colors.length > 3) throw new Error(`${source}/${ref}: couleurs invalides`);
  const [subfamily, growth] = habits[profile.growth];
  const fruitType = /cerise|cherry/i.test(profile.weight) ? "Cerise / cocktail" : shapeLabels[profile.shape];
  const missingFields = Object.entries({ hauteur: profile.height, calibre: profile.weight, origine: profile.origin, feuillage: profile.leaf }).filter(([, v]) => missing.test(v)).map(([k]) => k);
  if (!profile.daysFromTransplant) missingFields.push("délai chiffré depuis plantation");
  if (!profile.breeder) missingFields.push("obtenteur");
  const refs = [...new Set([item.url, ...profile.sources])];
  const note = [
    `Référence relevée sur la page ${item.page} du catalogue ${sourceTitle(item.url)} le ${item.collectedAt}. Description reformulée à partir des références citées ; les informations commerciales ne sont pas des résultats d’essai.`,
    profile.note,
    missingFields.length ? `Non établis précisément : ${missingFields.join(", ")}. Aucune valeur manquante n’est inventée.` : "",
    ["conflicting", "identity"].includes(profile.status) ? "Les divergences ou l’identité de la souche demandent confirmation sur le lot de graines." : "",
    profile.growth === "U" ? "Le filtre Indéterminée est provisoire, faute de croissance documentée." : "",
  ].filter(Boolean).join(" ");
  return {
    id: `catalog-ref-${source}-${ref}`,
    catalogIndex: maxIndex + indexCounter + 1,
    family: "Tomate (Solanum lycopersicum)",
    subfamily,
    name: item.name,
    aliases: [...new Set(profile.aliases || [])].filter((alias) => normalize(alias) !== normalize(item.name)),
    details: {
      description_histoire_particularités: profile.description,
      fruit: profile.fruit || `${shapeLabels[profile.shape]} ; ${profile.colors.map((c) => colorLabels[c]).join(" / ") || "couleur non documentée"}. Calibre indicatif : ${String(profile.weight).replace(/[.\s]+$/, "")}.`,
      type_de_fruit: fruitType,
      gènes_potentiels: "",
      taille: profile.height,
      maturité: profile.maturity,
      croissance: growthLabels[growth],
      origine: profile.origin,
      feuillage: profile.leaf,
      calibre_du_fruit: profile.weight,
    },
    plantDefaults: {
      type: /ancienne?|heirloom|historique/i.test(profile.description) ? "heirloom" : "open",
      growth,
      colors: profile.colors,
      colorMode: profile.colors.length > 1 ? "gradient" : "solid",
      shape: profile.shape,
      size: fruitSize(profile),
      fruitType,
      breeder: profile.breeder || "Obtenteur non documenté",
      daysToMaturity: Number(profile.daysFromTransplant) || 0,
    },
    catalogRevision: 3,
    importedFrom: { catalogue: `enrichissement-2026-${source}`, reference: ref, page: item.page, url: item.url, importedAt: item.collectedAt },
    sourceRefs: [{ reference: ref, url: item.url, page: item.page }],
    verification: {
      checkedAt: item.collectedAt,
      status: profile.status || "partial",
      scope: ["description", "aspect du fruit", ...(growth ? ["croissance déclarée"] : []), "précocité déclarée"],
      note,
      missingFields,
      updatedFields: ["Nouvelle fiche documentaire"],
      sources: refs.map((url) => ({ title: `${sourceTitle(url)} — ${item.name}`, url })),
    },
  };
}

const catalogue = [...base];
let indexCounter = 0;
const ledger = [];
const dirs = (await readdir(sourcesDir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
for (const source of dirs) {
  const sdir = join(sourcesDir, source);
  try {
    await readFile(join(sdir, "manifest.json"), "utf8");
  } catch {
    console.log(`Source ${source} : pas encore de manifeste, ignorée.`);
    continue;
  }
  const listingRaw = (await readFile(join(sdir, "listing.tsv"), "utf8")).trim();
  if (!listingRaw) {
    console.log(`Source ${source} : listing vide, ignorée.`);
    continue;
  }
  const manifest = JSON.parse(await readFile(join(sdir, "manifest.json"), "utf8"));
  const decisions = JSON.parse(await readFile(join(sdir, "identity-decisions.json"), "utf8"));
  const profiles = JSON.parse(await readFile(join(sdir, "profiles.json"), "utf8"));
  const listing = listingRaw.split(/\r?\n/).slice(1).map((line) => {
    const [page, slug, name] = line.split("\t");
    const url = (manifest.pageUrlTemplate || "{url}").replaceAll("{slug}", slug).replaceAll("{page}", page).replaceAll("{url}", manifest.catalogueUrl);
    return { page: Number(page), slug, name, reference: slug, url, collectedAt: manifest.collectedAt };
  });
  let added = 0;
  let existingCount = 0;
  const attach = (entry, item, reason) => {
    const keyName = normalize(item.name);
    if (![entry.name, ...(entry.aliases || [])].some((n) => normalize(n) === keyName)) {
      entry.aliases = [...(entry.aliases || []), item.name];
    }
    entry.sourceRefs = [...(entry.sourceRefs || []).filter((ref) => ref.reference !== item.reference), { reference: item.reference, url: item.url, page: item.page }];
    ledger.push({ source, ...item, status: "existing", catalogId: entry.id, reason });
  };
  const ownId = (ref) => `catalog-ref-${source}-${ref}`;
  for (const [ordinal, item] of listing.entries()) {
    item.ordinal = ordinal;
    const previous = catalogue.find((entry) => entry.id === ownId(item.reference));
    if (decisions.excluded[item.reference]) {
      if (previous) catalogue.splice(catalogue.indexOf(previous), 1);
      ledger.push({ source, ...item, status: "excluded", reason: decisions.excluded[item.reference] });
      continue;
    }
    if (decisions.existing[item.reference]) {
      const target = catalogue.find((entry) => entry.id === decisions.existing[item.reference].catalogId);
      if (previous && target?.id !== previous.id) catalogue.splice(catalogue.indexOf(previous), 1);
      if (target) {
        attach(target, item, decisions.existing[item.reference].reason || "Variété déjà présente sous ce nom.");
        existingCount += 1;
        continue;
      }
    }
    const profile = profiles[item.reference];
    if (!profile) {
      if (!previous) ledger.push({ source, ...item, status: "pending", reason: "Fiche de détails encore à documenter." });
      continue;
    }
    const built = makeEntry(source, item.reference, item, profile);
    if (previous) {
      // Les entrées d'enrichissement sont reconstruites sur place à chaque passe
      // pour répercuter les corrections des profils (croissance, couleurs, texte…).
      const kept = { id: previous.id, catalogIndex: previous.catalogIndex };
      catalogue[catalogue.indexOf(previous)] = { ...built, ...kept };
      added += 1;
      ledger.push({ source, ...item, status: "updated" });
      continue;
    }
    const key = normalize(item.name);
    const matched = catalogue.find((entry) => [entry.name, ...(entry.aliases || [])].some((n) => normalize(n) === key));
    if (matched) {
      attach(matched, item, "Nom déjà présent dans le catalogue.");
      existingCount += 1;
      continue;
    }
    catalogue.push(built);
    indexCounter += 1;
    baselineNames.add(key);
    added += 1;
    ledger.push({ source, ...item, status: "added" });
  }
  await writeFile(join(sdir, "progress.json"), JSON.stringify({ catalogueUrl: manifest.catalogueUrl, collectedAt: manifest.collectedAt, listed: listing.length, added, existing: existingCount, pending: ledger.filter((l) => l.status === "pending").length, entries: ledger }, null, 2) + "\n");
}

if (new Set(catalogue.map((entry) => entry.id)).size !== catalogue.length) throw new Error("Identifiants de catalogue en double");
for (const entry of catalogue) entry.details.gènes_potentiels = "";
const header = "/* Catalogue de référence — données documentaires, champs incertains explicités.\n * Génération : node scripts/build-catalog-enrich.mjs + node scripts/build-catalog-import.mjs ; détails dans data/. */\n";
await writeFile(join(root, "src/seed-catalog.js"), `${header}window.SEED_CATALOG_IMPORT = ${JSON.stringify(context.window.SEED_CATALOG_IMPORT || null, null, 2)};\nwindow.SEED_CATALOG = ${JSON.stringify(catalogue, null, 2)};\n`);
console.log(`Catalogue final : ${catalogue.length} fiches (${catalogue.length - base.length} ajoutées par l'enrichissement).`);
