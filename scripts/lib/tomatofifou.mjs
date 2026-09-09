/* Extraction et mise en forme des fiches Tomatofifou (cycle-en-terre, BE).
 *
 * Source : https://www.tomatofifou.com/categorie-produit/tomates/
 *   2 999 fiches, 15 par page, pagination /page/N/. Certaines fiches sont
 *   purement informatives (catégorie « Non Disponible ») : elles sont
 *   conservées, la mention est reportée dans la note documentaire.
 *
 * Chaque fiche produit expose un tableau « Caractéristiques » (calibre,
 * couleur, forme, précocité, climat, feuillage, croissance, origine, hauteur)
 * qui alimente directement les champs attendus par
 * scripts/build-catalog-enrich.mjs. Aucune valeur absente n'est inventée :
 * les champs manquants sont écrits comme tels et signalés dans la note.
 *
 * Ce module est sans accès réseau : il est testable hors ligne sur une
 * fixture HTML (tests/tomatofifou.test.mjs).
 */

export const SOURCE = "tomatofifou";
export const CATEGORY_URL = "https://www.tomatofifou.com/categorie-produit/tomates/";
export const PRODUCT_URL_TEMPLATE = "https://www.tomatofifou.com/produit/{slug}/";
export const PAGE_URL_TEMPLATE = "https://www.tomatofifou.com/categorie-produit/tomates/page/{page}/";

const NBSP = /[\u00a0\u202f]/g;

export function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll("œ", "oe")
    .replaceAll("æ", "ae")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function stripTags(html) {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8217;|&rsquo;/gi, "’")
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(NBSP, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Les noms du listing sont en capitales : on les remet en casse lisible.
export function titleCase(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (!/[A-ZÀ-Ý]/.test(text) || text !== text.toUpperCase()) return text;
  return text
    .toLowerCase()
    .split(/(\s+)/)
    .map((token) => (/\d/.test(token) && !/[a-zà-ÿ]/.test(token) ? token : token.replace(/^[\p{L}]/u, (letter) => letter.toUpperCase())))
    .join("");
}

/* --- Correspondances entre les libellés du site et le vocabulaire interne -- */

// Les tables sont indexées par libellé normalisé : jamais de clé écrite à la
// main, donc jamais de désaccord avec normalizeName().
const key = (value) => normalizeName(value);
const table = (entries) => new Map(Object.entries(entries).map(([label, value]) => [normalizeName(label), value]));

const COLOR_MAP = table({
  "rouge": { colors: ["red"] },
  "rose": { colors: ["pink"] },
  "jaune": { colors: ["yellow"] },
  "orange": { colors: ["orange"] },
  "verte": { colors: ["green"] },
  "noire": { colors: ["purple"] },
  "noire a pourpre": { colors: ["purple"] },
  "pourpre violace": { colors: ["purple"] },
  "acajou": { colors: ["brown"] },
  "blanche": { colors: ["cream"] },
  "bleue": { colors: ["anthocyanin"] },
  "bicolore jaune rouge": { colors: ["yellow", "red"] },
  "bigarree": { colors: [], note: "Fruit bigarré : la couleur de fond n’est pas précisée par la source." },
  "zebree": { colors: [], note: "Fruit zébré : la couleur de fond n’est pas précisée par la source." },
});

const SHAPE_MAP = table({
  "beefsteak": "beefsteak",
  "ronde": "rond",
  "aplatie": "aplat",
  "cotelee": "côtelé",
  "ovale prune allongee": "prune",
  "cordiforme": "cœur",
  "renflee": "variable",
  "piriforme": "poire",
  "variable": "variable",
  "ronde a ovale": "ovale",
  "teton": "variable",
  "nervuree": "côtelé",
  "poivron piment": "poivron",
  "irreguliere": "variable",
});

// Le texte produit doit contenir les déclencheurs reconnus par
// catalogLeafTypes() dans src/app.js.
const LEAF_MAP = table({
  "regulier": "Feuillage régulier selon le semencier.",
  "regulier rugosa": "Feuillage régulier et rugueux (rugosa) selon le semencier.",
  "pomme de terre": "Feuillage de type pomme de terre selon le semencier.",
  "pomme de terre rugosa": "Feuillage de type pomme de terre et rugueux (rugosa) selon le semencier.",
  "angora": "Feuillage laineux (type angora) selon le semencier.",
  "carotte": "Feuillage de type carotte selon le semencier.",
  "panache": "Feuillage panaché selon le semencier.",
  "pompom": "Feuillage de type pompon (gène stick) selon le semencier.",
});

// Codes de croissance attendus par scripts/build-catalog-enrich.mjs.
const GROWTH_MAP = table({
  "indeterminee": "I",
  "determinee": "D",
  "semi determinee": "S",
  "dwarf indeterminee": "WI",
  "dwarf determinee": "WD",
});

const CLIMAT_NOTE = table({
  "frais": "Climat frais indiqué par le semencier.",
  "chaud et sec": "Climat chaud et sec indiqué par le semencier.",
  "chaud et humide": "Climat chaud et humide indiqué par le semencier.",
  "humide": "Climat humide indiqué par le semencier.",
  "serre": "Culture sous serre indiquée par le semencier.",
  "tous": "",
});

const BOILERPLATE =
  /frais de port|conditions de vente|commande minimum|sachets? contiennent|paiement s[eé]curis[eé]|mode boutique|votre panier est vide|double-click|livraison internationale|cycle en terre|franco de port|cat[eé]gories\s*:|ugs\s*:|^prix|^[0-9,. ]+\s*€/i;

/* --- Analyse --------------------------------------------------------------- */

export function parseListingPage(html, page = 1) {
  const chunks = String(html ?? "").split(/<li\b/i);
  const items = [];
  const seen = new Set();
  for (const chunk of chunks) {
    const link = chunk.match(/href="(https:\/\/www\.tomatofifou\.com\/produit\/([^"/]+)\/?)(?:\?[^"]*)?"/i);
    if (!link) continue;
    const slug = decodeURIComponent(link[2]).replace(/\/$/, "");
    if (seen.has(slug)) continue;
    const heading = chunk.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
    const rawName = stripTags(heading?.[1] || slug.replaceAll("-", " "));
    if (!rawName) continue;
    seen.add(slug);
    items.push({ page, slug, name: titleCase(splitName(rawName).name), url: PRODUCT_URL_TEMPLATE.replace("{slug}", slug) });
  }
  const totalMatch = String(html ?? "").match(/sur\s*([\d\u00a0\u202f\s]+)\s*r[eé]sultats/i);
  const total = totalMatch ? Number(totalMatch[1].replace(NBSP, "").replace(/\s/g, "")) : 0;
  return { items, total };
}

// « ABAKANSKIY ROZOVYI - Абаканский розовый » : le nom retenu précède le
// séparateur, la forme étrangère devient un synonyme déclaré.
export function splitName(rawName) {
  const text = String(rawName ?? "").trim();
  const parts = text.split(/\s+[-\u2013\u2014]\s+/);
  const name = (parts[0] || text).trim();
  const alias = parts.length > 1 ? parts.slice(1).join(" - ").trim() : "";
  return { name, alias };
}

function extractCharacteristics(html) {
  const heading = String(html ?? "").search(/<h[1-6][^>]*>\s*Caract[eé]ristiques/i);
  if (heading < 0) return null;
  const table = String(html).slice(heading).match(/<table[\s\S]*?<\/table>/i);
  if (!table) return null;
  const rows = [...table[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => [...match[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => stripTags(cell[1])))
    .filter((cells) => cells.length >= 2);
  if (!rows.length) return null;
  return {
    calibre: rows.find(([label]) => key(label) === "calibre")?.[1] || "",
    couleur: rows.find(([label]) => key(label) === "couleur")?.[1] || "",
    forme: rows.find(([label]) => key(label) === "forme")?.[1] || "",
    precocite: rows.find(([label]) => key(label) === "precocite")?.[1] || "",
    climat: rows.find(([label]) => key(label) === "climat")?.[1] || "",
    feuillage: rows.find(([label]) => key(label) === "feuillage")?.[1] || "",
    croissance: rows.find(([label]) => key(label) === "croissance")?.[1] || "",
    origine: rows.find(([label]) => key(label) === "origine")?.[1] || "",
    hauteur: rows.find(([label]) => key(label) === "hauteur")?.[1] || "",
  };
}

export function parseProductPage(html) {
  const source = String(html ?? "");
  const title = source.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const rawTitle = stripTags(title?.[1] || "");
  if (!rawTitle) throw new Error("titre produit introuvable");
  // Le titre peut mélanger capitales latines et forme étrangère en casse
  // normale (« ABAKANSKIY ROZOVYI - Абаканский розовый ») : on assouplit
  // chaque partie séparément.
  const { name, alias } = splitName(rawTitle);
  const displayName = titleCase(name);
  const characteristics = extractCharacteristics(source);
  if (!characteristics) throw new Error("tableau « Caractéristiques » introuvable");

  const before = characteristics ? source.slice(0, source.search(/<h[1-6][^>]*>\s*Caract[eé]ristiques/i)) : source;
  const paragraphs = [...before.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripTags(match[1]))
    .filter((text) => text.length > 25 && !BOILERPLATE.test(text));

  // Les balises sont remplacées par des espaces avant la recherche : sinon
  // « 557Catégories : … » serait lu comme un seul mot.
  const flat = source.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/\s+/g, " ");
  const sku = flat.match(/UGS\s*:\s*([A-Za-z0-9._-]+)/i)?.[1] || "";
  const unavailable = /categorie-produit\/non-dispo\//i.test(source);

  return {
    name: displayName,
    aliases: alias && normalizeName(alias) !== normalizeName(displayName) ? [alias] : [],
    sku,
    unavailable,
    characteristics,
    paragraphs,
  };
}

/* --- Mise en forme du profil ----------------------------------------------- */

export function toProfile(product, { url, page = 1, collectedAt }) {
  const traits = product.characteristics || {};
  const description = (product.paragraphs || []).join(" ").replace(/\s*\.\.\s*/g, ". ").replace(/\.\.+/g, ".").trim();
  if (!description) throw new Error("description vide");

  // Libellé inconnu = erreur franche (la table de correspondance doit être
  // étendue) ; valeur absente = mention honnête, jamais une invention.
  const missing = (value) => /non (?:document|pr[eé]cis)|inconnu/i.test(value || "") || !String(value || "").trim();
  const color = missing(traits.couleur)
    ? { colors: [], note: "Couleur non précisée par la source." }
    : COLOR_MAP.get(key(traits.couleur));
  if (!color) throw new Error(`couleur non reconnue : ${traits.couleur}`);
  let shape = "";
  if (missing(traits.forme)) shape = "variable";
  else {
    shape = SHAPE_MAP.get(key(traits.forme));
    if (!shape) throw new Error(`forme non reconnue : ${traits.forme}`);
  }
  const leaf = LEAF_MAP.get(key(traits.feuillage)) || "Feuillage non documenté par le semencier.";

  // Le site ne publie pas la taxonomie « Dwarf » dans le tableau de la fiche :
  // quand la croissance ne la porte pas déjà, on s'appuie sur la mention
  // explicite du semencier dans la description, et on le dit dans la note.
  const haystack = `${product.name || ""} ${description}`;
  let dwarf = String(traits.dwarf || "").trim();
  const dwarfFromTable = Boolean(dwarf);
  if (!dwarf) {
    if (/micro.?dwarf|micro.?naine/i.test(haystack)) dwarf = "Micro Dwarf";
    else if (/dwarf|naines?\b|nain\b/i.test(haystack)) dwarf = "Dwarf";
  }
  let growth = GROWTH_MAP.get(key(traits.croissance)) || "U";
  if (/micro/i.test(dwarf)) growth = "M";
  else if (dwarf && growth === "I") growth = "WI";
  else if (dwarf && growth === "D") growth = "WD";
  else if (dwarf && growth === "S") growth = "WS";
  else if (dwarf) growth = "WU";

  const grams = [...description.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:à|-|et)\s*(\d+(?:[.,]\d+)?)\s*(?:grammes|g\b)/gi)];
  const weight = traits.calibre
    ? `${traits.calibre}${grams.length ? ` (${grams[0][1]} à ${grams[0][2]} g annoncés)` : ""} — calibre indicatif selon le semencier.`
    : "Calibre non documenté par le semencier.";

  const origin = missing(traits.origine)
    ? "Origine non documentée par le semencier."
    : traits.origine.replace(/\s+/g, " ").trim();

  const height = missing(traits.hauteur)
    ? "Hauteur non documentée par le semencier."
    : `Hauteur annoncée : ${traits.hauteur.replace(/\s+/g, " ").trim()}.`;

  const precocity = missing(traits.precocite)
    ? "Précocité non documentée par le semencier."
    : `${traits.precocite.replace(/\s+/g, " ").trim()} selon le semencier (classe commerciale, délai non chiffré).`;

  const breeder = description.match(/(?:d[eé]velopp[eé]e?|obtenue?|cr[eé][eé]e?|r[eé]alis[eé]e?)\s+par\s+([^.,;]{3,60})/i)?.[1]?.trim() || "";

  const notes = [];
  if (color.note) notes.push(color.note);
  const climatNote = CLIMAT_NOTE.get(key(traits.climat));
  if (climatNote) notes.push(climatNote);
  if (product.unavailable) notes.push("Fiche informative : variété non disponible à la vente au moment du relevé.");
  if (product.sku) notes.push(`Référence semencier : UGS ${product.sku}.`);
  if (growth === "U") notes.push("Croissance non documentée par la source ; le classement Indéterminée est provisoire.");
  if (dwarf && !dwarfFromTable) notes.push("Port « nain » déduit de la description du semencier, non d’une mesure : à confirmer à la culture.");

  return {
    growth,
    colors: color.colors,
    shape,
    weight,
    height,
    maturity: precocity,
    leaf,
    origin,
    description,
    fruit: (product.paragraphs || []).find((text) => /^(?:Gros |Petit |Fruit |Fruits )/.test(text)) || "",
    sources: [url],
    breeder,
    aliases: product.aliases || [],
    note: notes.join(" "),
    daysFromTransplant: 0,
    status: "partial",
    _meta: { page, collectedAt },
  };
}

/* --- Déduplication ---------------------------------------------------------- */

// Clés comparées à celles du catalogue : nom et synonymes déclarés uniquement.
// Jamais de fusion approximative : « 1884 » et « 1884 Purple » sont deux
// cultivars distincts et doivent rester deux fiches.
export function identityKeys(name, aliases = []) {
  return [...new Set([name, ...aliases].map(normalizeName).filter(Boolean))];
}

export function findKnownEntry(catalogue, name, aliases = []) {
  const wanted = new Set(identityKeys(name, aliases));
  for (const entry of catalogue) {
    const keys = identityKeys(entry.name, entry.aliases);
    if (keys.some((candidate) => wanted.has(candidate))) return entry;
  }
  return null;
}

// Voisinages à faire relire par un humain : même préfixe mais cultivars
// distincts (couleur, souche, obtenteur…). Rien n'est fusionné automatiquement.
export function findNeighbours(catalogue, name) {
  const wanted = normalizeName(name);
  if (wanted.length < 4) return [];
  return catalogue
    .filter((entry) => {
      const candidate = normalizeName(entry.name);
      if (candidate === wanted || candidate.length < 4) return false;
      return candidate.startsWith(wanted) || wanted.startsWith(candidate);
    })
    .map((entry) => ({ id: entry.id, name: entry.name }));
}
