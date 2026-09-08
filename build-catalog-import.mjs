import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(fileURLToPath(import.meta.url));
const read = (file) => readFile(join(root, file), "utf8");
const manifest = JSON.parse(await read("data/catalogue-import/manifest.json"));
const decisions = JSON.parse(await read("data/catalogue-import/identity-decisions.json"));
const profiles = JSON.parse(await read("data/catalogue-import/profiles.json"));
const listing = (await read("data/catalogue-import/listing.tsv")).trim().split(/\r?\n/).slice(1).map((line) => {
  const [page, slug, name] = line.split("\t");
  return { page: Number(page), slug, name, reference: slug.split("-")[0], url: `https://kokopelli-semences.fr/fr/p/${slug}` };
});
if (listing.length !== manifest.advertisedProductCount || new Set(listing.map((item) => item.reference)).size !== listing.length) throw new Error("Listing count or duplicate reference mismatch");
for (const page of manifest.pages) if (listing.filter((item) => item.page === page.page).length !== page.productCount) throw new Error(`Incomplete page ${page.page}`);

const context = vm.createContext({ window: {} });
vm.runInContext(await read("seed-catalog.js"), context);
// The original curated catalogue remains the base. Re-running the build never
// duplicates an imported row and never replaces the earlier botanical review.
const base = JSON.parse(JSON.stringify(context.window.SEED_CATALOG.filter((entry) => !entry.importedFrom)));
const baselineIds = new Set(base.map((entry) => entry.id));
const maxBaseIndex = Math.max(...base.map((entry) => Number(entry.catalogIndex) || 0));
const normalize = (value) => String(value || "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replaceAll("œ", "oe").replaceAll("æ", "ae").replace(/[^\p{L}\p{N}]/gu, "");
const names = (entry) => [entry.name, ...(entry.aliases || [])].filter(Boolean).map(normalize);
const matches = (name) => {
  const exact = base.filter((entry) => normalize(entry.name) === normalize(name));
  if (exact.length) return exact;
  const tokens = [name, ...name.split(" / ")].map(normalize);
  return base.filter((entry) => names(entry).some((key) => tokens.includes(key)));
};
const colorLabels = { red: "rouge", pink: "rose", orange: "orange", yellow: "jaune", green: "vert", purple: "pourpre", brown: "brun / acajou", cream: "blanc / crème", anthocyanin: "pigmentation bleu-violet" };
const shapeLabels = { poivron: "Fruit lobé creux, de type poivron", rond: "Fruit rond", aplati: "Fruit aplati", beefsteak: "Fruit charnu de type beefsteak", "côtelé": "Fruit côtelé", "allongé": "Fruit allongé", prune: "Fruit de type prune", "cœur": "Fruit cordiforme", poire: "Fruit en poire", ovale: "Fruit ovale", variable: "Forme variable selon le fruit ou le lot" };
const habits = { I: ["Indéterminée", "indeterminate"], D: ["Déterminée", "déterminée"], S: ["Déterminée", "semi-determinate"], B: ["Bush", "déterminée"], WI: ["Dwarf", "indeterminate"], WD: ["Dwarf", "déterminée"], WS: ["Dwarf", "semi-determinate"], WU: ["Dwarf", ""], M: ["Micro-naine", "déterminée"], U: ["Indéterminée", ""] };
const growthLabels = { indeterminate: "Indéterminée", "déterminée": "Déterminée", "semi-determinate": "Semi-déterminée", "": "Non documentée" };
const missing = /non (?:document|précis|chiffr|établi)|inconnue?|à confirmer/i;
const sourceTitle = (url) => {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const titles = { "tomatofifou.com": "Tomatofifou", "victoryseeds.com": "Victory Seed Company", "kokopelli-semences.com": "Fiche du fournisseur", "kokopelli-semences.fr": "Fiche du fournisseur", "tatianastomatobase.com": "Tatiana’s TOMATObase", "semeur.fr": "Semeur", "johnnyseeds.com": "Johnny’s Selected Seeds", "seedsavers.org": "Seed Savers Exchange", "shop.seedsavers.org": "Seed Savers Exchange" };
  return titles[host] || host;
};
function fruitSize(profile) {
  if (/cerise|cherry/i.test(profile.weight)) return "cerise";
  const weights = profile.weight.match(/\d+(?:[.,]\d+)?(?=\s*(?:à|–|-|g\b))/g)?.map((value) => Number(value.replace(",", "."))) || [];
  if (/\d\s*g\b/.test(profile.weight) && weights.length) {
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
    return avg < 50 ? "petit" : avg <= 200 ? "moyen" : "gros";
  }
  if (/beefsteak/.test(profile.shape)) return "gros";
  return "";
}
function makeEntry(item, profile, ordinal) {
  for (const key of ["growth", "shape", "weight", "height", "maturity", "leaf", "origin", "description"]) if (!String(profile[key] || "").trim()) throw new Error(`${item.reference}: empty ${key}`);
  if (!habits[profile.growth] || !shapeLabels[profile.shape]) throw new Error(`${item.reference}: invalid habit or shape`);
  if (!profile.sources?.length || profile.sources.some((url) => !/^https?:\/\//.test(url))) throw new Error(`${item.reference}: undocumented profile`);
  if (profile.colors.some((color) => !colorLabels[color]) || profile.colors.length > 3) throw new Error(`${item.reference}: invalid colors`);
  const [subfamily, growth] = habits[profile.growth];
  const fruitType = /cerise|cherry/i.test(profile.weight) ? "Cerise / cocktail" : shapeLabels[profile.shape];
  const missingFields = Object.entries({ hauteur: profile.height, calibre: profile.weight, origine: profile.origin, feuillage: profile.leaf }).filter(([, value]) => missing.test(value)).map(([key]) => key);
  if (!profile.daysFromTransplant) missingFields.push("délai chiffré depuis plantation");
  if (!profile.breeder) missingFields.push("obtenteur");
  const refs = [...new Set([item.url, ...profile.sources])];
  const note = [
    `Référence relevée sur la page ${item.page} du catalogue demandé le 7 septembre 2026. Description reformulée à partir des références citées ; les informations commerciales ne sont pas des résultats d’essai.`,
    profile.note,
    missingFields.length ? `Non établis précisément : ${missingFields.join(", ")}. Aucune valeur manquante n’est inventée.` : "",
    ["conflicting", "identity"].includes(profile.status) ? "Les divergences ou l’identité de la souche demandent confirmation sur le lot de graines." : "",
    profile.growth === "U" ? "Le filtre Indéterminée est provisoire, faute de croissance documentée." : "",
  ].filter(Boolean).join(" ");
  return {
    id: `catalog-ref-${item.reference}`,
    catalogIndex: maxBaseIndex + ordinal + 1,
    family: "Tomate (Solanum lycopersicum)", subfamily, name: item.name,
    aliases: [...new Set(profile.aliases || [])].filter((alias) => normalize(alias) !== normalize(item.name)),
    details: {
      description_histoire_particularités: profile.description,
      fruit: profile.fruit || `${shapeLabels[profile.shape]} ; ${profile.colors.map((color) => colorLabels[color]).join(" / ") || "couleur non documentée"}. Calibre indicatif : ${profile.weight}.`,
      type_de_fruit: fruitType,
      gènes_potentiels: "",
      taille: profile.height, maturité: profile.maturity,
      croissance: growthLabels[growth], origine: profile.origin, feuillage: profile.leaf,
      calibre_du_fruit: profile.weight,
    },
    plantDefaults: { type: /ancienne?|heirloom|historique/i.test(profile.description) ? "heirloom" : "open", growth, colors: profile.colors, colorMode: profile.colors.length > 1 ? "gradient" : "solid", shape: profile.shape, size: fruitSize(profile), fruitType, breeder: profile.breeder || "Obtenteur non documenté", daysToMaturity: Number(profile.daysFromTransplant) || 0 },
    catalogRevision: 3,
    importedFrom: { catalogue: "catalogue-source-2026", reference: item.reference, page: item.page, url: item.url, importedAt: manifest.collectedAt },
    sourceRefs: [{ reference: item.reference, url: item.url, page: item.page }],
    verification: { checkedAt: manifest.collectedAt, status: profile.status || "partial", scope: ["description", "aspect du fruit", ...(growth ? ["croissance déclarée"] : []), "précocité déclarée"], note, missingFields, updatedFields: ["Nouvelle fiche documentaire"], sources: refs.map((url) => ({ title: `${sourceTitle(url)} — ${item.name}`, url })) },
  };
}
const catalogue = [...base];
const byRef = new Map();
const ledger = [];
for (const [ordinal, item] of listing.entries()) {
  if (decisions.excluded[item.reference]) {
    ledger.push({ ...item, status: "excluded", reason: decisions.excluded[item.reference] });
    continue;
  }
  if (decisions.aliases[item.reference]) continue;
  const explicit = decisions.existing[item.reference];
  const found = explicit ? base.filter((entry) => entry.id === explicit.catalogId) : matches(item.name);
  let entry = found[0];
  let status = "existing";
  if (!entry) {
    const profile = profiles[item.reference];
    if (!profile) { ledger.push({ ...item, status: "pending", reason: "Fiche de détails encore à documenter." }); continue; }
    // Exact aliases, never similarity or removal of strain/generation names.
    const candidates = catalogue.filter((current) => names(current).some((key) => [item.name, ...(profile.aliases || [])].map(normalize).includes(key)));
    if (candidates.length) { entry = candidates[0]; status = "alias"; }
    else { entry = makeEntry(item, profile, ordinal); catalogue.push(entry); status = "added"; }
  }
  byRef.set(item.reference, entry);
  entry.aliases = [...new Set([...(entry.aliases || []), item.name])].filter((alias) => normalize(alias) !== normalize(entry.name));
  entry.sourceRefs = [...(entry.sourceRefs || []).filter((ref) => ref.reference !== item.reference), { reference: item.reference, url: item.url, page: item.page }];
  entry.catalogRevision = 3;
  ledger.push({ ...item, status, catalogId: entry.id, reason: explicit?.reason || (status === "alias" ? "Synonyme exact déjà enregistré." : "") });
}
for (const item of listing.filter((row) => decisions.aliases[row.reference])) {
  const decision = decisions.aliases[item.reference];
  const entry = byRef.get(decision.reference);
  if (!entry) { ledger.push({ ...item, status: "pending", reason: "La fiche canonique du synonyme est encore à documenter." }); continue; }
  entry.aliases = [...new Set([...(entry.aliases || []), item.name])];
  entry.sourceRefs = [...(entry.sourceRefs || []).filter((ref) => ref.reference !== item.reference), { reference: item.reference, url: item.url, page: item.page }];
  byRef.set(item.reference, entry);
  ledger.push({ ...item, status: "alias", catalogId: entry.id, reason: decision.reason });
}
for (const entry of catalogue) entry.details.gènes_potentiels = "";
if (new Set(catalogue.map((entry) => entry.id)).size !== catalogue.length) throw new Error("Duplicate catalogue IDs");
const newlyAdded = catalogue.filter((entry) => !baselineIds.has(entry.id));
for (const entry of newlyAdded) if (catalogue.some((other) => other.id !== entry.id && normalize(other.name) === normalize(entry.name))) throw new Error(`Duplicate new name ${entry.name}`);
ledger.sort((a, b) => listing.findIndex((item) => item.reference === a.reference) - listing.findIndex((item) => item.reference === b.reference));
const summary = {
  collectedAt: manifest.collectedAt, listingUrl: manifest.catalogueUrl,
  pagesRead: manifest.pages.length, listed: listing.length,
  added: newlyAdded.length,
  existing: ledger.filter((item) => item.status === "existing").length,
  aliases: ledger.filter((item) => item.status === "alias").length,
  excluded: ledger.filter((item) => item.status === "excluded").length,
  pending: ledger.filter((item) => item.status === "pending").length,
  total: catalogue.length,
};
const header = "/* Catalogue de référence — données documentaires, champs incertains explicités.\n * Génération : node build-catalog-import.mjs ; détails dans data/catalogue-import/. */\n";
await writeFile(join(root, "seed-catalog.js"), `${header}window.SEED_CATALOG_IMPORT = ${JSON.stringify(summary, null, 2)};\nwindow.SEED_CATALOG = ${JSON.stringify(catalogue, null, 2)};\n`);
await writeFile(join(root, "data/catalogue-import/progress.json"), JSON.stringify({ ...summary, entries: ledger }, null, 2) + "\n");
await mkdir(join(root, "docs"), { recursive: true });
const label = { added: "Ajoutée", existing: "Déjà présente", alias: "Synonyme rattaché", excluded: "Écartée", pending: "À documenter" };
const md = [
  "# Enrichissement du catalogue de référence", "", "**Relevé du 7 septembre 2026.**", "",
  `Source demandée : [1](${manifest.catalogueUrl}).`, "",
  `**${summary.pagesRead} pages parcourues, ${summary.listed} références relevées : ${summary.added} nouvelles fiches, ${summary.existing} déjà présentes, ${summary.aliases} synonymes rattachés et ${summary.excluded} mélange écarté.**`, "",
  summary.pending ? `**Travail non terminé : ${summary.pending} références restent à documenter avant ajout.** Elles sont listées ci-dessous et ne sont pas présentées comme vérifiées.` : "**Toutes les références du relevé ont été traitées.** Les caractéristiques absentes ou contradictoires sont explicitement signalées ; cela n’équivaut pas à une certification botanique de tous les lots.", "",
  "- Les gènes potentiels restent vides sur toutes les fiches.",
  "- Les noms de souches, couleurs distinctes et générations ne sont pas effacés pour obtenir un rapprochement approximatif.",
  "- Les anciennes fiches, notes, plantes, récoltes, photos et stocks personnels ne sont pas remplacés par cet ajout de références.",
  "- Les doublons potentiels déjà présents dans le catalogue de départ ne sont pas fusionnés sans contrôle des liens personnels. Aucun doublon de nom n’est ajouté.",
  "- Les profils proviennent de fiches publiques et d’extraits indexés, reformulés sans avis clients, tarifs ni promesses de rendement. Certaines références ne sont pas indépendantes du fournisseur.",
  "- Une donnée indisponible est marquée « non documentée », jamais remplacée par une hauteur, une origine ou une durée inventée. Une durée non rapportée explicitement à la plantation n’est pas utilisée comme telle dans le calendrier.",
  "- L’ajout concerne le catalogue de référence, pas des achats ni des quantités de graines possédées.", "",
  "## Contrôle page par page", "", "| Page | Références | Ajoutées | Présentes | Synonymes | Écartées | À documenter |", "| ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...manifest.pages.map((page) => `| [${page.page}](${page.url}) | ${page.productCount} | ${["added", "existing", "alias", "excluded", "pending"].map((status) => ledger.filter((item) => item.page === page.page && item.status === status).length).join(" | ")} |`), "",
  "## Correspondances et décisions", "", "| Page | Référence | Variété | Traitement | Fiche / motif |", "| ---: | --- | --- | --- | --- |",
  ...ledger.map((item) => `| ${item.page} | [${item.reference}](${item.url}) | ${item.name.replaceAll("|", "\\|")} | ${label[item.status]} | ${item.catalogId ? `[${item.catalogId}](verification-catalogue.md#${item.catalogId})` : ""}${item.reason ? ` — ${item.reason}` : ""} |`), "",
  "Les sources de chaque nouvelle fiche figurent aussi dans le [rapport documentaire complet](verification-catalogue.md) et dans l’application.", "",
];
await writeFile(join(root, "docs/enrichissement-catalogue.md"), md.join("\n"));
console.log(summary);
