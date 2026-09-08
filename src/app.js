/* Tomato Journal — local, dependency-free garden tracker */

const STORAGE_KEY = "tomato-journal-local-v1";
const PHOTO_DB_NAME = "tomato-journal-media-v1";
const PHOTO_STORE_NAME = "photos";
const PHOTO_STORAGE_VERSION = 1;

const colorMeta = {
  red: { label: "Rouge", hex: "#d45434", group: "Rouges" },
  orange: { label: "Orange", hex: "#eea337", group: "Oranges" },
  yellow: { label: "Jaune", hex: "#f0cf58", group: "Jaunes" },
  green: { label: "Vert", hex: "#4f815f", group: "Verts" },
  purple: { label: "Violet", hex: "#875879", group: "Violets" },
  pink: { label: "Rose", hex: "#eb967f", group: "Roses" },
  brown: { label: "Brun", hex: "#99612e", group: "Bruns" },
  anthocyanin: { label: "Anthocyane", hex: "#52667c", group: "Anthocyanes" },
  cream: { label: "Crème", hex: "#eaddc1", group: "Crèmes" },
};

function validColors(colors = []) {
  return (Array.isArray(colors) ? colors : [colors]).filter((color) => colorMeta[color]);
}

function mixColorHexes(colors = []) {
  const hexes = validColors(colors).slice(0, 3).map((color) => colorMeta[color].hex);
  if (!hexes.length) return "#d45434";
  const channels = hexes.map((hex) => hex.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16)));
  const mixed = [0, 1, 2].map((channel) => Math.round(channels.reduce((sum, rgb) => sum + rgb[channel], 0) / channels.length));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function colorPrimary(colors = [], mode = "solid") {
  const selected = validColors(colors).slice(0, 3);
  if (mode === "solid" && selected.length > 1) return mixColorHexes(selected);
  return colorMeta[selected[0] || "red"]?.hex || "#d45434";
}

function colorBackground(colors = [], mode = "solid") {
  const selected = validColors(colors).slice(0, 3);
  const hexes = selected.map((color) => colorMeta[color].hex);
  if (mode === "gradient" && hexes.length > 1) {
    const stops = hexes.map((hex, index) => `${hex} ${Math.round(index / (hexes.length - 1) * 100)}%`).join(", ");
    return `linear-gradient(135deg, ${stops})`;
  }
  return mixColorHexes(selected);
}

function normalizeColorMode(mode, colors = []) {
  return mode === "gradient" ? "gradient" : "solid";
}

function previewTextColor(colors = [], mode = "solid") {
  const hexes = validColors(colors).map((color) => colorMeta[color].hex);
  if (mode === "gradient" && hexes.length > 1) return "#ffffff";
  const hex = (mode === "gradient" && hexes.length > 1) ? hexes[0] : colorBackground(colors, "solid");
  const values = hex.slice(1).match(/.{2}/g)?.map((part) => parseInt(part, 16) / 255) || [0.83, 0.33, 0.2];
  const luminance = 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
  return luminance > 0.58 ? "#24372c" : "#ffffff";
}

function plantColorMode(plant) {
  const colors = validColors(plant?.colors);
  return normalizeColorMode(plant?.colorMode || (colors.length > 1 ? "gradient" : "solid"), colors);
}

function catalogColorMode(entry) {
  const colors = validColors(catalogColors(entry));
  return normalizeColorMode(entry?.colorMode || entry?.plantDefaults?.colorMode || (colors.length > 1 ? "gradient" : "solid"), colors);
}

function plantColorBackground(plant) {
  const colors = validColors(plant?.colors);
  if (!colors.length && plant?.accent) return plant.accent;
  return colorBackground(colors, plantColorMode(plant));
}

function plantColorPrimary(plant) {
  const colors = validColors(plant?.colors);
  if (!colors.length && typeof plant?.accent === "string" && !plant.accent.includes("gradient")) return plant.accent;
  return colorPrimary(colors, plantColorMode(plant));
}

function updateColorPreview(form) {
  if (!form) return;
  const colors = [...form.querySelectorAll(".color-option.selected")].map((button) => button.dataset.color).filter((color) => colorMeta[color]).slice(0, 3);
  const mode = form.elements?.namedItem("colorMode")?.value || (colors.length > 1 ? "gradient" : "solid");
  const preview = form.querySelector("[data-color-preview]");
  if (preview) {
    preview.style.background = colorBackground(colors, mode);
    preview.style.color = previewTextColor(colors, mode);
  }
  const label = form.querySelector("[data-color-preview-label]");
  if (label) label.textContent = mode === "gradient" && colors.length < 2 ? "Dégradé prêt · ajoutez une deuxième couleur" : mode === "gradient" ? "Dégradé multicolore" : "Couleur unie";
}

const typeMeta = {
  heirloom: "Ancienne",
  hybrid: "Hybride",
  open: "Pollinisation libre",
};

const growthMeta = {
  indeterminate: "Indéterminée",
  "déterminée": "Déterminée",
  "semi-determinate": "Semi-déterminée",
};
const FRUIT_SHAPES = ["rond", "aplati", "beefsteak", "côtelé", "allongé", "prune", "cœur", "poire", "ovale", "variable", "poivron"];
const catalogVerificationMeta = {
  partial: { label: "Contrôle partiel", warning: false },
  conflicting: { label: "Sources divergentes", warning: true },
  identity: { label: "Souche à préciser", warning: true },
  unconfirmed: { label: "Non confirmé", warning: true },
  accession: { label: "Accession à identifier", warning: true },
  local: { label: "Lot personnel", warning: true },
};

function growthOptionsHTML(selected = "") {
  return `<option value="" ${!selected ? "selected" : ""}>Non précisée</option>${Object.entries(growthMeta).map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("")}`;
}

const statusMeta = {
  growing: { label: "En croissance", className: "" },
  harvesting: { label: "En récolte", className: "harvesting" },
  finished: { label: "Terminée", className: "finished" },
};

const candidateStatusMeta = {
  candidate: { label: "Candidate", tone: "" },
  "to-buy": { label: "À acheter", tone: "yellow" },
  purchased: { label: "Achetée", tone: "blue" },
  sown: { label: "Semée", tone: "green" },
  planted: { label: "Plantée", tone: "green" },
  keep: { label: "Retenue", tone: "green" },
  discard: { label: "Écartée", tone: "muted" },
};

const candidatePriorityMeta = {
  high: { label: "Priorité haute", tone: "tomato" },
  medium: { label: "Priorité normale", tone: "" },
  low: { label: "À voir", tone: "muted" },
};

const reviewOverallMeta = {
  keep: { label: "À retenir", tone: "green" },
  maybe: { label: "À revoir", tone: "yellow" },
  discard: { label: "À écarter", tone: "tomato" },
};

const seasonStatusMeta = {
  active: { label: "En cours", tone: "green" },
  incomplete: { label: "Bilan incomplet", tone: "yellow" },
  complete: { label: "Bilan clôturé", tone: "blue" },
};

const crossStatusMeta = {
  planned: { label: "Prévu", tone: "" },
  crossed: { label: "Pollinisé", tone: "yellow" },
  fruit: { label: "Fruit obtenu", tone: "yellow" },
  seeds: { label: "Graines extraites", tone: "blue" },
  sown: { label: "Semée", tone: "green" },
  selected: { label: "Sélection en cours", tone: "green" },
  retained: { label: "Lignée retenue", tone: "green" },
  discarded: { label: "Écartée", tone: "muted" },
};

const crossStabilityMeta = {
  observation: "En observation",
  segregating: "Ségrégation en cours",
  promising: "Prometteuse",
  stable: "Stable",
};

const qualitativeMeta = {
  taste: { 1: "Décevant", 2: "Correct", 3: "Bon", 4: "Très bon", 5: "Exceptionnel" },
  vigor: { 1: "Faible", 2: "Moyenne", 3: "Bonne", 4: "Très vigoureuse" },
  quantity: { 1: "Faible", 2: "Moyenne", 3: "Bonne", 4: "Très bonne" },
  earliness: { late: "Tardive", average: "Dans la moyenne", early: "Précoce", "very-early": "Très précoce" },
};

const pageMeta = {
  garden: { title: "Potager", subtitle: "Votre saison de tomates, en un coup d’œil." },
  yields: { title: "Analyse détaillée", subtitle: "Récoltes, rendements et comparaisons de vos saisons." },
  seasons: { title: "Saisons", subtitle: "Comparez vos années et gardez une trace de vos progrès." },
  varieties: { title: "Variétés", subtitle: `Le catalogue fourni, avec ${defaultSeedCatalog().length} fiches de tomates à explorer.` },
  more: { title: "Plus", subtitle: "Outils, préférences et sauvegarde de vos données." },
};

let pendingCatalogPruneNotice = 0;
let pendingCatalogEnrichNotice = 0;
let pendingCatalogTypesNotice = false;
const TOMATO_FAMILY_HINTS = ["tomate", "tomato", "lycopersicum", "lycopersicon", "solanum"];
const CATALOG_SUBFAMILY_ORDER = ["Micro-naine", "Dwarf", "Bush", "Déterminée", "Indéterminée"];
const SEED_CATALOG_BY_ID = new Map(defaultSeedCatalog().map((entry) => [entry.id, entry]));
let state = loadState();
let route = "garden";
let gardenFilter = "active";
let selectedRegion = "Toutes les zones";
let viewMode = "grid";
let varietyFilter = "all";
let varietySearch = "";
let lastFocusedElement = null;
let deferredInstallPrompt = null;
let globalSearchQuery = "";
let bulkMode = false;
const selectedPlantIds = new Set();
let onboardingFlow = false;
let onboardingStep = 0;
let photoDbPromise = null;
const photoUrlCache = new Map();
const catalogPhotoUrlCache = new Map();
let storageStatus = { used: 0, quota: 0, photoBytes: 0, photoCount: 0, indexedDB: false, saveError: false, mediaError: false };
let storageWarningShown = false;

function icon(name) {
  const base = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const icons = {
    tomato: `<svg ${base}><path d="M4.4 10.7c0-3.6 3.1-6.5 7.6-6.5s7.6 2.9 7.6 6.5c0 5.2-3.4 8.7-7.6 8.7s-7.6-3.5-7.6-8.7Z" fill="currentColor" stroke="none"/><path d="M12 5.2c-1.1-2.3-.2-4 1.8-4.8.2 1.4-.3 3.1-1.8 4.8Zm-.1.7C9.6 3.1 7 2.9 5.3 4.3c2.2.1 4.4 1.2 6.7 3.4 2.3-2.2 4.5-3.3 6.7-3.4-1.7-1.4-4.3-1.2-6.8 1.6Z" fill="#4f815f" stroke="#4f815f" stroke-width="1.1"/></svg>`,
    yields: `<svg ${base}><path d="M5 19V10"/><path d="M12 19V5"/><path d="M19 19v-7"/><path d="M3.5 19.5h17"/><path d="M5 10h0M12 5h0M19 12h0" stroke-width="3.2"/></svg>`,
    seasons: `<svg ${base}><rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M8 3v5M16 3v5M4 10h16M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01M16 17.5h.01" stroke-width="1.8"/></svg>`,
    tag: `<svg ${base}><path d="m20.3 13.2-7.1 7.1a2 2 0 0 1-2.8 0L3.7 13.6a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6l6.6 6.6a2.1 2.1 0 0 1 0 3Z"/><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none"/></svg>`,
    menu: `<svg ${base}><path d="M4 6h16M4 12h16M4 18h16" stroke-width="2.2"/></svg>`,
    plus: `<svg ${base}><path d="M12 5v14M5 12h14" stroke-width="2.2"/></svg>`,
    search: `<svg ${base}><circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 4.3 4.3"/></svg>`,
    map: `<svg ${base}><path d="m9 18-5 3V6l5-3 6 3 5-3v15l-5 3-6-3Z"/><path d="M9 3v15M15 6v15"/></svg>`,
    leaf: `<svg ${base}><path d="M19.7 4.3C11.1 3.3 5.2 6.8 5.2 12.7c0 3.9 3 6.4 6.3 6.4 5.6 0 8.1-6.3 8.2-14.8Z"/><path d="M4 21c2.5-5.6 6.6-8.8 12.2-11.1"/></svg>`,
    sun: `<svg ${base}><circle cx="12" cy="12" r="3.6"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
    moon: `<svg ${base}><path d="M20 15.3A8.5 8.5 0 0 1 8.7 4a8.6 8.6 0 1 0 11.3 11.3Z"/><path d="M17.5 4.5v.01M20 7h.01" stroke-width="2.2"/></svg>`,
    calendar: `<svg ${base}><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" stroke-width="1.7"/></svg>`,
    scale: `<svg ${base}><path d="M12 4v16M7 20h10M5 7h14M5 7l-3 6a3.5 3.5 0 0 0 6 0L5 7Zm14 0-3 6a3.5 3.5 0 0 0 6 0l-3-6Z"/></svg>`,
    fruit: `<svg ${base}><circle cx="12" cy="13" r="7.2"/><path d="M12 5.8c-1-2.5.1-4.3 2.6-4.8.2 1.6-.6 3.6-2.6 4.8ZM11.8 6.6C9.5 4.7 7 4.8 5.5 6.4c2 .3 3.9 1.3 5.7 3.1"/></svg>`,
    edit: `<svg ${base}><path d="m4 16.9-.7 3.8 3.8-.7L18.8 8.3a2.2 2.2 0 0 0-3.1-3.1L4 16.9Z"/><path d="m14.5 6.5 3.1 3.1"/></svg>`,
    trash: `<svg ${base}><path d="M4 7h16M10 11v6M14 11v6M6.5 7l.8 13h9.4l.8-13M9 7V4h6v3"/></svg>`,
    close: `<svg ${base}><path d="m6 6 12 12M18 6 6 18"/></svg>`,
    arrow: `<svg ${base}><path d="M5 12h13M13 6l6 6-6 6"/></svg>`,
    chevron: `<svg ${base}><path d="m9 6 6 6-6 6"/></svg>`,
    check: `<svg ${base}><path d="m5 12 4.3 4.3L19 6.7" stroke-width="2.2"/></svg>`,
    share: `<svg ${base}><circle cx="18" cy="5" r="2.3"/><circle cx="6" cy="12" r="2.3"/><circle cx="18" cy="19" r="2.3"/><path d="m8.1 10.9 7.8-4.5M8.1 13.1l7.8 4.5"/></svg>`,
    download: `<svg ${base}><path d="M12 3v12M7.5 11.5 12 16l4.5-4.5M4 20h16"/></svg>`,
    copy: `<svg ${base}><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2"/></svg>`,
    upload: `<svg ${base}><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5M4 20h16"/></svg>`,
    book: `<svg ${base}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3v16M8.5 7h7M8.5 10h7"/></svg>`,
    settings: `<svg ${base}><path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z"/><path d="m19.4 13.4 1.1.8-1.9 3.3-1.3-.5a7.8 7.8 0 0 1-1.9 1.1l-.2 1.4h-3.8l-.2-1.4a7.8 7.8 0 0 1-1.9-1.1l-1.3.5-1.9-3.3 1.1-.8a7.4 7.4 0 0 1 0-2.2l-1.1-.8L8 7.1l1.3.5a7.8 7.8 0 0 1 1.9-1.1l.2-1.4h3.8l.2 1.4a7.8 7.8 0 0 1 1.9 1.1l1.3-.5 1.9 3.3-1.1.8a7.4 7.4 0 0 1 0 2.2Z"/></svg>`,
    help: `<svg ${base}><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 4.2 1.8c-1.2 1.1-1.9 1.5-1.9 3M12 17h.01" stroke-width="2"/></svg>`,
    message: `<svg ${base}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7a2.5 2.5 0 0 1-2.5 2.5h-7L6 19v-4H6.5A2.5 2.5 0 0 1 4 12.5v-7Z"/></svg>`,
    star: `<svg ${base}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" fill="currentColor" stroke="none"/></svg>`,
    droplet: `<svg ${base}><path d="M12 3S6.5 9.2 6.5 13.7a5.5 5.5 0 0 0 11 0C17.5 9.2 12 3 12 3Z"/></svg>`,
    camera: `<svg ${base}><path d="M4 7.5h3l1.3-2h7.4l1.3 2h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5Z"/><circle cx="12" cy="13.5" r="3.2"/></svg>`,
    info: `<svg ${base}><circle cx="12" cy="12" r="9"/><path d="M12 10.5V16M12 7.5h.01" stroke-width="2.2"/></svg>`,
  };
  return icons[name] || icons.info;
}

function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    if (!el.innerHTML.trim()) el.innerHTML = icon(el.dataset.icon);
  });
}

function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isoDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayIso() {
  return isoDate(new Date());
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseNumericInput(value) {
  let normalized = String(value ?? "").trim().replace(/\s/g, "");
  if (!normalized) return 0;
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.lastIndexOf(",") > normalized.lastIndexOf(".")
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized.replace(/,/g, "");
  } else {
    normalized = normalized.replace(",", ".");
  }
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function roundWeight(value) {
  return Math.round((Number(value) || 0) * 1000) / 1000;
}

function formatNumber(value, decimals = 0) {
  return Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatWeight(grams, compact = false) {
  const numeric = Number(grams || 0);
  if (state.units === "imperial") {
    const pounds = numeric / 453.59237;
    return `${formatNumber(pounds, 2)} lb`;
  }
  const kilograms = numeric / 1000;
  const decimals = compact ? 2 : numeric >= 1000 ? (Number.isInteger(numeric) ? 2 : 3) : (Number.isInteger(numeric) ? 2 : 4);
  return `${formatNumber(kilograms, decimals)} kg`;
}

function formatAverageFruit(grams, fruits) {
  if (!fruits) return state.units === "imperial" ? "—" : "—";
  if (state.units === "imperial") return `${formatNumber(grams / fruits / 28.3495, 1)} oz`;
  const average = Number(grams || 0) / Number(fruits);
  const decimals = Number.isInteger(average) ? 0 : average < 10 ? 2 : 1;
  return `${formatNumber(average, decimals)} g`;
}

function formatDate(dateString, options = { day: "numeric", month: "short", year: "numeric" }) {
  if (!dateString) return "—";
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("fr-FR", options).format(date).replace(".", "");
}

function formatDateShort(dateString) {
  return formatDate(dateString, { day: "numeric", month: "short" });
}

function splitTotal(total, count, forcedLast = null) {
  if (count <= 1) return [total];
  const last = forcedLast == null ? Math.max(1, Math.round(total / count)) : forcedLast;
  const remaining = total - last;
  const base = Math.floor(remaining / (count - 1));
  const remainder = remaining - base * (count - 1);
  const result = Array.from({ length: count - 1 }, (_, index) => base + (index < remainder ? 1 : 0));
  result.push(last);
  return result;
}

function defaultSeedCatalog() {
  return Array.isArray(window.SEED_CATALOG) ? window.SEED_CATALOG : [];
}

function currentSeedCatalog() {
  return Array.isArray(state?.catalog) ? state.catalog : defaultSeedCatalog();
}

function catalogDetailValue(entry, ...keys) {
  const details = entry?.details || {};
  for (const key of keys) {
    if (details[key]) return String(details[key]);
  }
  return "";
}

function catalogDetailsText(entry) {
  return [...Object.entries(entry?.details || {}).map(([label, value]) => `${label} ${value}`), ...(Array.isArray(entry?.aliases) ? entry.aliases : [])].join(" ");
}

function isTomatoCatalogEntry(entry) {
  const family = String(entry?.family || "").toLowerCase();
  return TOMATO_FAMILY_HINTS.some((hint) => family.includes(hint));
}

function pruneNonTomatoCatalog(catalog) {
  const kept = [];
  const removed = [];
  (Array.isArray(catalog) ? catalog : []).forEach((entry) => {
    (isTomatoCatalogEntry(entry) ? kept : removed).push(entry);
  });
  return { kept, removed };
}

function normalizeCatalogName(value) {
  return String(value || "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replaceAll("œ", "oe").replaceAll("æ", "ae").replace(/[^\p{L}\p{N}]/gu, "");
}

function catalogIdentityNames(entry) {
  const names = [entry?.name, ...(Array.isArray(entry?.aliases) ? entry.aliases : [])];
  // Only declared synonyms are used. Never strip colors, strains, F1/F2 or
  // dwarf qualifiers, and never fuzzy-merge different tomato cultivars.
  return [...new Set(names.filter((name) => typeof name === "string").map(normalizeCatalogName).filter(Boolean))];
}

function mergeReferenceCatalog(data) {
  if (!Array.isArray(data.catalog)) data.catalog = [];
  const ids = new Set(data.catalog.map((entry) => entry.id));
  const names = new Set(data.catalog.flatMap(catalogIdentityNames));
  let added = 0;
  for (const reference of defaultSeedCatalog()) {
    const keys = catalogIdentityNames(reference);
    if (ids.has(reference.id) || keys.some((key) => names.has(key))) continue;
    data.catalog.push(cloneData(reference));
    ids.add(reference.id);
    keys.forEach((key) => names.add(key));
    added += 1;
  }
  return added;
}

function normalizeCatalogSubfamily(value) {
  const label = normalizeSearchText(value).trim();
  if (/^micro[- ]?(?:naine?|dwarf)$/.test(label)) return "Micro-naine";
  if (/^(?:dwarf(?: \(naine\))?|naine?)$/.test(label)) return "Dwarf";
  if (/^(?:bush|buisson(?:nante?)?)$/.test(label)) return "Bush";
  if (/^indetermin(?:ee?|er|ate)$/.test(label)) return "Indéterminée";
  if (/^determin(?:ee?|er|ate)$/.test(label)) return "Déterminée";
  return "";
}

function catalogSubfamily(entry) {
  const explicit = normalizeCatalogSubfamily(entry?.subfamily);
  if (explicit) return explicit;
  const supplied = !entry?.userAdded && !entry?.crossId ? SEED_CATALOG_BY_ID.get(entry?.id) : null;
  if (supplied) return supplied.subfamily;
  // Older personal sheets can still have a free-text category. Compact habits
  // take priority; otherwise use the recorded growth habit, then indeterminate.
  const text = normalizeSearchText(`${entry?.subfamily || ""} ${catalogDetailValue(entry, "description_histoire_particularités", "description")} ${catalogDetailValue(entry, "taille")}`);
  if (/\bmicro[- ]?(?:nain|dwarf)/.test(text)) return "Micro-naine";
  if (/\bdwarf\b|\bnain(?:e|s|es)?\b/.test(text)) return "Dwarf";
  if (/\bbush\b|buisson/.test(text)) return "Bush";
  const growth = normalizeCatalogSubfamily(entry?.plantDefaults?.growth || entry?.growth);
  if (growth) return growth;
  if (/\bindetermin/.test(text)) return "Indéterminée";
  if (/\bdetermin/.test(text)) return "Déterminée";
  if (/\bcompact/.test(text)) return "Bush";
  return "Indéterminée";
}

function catalogSubfamilyList(entries) {
  const present = new Set(entries.map((entry) => catalogSubfamily(entry)));
  return CATALOG_SUBFAMILY_ORDER.filter((subfamily) => present.has(subfamily));
}

function catalogSubfamilyOptionsHTML(entry = null) {
  const selected = catalogSubfamily(entry);
  return CATALOG_SUBFAMILY_ORDER.map((value) => `<option value="${escapeHTML(value)}" ${value === selected ? "selected" : ""}>${escapeHTML(value)}</option>`).join("");
}

function migrateCatalogTypes(data) {
  let changed = false;
  const assign = (record, key, value) => {
    if (JSON.stringify(record[key]) === JSON.stringify(value)) return;
    record[key] = value;
    changed = true;
  };
  const updateFields = (record, reference, detailsKey, supplied) => {
    const legacyType = !CATALOG_SUBFAMILY_ORDER.includes(record.subfamily);
    const legacySource = supplied && detailsKey === "details" && (Object.hasOwn(record, "source") || Object.hasOwn(record, "sourceUrl"));
    const outdated = supplied && supplied.catalogRevision && record.catalogRevision !== supplied.catalogRevision;
    if (outdated) assign(record, "subfamily", supplied.subfamily);
    else if (legacyType) assign(record, "subfamily", catalogSubfamily(reference));
    if (supplied && (legacyType || legacySource || outdated)) {
      // Refresh only bundled reference fields, never observed plant traits,
      // personal notes, harvests, photos or locally created varieties.
      if (record[detailsKey]) assign(record, detailsKey, { ...record[detailsKey], ...supplied.details });
      if (detailsKey === "details") {
        if (supplied.plantDefaults) assign(record, "plantDefaults", { ...record.plantDefaults, ...supplied.plantDefaults });
        if (supplied.verification) assign(record, "verification", cloneData(supplied.verification));
        for (const key of ["aliases", "sourceRefs", "importedFrom"]) {
          if (supplied[key]) assign(record, key, cloneData(supplied[key]));
        }
        for (const key of ["source", "sourceUrl"]) {
          if (Object.hasOwn(record, key)) { delete record[key]; changed = true; }
        }
      }
      if (supplied.catalogRevision) assign(record, "catalogRevision", supplied.catalogRevision);
    }
  };
  const visit = (record, catalogById = new Map()) => {
    if (!record || typeof record !== "object") return;
    if (Array.isArray(record.catalog)) catalogById = new Map(record.catalog.map((entry) => [entry.id, entry]));
    if (record.name && record.family && record.details) {
      const supplied = !record.userAdded && !record.crossId ? SEED_CATALOG_BY_ID.get(record.id) : null;
      updateFields(record, record, "details", supplied);
    } else if (record.catalogId && (Object.hasOwn(record, "subfamily") || record.catalogDetails)) {
      const reference = catalogById.get(record.catalogId) || SEED_CATALOG_BY_ID.get(record.catalogId);
      if (reference) {
        const supplied = !reference.userAdded && !reference.crossId ? SEED_CATALOG_BY_ID.get(reference.id) : null;
        updateFields(record, reference, "catalogDetails", supplied);
      }
    }
    // Include copies in candidates, cross parents, trash and saved snapshots so
    // restoring an older item cannot bring the former supplier labels back.
    Object.values(record).forEach((value) => visit(value, catalogById));
  };
  visit(data);
  return changed;
}

function catalogColors(entry) {
  const explicit = entry?.plantDefaults?.colors;
  if (Array.isArray(explicit)) return explicit.filter((color) => colorMeta[color]).slice(0, 3);
  const text = `${catalogDetailValue(entry, "fruit")} ${catalogDetailValue(entry, "type_de_fruit")}`;
  const rules = [
    ["red", /rouge|red|crimson|scarlet|bordeaux|burgundy|vermilion/i],
    ["orange", /orange|abricot|marmalade|carotte/i],
    ["yellow", /jaune|yellow|gold|doré|dorée|lemon/i],
    ["green", /vert|green|lime|emerald|laitue/i],
    ["purple", /violet|purple|pourpre|black|noir|noire|indigo/i],
    ["pink", /rose|pink|magenta/i],
    ["brown", /brun|brown|chocolat|chocolate/i],
    ["anthocyanin", /bleu|blue|anthocyan/i],
    ["cream", /blanc|blanche|white|crème|cream|ivoire/i],
  ];
  const colors = rules.filter(([, pattern]) => pattern.test(text)).map(([color]) => color);
  if (colors.length) return colors.slice(0, 3);
  return [];
}
function catalogType(entry) {
  if (["heirloom", "hybrid", "open"].includes(entry?.plantDefaults?.type)) return entry.plantDefaults.type;
  const text = `${entry?.name || ""} ${catalogDetailsText(entry)}`;
  if (/\bF1\b|hybride|hybrid/i.test(text)) return "hybrid";
  if (/heirloom|ancienne|héritage|pollinisation libre|open[- ]pollinated/i.test(text)) return "heirloom";
  return "open";
}

function catalogSize(entry) {
  const text = normalizeSearchText(`${catalogDetailValue(entry, "type_de_fruit")} ${catalogDetailValue(entry, "fruit")}`);
  // Fruit size is independent from the height or dwarf habit of its plant.
  if (/cerise|cherry|currant/.test(text)) return "cerise";
  if (/cocktail|petits? fruits?/.test(text)) return "petit";
  if (/beefsteak|gros fruits?|coeur|cordiform/.test(text)) return "gros";
  const weight = text.match(/(\d+(?:[.,]\d+)?)\s*(?:a|-|–)\s*(\d+(?:[.,]\d+)?)\s*g\b/) || text.match(/(\d+(?:[.,]\d+)?)\s*g\b/);
  if (weight) {
    const grams = (Number(weight[1].replace(",", ".")) + Number((weight[2] || weight[1]).replace(",", "."))) / 2;
    return grams < 50 ? "petit" : grams <= 200 ? "moyen" : "gros";
  }
  if (/calibre moyen|fruit moyen/.test(text)) return "moyen";
  return "";
}

function catalogShape(entry) {
  const explicit = entry?.plantDefaults?.shape;
  if (explicit === "" || FRUIT_SHAPES.includes(explicit)) return explicit;
  const text = normalizeSearchText(`${catalogDetailValue(entry, "type_de_fruit")} ${catalogDetailValue(entry, "fruit")}`);
  if (/coeur|cordiform|oxheart|heart/.test(text)) return "cœur";
  if (/poire|pear/.test(text)) return "poire";
  if (/prune|plum/.test(text)) return "prune";
  if (/allong|elong/.test(text)) return "allongé";
  if (/ovale|ovoide/.test(text)) return "ovale";
  if (/cotel|ruffl|ribbed/.test(text)) return "côtelé";
  if (/beefsteak/.test(text)) return "beefsteak";
  if (/aplati|oblat|flat/.test(text)) return "aplati";
  if (/rond|round|globe|cerise|cherry|cocktail/.test(text)) return "rond";
  return "";
}

function catalogGrowth(entry) {
  if (Object.hasOwn(entry?.plantDefaults || {}, "growth")) return growthMeta[entry.plantDefaults.growth] ? entry.plantDefaults.growth : "";
  const text = normalizeSearchText(catalogDetailsText(entry));
  if (/semi[- ]?determin/.test(text)) return "semi-determinate";
  if (/\bindetermin/.test(text)) return "indeterminate";
  if (/\bdetermin/.test(text)) return "déterminée";
  const category = normalizeCatalogSubfamily(entry?.subfamily);
  if (category === "Déterminée") return "déterminée";
  if (category === "Indéterminée") return "indeterminate";
  // A dwarf, a bushy habit or vigorous growth alone does not establish determinacy.
  return "";
}

function catalogMaturityDays(entry) {
  const explicit = Number(entry?.plantDefaults?.daysToMaturity);
  if (explicit > 0) return explicit;
  // Audited sheets only provide a numeric default when its transplant basis is documented.
  if (entry?.verification) return 75;
  const maturity = catalogDetailValue(entry, "maturité", "maturity");
  const match = maturity.match(/\b(\d{2,3})\b/);
  return match ? Number(match[1]) : 75;
}
function catalogMaturityNotice(entry) {
  return entry?.verification && !(Number(entry?.plantDefaults?.daysToMaturity) > 0)
    ? "Aucun délai fiable depuis la plantation n’est renseigné. Le formulaire du potager propose 75 jours comme hypothèse de calendrier, à ajuster : ce n’est pas une donnée vérifiée pour cette variété."
    : "";
}

function catalogAccent(entry) {
  const colors = catalogColors(entry);
  return colorBackground(colors, catalogColorMode(entry)) || "#4f815f";
}

function catalogEntryById(id) {
  const entries = currentSeedCatalog();
  const exact = entries.find((entry) => entry.id === id || String(entry.catalogIndex) === String(id));
  if (exact) return exact;
  const reference = SEED_CATALOG_BY_ID.get(id);
  if (!reference) return undefined;
  const keys = new Set(catalogIdentityNames(reference));
  return entries.find((entry) => catalogIdentityNames(entry).some((key) => keys.has(key)));
}

function catalogEntryToPlant(entry, options = {}) {
  if (!entry) return null;
  const details = cloneData(entry.details || {});
  const defaults = entry.plantDefaults || {};
  const colors = catalogColors(entry);
  return {
    id: options.asNew ? "" : (options.id || entry.id || ""),
    name: entry.name || "",
    type: ["heirloom", "hybrid", "open"].includes(defaults.type) ? defaults.type : catalogType(entry),
    colors,
    colorMode: normalizeColorMode(entry.colorMode || defaults.colorMode || (colors.length > 1 ? "gradient" : "solid"), colors),
    size: defaults.size ?? catalogSize(entry),
    shape: defaults.shape ?? catalogShape(entry),
    growth: defaults.growth ?? catalogGrowth(entry),
    fruitType: defaults.fruitType || catalogDetailValue(entry, "type_de_fruit"),
    breeder: defaults.breeder || "",
    seedSource: entry.userAdded ? "Ajouté au catalogue local" : "Catalogue fourni par l'utilisateur",
    datePlanted: todayIso(),
    daysToMaturity: catalogMaturityDays(entry),
    season: options.season || new Date().getFullYear(),
    region: "",
    location: "",
    notes: "",
    status: "growing",
    accent: catalogAccent(entry),
    harvests: [],
    catalogId: entry.id || "",
    family: entry.family || "",
    subfamily: entry.subfamily || "",
    catalogDetails: details,
    ...(entry.catalogRevision ? { catalogRevision: entry.catalogRevision } : {}),
  };
}

function catalogOptionsHTML(selectedId = "") {
  const groups = {};
  currentSeedCatalog().forEach((entry) => {
    const family = entry.family || "Autres";
    if (!groups[family]) groups[family] = [];
    groups[family].push(entry);
  });
  return `<option value="">Saisie manuelle · choisir une variété ci-dessous</option>${Object.entries(groups).map(([family, entries]) => `<optgroup label="${escapeHTML(family)}">${entries.map((entry) => `<option value="${escapeHTML(entry.id || entry.catalogIndex || "")}" ${String(selectedId) === String(entry.id || entry.catalogIndex || "") ? "selected" : ""}>${escapeHTML(entry.name)}${entry.subfamily ? ` · ${escapeHTML(entry.subfamily)}` : ""}</option>`).join("")}</optgroup>`).join("")}`;
}

function setPlantFormField(form, name, value) {
  const field = form.elements?.namedItem(name);
  if (!field || value == null) return;
  field.value = value;
}

function updatePlantFormColors(form, colors = []) {
  const selectedColors = colors.filter((color) => colorMeta[color]).slice(0, 3);
  form.querySelectorAll(".color-option").forEach((button) => {
    const selected = selectedColors.includes(button.dataset.color);
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", selected);
  });
  const help = form.querySelector("#color-help");
  if (help) help.textContent = selectedColors.map((color) => colorMeta[color]?.label).filter(Boolean).join(" · ") || "Aucune couleur sélectionnée";
  updateColorPreview(form);
}

function applyCatalogToPlantForm(form, entry) {
  if (!form || !entry) return;
  const plant = catalogEntryToPlant(entry, { asNew: true, season: state.currentSeason });
  form.dataset.catalogId = entry.id || "";
  setPlantFormField(form, "name", plant.name);
  setPlantFormField(form, "type", plant.type);
  setPlantFormField(form, "size", plant.size);
  setPlantFormField(form, "shape", plant.shape);
  setPlantFormField(form, "growth", plant.growth);
  setPlantFormField(form, "daysToMaturity", plant.daysToMaturity);
  setPlantFormField(form, "fruitType", plant.fruitType);
  setPlantFormField(form, "colorMode", plant.colorMode);
  setPlantFormField(form, "breeder", plant.breeder);
  updatePlantFormColors(form, plant.colors);
  const source = form.querySelector("[data-catalog-selection-note]");
  if (source) {
    source.hidden = false;
    const summary = catalogShortText(catalogDetailValue(entry, "description_histoire_particularités", "description", "fruit"), 190);
    source.innerHTML = `<span>${icon("tag")}</span><div><strong>${escapeHTML(entry.family || "Catalogue local")}</strong><span>${escapeHTML(entry.subfamily || "Fiche sélectionnée")} · les caractéristiques ont été préremplies. Vous pouvez encore les ajuster.</span>${summary ? `<small>${escapeHTML(summary)}</small>` : ""}${catalogMaturityNotice(entry) ? `<small class="catalog-planning-notice">${escapeHTML(catalogMaturityNotice(entry))}</small>` : ""}</div>`;
  }
}
function buildDemoState() {
  const profiles = [
    { yieldGrams: 2010, fruits: 110, events: 18, region: "Serre", location: "Rangée A · plant 1", days: 60 },
    { yieldGrams: 1150, fruits: 78, events: 16, region: "Bac surélevé", location: "Bac 2 · plant 2", days: 80 },
    { yieldGrams: 1130, fruits: 85, events: 14, region: "Bac surélevé", location: "Bac 1 · plant 4", days: 97 },
    { yieldGrams: 1010, fruits: 62, events: 12, region: "Bac surélevé", location: "Bac 2 · plant 4", days: 75 },
    { yieldGrams: 990, fruits: 59, events: 11, region: "Zen Garden", location: "Arche · plant 1", days: 80 },
    { yieldGrams: 820, fruits: 53, events: 10, region: "Bac surélevé", location: "Bac 3 · plant 2", days: 96, forcedLast: 500 },
    { yieldGrams: 790, fruits: 57, events: 10, region: "Redwood Corner", location: "Bac 1 · plant 1", days: 78 },
    { yieldGrams: 690, fruits: 49, events: 9, region: "Serre", location: "Rangée B · plant 3", days: 75 },
    { yieldGrams: 660, fruits: 42, events: 9, region: "Serre", location: "Rangée A · plant 3", days: 57 },
    { yieldGrams: 520, fruits: 32, events: 8, region: "Bac surélevé", location: "Bac 4 · plant 1", days: 80 },
    { yieldGrams: 230, fruits: 34, events: 6, region: "Zen Garden", location: "Arche · plant 3", days: 70 },
    { yieldGrams: 210, fruits: 26, events: 5, region: "Redwood Corner", location: "Bac 2 · plant 1", days: 85 },
    { yieldGrams: 190, fruits: 28, events: 5, region: "Bac surélevé", location: "Bac 4 · plant 3", days: 75 },
    { yieldGrams: 140, fruits: 20, events: 4, region: "Zen Garden", location: "Arche · plant 4", days: 75 },
    { yieldGrams: 80, fruits: 14, events: 4, region: "Redwood Corner", location: "Bac 3 · plant 1", days: 78 },
    { yieldGrams: 30, fruits: 9, events: 2, region: "Serre", location: "Rangée B · plant 1", days: 75 },
  ];
  const tomatoCatalog = defaultSeedCatalog().filter((entry) => String(entry.family || "").toLowerCase().includes("tomate"));
  const selectedEntries = tomatoCatalog.slice(0, profiles.length);
  const specs = profiles.map((profile, plantIndex) => {
    const entry = selectedEntries[plantIndex];
    const catalogPlant = entry ? catalogEntryToPlant(entry) : { name: `Variété tomate ${plantIndex + 1}`, type: "open", colors: ["red"], size: "moyen", shape: "rond", growth: "indeterminate", fruitType: "tranche", accent: "#d45434", catalogDetails: {} };
    return { ...catalogPlant, ...profile, name: entry?.name || catalogPlant.name, accent: catalogPlant.accent || "#d45434", catalogId: entry?.id || "", family: entry?.family || "Tomate (Solanum lycopersicum)", subfamily: entry?.subfamily || "", catalogDetails: cloneData(entry?.details || {}) };
  });

  const plants = specs.map((spec, plantIndex) => {
    const datePlanted = addDays("2026-03-23", (plantIndex * 3) % 14);
    const weights = splitTotal(spec.yieldGrams, spec.events, spec.forcedLast);
    const fruitCounts = splitTotal(spec.fruits, spec.events);
    const harvests = weights.map((weight, eventIndex) => {
      const spread = Math.round((eventIndex / Math.max(1, spec.events - 1)) * 42);
      const date = addDays("2026-06-11", spread + ((plantIndex * 2 + eventIndex) % 3));
      return {
        id: uid("harvest"),
        date,
        weight,
        fruits: fruitCounts[eventIndex],
        notes: eventIndex === spec.events - 1 && plantIndex === 4 ? "Les dernières grappes sont bien colorées." : "",
      };
    });
    return {
      id: `demo-${plantIndex + 1}`,
      name: spec.name,
      type: spec.type,
      colors: spec.colors,
      size: spec.size,
      shape: spec.shape,
      growth: spec.growth,
      fruitType: spec.fruitType,
      breeder: spec.breeder || "",
      seedSource: "Catalogue fourni · 2026",
      datePlanted,
      daysToMaturity: spec.days,
      season: 2026,
      region: spec.region,
      location: spec.location,
      notes: plantIndex === 2 ? "Très belle vigueur depuis la plantation." : "",
      status: "harvesting",
      accent: spec.accent,
      harvests,
      catalogId: spec.catalogId,
      family: spec.family,
      subfamily: spec.subfamily,
      catalogDetails: cloneData(spec.catalogDetails || {}),
      ...(spec.catalogRevision ? { catalogRevision: spec.catalogRevision } : {}),
    };
  });

  return {
    version: 4,
    currentSeason: 2026,
    lastExportAt: "",
    onboardingSeen: false,
    budgetSettings: { marketPricePerKg: 4.5, projectionRate: 1.15 },
    units: "metric",
    theme: "orbital",
    catalog: cloneData(defaultSeedCatalog()),
    regions: ["Bac surélevé", "Redwood Corner", "Zen Garden", "Serre"],
    seasons: [
      {
        year: 2026,
        start: "2026-05-26",
        end: "2026-07-23",
        status: "active",
        notes: "Une saison généreuse, avec une belle diversité issue du catalogue fourni.",
        highlights: [
          { icon: "scale", tone: "", title: "Première grosse récolte", text: `${specs[5]?.name || "Une tomate du catalogue"} · 500 g le 23 juillet` },
          { icon: "sun", tone: "green", title: `${plants.length} variétés du catalogue suivies`, text: "Des micro-naines aux espèces sauvages, avec leurs fiches détaillées." },
          { icon: "droplet", tone: "yellow", title: "Rythme de récolte", text: "Le pic de production est en cours." },
        ],
      },
    ],
    tasks: [
      { id: "demo-task-1", title: "Arroser doucement au pied", type: "watering", plantId: "demo-1", season: 2026, dueDate: "2026-08-29", amount: "2 L par plant", repeat: "weekly", notes: "Éviter de mouiller le feuillage.", done: false },
      { id: "demo-task-2", title: "Apport d'engrais tomates", type: "fertilization", plantId: "demo-3", season: 2026, dueDate: "2026-08-30", amount: "30 ml dilués dans 5 L d'eau", repeat: "biweekly", notes: "À faire après l'arrosage.", done: false },
      { id: "demo-task-3", title: "Attacher les nouvelles pousses", type: "pruning", plantId: "demo-5", season: 2026, dueDate: "2026-09-02", amount: "2 attaches souples", repeat: "once", notes: "Vérifier aussi les grappes basses.", done: false },
    ],
    photos: [],
    catalogPhotos: [],
    ratings: [
      { id: "demo-rating-1", plantId: "demo-1", season: 2026, date: "2026-07-22", overall: 5, taste: 5, sweetness: 5, acidity: 3, texture: 4, notes: "Très sucrée, parfaite à picorer directement sur le plant." },
      { id: "demo-rating-2", plantId: "demo-3", season: 2026, date: "2026-07-21", overall: 4, taste: 4, sweetness: 4, acidity: 3, texture: 5, notes: "Chair fondante et très parfumée." },
      { id: "demo-rating-3", plantId: "demo-5", season: 2026, date: "2026-07-23", overall: 4, taste: 4, sweetness: 3, acidity: 4, texture: 4, notes: "Bonne fraîcheur, jolie tenue en salade." },
    ],
    expenses: [
      { id: "demo-expense-1", date: "2026-02-18", season: 2026, category: "seeds", label: "Semences du catalogue", amount: 28.5, plantId: "", region: "", notes: "Variétés de la saison." },
      { id: "demo-expense-2", date: "2026-03-11", season: 2026, category: "soil", label: "Terreau et compost", amount: 42, plantId: "", region: "Bac surélevé", notes: "Préparation des bacs." },
      { id: "demo-expense-3", date: "2026-05-28", season: 2026, category: "fertilizer", label: "Engrais tomates", amount: 16.9, plantId: "demo-3", region: "Bac surélevé", notes: "Bidon pour la saison." },
      { id: "demo-expense-4", date: "2026-06-04", season: 2026, category: "equipment", label: "Attaches et tuteurs", amount: 12.4, plantId: "demo-5", region: "Zen Garden", notes: "Matériel réutilisable." },
    ],
    plans: [],
    candidates: [],
    seasonReviews: [],
    crosses: [],
    seedInventory: [],
    healthLogs: [],
    trash: [],
    plants,
  };
}
function buildBlankState() {
  const blank = buildDemoState();
  blank.plants = [];
  blank.regions = [];
  blank.tasks = [];
  blank.photos = [];
  blank.catalogPhotos = [];
  blank.ratings = [];
  blank.expenses = [];
  blank.plans = [];
  blank.candidates = [];
  blank.seasonReviews = [];
  blank.crosses = [];
  blank.seedInventory = [];
  blank.healthLogs = [];
  blank.trash = [];
  blank.seasons = [{ year: blank.currentSeason, start: `${blank.currentSeason}-01-01`, end: "", status: "active", notes: "", highlights: [] }];
  blank.onboardingSeen = true;
  return blank;
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.plants)) {
        const merged = { ...buildDemoState(), ...parsed };
        if (!Object.prototype.hasOwnProperty.call(parsed, "expenses") || !Array.isArray(merged.expenses)) merged.expenses = [];
        if (!Object.prototype.hasOwnProperty.call(parsed, "plans") || !Array.isArray(merged.plans)) merged.plans = [];
        if (!Object.prototype.hasOwnProperty.call(parsed, "candidates") || !Array.isArray(merged.candidates)) merged.candidates = [];
        if (!Object.prototype.hasOwnProperty.call(parsed, "seasonReviews") || !Array.isArray(merged.seasonReviews)) merged.seasonReviews = [];
        if (!Object.prototype.hasOwnProperty.call(parsed, "crosses") || !Array.isArray(merged.crosses)) merged.crosses = [];
        if (!Array.isArray(merged.catalog)) merged.catalog = cloneData(defaultSeedCatalog());
        if (!["orbital", "night"].includes(merged.theme)) merged.theme = "orbital";
        if (typeof merged.lastExportAt !== "string") merged.lastExportAt = "";
        if (!Array.isArray(merged.photos)) merged.photos = [];
        if (!Array.isArray(merged.catalogPhotos)) merged.catalogPhotos = [];
        if (!Array.isArray(merged.trash)) merged.trash = [];
        if (!Array.isArray(merged.seedInventory)) merged.seedInventory = [];
        if (!Array.isArray(merged.healthLogs)) merged.healthLogs = [];
        if (typeof merged.onboardingSeen !== "boolean") merged.onboardingSeen = false;
        const prune = pruneNonTomatoCatalog(merged.catalog);
        if (prune.removed.length) {
          merged.catalog = prune.kept;
          merged.trash = Array.isArray(merged.trash) ? merged.trash : [];
          prune.removed.forEach((entry) => {
            if (entry?.userAdded || entry?.crossId) {
              merged.trash.unshift({ id: uid("trash"), type: "catalog", label: entry.name || "Variété du catalogue", deletedAt: todayIso(), data: { entry: cloneData(entry) } });
            }
          });
          merged.catalogPrunedAt = todayIso();
          pendingCatalogPruneNotice = prune.removed.length;
        }
        pendingCatalogEnrichNotice += mergeReferenceCatalog(merged);
        pendingCatalogTypesNotice = migrateCatalogTypes(merged);
        if (!merged.budgetSettings || typeof merged.budgetSettings !== "object") merged.budgetSettings = { marketPricePerKg: 4.5, projectionRate: 1.15 };
        merged.budgetSettings.marketPricePerKg = Number(merged.budgetSettings.marketPricePerKg) > 0 ? Number(merged.budgetSettings.marketPricePerKg) : 4.5;
        merged.budgetSettings.projectionRate = Number(merged.budgetSettings.projectionRate) > 0 ? Number(merged.budgetSettings.projectionRate) : 1.15;
        return merged;
      }
    }
  } catch (error) {
    console.warn("Impossible de charger les données locales", error);
  }
  return buildDemoState();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageStatus.saveError = false;
    refreshStorageEstimate();
    return true;
  } catch (error) {
    storageStatus.saveError = true;
    console.warn("Impossible d'enregistrer les données locales", error);
    updateStorageIndicator();
    if (!storageWarningShown) {
      storageWarningShown = true;
      setTimeout(() => toast("Le stockage local est presque plein. Exportez une sauvegarde puis libérez de l'espace.", "error"), 0);
    }
    return false;
  }
}

function photoStorageSupported() {
  return typeof window !== "undefined" && Boolean(window.indexedDB);
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("indexeddb-request-failed"));
  });
}

function openPhotoDatabase() {
  if (window.TomatoPhotoStore?.open) return window.TomatoPhotoStore.open();
  if (!photoStorageSupported()) return Promise.reject(new Error("indexeddb-unavailable"));
  if (photoDbPromise) return photoDbPromise;
  photoDbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(PHOTO_DB_NAME, PHOTO_STORAGE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PHOTO_STORE_NAME)) database.createObjectStore(PHOTO_STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(request.error || new Error("indexeddb-open-failed"));
  }).catch((error) => {
    photoDbPromise = null;
    throw error;
  });
  return photoDbPromise;
}

async function putPhotoBlob(id, blob) {
  if (window.TomatoPhotoStore?.put) return window.TomatoPhotoStore.put(id, blob);
  const database = await openPhotoDatabase();
  const transaction = database.transaction(PHOTO_STORE_NAME, "readwrite");
  transaction.objectStore(PHOTO_STORE_NAME).put({ id, blob, updatedAt: new Date().toISOString() });
  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("indexeddb-write-failed"));
    transaction.onabort = () => reject(transaction.error || new Error("indexeddb-write-aborted"));
  });
  return blob;
}

async function getPhotoBlob(id) {
  if (!id || !photoStorageSupported()) return null;
  if (window.TomatoPhotoStore?.get) return window.TomatoPhotoStore.get(id);
  const database = await openPhotoDatabase();
  const transaction = database.transaction(PHOTO_STORE_NAME, "readonly");
  return idbRequest(transaction.objectStore(PHOTO_STORE_NAME).get(id)).then((record) => record?.blob || null);
}

async function deletePhotoBlob(id) {
  if (!id || !photoStorageSupported()) return;
  if (window.TomatoPhotoStore?.remove) return window.TomatoPhotoStore.remove(id);
  const database = await openPhotoDatabase();
  const transaction = database.transaction(PHOTO_STORE_NAME, "readwrite");
  transaction.objectStore(PHOTO_STORE_NAME).delete(id);
  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("indexeddb-delete-failed"));
    transaction.onabort = () => reject(transaction.error || new Error("indexeddb-delete-aborted"));
  });
}

function dataUrlToBlob(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) throw new Error("invalid-data-url");
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("invalid-data-url");
  const header = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  const mime = header.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";
  if (/;base64/i.test(header)) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(payload)], { type: mime });
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    if (!blob) { resolve(""); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("blob-read-failed"));
    reader.readAsDataURL(blob);
  });
}

function revokePhotoUrl(id) {
  const url = photoUrlCache.get(id);
  if (url && url.startsWith("blob:") && typeof URL !== "undefined") URL.revokeObjectURL(url);
  photoUrlCache.delete(id);
}

function photoSource(photo) {
  return photoUrlCache.get(photo?.id) || photo?.dataUrl || "";
}

function catalogPhotoSource(photo) {
  return catalogPhotoUrlCache.get(photo?.id) || photo?.dataUrl || "";
}

async function hydrateCatalogPhotoUrls() {
  if (!Array.isArray(state.catalogPhotos)) state.catalogPhotos = [];
  for (const photo of state.catalogPhotos) {
    if (photo.dataUrl) {
      catalogPhotoUrlCache.set(photo.id, photo.dataUrl);
      continue;
    }
    if (!photo.mediaId || !photoStorageSupported()) continue;
    try {
      const blob = await getPhotoBlob(photo.mediaId);
      if (blob) {
        const oldUrl = catalogPhotoUrlCache.get(photo.id);
        if (oldUrl?.startsWith("blob:")) URL.revokeObjectURL(oldUrl);
        catalogPhotoUrlCache.set(photo.id, URL.createObjectURL(blob));
        photo.bytes = blob.size;
        photo.mimeType = blob.type || photo.mimeType || "image/jpeg";
      }
    } catch (error) {
      storageStatus.mediaError = true;
      console.warn("Impossible de charger une photo de référence", error);
    }
  }
}

async function hydratePhotoUrls() {
  if (!Array.isArray(state.photos)) state.photos = [];
  for (const photo of state.photos) {
    if (photo.dataUrl) {
      photoUrlCache.set(photo.id, photo.dataUrl);
      continue;
    }
    if (!photo.mediaId || !photoStorageSupported()) continue;
    try {
      const blob = await getPhotoBlob(photo.mediaId);
      if (blob) {
        revokePhotoUrl(photo.id);
        photoUrlCache.set(photo.id, URL.createObjectURL(blob));
        photo.bytes = blob.size;
        photo.mimeType = blob.type || photo.mimeType || "image/jpeg";
      }
    } catch (error) {
      storageStatus.mediaError = true;
      console.warn("Impossible de charger une photo locale", error);
    }
  }
}

async function initializePhotoStorage() {
  if (!photoStorageSupported()) {
    storageStatus.indexedDB = false;
    await refreshStorageEstimate();
    updateStorageIndicator();
    return;
  }
  storageStatus.indexedDB = true;
  let migrated = false;
  try {
    await openPhotoDatabase();
    for (const photo of [...photoMetadataRecords(), ...catalogPhotoMetadataRecords()]) {
      if (photo.dataUrl) {
        const blob = dataUrlToBlob(photo.dataUrl);
        const mediaId = photo.mediaId || photo.id;
        await putPhotoBlob(mediaId, blob);
        photo.mediaId = mediaId;
        photo.bytes = blob.size;
        photo.mimeType = blob.type || "image/jpeg";
        delete photo.dataUrl;
        migrated = true;
      } else if (!photo.mediaId) {
        photo.mediaId = photo.id;
      }
    }
    await hydratePhotoUrls();
    await hydrateCatalogPhotoUrls();
    if (migrated) saveState();
    storageStatus.mediaError = false;
    await refreshStorageEstimate();
    updateStorageIndicator();
    render();
  } catch (error) {
    storageStatus.mediaError = true;
    console.warn("La migration IndexedDB des photos a échoué", error);
    updateStorageIndicator();
    if (!storageWarningShown) {
      storageWarningShown = true;
      setTimeout(() => toast("Les photos n'ont pas pu être déplacées vers le stockage sécurisé. Exportez vos données et vérifiez l'espace disponible.", "error"), 0);
    }
  }
}

async function purgePhotoMedia(ids = []) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  for (const id of uniqueIds) {
    const photo = (state.photos || []).find((item) => item.id === id);
    const mediaId = photo?.mediaId || id;
    try { await deletePhotoBlob(mediaId); } catch (error) { console.warn("Impossible de supprimer le fichier photo", error); }
    revokePhotoUrl(id);
    const catalogUrl = catalogPhotoUrlCache.get(id);
    if (catalogUrl?.startsWith("blob:")) URL.revokeObjectURL(catalogUrl);
    catalogPhotoUrlCache.delete(id);
  }
  await refreshStorageEstimate();
}

function trashPhotoIds(item) {
  if (!item) return [];
  if (item.type === "photo") return [item.data?.mediaId || item.data?.id];
  if (item.type === "plant") return (item.data?.photos || []).map((photo) => photo.mediaId || photo.id);
  if (item.type === "catalog") return [item.data?.catalogPhoto].filter(Boolean).map((photo) => photo.mediaId || photo.id);
  if (item.type === "backup") return [...(item.data?.snapshot?.photos || []), ...(item.data?.snapshot?.catalogPhotos || [])].map((photo) => photo.mediaId || photo.id);
  return [];
}

function catalogPhotoMetadataRecords() {
  const records = [...(state.catalogPhotos || [])];
  (state.trash || []).forEach((item) => {
    if (item.type === "catalog") {
      if (item.data?.catalogPhoto) records.push(item.data.catalogPhoto);
      if (item.data?.entry?.catalogPhoto) records.push(item.data.entry.catalogPhoto);
    }
    if (item.type === "backup") records.push(...(item.data?.snapshot?.catalogPhotos || []));
  });
  return [...new Map(records.filter((photo) => photo?.id).map((photo) => [photo.id, photo])).values()];
}

function photoMetadataRecords() {
  const records = [...(state.photos || [])];
  (state.trash || []).forEach((item) => {
    if (item.type === "photo" && item.data) records.push(item.data);
    if (item.type === "plant") records.push(...(item.data?.photos || []));
    if (item.type === "backup") records.push(...(item.data?.snapshot?.photos || []));
  });
  return [...new Map(records.filter((photo) => photo?.id).map((photo) => [photo.id, photo])).values()];
}

function formatStorageBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${Math.round(value)} o`;
  if (value < 1024 * 1024) return `${(value / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Ko`;
  return `${(value / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}

async function refreshStorageEstimate() {
  let used = 0;
  let quota = 0;
  try {
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      used = Number(estimate.usage || 0);
      quota = Number(estimate.quota || 0);
    } else if (typeof localStorage !== "undefined") {
      used = new Blob([localStorage.getItem(STORAGE_KEY) || ""]).size;
    }
  } catch (error) {
    console.warn("Impossible d'estimer le stockage", error);
  }
  storageStatus.used = used;
  storageStatus.quota = quota;
  storageStatus.photoCount = (state.photos || []).length;
  storageStatus.photoBytes = (state.photos || []).reduce((sum, photo) => sum + Number(photo.bytes || 0), 0);
  updateStorageIndicator();
  return storageStatus;
}

function storageStatusLabel() {
  const ratio = storageStatus.quota ? storageStatus.used / storageStatus.quota : 0;
  if (storageStatus.saveError || storageStatus.mediaError) return "Stockage à vérifier · export recommandé";
  const quotaLabel = storageStatus.quota ? `${formatStorageBytes(storageStatus.used)} / ${formatStorageBytes(storageStatus.quota)}` : formatStorageBytes(storageStatus.used);
  const photoLabel = storageStatus.photoCount ? ` · ${storageStatus.photoCount} photo${storageStatus.photoCount > 1 ? "s" : ""} séparée${storageStatus.photoCount > 1 ? "s" : ""}` : "";
  return `${ratio >= 0.85 ? "Stockage presque plein" : "Stockage local"} · ${quotaLabel}${photoLabel}`;
}

function updateStorageIndicator() {
  if (typeof document === "undefined") return;
  const label = storageStatusLabel();
  const ratio = storageStatus.quota ? storageStatus.used / storageStatus.quota : 0;
  document.querySelectorAll("[data-storage-status]").forEach((element) => {
    element.textContent = label;
    element.title = storageStatus.photoCount ? `${storageStatus.photoCount} photo${storageStatus.photoCount > 1 ? "s" : ""} en IndexedDB · ${formatStorageBytes(storageStatus.photoBytes)}${storageStatus.quota ? ` · quota global ${Math.round(ratio * 100)} % utilisé` : ""}` : "Les données restent dans ce navigateur.";
  });
  document.querySelectorAll("[data-storage-indicator]").forEach((element) => {
    element.classList.toggle("warning", Boolean(storageStatus.saveError || storageStatus.mediaError || (ratio && ratio >= 0.85)));
  });
  document.querySelectorAll("[data-export-reminder]").forEach((element) => { element.textContent = exportReminderText(); });
}

function seasonPlants(year = state.currentSeason) {
  return state.plants.filter((plant) => Number(plant.season) === Number(year));
}

function harvestEntries(year = state.currentSeason) {
  return seasonPlants(year).flatMap((plant) =>
    (plant.harvests || []).map((harvest) => ({ ...harvest, plant, plantName: plant.name }))
  );
}

function plantTotals(plant) {
  const harvests = plant.harvests || [];
  return {
    weight: roundWeight(harvests.reduce((sum, harvest) => sum + Number(harvest.weight || 0), 0)),
    fruits: harvests.reduce((sum, harvest) => sum + Number(harvest.fruits || 0), 0),
    harvests: harvests.length,
  };
}

function seasonStats(year = state.currentSeason) {
  const plants = seasonPlants(year);
  const entries = harvestEntries(year);
  const totalWeight = roundWeight(entries.reduce((sum, item) => sum + Number(item.weight || 0), 0));
  const totalFruits = entries.reduce((sum, item) => sum + Number(item.fruits || 0), 0);
  const producingPlants = plants.filter((plant) => (plant.harvests || []).length > 0);
  return {
    plants,
    entries,
    totalWeight,
    totalFruits,
    harvests: entries.length,
    varieties: producingPlants.length,
    activePlants: plants.filter((plant) => plant.status !== "finished").length,
  };
}

const taskMeta = {
  watering: { label: "Arrosage", icon: "droplet", tone: "blue" },
  fertilization: { label: "Fertilisation", icon: "leaf", tone: "green" },
  pruning: { label: "Taille / tuteurage", icon: "leaf", tone: "" },
  observation: { label: "Observation", icon: "info", tone: "yellow" },
  other: { label: "Autre", icon: "star", tone: "" },
};

const repeatMeta = {
  once: "Une fois",
  daily: "Tous les jours",
  weekly: "Chaque semaine",
  biweekly: "Toutes les 2 semaines",
};

const expenseMeta = {
  seeds: { label: "Semences et plants", tone: "yellow" },
  soil: { label: "Terreau / compost", tone: "green" },
  fertilizer: { label: "Engrais et soins", tone: "blue" },
  equipment: { label: "Matériel", tone: "" },
  water: { label: "Eau", tone: "blue" },
  other: { label: "Autre", tone: "" },
};

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function seasonExpenses(year = state.currentSeason) {
  return (state.expenses || []).filter((expense) => Number(expense.season || state.currentSeason) === Number(year));
}

function budgetStats(year = state.currentSeason) {
  const expenses = seasonExpenses(year);
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const categoryTotals = {};
  expenses.forEach((expense) => { const key = expenseMeta[expense.category] ? expense.category : "other"; categoryTotals[key] = (categoryTotals[key] || 0) + Number(expense.amount || 0); });
  const byCategory = Object.entries(categoryTotals).map(([key, amount]) => ({ label: expenseMeta[key]?.label || key, tone: expenseMeta[key]?.tone || "", amount })).filter((item) => item.amount > 0);
  const zones = {};
  const varieties = {};
  expenses.forEach((expense) => {
    const plant = expense.plantId ? findPlant(expense.plantId) : null;
    const zone = expense.region || plant?.region || "Sans zone";
    zones[zone] = (zones[zone] || 0) + Number(expense.amount || 0);
    const variety = plant?.name || "Général / non attribué";
    varieties[variety] = (varieties[variety] || 0) + Number(expense.amount || 0);
  });
  const settings = state.budgetSettings || { marketPricePerKg: 4.5, projectionRate: 1.15 };
  const yieldKg = seasonStats(year).totalWeight / 1000;
  const marketPricePerKg = Number(settings.marketPricePerKg) > 0 ? Number(settings.marketPricePerKg) : 4.5;
  const marketValue = yieldKg * marketPricePerKg;
  const projectedExpenses = total * (Number(settings.projectionRate) > 0 ? Number(settings.projectionRate) : 1.15);
  const projectedYieldKg = yieldKg * (Number(settings.projectionRate) > 0 ? Number(settings.projectionRate) : 1.15);
  return {
    expenses,
    total,
    yieldKg,
    marketPricePerKg,
    marketValue,
    savings: marketValue - total,
    projectedExpenses,
    projectedYieldKg,
    projectedMarketValue: projectedYieldKg * marketPricePerKg,
    byCategory: byCategory.sort((a, b) => b.amount - a.amount),
    zones: Object.entries(zones).map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount),
    varieties: Object.entries(varieties).map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount),
  };
}


const healthSymptomMeta = {
  mildew: { label: "Mildiou / maladie fongique", tone: "tomato" },
  aphids: { label: "Pucerons", tone: "yellow" },
  necrosis: { label: "Nécrose / taches", tone: "tomato" },
  deficiency: { label: "Carence", tone: "blue" },
  mites: { label: "Acariens", tone: "yellow" },
  whitefly: { label: "Aleurodes", tone: "yellow" },
  slug: { label: "Limaces / dégâts", tone: "green" },
  other: { label: "Autre symptôme", tone: "" },
};

const healthSeverityMeta = {
  observation: { label: "Observation", tone: "" },
  light: { label: "Léger", tone: "green" },
  moderate: { label: "Modéré", tone: "yellow" },
  severe: { label: "Sévère", tone: "tomato" },
};

function healthSymptomLabel(value) { return healthSymptomMeta[value]?.label || "Autre symptôme"; }
function healthSeverityLabel(value) { return healthSeverityMeta[value]?.label || "Observation"; }

function seedInventoryStats() {
  const items = state.seedInventory || [];
  const remaining = items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 0)), 0);
  const expired = items.filter((item) => item.viabilityDate && item.viabilityDate < todayIso() && Number(item.quantity || 0) > 0).length;
  const toBuy = candidatesForSeason(nextSeasonYear()).filter((candidate) => candidate.status === "to-buy" && !(items.some((item) => item.candidateId === candidate.id && Number(item.quantity || 0) > 0)));
  return { items, remaining, expired, toBuy };
}

function healthLogsForSeason(year = state.currentSeason) {
  return (state.healthLogs || []).filter((log) => Number(log.season || findPlant(log.plantId)?.season || state.currentSeason) === Number(year));
}

function healthPhotoForLog(log) {
  return (state.photos || []).find((photo) => photo.id === log.photoId) || null;
}

function smartReminderSuggestions(year = state.currentSeason) {
  const today = new Date(`${todayIso()}T12:00:00`);
  return seasonPlants(year).map((plant) => {
    if (!plant.datePlanted || !plant.daysToMaturity || (plant.harvests || []).length) return null;
    const expected = new Date(`${addDays(plant.datePlanted, Number(plant.daysToMaturity))}T12:00:00`);
    const days = Math.round((expected - today) / 86400000);
    return { plant, expected: isoDate(expected), days };
  }).filter(Boolean).filter((item) => item.days <= 21 && item.days >= -45).sort((a, b) => Math.abs(a.days) - Math.abs(b.days)).slice(0, 5);
}

function smartReminderText(item) {
  if (item.days > 1) return `${item.plant.name} devrait commencer à produire dans environ ${item.days} jours.`;
  if (item.days === 1) return `${item.plant.name} pourrait commencer à produire demain.`;
  if (item.days === 0) return `${item.plant.name} arrive à maturité estimée aujourd'hui.`;
  return `${item.plant.name} a dépassé sa maturité estimée de ${Math.abs(item.days)} jour${Math.abs(item.days) > 1 ? "s" : ""}.`;
}

function selectedPlants() {
  return [...selectedPlantIds].map((id) => findPlant(id)).filter(Boolean);
}

function plantTrashPayload(plant) {
  return {
    plant,
    tasks: (state.tasks || []).filter((task) => task.plantId === plant.id),
    photos: (state.photos || []).filter((photo) => photo.plantId === plant.id),
    ratings: (state.ratings || []).filter((rating) => rating.plantId === plant.id),
    seasonReviews: (state.seasonReviews || []).filter((review) => review.plantId === plant.id),
    expenses: (state.expenses || []).filter((expense) => expense.plantId === plant.id),
    healthLogs: (state.healthLogs || []).filter((log) => log.plantId === plant.id),
  };
}

function removePlantRelations(plantIds) {
  const ids = new Set(plantIds);
  state.plants = (state.plants || []).filter((plant) => !ids.has(plant.id));
  state.tasks = (state.tasks || []).filter((task) => !ids.has(task.plantId));
  state.photos = (state.photos || []).filter((photo) => !ids.has(photo.plantId));
  state.ratings = (state.ratings || []).filter((rating) => !ids.has(rating.plantId));
  state.seasonReviews = (state.seasonReviews || []).filter((review) => !ids.has(review.plantId));
  state.expenses = (state.expenses || []).filter((expense) => !ids.has(expense.plantId));
  state.healthLogs = (state.healthLogs || []).filter((log) => !ids.has(log.plantId));
}

function undoTrashBatch(ids) {
  closeModal();
  ids.forEach((id) => restoreTrashItem(id));
  toast(`${ids.length} fiche${ids.length > 1 ? "s" : ""} restaurée${ids.length > 1 ? "s" : ""}.`);
}

function renderBulkToolbar(plants) {
  const zones = [...new Set([...(state.regions || []), ...seasonPlants().map((plant) => plant.region).filter(Boolean)])].sort((a, b) => a.localeCompare(b, "fr"));
  const selected = selectedPlants();
  return `<section class="bulk-toolbar"><div class="bulk-toolbar-heading"><div><strong>Sélection multiple</strong><span>${selected.length} plante${selected.length > 1 ? "s" : ""} sélectionnée${selected.length > 1 ? "s" : ""}</span></div><button class="button ghost" data-action="clear-plant-selection" type="button">Fermer</button></div><div class="bulk-toolbar-controls"><label class="bulk-select-all"><input id="bulk-select-all" type="checkbox" ${plants.length && plants.every((plant) => selectedPlantIds.has(plant.id)) ? "checked" : ""} /> Tout sélectionner</label><select id="bulk-operation" aria-label="Action groupée"><option value="status">Changer le statut</option><option value="zone">Changer la zone</option><option value="archive">Archiver / terminer</option><option value="compare">Comparer les plants</option><option value="delete">Supprimer</option></select><select id="bulk-status" aria-label="Nouveau statut"><option value="growing">En croissance</option><option value="harvesting">En récolte</option><option value="finished">Terminée</option></select><select id="bulk-zone" aria-label="Nouvelle zone"><option value="">Sans zone</option>${zones.map((zone) => `<option value="${escapeHTML(zone)}">${escapeHTML(zone)}</option>`).join("")}<option value="__new__">＋ Nouvelle zone…</option></select><button class="button primary" data-action="apply-bulk-action" type="button">${icon("check")} Appliquer</button></div><p class="form-help">Les suppressions groupées utilisent la corbeille et demandent deux confirmations.</p></section>`;
}

function renderSmartReminderPanel(year = state.currentSeason) {
  const suggestions = smartReminderSuggestions(year);
  if (!suggestions.length) return "";
  return `<section class="panel smart-reminders-panel"><div class="panel-header"><div><h2>Rappels intelligents</h2><p>Dates de plantation et maturité estimée du catalogue.</p></div><span class="panel-link">${suggestions.length} suggestion${suggestions.length > 1 ? "s" : ""}</span></div><div class="smart-reminder-list">${suggestions.map((item) => `<div class="smart-reminder-row"><span class="smart-reminder-icon">${icon("calendar")}</span><div><strong>${escapeHTML(item.plant.name)}</strong><small>${escapeHTML(smartReminderText(item))} · autour du ${formatDate(item.expected)}</small></div><button class="button ghost" data-action="smart-log-harvest" data-id="${escapeHTML(item.plant.id)}" type="button">Noter</button></div>`).join("")}</div></section>`;
}

function toggleBulkMode() {
  bulkMode = !bulkMode;
  if (!bulkMode) selectedPlantIds.clear();
  render();
}

function togglePlantSelection(element) {
  const id = element.dataset.id;
  if (!id) return;
  if (selectedPlantIds.has(id)) selectedPlantIds.delete(id);
  else selectedPlantIds.add(id);
  render();
}

function visibleGardenPlants() {
  let plants = seasonPlants().filter((plant) => gardenFilter === "all" || plant.status !== "finished");
  if (selectedRegion !== "Toutes les zones") plants = plants.filter((plant) => plant.region === selectedRegion);
  return plants;
}

function applyBulkAction() {
  const plants = selectedPlants();
  if (!plants.length) { toast("Sélectionnez au moins une plante.", "error"); return; }
  const operation = document.getElementById("bulk-operation")?.value || "status";
  if (operation === "compare") {
    openModal(renderPlantComparison(plants));
    return;
  }
  if (operation === "delete") {
    if (!confirmTwice(`${plants.length} plante${plants.length > 1 ? "s" : ""}`, "Les fiches, récoltes et éléments associés seront déplacés dans la corbeille.")) return;
    const trashIds = plants.map((plant) => moveToTrash("plant", plant.name, plantTrashPayload(plant)));
    removePlantRelations(plants.map((plant) => plant.id));
    selectedPlantIds.clear(); bulkMode = false;
    saveState(); render();
    toast(`${plants.length} fiche${plants.length > 1 ? "s" : ""} déplacée${plants.length > 1 ? "s" : "e"} dans la corbeille.`, "success", { label: "Annuler", onClick: () => undoTrashBatch(trashIds) });
    return;
  }
  if (operation === "archive") {
    plants.forEach((plant) => { plant.status = "finished"; });
    toast(`${plants.length} plante${plants.length > 1 ? "s" : ""} archivée${plants.length > 1 ? "s" : "e"}.`);
  } else if (operation === "status") {
    const status = document.getElementById("bulk-status")?.value || "growing";
    plants.forEach((plant) => { plant.status = status; });
    toast(`Statut mis à jour pour ${plants.length} plante${plants.length > 1 ? "s" : ""}.`);
  } else if (operation === "zone") {
    let zone = document.getElementById("bulk-zone")?.value || "";
    if (zone === "__new__") zone = window.prompt("Nom de la nouvelle zone", "Mon nouveau bac")?.trim() || "";
    if (!zone) { toast("Choisissez ou créez une zone.", "error"); return; }
    state.regions = state.regions || [];
    if (!state.regions.some((item) => item.toLowerCase() === zone.toLowerCase())) state.regions.push(zone);
    plants.forEach((plant) => { plant.region = zone; });
    toast(`Zone « ${zone} » appliquée à ${plants.length} plante${plants.length > 1 ? "s" : ""}.`);
  }
  selectedPlantIds.clear();
  saveState(); render();
}

function renderPlantComparison(plants = selectedPlants()) {
  const rows = plants.map((plant) => {
    const totals = plantTotals(plant);
    const harvests = [...(plant.harvests || [])].sort((a, b) => a.date.localeCompare(b.date));
    const rating = ratingAverage(plant.id);
    const firstHarvest = harvests[0];
    const days = firstHarvest && plant.datePlanted ? Math.round((new Date(`${firstHarvest.date}T12:00:00`) - new Date(`${plant.datePlanted}T12:00:00`)) / 86400000) : null;
    return { plant, totals, rating, firstHarvest, days };
  });
  return `<div class="modal-backdrop"><div class="modal comparison-modal" role="dialog" aria-modal="true" aria-labelledby="plant-comparison-title"><div class="modal-header"><div><span class="eyebrow">COMPARAISON DE PERFORMANCE</span><h2 id="plant-comparison-title">Comparer ${rows.length} plant${rows.length > 1 ? "s" : ""}</h2><p>Poids, précocité et goût pour choisir les meilleurs parents de croisement.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><div class="modal-body"><div class="comparison-table-wrap"><table class="comparison-table"><thead><tr><th>Plant</th><th>Variété / zone</th><th>Poids</th><th>Fruits</th><th>Première récolte</th><th>Précocité</th><th>Goût</th><th>État</th></tr></thead><tbody>${rows.map((row) => `<tr><th scope="row">${escapeHTML(row.plant.name)}</th><td>${escapeHTML([row.plant.family, row.plant.region].filter(Boolean).join(" · ") || "Sans zone")}</td><td>${formatWeight(row.totals.weight)}</td><td>${row.totals.fruits || "—"}</td><td>${row.firstHarvest ? formatDate(row.firstHarvest.date) : "—"}</td><td>${row.days != null ? `${row.days} j` : "—"}</td><td>${row.rating ? `${formatNumber(row.rating, 1)} / 5` : "—"}</td><td>${statusBadge(row.plant)}</td></tr>`).join("") || `<tr><td colspan="8" class="no-results">Sélectionnez au moins une plante.</td></tr>`}</tbody></table></div><p class="form-help">La précocité est calculée entre la date de plantation et la première récolte enregistrée. Les plants sans récolte restent comparables mais affichent « — ».</p><div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Fermer</button><button class="button primary" data-action="open-crosses" type="button">${icon("leaf")} Ouvrir les croisements</button></div></div></div></div>`;
}

function seasonTasks(year = state.currentSeason) {
  return (state.tasks || []).filter((task) => {
    const plant = task.plantId ? findPlant(task.plantId) : null;
    return Number(task.season || plant?.season || state.currentSeason) === Number(year);
  });
}

function nextSeasonYear() {
  return Number(state.currentSeason) + 1;
}

function candidateStatusLabel(status) {
  return candidateStatusMeta[status]?.label || "Candidate";
}

function candidateById(id) {
  return (state.candidates || []).find((candidate) => candidate.id === id);
}

function candidatesForSeason(year = nextSeasonYear()) {
  return (state.candidates || []).filter((candidate) => Number(candidate.season || nextSeasonYear()) === Number(year));
}

function candidateForCatalog(catalogId, season = nextSeasonYear()) {
  return candidatesForSeason(season).find((candidate) => candidate.catalogId && candidate.catalogId === catalogId);
}

function candidateForPlant(plant, season = nextSeasonYear()) {
  if (!plant) return null;
  return candidatesForSeason(season).find((candidate) => (plant.catalogId && candidate.catalogId === plant.catalogId) || (candidate.name === plant.name && (!candidate.family || candidate.family === plant.family)));
}

function crossById(id) {
  return (state.crosses || []).find((cross) => cross.id === id);
}

function crossStatusLabel(status) {
  return crossStatusMeta[status]?.label || "Prévu";
}

function crossParentLabel(parent) {
  return parent?.name || "Parent non renseigné";
}

function crossParentFromRef(ref, manualName) {
  const name = String(manualName || "").trim();
  if (String(ref || "").startsWith("plant:")) {
    const plant = findPlant(String(ref).slice(6));
    if (plant) return { ref, plantId: plant.id, catalogId: plant.catalogId || "", name: plant.name, family: plant.family || "", subfamily: plant.subfamily || "" };
  }
  if (String(ref || "").startsWith("catalog:")) {
    const entry = catalogEntryById(String(ref).slice(8));
    if (entry) return { ref, catalogId: entry.id || "", name: entry.name, family: entry.family || "", subfamily: entry.subfamily || "" };
  }
  return { ref: "manual", name, family: "", subfamily: "" };
}

function crossParentOptionsHTML(selectedRef = "") {
  const plants = [...(state.plants || [])].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const catalog = [...currentSeedCatalog()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return `<option value="" ${!selectedRef || selectedRef === "manual" ? "selected" : ""}>Saisie manuelle</option><optgroup label="Plantes du potager">${plants.map((plant) => { const ref = `plant:${plant.id}`; return `<option value="${escapeHTML(ref)}" ${selectedRef === ref ? "selected" : ""}>${escapeHTML(plant.name)}${plant.region ? ` · ${escapeHTML(plant.region)}` : ""}</option>`; }).join("")}</optgroup><optgroup label="Catalogue de semences">${catalog.map((entry) => { const ref = `catalog:${entry.id || entry.catalogIndex}`; return `<option value="${escapeHTML(ref)}" ${selectedRef === ref ? "selected" : ""}>${escapeHTML(entry.name)} · ${escapeHTML(entry.family || "Famille non précisée")}</option>`; }).join("")}</optgroup>`;
}

function crossCatalogEntryFromCross(cross, existing = null) {
  const female = crossParentLabel(cross.femaleParent);
  const male = crossParentLabel(cross.maleParent);
  const generation = cross.generation || "F1";
  const parentEntries = [cross.femaleParent, cross.maleParent].map((parent) => parent?.catalogId ? catalogEntryById(parent.catalogId) : null).filter(Boolean);
  const colors = [...new Set(parentEntries.flatMap((entry) => catalogColors(entry)))].slice(0, 3);
  const details = Object.fromEntries([
    ["description_histoire_particularités", `Lignée issue du croisement ${female} × ${male}.`],
    ["croisement_parents", `${female} × ${male}`],
    ["génération", generation],
    ["statut_de_sélection", crossStatusLabel(cross.status)],
    ["stabilité", crossStabilityMeta[cross.stability] || "En observation"],
    ["date_du_croisement", cross.crossedDate || cross.plannedDate || ""],
    ["date_des_graines", cross.seedDate || ""],
    ["nombre_de_graines", cross.seedQuantity ? String(cross.seedQuantity) : ""],
    ["plants_sélectionnés", cross.selectedCount ? String(cross.selectedCount) : ""],
    ["caractères_recherchés", cross.traits || ""],
    ["fruit_obtenu", cross.fruitNotes || ""],
    ["sélection", cross.selectedNotes || ""],
    ["observations", cross.notes || ""],
  ].filter(([, value]) => value));
  return {
    id: existing?.id || "",
    ...(existing?.catalogIndex ? { catalogIndex: existing.catalogIndex } : {}),
    name: cross.name,
    family: cross.family || "Tomate (Solanum lycopersicum)",
    subfamily: catalogSubfamily(cross),
    details,
    plantDefaults: {
      type: "open",
      fruitType: "Lignée issue d'un croisement",
      size: "",
      shape: "",
      growth: "",
      daysToMaturity: 75,
      breeder: "Croisement personnel",
      colors: colors.length ? colors : ["red"],
    },
    userAdded: true,
    source: "cross",
    crossId: cross.id,
  };
}

function candidateDataFromCross(cross, catalogId = "", existing = null) {
  const status = cross.status === "retained" ? "keep" : cross.status === "discarded" ? "discard" : (existing?.status || "candidate");
  return {
    season: Number(cross.targetSeason) || nextSeasonYear(),
    catalogId,
    name: cross.name,
    family: cross.family || "Tomate (Solanum lycopersicum)",
    subfamily: cross.subfamily || `Lignée ${cross.generation || "F1"}`,
    status,
    priority: existing?.priority || "medium",
    quantity: existing?.quantity || (cross.seedQuantity ? `${cross.seedQuantity} graines` : ""),
    notes: cross.notes || cross.traits || "",
    source: "croisement",
    crossId: cross.id,
    updatedAt: todayIso(),
  };
}

function ensureCrossOutputs(cross) {
  state.catalog = Array.isArray(state.catalog) ? state.catalog : cloneData(defaultSeedCatalog());
  state.candidates = state.candidates || [];
  if (cross.createCatalog !== false) {
    let entry = cross.catalogId ? catalogEntryById(cross.catalogId) : state.catalog.find((item) => item.crossId === cross.id);
    const entryData = crossCatalogEntryFromCross(cross, entry);
    if (entry) Object.assign(entry, entryData, { id: entry.id, catalogIndex: entry.catalogIndex });
    else {
      const numericIndexes = state.catalog.map((item) => Number(item.catalogIndex)).filter((value) => Number.isFinite(value));
      entry = { ...entryData, id: uid("catalog-cross"), catalogIndex: Math.max(0, ...numericIndexes) + 1 };
      state.catalog.unshift(entry);
    }
    cross.catalogId = entry.id;
  }
  if (cross.createCandidate !== false) {
    const existing = (state.candidates || []).find((candidate) => candidate.crossId === cross.id) || (cross.candidateId ? candidateById(cross.candidateId) : null);
    const candidateData = candidateDataFromCross(cross, cross.catalogId || existing?.catalogId || "", existing);
    if (existing) {
      Object.assign(existing, candidateData, { id: existing.id, createdAt: existing.createdAt || todayIso() });
      cross.candidateId = existing.id;
    } else {
      const candidate = { id: uid("candidate"), createdAt: todayIso(), ...candidateData };
      state.candidates.unshift(candidate);
      cross.candidateId = candidate.id;
    }
  }
}

function seasonReviewForPlant(plantId, season = state.currentSeason) {
  return (state.seasonReviews || []).find((review) => review.plantId === plantId && Number(review.season || season) === Number(season));
}

function reviewHasContent(review) {
  return Boolean(review && [review.overall, review.taste, review.vigor, review.earliness, review.quantity, review.notes].some((value) => String(value || "").trim()));
}

function reviewValueLabel(type, value) {
  if (!value) return "Non renseigné";
  return qualitativeMeta[type]?.[value] || String(value);
}

function seasonStatusLabel(season) {
  const status = season?.status || (season?.end ? "incomplete" : "active");
  return seasonStatusMeta[status]?.label || seasonStatusMeta.active.label;
}

function taskDueLabel(task) {
  if (!task.dueDate) return "Sans date";
  if (task.dueDate === todayIso()) return "Aujourd’hui";
  if (task.dueDate === addDays(todayIso(), 1)) return "Demain";
  return formatDateShort(task.dueDate);
}

function taskIsLate(task) {
  return !task.done && task.dueDate && task.dueDate < todayIso();
}

function getPlantRatings(plantId) {
  return (state.ratings || []).filter((rating) => rating.plantId === plantId).sort((a, b) => b.date.localeCompare(a.date));
}

function ratingAverage(plantId) {
  const ratings = getPlantRatings(plantId);
  if (!ratings.length) return 0;
  return ratings.reduce((sum, rating) => sum + Number(rating.overall || 0), 0) / ratings.length;
}

function renderStars(value, small = false) {
  const rounded = Math.round(Number(value || 0));
  return `<span class="rating-stars ${small ? "small" : ""}" aria-label="${formatNumber(value, 1)} sur 5">${[1, 2, 3, 4, 5].map((item) => `<span class="${item <= rounded ? "filled" : ""}">★</span>`).join("")}</span>`;
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function moveToTrash(type, label, data) {
  state.trash = state.trash || [];
  const item = { id: uid("trash"), type, label, deletedAt: todayIso(), data: cloneData(data) };
  state.trash.unshift(item);
  return item.id;
}

function trashTypeLabel(type) {
  return ({ plant: "Plante", region: "Zone", harvest: "Récolte", task: "Tâche", photo: "Photo", rating: "Dégustation", season: "Saison", expense: "Dépense", candidate: "Candidat de saison", cross: "Croisement / lignée", catalog: "Variété du catalogue", seed: "Stock de graines", health: "Observation sanitaire", backup: "Sauvegarde" })[type] || "Élément";
}

function restoreTrashItem(trashId) {
  const item = (state.trash || []).find((entry) => entry.id === trashId);
  if (!item) return null;
  state.plants = state.plants || [];
  state.tasks = state.tasks || [];
  state.photos = state.photos || [];
  state.ratings = state.ratings || [];
  state.expenses = state.expenses || [];
  state.candidates = state.candidates || [];
  state.crosses = state.crosses || [];
  state.seasonReviews = state.seasonReviews || [];
  state.regions = state.regions || [];
  state.catalog = state.catalog || [];
  state.seedInventory = state.seedInventory || [];
  state.healthLogs = state.healthLogs || [];

  if (item.type === "plant") {
    if (!findPlant(item.data.plant.id)) state.plants.push(item.data.plant);
    (item.data.tasks || []).forEach((task) => { if (!state.tasks.some((current) => current.id === task.id)) state.tasks.push(task); });
    (item.data.photos || []).forEach((photo) => { if (!state.photos.some((current) => current.id === photo.id)) state.photos.push(photo); });
    (item.data.ratings || []).forEach((rating) => { if (!state.ratings.some((current) => current.id === rating.id)) state.ratings.push(rating); });
    (item.data.seasonReviews || []).forEach((review) => { if (!state.seasonReviews.some((current) => current.id === review.id)) state.seasonReviews.push(review); });
    (item.data.expenses || []).forEach((expense) => { if (!state.expenses.some((current) => current.id === expense.id)) state.expenses.push(expense); });
    (item.data.healthLogs || []).forEach((log) => { if (!state.healthLogs.some((current) => current.id === log.id)) state.healthLogs.push(log); });
  } else if (item.type === "region") {
    if (!state.regions.includes(item.data.region)) state.regions.push(item.data.region);
    (item.data.assignments || []).forEach((assignment) => {
      const plant = findPlant(assignment.plantId);
      if (plant) plant.region = item.data.region;
    });
  } else if (item.type === "harvest") {
    const plant = findPlant(item.data.plantId);
    if (plant && !(plant.harvests || []).some((harvest) => harvest.id === item.data.harvest.id)) {
      plant.harvests = plant.harvests || [];
      plant.harvests.push(item.data.harvest);
    }
  } else if (item.type === "task") {
    if (!state.tasks.some((task) => task.id === item.data.id)) state.tasks.push(item.data);
  } else if (item.type === "photo") {
    if (!state.photos.some((photo) => photo.id === item.data.id)) state.photos.push(item.data);
  } else if (item.type === "rating") {
    if (!state.ratings.some((rating) => rating.id === item.data.id)) state.ratings.push(item.data);
  } else if (item.type === "expense") {
    if (!state.expenses.some((expense) => expense.id === item.data.id)) state.expenses.push(item.data);
  } else if (item.type === "candidate") {
    if (!state.candidates.some((candidate) => candidate.id === item.data.id)) state.candidates.push(item.data);
  } else if (item.type === "cross") {
    if (!state.crosses.some((cross) => cross.id === item.data.cross.id)) state.crosses.push(item.data.cross);
    if (item.data.catalogEntry && !catalogEntryById(item.data.catalogEntry.id)) state.catalog.push(item.data.catalogEntry);
    (item.data.candidates || []).forEach((candidate) => { if (!state.candidates.some((current) => current.id === candidate.id)) state.candidates.push(candidate); });
  } else if (item.type === "seed") {
    if (!state.seedInventory.some((seed) => seed.id === item.data.id)) state.seedInventory.push(item.data);
  } else if (item.type === "health") {
    if (!state.healthLogs.some((log) => log.id === item.data.id)) state.healthLogs.push(item.data);
  } else if (item.type === "catalog") {
    const restoredEntry = item.data?.entry || item.data;
    const restoredPhoto = item.data?.catalogPhoto || restoredEntry?.catalogPhoto;
    if (restoredEntry && !catalogEntryById(restoredEntry.id)) state.catalog.push(restoredEntry);
    if (restoredPhoto && !state.catalogPhotos.some((photo) => photo.id === restoredPhoto.id)) state.catalogPhotos.push(restoredPhoto);
  } else if (item.type === "season") {
    if (!state.seasons.some((season) => Number(season.year) === Number(item.data.year))) state.seasons.push(item.data);
  } else if (item.type === "backup") {
    state = cloneData(item.data.snapshot);
    state.catalog = Array.isArray(state.catalog) ? state.catalog : cloneData(defaultSeedCatalog());
    state.trash = state.trash || [];
  }

  state.trash = state.trash.filter((entry) => entry.id !== trashId);
  migrateCatalogTypes(state);
  saveState();
  render();
  if (item.type === "photo" || item.type === "plant" || item.type === "catalog" || item.type === "backup") void initializePhotoStorage();
  return item;
}

function plantAccent(plant) {
  return plantColorBackground(plant);
}

function statusBadge(plant) {
  const meta = statusMeta[plant.status] || statusMeta.growing;
  return `<span class="status-badge ${meta.className}"><span class="tiny-dot"></span>${meta.label}</span>`;
}

function renderStatCard(value, label, iconName, tone = "") {
  return `<div class="stat-card">
    <div class="stat-icon ${tone}">${icon(iconName)}</div>
    <div class="stat-value">${value}</div>
    <div class="stat-label">${label}</div>
  </div>`;
}

function renderPageHeading(title, subtitle, action = "") {
  return `<div class="page-heading">
    <div><h1>${escapeHTML(title)}</h1><p>${escapeHTML(subtitle)}</p></div>
    ${action ? `<div class="heading-actions">${action}</div>` : ""}
  </div>`;
}

function renderSeasonPills() {
  const seasons = [...new Set(state.seasons.map((season) => season.year).concat(state.plants.map((plant) => plant.season)))].sort((a, b) => b - a);
  return `<div class="filter-row">
    <span class="section-label" style="margin-right:4px">SAISON</span>
    ${seasons.map((year) => `<button class="pill ${Number(year) === Number(state.currentSeason) ? "active" : ""}" data-action="select-season" data-year="${year}" type="button">${year}</button>`).join("")}
    <button class="pill" data-action="add-season" type="button">${icon("plus")} Nouvelle saison</button>
  </div>`;
}

function renderTaskRow(task, compact = false) {
  const plant = task.plantId ? findPlant(task.plantId) : null;
  const meta = taskMeta[task.type] || taskMeta.other;
  const details = [task.amount, plant?.name].filter(Boolean).join(" · ");
  return `<div class="task-row ${task.done ? "completed" : ""}" data-task-row="${escapeHTML(task.id)}"><button class="task-check" data-action="toggle-task" data-id="${escapeHTML(task.id)}" type="button" aria-label="${task.done ? "Marquer comme à faire" : "Marquer comme terminé"}">${task.done ? icon("check") : ""}</button><div class="task-main"><div class="task-title">${escapeHTML(task.title)}</div><div class="task-meta"><span class="task-type ${meta.tone || ""}">${icon(meta.icon)} ${meta.label}</span>${details ? `<span>${escapeHTML(details)}</span>` : ""}${task.repeat && task.repeat !== "once" ? `<span>· ${escapeHTML(repeatMeta[task.repeat] || task.repeat)}</span>` : ""}</div>${!compact && task.notes ? `<div class="task-notes">${escapeHTML(task.notes)}</div>` : ""}</div><div class="task-due ${taskIsLate(task) ? "late" : ""} ${task.done ? "done" : ""}">${task.done ? "Terminée" : taskDueLabel(task)}</div>${!compact ? `<div class="task-actions"><button class="mini-button" data-action="edit-task" data-id="${escapeHTML(task.id)}" type="button" title="Modifier">${icon("edit")}</button><button class="mini-button" data-action="delete-task" data-id="${escapeHTML(task.id)}" type="button" title="Supprimer">${icon("trash")}</button></div>` : ""}</div>`;
}

function renderTasksPanel() {
  const tasks = seasonTasks().sort((a, b) => Number(a.done) - Number(b.done) || String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999"))).slice(0, 4);
  const pending = seasonTasks().filter((task) => !task.done).length;
  return `<section class="panel tasks-panel"><div class="panel-header"><div><h2>À faire au potager <span class="counter-badge" data-pending-task-count>${pending}</span></h2><p>Arrosage, fertilisation et petites attentions.</p></div><div style="display:flex;gap:7px"><button class="button secondary" data-action="open-tasks" type="button">Voir tout</button><button class="button primary" data-action="add-task" type="button">${icon("plus")} Ajouter</button></div></div>${tasks.length ? `<div class="task-list">${tasks.map((task) => renderTaskRow(task, true)).join("")}</div>` : `<div class="no-results">Aucune tâche programmée. Ajoutez votre prochain geste de culture.</div>`}</section>`;
}

function renderGarden() {
  const stats = seasonStats();
  const regions = ["Toutes les zones", ...new Set(seasonPlants().map((plant) => plant.region).filter(Boolean))];
  let plants = stats.plants.filter((plant) => gardenFilter === "all" || plant.status !== "finished");
  if (selectedRegion !== "Toutes les zones") plants = plants.filter((plant) => plant.region === selectedRegion);

  const action = `<button class="button primary" data-action="add-plant" type="button">${icon("plus")} Ajouter une plante</button>`;
  return `${renderPageHeading(pageMeta.garden.title, `Saison ${state.currentSeason} · ${stats.activePlants} plantes suivies`, action)}
    ${renderSeasonPills()}
    <div class="filter-row">
      <span class="section-label" style="margin-right:4px">ZONE</span>
      ${regions.map((region) => `<button class="pill ${selectedRegion === region ? "active" : ""}" data-action="select-region" data-region="${escapeHTML(region)}" type="button">${escapeHTML(region)}</button>`).join("")}
      <button class="pill" data-action="manage-regions" type="button">${icon("settings")} Gérer les zones</button>
    </div>
    <div class="stat-grid">
      ${renderStatCard(formatNumber(stats.activePlants), "PLANTES ACTIVES", "leaf", "green")}
      ${renderStatCard(formatWeight(stats.totalWeight), "TOTAL RÉCOLTÉ", "scale", "")}
      ${renderStatCard(formatNumber(stats.totalFruits), "FRUITS", "fruit", "yellow")}
      ${renderStatCard(formatNumber(stats.harvests), "RÉCOLTES", "calendar", "blue")}
    </div>
    <div class="garden-toolbar">
      <div class="count"><strong>${plants.length}</strong> plante${plants.length > 1 ? "s" : ""} affichée${plants.length > 1 ? "s" : ""}</div>
      <div class="garden-toolbar-right">
        <div class="filter-row" style="margin:0">
          <button class="pill ${gardenFilter === "active" ? "active" : ""}" data-action="garden-filter" data-filter="active" type="button">En cours</button>
          <button class="pill ${gardenFilter === "all" ? "active" : ""}" data-action="garden-filter" data-filter="all" type="button">Toutes</button>
        </div>
        <div class="view-toggle" aria-label="Choisir l'affichage">
          <button class="${viewMode === "grid" ? "active" : ""}" data-action="view-mode" data-mode="grid" type="button" aria-label="Grille">${icon("menu")}</button>
          <button class="${viewMode === "list" ? "active" : ""}" data-action="view-mode" data-mode="list" type="button" aria-label="Liste">${icon("yields")}</button>
        </div>
        <button class="pill ${bulkMode ? "active" : ""}" data-action="toggle-bulk-mode" type="button">${icon("check")} Sélectionner</button>
      </div>
    </div>
    ${bulkMode ? renderBulkToolbar(plants) : ""}
    ${plants.length ? `<div class="plant-grid ${viewMode === "list" ? "list-mode" : ""}">${plants.map(renderPlantCard).join("")}</div>` : renderEmptyGarden()}
    <div style="height:17px"></div>
    ${renderTasksPanel()}
    <div style="height:17px"></div>
    ${(() => { const reminders = renderSmartReminderPanel(); return `${reminders}${reminders ? `<div style="height:17px"></div>` : ""}`; })()}
    ${renderRecentHarvestPanel(stats.entries)}`;
}

function renderEmptyGarden() {
  return `<div class="empty-state"><div><div class="empty-illustration"><img src="assets/icon-192.png" alt="" /></div><h3>${selectedRegion === "Toutes les zones" ? "Votre potager est vide" : "Aucune plante dans cette zone"}</h3><p>Ajoutez vos plants de tomates pour commencer à suivre leur croissance, leurs variétés et leurs récoltes.</p><button class="button primary" data-action="add-plant" type="button">${icon("plus")} Ajouter ma première plante</button></div></div>`;
}

function renderPlantCard(plant) {
  const totals = plantTotals(plant);
  const color = plantAccent(plant);
  const region = plant.region || "Zone non renseignée";
  const selected = selectedPlantIds.has(plant.id);
  return `<article class="plant-card ${selected ? "bulk-selected" : ""}" style="--accent:${color}" data-action="open-plant" data-id="${escapeHTML(plant.id)}" tabindex="0" role="button" aria-label="Ouvrir ${escapeHTML(plant.name)}">
    ${bulkMode ? `<label class="bulk-select-check" title="Sélectionner ${escapeHTML(plant.name)}"><input type="checkbox" data-action="toggle-plant-selection" data-id="${escapeHTML(plant.id)}" ${selected ? "checked" : ""} aria-label="Sélectionner ${escapeHTML(plant.name)}" /><span>${icon("check")}</span></label>` : ""}
    <div class="plant-card-top"><div><h3>${escapeHTML(plant.name)}</h3><div class="plant-type">${typeMeta[plant.type] || "Variété"} · ${escapeHTML(plant.location || region)}</div></div>${statusBadge(plant)}</div>
    <div class="plant-location">${icon("map")}<span>${escapeHTML(region)}</span><span style="color:var(--line-strong)">·</span><span>Plantée le ${formatDateShort(plant.datePlanted)}</span></div>
    <div class="plant-metrics">
      <div><div class="plant-metric-value">${totals.weight ? formatWeight(totals.weight) : "—"}</div><div class="plant-metric-label">Poids</div></div>
      <div><div class="plant-metric-value">${totals.fruits || "—"}</div><div class="plant-metric-label">Fruits</div></div>
      <div><div class="plant-metric-value">${totals.harvests || "—"}</div><div class="plant-metric-label">Récoltes</div></div>
    </div>
  </article>`;
}

function renderRecentHarvestPanel(entries) {
  const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.weight - a.weight).slice(0, 4);
  return `<section class="panel"><div class="panel-header"><div><h2>Dernières récoltes</h2><p>Les notes les plus récentes de la saison.</p></div><button class="button ghost" data-route="yields" type="button">Tout voir ${icon("arrow")}</button></div>
    ${recent.length ? `<div class="recent-rows">${recent.map((item) => `<div class="recent-row"><div class="tomato-thumb" style="--harvest-color:${plantColorPrimary(item.plant)};--harvest-background:${plantColorBackground(item.plant)}">${icon("tomato")}</div><div class="recent-row-main"><strong>${escapeHTML(item.plantName)}</strong><span>${formatDate(item.date)} · ${item.fruits} fruit${item.fruits > 1 ? "s" : ""}</span></div><div class="recent-weight">${formatWeight(item.weight)}</div></div>`).join("")}</div>` : `<div class="no-results">Aucune récolte pour le moment.</div>`}
  </section>`;
}

function getWeeklyData(entries) {
  const season = state.seasons.find((item) => Number(item.year) === Number(state.currentSeason));
  const firstDate = season?.start || (entries.length ? [...entries].sort((a, b) => a.date.localeCompare(b.date))[0].date : `${state.currentSeason}-05-26`);
  const minDate = new Date(`${firstDate}T12:00:00`);
  const maxDate = entries.length ? new Date(`${[...entries].sort((a, b) => b.date.localeCompare(a.date))[0].date}T12:00:00`) : minDate;
  const diffWeeks = Math.max(1, Math.ceil((maxDate - minDate) / (7 * 24 * 60 * 60 * 1000)) + 1);
  const count = Math.max(8, Math.min(12, diffWeeks));
  const buckets = Array.from({ length: count }, (_, index) => ({
    label: formatDateShort(addDays(firstDate, index * 7)).replace(" ", "\u00a0"),
    value: 0,
  }));
  entries.forEach((entry) => {
    const date = new Date(`${entry.date}T12:00:00`);
    const index = Math.floor((date - minDate) / (7 * 24 * 60 * 60 * 1000));
    if (buckets[index]) buckets[index].value = roundWeight(buckets[index].value + Number(entry.weight || 0));
  });
  return buckets;
}

function annualMonthLabel(index, year = state.currentSeason) {
  const date = new Date(Number(year), index, 1, 12);
  return new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(date).replace(/\./g, "");
}

function annualHarvestData(year = state.currentSeason) {
  const numericYear = Number(year);
  const months = Array.from({ length: 12 }, (_, index) => ({
    index,
    label: annualMonthLabel(index, numericYear),
    totalWeight: 0,
    totalFruits: 0,
    varieties: new Map(),
  }));
  const varieties = new Map();
  const calendarEntries = (state.plants || []).flatMap((plant) => (plant.harvests || []).map((harvest) => ({ ...harvest, plant, plantName: plant.name })));
  calendarEntries.forEach((entry) => {
    const dateText = String(entry.date || "");
    const dateYear = Number(dateText.slice(0, 4));
    const monthIndex = Number(dateText.slice(5, 7)) - 1;
    if (dateYear !== numericYear || monthIndex < 0 || monthIndex > 11) return;
    const plant = entry.plant;
    const key = plant.catalogId || `name:${normalizeSearchText(plant.name)}`;
    if (!varieties.has(key)) varieties.set(key, { key, label: plant.name, plant, weight: 0, fruits: 0 });
    const variety = varieties.get(key);
    const weight = Number(entry.weight || 0);
    const fruits = Number(entry.fruits || 0);
    variety.weight += weight;
    variety.fruits += fruits;
    const month = months[monthIndex];
    if (!month.varieties.has(key)) month.varieties.set(key, { key, label: plant.name, plant, weight: 0, fruits: 0 });
    const monthVariety = month.varieties.get(key);
    monthVariety.weight += weight;
    monthVariety.fruits += fruits;
    month.totalWeight = roundWeight(month.totalWeight + weight);
    month.totalFruits += fruits;
  });
  const legend = [...varieties.values()]
    .map((variety) => ({ ...variety, weight: roundWeight(variety.weight) }))
    .sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label, "fr"));
  const order = new Map(legend.map((variety, index) => [variety.key, index]));
  months.forEach((month) => {
    month.varieties = [...month.varieties.values()]
      .map((variety) => ({ ...variety, weight: roundWeight(variety.weight) }))
      .filter((variety) => variety.weight > 0)
      .sort((a, b) => order.get(a.key) - order.get(b.key));
  });
  const totalWeight = roundWeight(legend.reduce((sum, variety) => sum + variety.weight, 0));
  const totalFruits = months.reduce((sum, month) => sum + month.totalFruits, 0);
  const maxMonth = Math.max(...months.map((month) => month.totalWeight), 1);
  return { months, legend, totalWeight, totalFruits, maxMonth };
}

function renderAnnualHarvestChart(year = state.currentSeason) {
  const data = annualHarvestData(year);
  const legend = data.legend;
  const legendRows = legend.map((variety) => {
    const share = data.totalWeight ? variety.weight / data.totalWeight * 100 : 0;
    return `<div class="annual-legend-row"><span class="annual-legend-swatch" style="--legend-color:${plantColorBackground(variety.plant)}"></span><div class="annual-legend-copy"><strong>${escapeHTML(variety.label)}</strong><small>${formatNumber(share, 1)} % · ${variety.fruits} fruit${variety.fruits > 1 ? "s" : ""}</small></div><b>${formatWeight(variety.weight)}</b></div>`;
  }).join("");
  return `<section class="panel annual-harvest-panel"><div class="panel-header"><div><h2>Récoltes par mois et par variété</h2><p>Année civile complète ${year} · chaque barre est répartie selon le poids récolté de chaque variété.</p></div><span class="panel-link">${formatWeight(data.totalWeight)} au total</span></div><div class="annual-chart-layout"><div class="annual-chart-area"><div class="annual-chart-axis"><span>${formatWeight(data.maxMonth, true)}</span><span>${formatWeight(data.maxMonth * .66, true)}</span><span>${formatWeight(data.maxMonth * .33, true)}</span><span>0</span></div><div class="annual-chart-main"><div class="annual-chart-grid-lines"><i></i><i></i><i></i><i></i></div><div class="annual-bars" aria-label="Récoltes mensuelles de ${year}">${data.months.map((month) => { const height = month.totalWeight ? Math.max(2, month.totalWeight / data.maxMonth * 100) : 0; return `<div class="annual-month" title="${escapeHTML(`${month.label} ${year} · ${formatWeight(month.totalWeight)} · ${month.totalFruits} fruit${month.totalFruits > 1 ? "s" : ""}`)}"><div class="annual-bar-holder"><div class="annual-bar" style="height:${height}%">${month.varieties.map((variety) => `<span class="annual-bar-segment" style="--segment-color:${plantColorBackground(variety.plant)};height:${month.totalWeight ? variety.weight / month.totalWeight * 100 : 0}%" title="${escapeHTML(`${variety.label} · ${formatWeight(variety.weight)} · ${variety.fruits} fruit${variety.fruits > 1 ? "s" : ""}`)}"></span>`).join("")}</div></div><span class="annual-month-label">${escapeHTML(month.label)}</span></div>`; }).join("")}</div></div></div><aside class="annual-legend"><div class="annual-legend-heading"><strong>Variétés récoltées</strong><span>${legend.length}</span></div><div class="annual-legend-list">${legendRows || `<div class="annual-legend-empty">Aucune récolte enregistrée pour ${year}.</div>`}</div></aside></div><div class="annual-chart-note">Les douze mois restent visibles, même sans récolte : les périodes creuses et les productions hors saison se repèrent immédiatement. Le graphique se base sur la date de récolte, même si la fiche plante appartient à une autre saison de suivi. Les couleurs reprennent celles de chaque fiche plante.</div></section>`;
}

function renderWeeklyChart(entries) {
  const data = getWeeklyData(entries);
  const max = Math.max(...data.map((item) => item.value), 1);
  const topLabel = formatWeight(max);
  return `<section class="panel chart-panel"><div class="panel-header"><div><h2>Rythme des récoltes</h2><p>Poids récolté par semaine · ${state.currentSeason}</p></div><span class="panel-link">${topLabel} au pic</span></div>
    <div class="chart-wrap"><div class="chart-y-labels"><span>${formatWeight(max, true)}</span><span>${formatWeight(max * .66, true)}</span><span>${formatWeight(max * .33, true)}</span><span>0</span></div><div class="chart-grid">${data.map(() => `<div class="chart-grid-line"></div>`).join("")}</div><div class="chart-bars">${data.map((item) => `<div class="chart-bar-group" title="${escapeHTML(item.label)} · ${formatWeight(item.value)}"><div class="chart-bar" style="height:${item.value ? Math.max(4, (item.value / max) * 100) : 2}%"></div></div>`).join("")}</div><div class="chart-labels">${data.map((item) => `<span>${escapeHTML(item.label)}</span>`).join("")}</div></div>
    <div class="chart-note">Chaque barre représente le poids total récolté sur les sept jours.</div></section>`;
}

function renderYields() {
  const stats = seasonStats();
  const entries = [...stats.entries].sort((a, b) => b.date.localeCompare(a.date) || b.weight - a.weight);
  const heaviest = [...entries].sort((a, b) => b.weight - a.weight).slice(0, 3);
  const grouped = getBreakdown(stats.plants);
  return `${renderPageHeading(pageMeta.yields.title, `Saison ${state.currentSeason} · ${formatDate(state.seasons.find((s) => s.year === state.currentSeason)?.start || `${state.currentSeason}-05-26`)} — aujourd’hui`, `<button class="button secondary" data-action="share" type="button">${icon("share")} Partager</button><button class="button primary" data-action="quick-harvest" type="button">${icon("plus")} Noter une récolte</button>`)}
    ${renderSeasonPills()}
    <div class="stat-grid">
      ${renderStatCard(formatWeight(stats.totalWeight), "TOTAL RÉCOLTÉ", "scale", "")}
      ${renderStatCard(formatNumber(stats.totalFruits), "FRUITS", "fruit", "yellow")}
      ${renderStatCard(formatNumber(stats.harvests), "ÉVÉNEMENTS", "calendar", "blue")}
      ${renderStatCard(formatNumber(stats.varieties), "VARIÉTÉS", "tag", "green")}
    </div>
    ${renderAnnualHarvestChart(state.currentSeason)}
    <div style="height:17px"></div>
    <div class="two-col">
      <div class="stack">${renderWeeklyChart(stats.entries)}${renderBreakdownPanel(grouped)}</div>
      <div class="stack">${renderHeaviestPanel(heaviest)}${renderHarvestLogPanel(entries)}</div>
    </div>
    <div style="height:17px"></div>
    ${renderAdvancedStatsPanel(stats, false)}
    <div style="height:17px"></div>
    ${renderSeasonComparison()}`;
}

function getBreakdown(plants) {
  return plants.map((plant) => ({ plant, ...plantTotals(plant) })).filter((item) => item.weight > 0).sort((a, b) => b.weight - a.weight);
}

function renderBreakdownPanel(items) {
  const max = Math.max(...items.map((item) => item.weight), 1);
  return `<section class="panel"><div class="panel-header"><div><h2>Répartition par variété</h2><p>Quel plant contribue le plus à votre saison&nbsp;?</p></div></div><div class="breakdown-list">${items.length ? items.map((item) => `<div class="breakdown-item"><div class="breakdown-name"><span class="color-dot" style="--dot:${plantAccent(item.plant)}"></span>${escapeHTML(item.plant.name)}</div><div class="breakdown-track"><div class="breakdown-fill" style="--fill:${plantAccent(item.plant)};width:${(item.weight / max) * 100}%"></div></div><div class="breakdown-value">${formatWeight(item.weight)}</div></div>`).join("") : `<div class="no-results">Les variétés apparaîtront après votre première récolte.</div>`}</div></section>`;
}

function renderHeaviestPanel(items) {
  return `<section class="panel"><div class="panel-header"><div><h2>Les plus beaux fruits</h2><p>Vos tomates les plus lourdes.</p></div><button class="mini-button" data-action="quick-harvest" title="Noter une récolte" type="button">${icon("plus")}</button></div><div class="heaviest-list">${items.length ? items.map((item, index) => `<div class="heaviest-item"><span class="rank">#${index + 1}</span><span class="heaviest-mark" style="--mark:${plantColorBackground(item.plant)};--mark-primary:${plantColorPrimary(item.plant)}">${icon("tomato")}</span><div><h4>${escapeHTML(item.plantName)}</h4><p>${formatDate(item.date)} · ${validColors(item.plant.colors).map((c) => colorMeta[c]?.label).join(" / ") || "Tomate"}</p></div><strong class="heaviest-weight">${formatWeight(item.weight)}</strong></div>`).join("") : `<div class="no-results">Notez votre plus belle tomate ici.</div>`}</div></section>`;
}

function renderHarvestLogPanel(entries) {
  const grouped = [];
  entries.forEach((entry) => {
    let group = grouped.find((item) => item.date === entry.date);
    if (!group) { group = { date: entry.date, items: [], weight: 0, fruits: 0 }; grouped.push(group); }
    group.items.push(entry);
    group.weight = roundWeight(group.weight + Number(entry.weight || 0));
    group.fruits += entry.fruits;
  });
  return `<section class="panel"><div class="panel-header"><div><h2>Journal des récoltes</h2><p>${grouped.length} jour${grouped.length > 1 ? "s" : ""} enregistré${grouped.length > 1 ? "s" : ""}</p></div></div><div class="timeline">${grouped.slice(0, 8).map((group) => `<div class="timeline-row"><div class="timeline-date">${formatDate(group.date)}</div><div class="timeline-info"><strong>${group.items.length} variété${group.items.length > 1 ? "s" : ""}</strong><span class="timeline-harvest-detail"><span class="timeline-color-dots">${group.items.slice(0, 4).map((item) => `<i style="--timeline-color:${plantColorBackground(item.plant)}" title="${escapeHTML(item.plantName)}"></i>`).join("")}</span>${group.fruits} fruits · ${group.items.slice(0,2).map((item) => escapeHTML(item.plantName)).join(", ")}${group.items.length > 2 ? "…" : ""}</span></div><div class="timeline-total">${formatWeight(group.weight)}</div></div>`).join("") || `<div class="no-results">Aucun événement pour le moment.</div>`}</div></section>`;
}

function renderSeasonComparison() {
  const years = [...new Set((state.seasons || []).map((season) => Number(season.year)).concat((state.plants || []).map((plant) => Number(plant.season)).filter(Boolean)))].sort((a, b) => b - a);
  const rows = years.map((year) => {
    const stats = seasonStats(year);
    const producing = stats.plants.filter((plant) => (plant.harvests || []).length > 0);
    const entries = stats.entries;
    const ratings = (state.ratings || []).filter((rating) => Number(rating.season || findPlant(rating.plantId)?.season || state.currentSeason) === year && Number(rating.overall) > 0);
    const taste = ratings.length ? ratings.reduce((sum, rating) => sum + Number(rating.overall), 0) / ratings.length : 0;
    const zones = new Set(entries.map((entry) => entry.plant.region).filter(Boolean));
    const top = getBreakdown(stats.plants)[0];
    const budget = budgetStats(year).total;
    return { year, ...stats, producing, taste, zones: zones.size, top, budget };
  });
  const maxWeight = Math.max(...rows.map((row) => row.totalWeight), 1);
  return `<section class="panel season-comparison-panel"><div class="panel-header"><div><h2>Comparer les saisons</h2><p>Rendement, diversité, zones et dégustations année par année.</p></div><span class="panel-link">${rows.length} saison${rows.length > 1 ? "s" : ""}</span></div><div class="season-compare-table-wrap"><table class="season-compare-table"><thead><tr><th>Saison</th><th>Rendement</th><th>Variétés</th><th>Zones productives</th><th>Note gustative</th><th>Meilleure variété</th><th>Budget</th></tr></thead><tbody>${rows.map((row) => `<tr><th scope="row"><button class="season-year-button" data-action="select-season" data-year="${row.year}" type="button">${row.year}${row.year === Number(state.currentSeason) ? `<span>active</span>` : ""}</button></th><td><div class="compare-value"><strong>${row.totalWeight ? formatWeight(row.totalWeight) : "—"}</strong><div class="compare-track"><span style="width:${row.totalWeight ? Math.max(5, (row.totalWeight / maxWeight) * 100) : 0}%"></span></div><small>${row.totalFruits || 0} fruits · ${row.harvests} récolte${row.harvests > 1 ? "s" : ""}</small></div></td><td><strong>${row.producing.length}</strong><small>${row.plants.length} plant${row.plants.length > 1 ? "s" : ""} suivis</small></td><td><strong>${row.zones || 0}</strong><small>zone${row.zones > 1 ? "s" : ""}</small></td><td><strong>${row.taste ? `${formatNumber(row.taste, 1)} / 5` : "—"}</strong><small>${row.taste ? `${ratingsLabel(row.taste)}` : "Aucune note"}</small></td><td><strong>${escapeHTML(row.top?.plant.name || "—")}</strong><small>${row.top ? formatWeight(row.top.weight) : "Pas encore de récolte"}</small></td><td><strong>${row.budget ? formatCurrency(row.budget) : "—"}</strong><small>${row.budget ? "dépenses enregistrées" : "Aucune dépense"}</small></td></tr>`).join("") || `<tr><td colspan="7" class="no-results">Ajoutez une saison ou une plante pour commencer la comparaison.</td></tr>`}</tbody></table></div><div class="comparison-footnote">Les valeurs sont calculées uniquement à partir des données enregistrées. Une saison sans note ou sans dépense reste affichée comme « — ».</div></section>`;
}

function ratingsLabel(value) {
  if (value >= 4.5) return "coup de cœur";
  if (value >= 3.5) return "très apprécié";
  if (value >= 2.5) return "à observer";
  return "à améliorer";
}

function renderSeasons() {
  const season = state.seasons.find((item) => Number(item.year) === Number(state.currentSeason)) || { year: state.currentSeason, start: `${state.currentSeason}-05-26`, end: todayIso(), highlights: [] };
  const stats = seasonStats();
  const seasonStatus = seasonStatusMeta[season.status || (season.end ? "incomplete" : "active")] || seasonStatusMeta.active;
  const years = [...state.seasons].sort((a, b) => b.year - a.year);
  return `${renderPageHeading(pageMeta.seasons.title, "Un aperçu calme de chaque année au potager.", `<button class="button secondary" data-action="open-season-review" data-year="${season.year}" type="button">${icon("star")} Bilan qualitatif</button><button class="button secondary" data-action="open-candidates" data-season="${nextSeasonYear()}" type="button">${icon("leaf")} Préparer ${nextSeasonYear()}</button><button class="button secondary" data-route="yields" type="button">${icon("yields")} Analyse détaillée</button><button class="button secondary" data-action="open-calendar" type="button">${icon("calendar")} Calendrier</button><button class="button primary" data-action="add-season" type="button">${icon("plus")} Ajouter une saison</button>`)}
    ${renderSeasonPills()}
    <div class="season-hero"><section class="season-card"><div class="eyebrow">SAISON ACTIVE</div><span class="season-status-pill ${seasonStatus.tone || ""}">${escapeHTML(seasonStatus.label)}</span><h2>${season.year}</h2><p>${escapeHTML(season.notes || "Une saison à observer, noter et savourer.")}</p><div class="season-card-actions"><button class="mini-button" data-action="edit-season" data-year="${season.year}" type="button" title="Modifier la saison">${icon("edit")}</button></div><div style="position:absolute;left:26px;bottom:23px;color:rgba(255,255,255,.67);font-size:11px">${formatDate(season.start)} — ${formatDate(season.end || todayIso())}</div></section><div class="season-summary"><div class="season-summary-item"><div class="season-summary-value">${formatWeight(stats.totalWeight)}</div><div class="season-summary-label">Poids total</div></div><div class="season-summary-item"><div class="season-summary-value">${formatNumber(stats.totalFruits)}</div><div class="season-summary-label">Fruits récoltés</div></div><div class="season-summary-item"><div class="season-summary-value">${formatNumber(stats.varieties)}</div><div class="season-summary-label">Variétés en récolte</div></div><div class="season-summary-item"><div class="season-summary-value">${formatNumber(stats.harvests)}</div><div class="season-summary-label">Événements notés</div></div></div></div>
    ${renderSeasonReviewPanel(season.year)}
    <div style="height:17px"></div>
    <div class="two-col"><section class="panel"><div class="panel-header"><div><h2>Moments de la saison</h2><p>Ajoutez une note pour vous souvenir de ce qui a compté.</p></div><button class="button secondary" data-action="add-highlight" data-year="${season.year}" type="button">${icon("plus")} Ajouter</button></div><div class="highlight-list">${(season.highlights || []).map((highlight) => `<div class="highlight-item"><div class="highlight-icon ${highlight.tone || ""}">${icon(highlight.icon || "star")}</div><div><strong>${escapeHTML(highlight.title)}</strong><span>${escapeHTML(highlight.text)}</span></div></div>`).join("") || `<div class="no-results">Aucun moment ajouté à cette saison.</div>`}</div></section><section class="panel"><div class="panel-header"><div><h2>Historique</h2><p>Vos saisons précédentes et en cours.</p></div></div><div class="timeline">${years.map((item) => { const itemStats = seasonStats(item.year); return `<div class="timeline-row" style="cursor:pointer" data-action="select-season" data-year="${item.year}"><div class="timeline-date"><strong style="color:var(--ink);font-size:14px">${item.year}</strong></div><div class="timeline-info"><strong>${item.year === state.currentSeason ? "Saison active" : "Saison archivée"} · ${escapeHTML(seasonStatusLabel(item))}</strong><span>${formatNumber(itemStats.varieties)} variétés · ${formatWeight(itemStats.totalWeight)}</span></div><span style="color:var(--muted-2)">${icon("chevron")}</span></div>`; }).join("")}</div></section></div>`;
}

function normalizeSearchText(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function catalogShortText(value, maxLength = 150) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
}

function varietiesForFilter() {
  const all = currentSeedCatalog();
  return all.filter((entry) => {
    const query = normalizeSearchText(varietySearch.trim());
    const searchable = normalizeSearchText([entry.name, entry.family, entry.subfamily, catalogDetailsText(entry)].join(" "));
    const matchesSearch = !query || searchable.includes(query);
    const matchesFilter = varietyFilter === "all" || catalogSubfamily(entry) === varietyFilter;
    return matchesSearch && matchesFilter;
  });
}

function renderVarieties() {
  const allCatalog = currentSeedCatalog();
  const subfamilyCounts = allCatalog.reduce((counts, entry) => {
    const subfamily = catalogSubfamily(entry);
    counts[subfamily] = (counts[subfamily] || 0) + 1;
    return counts;
  }, {});
  const filters = CATALOG_SUBFAMILY_ORDER.map((subfamily) => [subfamily, `${subfamily} · ${subfamilyCounts[subfamily] || 0}`]);
  const entries = varietiesForFilter();
  const groups = {};
  entries.forEach((entry) => {
    const group = catalogSubfamily(entry);
    if (!groups[group]) groups[group] = [];
    groups[group].push(entry);
  });
  const orderedGroups = catalogSubfamilyList(entries);
  return `${renderPageHeading(pageMeta.varieties.title, `${allCatalog.length} variétés de tomates · ${CATALOG_SUBFAMILY_ORDER.length} types de plantes`, `<button class="button secondary" data-action="add-catalog" type="button">${icon("plus")} Nouvelle variété</button><button class="button primary" data-action="add-plant" type="button">${icon("leaf")} Ajouter au potager</button>`)}
    <section class="catalog-intro"><div class="catalog-intro-icon">${icon("tag")}</div><div><strong>Des sources et des réserves pour chaque fiche</strong><p>Ouvrez une variété pour voir les points recoupés et ceux qui restent à confirmer. Les cinq filtres sont des regroupements pratiques : le port nain ou buissonnant ne suffit pas à déterminer la croissance.</p><a class="catalog-audit-link" href="docs/verification-catalogue.md" target="_blank" rel="noopener">Lire le rapport des ${defaultSeedCatalog().length} fiches</a>${window.SEED_CATALOG_IMPORT ? `<a class="catalog-audit-link" href="docs/enrichissement-catalogue.md" target="_blank" rel="noopener">Suivi de l’enrichissement · ${window.SEED_CATALOG_IMPORT.added} ajouts</a>` : ""}</div><span class="catalog-count">${allCatalog.length}<small>fiches</small></span></section>
    <div class="variety-toolbar"><div class="search-box">${icon("search")}<input id="variety-search" type="search" placeholder="Rechercher un nom, un type ou une caractéristique…" value="${escapeHTML(varietySearch)}" aria-label="Rechercher dans le catalogue" /></div><div class="catalog-filter-controls"><div class="filter-chips" role="group" aria-label="Filtrer par type de plante">${filters.map(([value, label]) => `<button class="pill ${varietyFilter === value ? "active tomato" : ""}" data-action="variety-filter" data-filter="${escapeHTML(value)}" type="button" aria-pressed="${varietyFilter === value}" title="${varietyFilter === value ? "Afficher tous les types" : `Filtrer : ${escapeHTML(value)}`}">${escapeHTML(label)}</button>`).join("")}</div><span class="form-help">Cliquez de nouveau sur le type actif pour tout afficher.</span></div></div>
    ${orderedGroups.length ? `<div class="variety-groups">${orderedGroups.map((group) => `<section class="variety-group"><h2>${escapeHTML(group)} <span class="catalog-group-count">${groups[group].length}</span></h2><div class="variety-cards">${groups[group].map(renderVarietyCard).join("")}</div></section>`).join("")}</div>` : `<div class="empty-state"><div><div class="empty-illustration" style="color:var(--purple);background:#f0e8ef">${icon("tag")}</div><h3>Aucune variété trouvée</h3><p>Essayez un autre mot-clé ou un autre type de plante dans le catalogue.</p><button class="button primary" data-action="add-plant" type="button">${icon("plus")} Ajouter une plante</button></div></div>`}`;
}

function renderVarietyCard(entry) {
  const normalized = catalogEntryToPlant(entry);
  const typeLabel = typeMeta[normalized.type] || "Pollinisation libre";
  const fruitType = catalogDetailValue(entry, "type_de_fruit", "fruit") || normalized.fruitType;
  const maturity = catalogDetailValue(entry, "maturité", "maturity") || `${normalized.daysToMaturity} j environ`;
  const description = catalogDetailValue(entry, "description_histoire_particularités", "description", "description_history");
  const sourceLabel = entry.crossId ? "Croisement personnel" : entry.userAdded ? "Ajout local" : catalogSubfamily(entry);
  return `<article class="variety-card catalog-card" style="--accent:${catalogAccent(entry)}" data-action="open-catalog-entry" data-id="${escapeHTML(entry.id || entry.catalogIndex || "")}" tabindex="0" role="button"><div class="variety-card-top"><h3>${escapeHTML(entry.name)}</h3><span class="season-count">${escapeHTML(sourceLabel)}</span></div><p class="catalog-card-description">${escapeHTML(catalogShortText(description || fruitType || "Aucun détail descriptif renseigné."))}</p>${renderCatalogVerificationBadge(entry)}<div class="variety-card-bottom"><div class="variety-meta">${escapeHTML(typeLabel)} · ${escapeHTML(catalogShortText(fruitType, 60) || "Caractéristique non précisée")}</div><div class="variety-yield" title="${escapeHTML(maturity)}">${escapeHTML(catalogShortText(maturity, 64))} ${icon("chevron")}</div></div></article>`;
}

function catalogPhotoForEntry(entry) {
  return (state.catalogPhotos || []).find((photo) => photo.catalogId === entry?.id) || null;
}

function renderCatalogPhotoForm(entry) {
  const existing = catalogPhotoForEntry(entry);
  return `<div class="modal-backdrop"><div class="modal compact" role="dialog" aria-modal="true" aria-labelledby="catalog-photo-title"><div class="modal-header"><div><span class="eyebrow">PHOTO DE RÉFÉRENCE</span><h2 id="catalog-photo-title">${existing ? "Remplacer la photo" : "Ajouter une photo"}</h2><p>Une image locale pour reconnaître la variété au premier coup d’œil.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="catalog-photo-form" class="modal-body" data-catalog-id="${escapeHTML(entry.id || "")}" data-existing-id="${escapeHTML(existing?.id || "")}"><div class="form-grid"><div class="form-field full"><label for="catalog-photo-file">Image *</label><input id="catalog-photo-file" name="file" type="file" accept="image/*" required /><span class="form-help">L'image est compressée et conservée uniquement dans ce navigateur.</span></div><div class="form-field full"><label for="catalog-photo-title">Légende</label><input id="catalog-photo-title" name="title" value="${escapeHTML(existing?.title || entry.name)}" placeholder="ex. Fruit mûr, feuillage, port…" /></div><div class="form-field full"><label for="catalog-photo-caption">Note</label><textarea id="catalog-photo-caption" name="caption" placeholder="Ce que cette photo doit vous rappeler…">${escapeHTML(existing?.caption || "")}</textarea></div></div><div class="form-actions">${existing ? `<button class="button danger" data-action="delete-catalog-photo" data-id="${escapeHTML(existing.id)}" type="button">${icon("trash")} Retirer l'image</button>` : ""}<span style="flex:1"></span><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("camera")} ${existing ? "Remplacer" : "Enregistrer"}</button></div></form></div></div>`;
}

function catalogVerificationStatus(entry) {
  if (!entry?.verification) return null;
  return Object.hasOwn(catalogVerificationMeta, entry.verification.status) ? catalogVerificationMeta[entry.verification.status] : catalogVerificationMeta.unconfirmed;
}

function renderCatalogVerificationBadge(entry) {
  const meta = catalogVerificationStatus(entry);
  return meta ? `<span class="catalog-review-status ${meta.warning ? "warning" : ""}">${icon("info")}${escapeHTML(meta.label)}</span>` : "";
}

function catalogSourceUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}

function renderCatalogVerification(entry) {
  const review = entry?.verification;
  if (!review) return "";
  const meta = catalogVerificationStatus(entry);
  const scope = Array.isArray(review.scope) ? review.scope : [];
  const sources = (Array.isArray(review.sources) ? review.sources : []).filter((source) => source && catalogSourceUrl(source.url));
  const date = /^\d{4}-\d{2}-\d{2}$/.test(review.checkedAt) && Number.isFinite(Date.parse(review.checkedAt)) ? formatDate(review.checkedAt) : "Date non renseignée";
  return `<section class="catalog-verification ${meta.warning ? "warning" : ""}" aria-label="Vérification documentaire"><div class="catalog-verification-heading"><strong>${escapeHTML(meta.label)}</strong><span>Contrôle documentaire · ${escapeHTML(date)}</span></div><p>${escapeHTML(review.note || "Documentation à compléter.")}</p>${scope.length ? `<p><strong>Points recoupés :</strong> ${scope.map(escapeHTML).join(", ")}.</p>` : `<p><strong>Aucun caractère du lot n’est confirmé par une source publique exploitable.</strong></p>`}<p class="catalog-verification-limits">Le contrôle est partiel : les autres caractères restent à confirmer. Les poids, le goût et les délais varient avec les conditions de culture.</p>${sources.length ? `<ul class="catalog-verification-sources">${sources.map((source, index) => `<li><a href="${escapeHTML(catalogSourceUrl(source.url))}" target="_blank" rel="noopener noreferrer">[${index + 1}] ${escapeHTML(source.title || "Référence documentaire")}</a></li>`).join("")}</ul>` : `<p class="form-help">La référence du sachet, des photos et un suivi du lot permettront de compléter cette fiche.</p>`}</section>`;
}

function renderCatalogDetail(entry) {
  const details = Object.entries(entry.details || {}).filter(([, value]) => String(value ?? "").trim());
  const normalized = catalogEntryToPlant(entry);
  const relatedPlants = (state.plants || []).filter((plant) => plant.catalogId === entry.id || (plant.name === entry.name && plant.family === entry.family));
  const fruitType = catalogDetailValue(entry, "type_de_fruit", "fruit") || normalized.fruitType || "Caractéristique de fruit non précisée";
  const maturity = catalogDetailValue(entry, "maturité", "maturity") || `${normalized.daysToMaturity} jours environ`;
  const cross = entry.crossId ? crossById(entry.crossId) : null;
  const sourceLabel = cross ? "LIGNÉE ISSUE D’UN CROISEMENT" : entry.userAdded ? "FICHE AJOUTÉE LOCALEMENT" : "FICHE DU CATALOGUE FOURNI";
  const nextCandidate = candidateForCatalog(entry.id, nextSeasonYear());
  const referencePhoto = catalogPhotoForEntry(entry);
  const referenceSource = referencePhoto ? catalogPhotoSource(referencePhoto) : "";
  return `<div class="modal-backdrop"><div class="modal catalog-detail-modal" role="dialog" aria-modal="true" aria-labelledby="catalog-detail-title"><div class="modal-header"><div><span class="eyebrow">${sourceLabel}</span><h2 id="catalog-detail-title">${escapeHTML(entry.name)}</h2><p>${escapeHTML(entry.family || "Famille non précisée")} · ${escapeHTML(catalogSubfamily(entry))}</p></div><div class="catalog-header-actions">${cross ? `<button class="mini-button" data-action="edit-cross" data-id="${escapeHTML(cross.id)}" type="button" title="Modifier le croisement" aria-label="Modifier le croisement">${icon("edit")}</button>` : entry.userAdded ? `<button class="mini-button" data-action="edit-catalog-entry" data-id="${escapeHTML(entry.id || "")}" type="button" title="Modifier la fiche" aria-label="Modifier la fiche">${icon("edit")}</button>` : ""}<button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div></div><div class="modal-body"><div class="catalog-detail-banner" style="--accent:${catalogAccent(entry)};--accent-primary:${colorPrimary(catalogColors(entry), catalogColorMode(entry))}"><span class="catalog-detail-symbol">${icon("tomato")}</span><div><strong>${escapeHTML(typeMeta[normalized.type] || "Variété")}</strong><span>${escapeHTML(fruitType)}</span></div><span class="catalog-detail-origin">${relatedPlants.length ? `${relatedPlants.length} fiche${relatedPlants.length > 1 ? "s" : ""} au potager` : "Pas encore au potager"}</span></div>${renderCatalogVerification(entry)}<dl class="catalog-detail-grid">${details.map(([label, value]) => `<div class="catalog-detail-field"><dt>${escapeHTML(label.replaceAll("_", " "))}</dt><dd>${escapeHTML(value)}</dd></div>`).join("") || `<div class="no-results">Aucun détail supplémentaire dans la fiche source.</div>`}</dl>${referencePhoto ? `<section class="catalog-reference-photo"><div class="catalog-reference-visual">${referenceSource ? `<img src="${escapeHTML(referenceSource)}" alt="${escapeHTML(referencePhoto.title || `Photo de ${entry.name}`)}" />` : `<div class="photo-missing">${icon("camera")}<span>Image en cours de chargement</span></div>`}</div><div><span class="eyebrow">VOTRE REPÈRE LOCAL</span><h3>${escapeHTML(referencePhoto.title || "Photo de référence")}</h3>${referencePhoto.caption ? `<p>${escapeHTML(referencePhoto.caption)}</p>` : ""}<div class="catalog-reference-actions"><button class="button ghost" data-action="add-catalog-photo" data-id="${escapeHTML(entry.id)}" type="button">${icon("edit")} Remplacer</button><button class="button ghost" data-action="delete-catalog-photo" data-id="${escapeHTML(referencePhoto.id)}" type="button">${icon("trash")} Retirer</button></div></div></section>` : `<section class="catalog-reference-empty"><span>${icon("camera")}</span><div><strong>Ajouter une photo de référence</strong><p>Associez une image locale à cette variété pour retrouver son aspect l'année prochaine.</p></div><button class="button secondary" data-action="add-catalog-photo" data-id="${escapeHTML(entry.id)}" type="button">${icon("camera")} Ajouter</button></section>`}<div class="catalog-detail-facts"><span><strong>Maturité estimée</strong>${escapeHTML(maturity)}</span><span><strong>Couleurs détectées</strong>${escapeHTML(normalized.colors.map((color) => colorMeta[color]?.label).filter(Boolean).join(" · ") || "Non précisée")}</span></div>${catalogMaturityNotice(entry) ? `<p class="catalog-planning-notice">${escapeHTML(catalogMaturityNotice(entry))}</p>` : ""}<div class="catalog-detail-actions"><div><strong>Prêt à l'essayer&nbsp;?</strong><span>Préparez son achat pour ${nextSeasonYear()} ou créez une fiche de suivi préremplie avec les caractéristiques de cette variété.</span></div><div class="catalog-detail-action-buttons"><button class="button secondary" data-action="add-candidate" data-id="${escapeHTML(entry.id || entry.catalogIndex || "")}" data-season="${nextSeasonYear()}" data-status="to-buy" type="button">${icon("leaf")} ${nextCandidate ? "Modifier la préparation" : `Préparer ${nextSeasonYear()}`}</button><button class="button primary" data-action="add-catalog-entry" data-id="${escapeHTML(entry.id || entry.catalogIndex || "")}" type="button">${icon("plus")} Ajouter au potager</button></div></div><div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Fermer</button></div></div></div></div>`;
}
function renderCatalogForm(entry = null) {
  const isEdit = Boolean(entry?.userAdded && entry?.id);
  const defaults = entry?.plantDefaults || {};
  const colors = entry ? catalogColors(entry) : ["red"];
  const colorMode = normalizeColorMode(entry?.colorMode || entry?.plantDefaults?.colorMode || (colors.length > 1 ? "gradient" : "solid"), colors);
  const details = entry?.details || {};
  const type = ["heirloom", "hybrid", "open"].includes(defaults.type) ? defaults.type : (entry ? catalogType(entry) : "open");
  const size = defaults.size ?? (entry ? catalogSize(entry) : "");
  const shape = defaults.shape ?? (entry ? catalogShape(entry) : "");
  const growth = defaults.growth ?? (entry ? catalogGrowth(entry) : "");
  const days = defaults.daysToMaturity || (entry ? catalogMaturityDays(entry) : 75);
  const inputValue = (value) => escapeHTML(value || "");
  return `<div class="modal-backdrop"><div class="modal catalog-form-modal" role="dialog" aria-modal="true" aria-labelledby="catalog-form-title"><div class="modal-header"><div><span class="eyebrow">CATALOGUE PERSONNEL</span><h2 id="catalog-form-title">${isEdit ? "Modifier la variété" : "Ajouter une variété au catalogue"}</h2><p>${isEdit ? "Mettez à jour cette fiche ajoutée localement." : "Créez une fiche réutilisable dans le menu de sélection des plantes."}</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="catalog-form" class="modal-body" data-edit-id="${escapeHTML(entry?.id || "")}"><div class="form-grid"><div class="form-field full"><label for="catalog-name">Nom de la variété *</label><input id="catalog-name" name="name" required value="${inputValue(entry?.name)}" placeholder="ex. Ma sélection, variété locale…" /></div><div class="form-field"><label for="catalog-family">Famille *</label><input id="catalog-family" name="family" required value="${inputValue(entry?.family)}" placeholder="ex. Tomate (Solanum lycopersicum)…" /></div><div class="form-field"><label for="catalog-subfamily">Type de plante</label><select id="catalog-subfamily" name="subfamily">${catalogSubfamilyOptionsHTML(entry)}</select></div><div class="form-field"><label for="catalog-type">Type de variété</label><select id="catalog-type" name="type"><option value="open" ${type === "open" ? "selected" : ""}>Pollinisation libre</option><option value="heirloom" ${type === "heirloom" ? "selected" : ""}>Ancienne</option><option value="hybrid" ${type === "hybrid" ? "selected" : ""}>Hybride</option></select></div><div class="form-field"><label for="catalog-fruit-type">Type de fruit / caractéristique</label><input id="catalog-fruit-type" name="fruitType" value="${inputValue(defaults.fruitType || details.type_de_fruit)}" placeholder="ex. Cerise, grain, fleur…" /></div><div class="form-field"><label for="catalog-size">Taille du fruit</label><select id="catalog-size" name="size"><option value="" ${!size ? "selected" : ""}>Non précisée</option>${["cerise","petit","moyen","gros"].map((value) => `<option value="${value}" ${size === value ? "selected" : ""}>${value[0].toUpperCase() + value.slice(1)}</option>`).join("")}</select></div><div class="form-field"><label for="catalog-shape">Forme</label><select id="catalog-shape" name="shape"><option value="" ${!shape ? "selected" : ""}>Non précisée</option>${FRUIT_SHAPES.map((value) => `<option value="${value}" ${shape === value ? "selected" : ""}>${value[0].toUpperCase() + value.slice(1)}</option>`).join("")}</select></div><div class="form-field"><label for="catalog-growth">Croissance de la plante</label><select id="catalog-growth" name="growth">${growthOptionsHTML(growth)}</select></div><div class="form-field"><label for="catalog-days">Jours jusqu'à maturité</label><input id="catalog-days" name="daysToMaturity" type="number" min="1" max="365" value="${days}" /></div><div class="form-field"><label for="catalog-breeder">Obtenteur / source</label><input id="catalog-breeder" name="breeder" value="${inputValue(defaults.breeder)}" placeholder="ex. échange, semencier…" /></div><div class="form-field full"><label>Couleur / teinte <span class="form-help">· jusqu'à 3 couleurs</span></label><div class="color-choice-layout"><div class="color-choice-controls"><div class="color-picker">${Object.entries(colorMeta).map(([key, meta]) => `<button class="color-option ${colors.includes(key) ? "selected" : ""}" style="--option-color:${meta.hex}" data-action="pick-color" data-color="${key}" type="button" title="${meta.label}" aria-label="${meta.label}" aria-pressed="${colors.includes(key)}"></button>`).join("")}</div><div class="form-help" id="color-help">${colors.map((color) => colorMeta[color]?.label).filter(Boolean).join(" · ") || "Aucune couleur sélectionnée"}</div><label class="color-mode-control" for="catalog-color-mode">Affichage<select id="catalog-color-mode" name="colorMode"><option value="solid" ${colorMode === "solid" ? "selected" : ""}>Couleur unie</option><option value="gradient" ${colorMode === "gradient" ? "selected" : ""}>Dégradé multicolore</option></select></label></div><div class="color-preview" data-color-preview style="background:${colorBackground(colors, colorMode)};color:${previewTextColor(colors, colorMode)}"><span class="color-preview-symbol">${icon("tomato")}</span><div><strong>Aperçu du fruit</strong><small data-color-preview-label>${colorMode === "gradient" ? (colors.length > 1 ? "Dégradé multicolore" : "Dégradé prêt · ajoutez une deuxième couleur") : "Couleur unie"}</small></div></div></div></div><div class="form-field full"><label for="catalog-description">Description, histoire ou particularités</label><textarea id="catalog-description" name="description" placeholder="Origine, port, intérêt de la variété…">${inputValue(details.description_histoire_particularités || details.description)}</textarea></div><div class="form-field full"><label for="catalog-fruit">Description du fruit / de la récolte</label><textarea id="catalog-fruit" name="fruit" placeholder="Couleur à maturité, saveur, utilisation…">${inputValue(details.fruit)}</textarea></div><div class="form-field full"><label for="catalog-size-text">Hauteur de la plante</label><input id="catalog-size-text" name="sizeText" value="${inputValue(details.taille)}" placeholder="ex. 30 à 50 cm, 1,5 m…" /></div><div class="form-field"><label for="catalog-maturity-text">Maturité / cycle</label><input id="catalog-maturity-text" name="maturityText" value="${inputValue(details.maturité)}" placeholder="ex. 75 jours" /></div><div class="form-field"><label for="catalog-genes">Gènes ou remarques techniques</label><input id="catalog-genes" name="genes" value="${inputValue(details.gènes_potentiels)}" placeholder="Facultatif" /></div></div><div class="form-help catalog-form-help">Le catalogue est réservé aux tomates et à leurs espèces proches (<em>Solanum</em>). Les champs botaniques sont conservés dans la fiche. La variété apparaîtra ensuite dans le menu déroulant de <strong>Ajouter une plante</strong>.</div><div class="form-actions">${isEdit ? `<button class="button danger" data-action="delete-catalog-entry" data-id="${entry.id}" type="button">${icon("trash")} Retirer du catalogue</button>` : ""}<span style="flex:1"></span><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("check")} ${isEdit ? "Enregistrer la fiche" : "Ajouter au catalogue"}</button></div></form></div></div>`;
}

function catalogDetailsFromForm(data) {
  const values = {
    "description_histoire_particularités": String(data.get("description") || "").trim(),
    fruit: String(data.get("fruit") || "").trim(),
    type_de_fruit: String(data.get("fruitType") || "").trim(),
    "gènes_potentiels": String(data.get("genes") || "").trim(),
    taille: String(data.get("sizeText") || "").trim(),
    maturité: String(data.get("maturityText") || "").trim(),
  };
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value));
}

function catalogEntryFromForm(form) {
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const family = String(data.get("family") || "").trim();
  const selectedColors = [...form.querySelectorAll(".color-option.selected")].map((button) => button.dataset.color).filter((color) => colorMeta[color]).slice(0, 3);
  const details = catalogDetailsFromForm(data);
  return {
    name,
    family,
    subfamily: catalogSubfamily({ subfamily: data.get("subfamily") }),
    details,
    plantDefaults: {
      type: ["heirloom", "hybrid", "open"].includes(data.get("type")) ? data.get("type") : "open",
      fruitType: String(data.get("fruitType") || "").trim(),
      size: String(data.get("size") || ""),
      shape: String(data.get("shape") || ""),
      growth: String(data.get("growth") || ""),
      daysToMaturity: Number(data.get("daysToMaturity")) || 75,
      breeder: String(data.get("breeder") || "").trim(),
      colors: selectedColors.length ? selectedColors : ["green"],
      colorMode: normalizeColorMode(data.get("colorMode"), selectedColors),
    },
    userAdded: true,
    source: "catalogue-local",
  };
}
function renderPlanningModal() {
  const current = seasonStats();
  const nextSeason = Number(state.currentSeason) + 1;
  const ranked = getBreakdown(current.plants);
  const rated = current.plants.map((plant) => ({ plant, average: ratingAverage(plant.id) })).filter((item) => item.average > 0).sort((a, b) => b.average - a.average || plantTotals(b.plant).weight - plantTotals(a.plant).weight);
  const unproductive = current.plants.filter((plant) => !(plant.harvests || []).length);
  const plan = (state.plans || []).find((item) => Number(item.season) === nextSeason);
  const defaultPlantIds = ranked.slice(0, 5).map((item) => item.plant.id);
  const selectedPlantIds = plan?.plantIds?.length ? plan.plantIds : defaultPlantIds;
  const zoneTotals = {};
  current.entries.forEach((entry) => {
    const zone = entry.plant.region || "Sans zone";
    zoneTotals[zone] = roundWeight((zoneTotals[zone] || 0) + Number(entry.weight || 0));
  });
  const winningZone = Object.entries(zoneTotals).sort((a, b) => b[1] - a[1])[0];
  const recommendationCards = [
    ranked.length ? { tone: "green", title: "Reconduire les plus productives", text: `${ranked.slice(0, 3).map((item) => item.plant.name).join(", ")} — ${formatWeight(roundWeight(ranked.slice(0, 3).reduce((sum, item) => sum + item.weight, 0)))} cumulés.` } : { tone: "green", title: "Commencer par une base de variétés", text: "Aucune récolte n'est encore enregistrée : utilisez cette saison comme point de départ." },
    rated.length ? { tone: "yellow", title: "Garder les coups de cœur", text: `${rated[0].plant.name} arrive en tête avec ${formatNumber(rated[0].average, 1)} / 5.` } : { tone: "yellow", title: "Prévoir des dégustations", text: "Ajoutez des notes gustatives pour savoir quelles variétés méritent une place permanente." },
    winningZone ? { tone: "blue", title: "Observer la zone gagnante", text: `${winningZone[0]} a produit ${formatWeight(winningZone[1])}. Réservez-lui de la place, tout en testant une rotation.` } : { tone: "blue", title: "Documenter les zones", text: "Associez chaque plante à une zone pour obtenir des recommandations plus précises." },
    unproductive.length ? { tone: "", title: "Revoir les plants sans récolte", text: `${unproductive.slice(0, 3).map((plant) => plant.name).join(", ")}${unproductive.length > 3 ? "…" : ""} n'ont pas encore de récolte enregistrée.` } : { tone: "", title: "Diversifier avec un essai", text: "Toutes les plantes ont produit : gardez une petite place pour une nouvelle variété à tester." },
  ];
  const plants = [...current.plants].sort((a, b) => plantTotals(b).weight - plantTotals(a).weight || a.name.localeCompare(b.name, "fr"));
  const seasonOptions = [...new Set((state.seasons || []).map((item) => Number(item.year)).concat([nextSeason]))].sort((a, b) => b - a);
  return `<div class="modal-backdrop"><div class="modal planning-modal" role="dialog" aria-modal="true" aria-labelledby="planning-title"><div class="modal-header"><div><h2 id="planning-title">Planifier la saison ${nextSeason}</h2><p>Des recommandations calculées à partir de vos rendements et de vos notes actuelles.</p></div><div class="modal-header-actions"><button class="button secondary" data-action="open-candidates" data-season="${nextSeason}" type="button">${icon("tag")} Candidats</button><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div></div><form id="planning-form" class="modal-body"><div class="planning-hero"><div class="planning-orbit">${icon("leaf")}</div><div><span class="eyebrow">CAP SUR LA PROCHAINE SAISON</span><strong>${ranked.length ? `${ranked.length} variétés ont déjà une histoire à raconter.` : "Votre prochaine saison commence ici."}</strong><span>Les suggestions restent modifiables : sélectionnez les variétés que vous souhaitez reconduire.</span></div></div><div class="planning-recommendations">${recommendationCards.map((card) => `<article class="planning-recommendation ${card.tone}"><span>${icon(card.tone === "yellow" ? "star" : card.tone === "blue" ? "map" : card.tone === "green" ? "leaf" : "info")}</span><div><strong>${escapeHTML(card.title)}</strong><p>${escapeHTML(card.text)}</p></div></article>`).join("")}</div><div class="form-grid"><div class="form-field"><label for="planning-season">Saison cible</label><select id="planning-season" name="targetSeason">${seasonOptions.map((year) => `<option value="${year}" ${Number(year) === nextSeason ? "selected" : ""}>${year}</option>`).join("")}</select></div><div class="form-field"><label>Objectif indicatif</label><div class="planning-target"><strong>${current.totalWeight ? formatWeight(current.totalWeight * 1.15) : "—"}</strong><span>+15 % vs ${state.currentSeason}</span></div></div></div><fieldset class="planning-fieldset"><legend>Variétés à reconduire ou tester</legend><p class="form-help">La sélection sera conservée dans votre plan ${nextSeason}. Vous pourrez la modifier à tout moment.</p><div class="planning-choices">${plants.map((plant) => { const totals = plantTotals(plant); const rating = ratingAverage(plant.id); return `<label class="planning-choice"><input type="checkbox" name="plantIds" value="${escapeHTML(plant.id)}" ${selectedPlantIds.includes(plant.id) ? "checked" : ""}/><span class="planning-check">${icon("check")}</span><span class="planning-choice-copy"><strong>${escapeHTML(plant.name)}</strong><small>${totals.weight ? `${formatWeight(totals.weight)} · ${totals.fruits} fruits` : "Pas encore récoltée"}${rating ? ` · ${formatNumber(rating, 1)} / 5` : ""}</small></span><span class="planning-signal ${totals.weight ? "positive" : "quiet"}">${totals.weight ? "+" : "○"}</span></label>`; }).join("") || `<div class="no-results">Ajoutez des plantes avant de préparer une sélection.</div>`}</div></fieldset><div class="form-field full"><label for="planning-notes">Notes pour la prochaine saison</label><textarea id="planning-notes" name="notes" placeholder="Idées de rotation, essais à prévoir, matériel à acheter…">${escapeHTML(plan?.notes || "")}</textarea></div><div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("check")} Enregistrer le plan</button></div></form></div></div>`;
}

function candidateSeasonOptions(selectedSeason) {
  const seasons = [...new Set([
    nextSeasonYear(),
    ...(state.seasons || []).map((season) => Number(season.year)),
    ...(state.candidates || []).map((candidate) => Number(candidate.season)),
  ].filter(Boolean))].sort((a, b) => b - a);
  return seasons.map((year) => `<option value="${year}" ${Number(selectedSeason) === Number(year) ? "selected" : ""}>${year}</option>`).join("");
}

function renderCandidateForm(candidate = null, defaults = {}) {
  const isEdit = Boolean(candidate?.id);
  const catalogId = candidate?.catalogId || defaults.catalogId || "";
  const entry = catalogEntryById(catalogId);
  const selectedSeason = Number(candidate?.season || defaults.season || nextSeasonYear());
  const initialName = candidate?.name ?? defaults.name ?? entry?.name ?? "";
  const initialFamily = candidate?.family ?? defaults.family ?? entry?.family ?? "";
  const initialSubfamily = candidate?.subfamily ?? defaults.subfamily ?? entry?.subfamily ?? "";
  const status = candidateStatusMeta[candidate?.status || defaults.status] ? (candidate?.status || defaults.status) : "candidate";
  const priority = candidatePriorityMeta[candidate?.priority || defaults.priority] ? (candidate?.priority || defaults.priority) : "medium";
  const inputValue = (value) => escapeHTML(value || "");
  return `<div class="modal-backdrop"><div class="modal candidate-form-modal" role="dialog" aria-modal="true" aria-labelledby="candidate-form-title"><div class="modal-header"><div><span class="eyebrow">PRÉPARATION ${selectedSeason}</span><h2 id="candidate-form-title">${isEdit ? "Modifier la variété" : "Ajouter une variété à la préparation"}</h2><p>${isEdit ? "Faites évoluer son statut au fil de vos décisions." : "Gardez une trace des variétés à tester, acheter ou retenir."}</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="candidate-form" class="modal-body" data-edit-id="${escapeHTML(candidate?.id || "")}" data-catalog-id="${escapeHTML(catalogId)}"><div class="candidate-form-intro"><span>${icon("leaf")}</span><div><strong>Une liste séparée du journal de culture</strong><small>Cette fiche prépare une future saison : elle ne crée pas encore de plante et ne demande aucune récolte.</small></div></div><div class="form-grid"><div class="form-field full"><label for="candidate-catalog-select">Choisir une fiche du catalogue</label><select id="candidate-catalog-select" name="catalogSelect" data-candidate-catalog-select>${catalogOptionsHTML(catalogId)}</select><span class="form-help">La sélection préremplit le nom, la famille et la sous-famille. Vous pouvez ensuite les ajuster.</span></div><div class="form-field full"><label for="candidate-name">Nom de la variété *</label><input id="candidate-name" name="name" required value="${inputValue(initialName)}" placeholder="ex. Une belle découverte locale…" /></div><div class="form-field"><label for="candidate-family">Famille</label><input id="candidate-family" name="family" value="${inputValue(initialFamily)}" placeholder="ex. Tomate" /></div><div class="form-field"><label for="candidate-subfamily">Sous-famille</label><input id="candidate-subfamily" name="subfamily" value="${inputValue(initialSubfamily)}" placeholder="ex. Cerise, cœur de bœuf…" /></div><div class="form-field"><label for="candidate-season">Saison cible</label><select id="candidate-season" name="season">${candidateSeasonOptions(selectedSeason)}</select></div><div class="form-field"><label for="candidate-status">Étape</label><select id="candidate-status" name="status">${Object.entries(candidateStatusMeta).map(([value, meta]) => `<option value="${value}" ${status === value ? "selected" : ""}>${meta.label}</option>`).join("")}</select></div><div class="form-field"><label for="candidate-priority">Priorité</label><select id="candidate-priority" name="priority">${Object.entries(candidatePriorityMeta).map(([value, meta]) => `<option value="${value}" ${priority === value ? "selected" : ""}>${meta.label}</option>`).join("")}</select></div><div class="form-field"><label for="candidate-quantity">Quantité envisagée</label><input id="candidate-quantity" name="quantity" value="${inputValue(candidate?.quantity || defaults.quantity)}" placeholder="ex. 2 sachets ou 3 plants" /></div><div class="form-field full"><label for="candidate-notes">Notes de décision</label><textarea id="candidate-notes" name="notes" placeholder="Pourquoi cette variété vous tente, où la trouver, quel essai prévoir…">${inputValue(candidate?.notes || defaults.notes)}</textarea></div></div><div class="form-help candidate-form-source" data-candidate-source-note ${entry ? "" : "hidden"}>${entry ? `${icon("tag")} <span>Liée à la fiche catalogue « ${escapeHTML(entry.name)} » · ${escapeHTML(entry.family || "Famille non précisée")}.</span>` : ""}</div><div class="form-actions">${isEdit ? `<button class="button danger" data-action="delete-candidate" data-id="${escapeHTML(candidate.id)}" type="button">${icon("trash")} Supprimer</button>` : ""}<span style="flex:1"></span><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("check")} ${isEdit ? "Enregistrer" : "Ajouter à la liste"}</button></div></form></div></div>`;
}

function renderCandidateRow(candidate) {
  const status = candidateStatusMeta[candidate.status] || candidateStatusMeta.candidate;
  const priority = candidatePriorityMeta[candidate.priority] || candidatePriorityMeta.medium;
  const entry = candidate.catalogId ? catalogEntryById(candidate.catalogId) : null;
  const details = [candidate.family, candidate.subfamily].filter(Boolean).join(" · ");
  const secondary = [priority.label, candidate.quantity, candidate.crossId ? "Croisement personnel" : entry ? "Fiche catalogue" : "Saisie libre"].filter(Boolean).join(" · ");
  return `<article class="candidate-row"><div class="candidate-row-icon ${status.tone || ""}">${icon(entry ? "tag" : "leaf")}</div><div class="candidate-row-copy"><strong>${escapeHTML(candidate.name)}</strong><span>${escapeHTML(details || "Famille non précisée")}</span><small>${escapeHTML(secondary)}</small>${candidate.notes ? `<p>${escapeHTML(catalogShortText(candidate.notes, 180))}</p>` : ""}</div><span class="candidate-status ${status.tone || ""}">${escapeHTML(status.label)}</span><div class="candidate-row-actions"><button class="mini-button" data-action="edit-candidate" data-id="${escapeHTML(candidate.id)}" type="button" title="Modifier" aria-label="Modifier ${escapeHTML(candidate.name)}">${icon("edit")}</button><button class="mini-button" data-action="delete-candidate" data-id="${escapeHTML(candidate.id)}" type="button" title="Supprimer" aria-label="Supprimer ${escapeHTML(candidate.name)}">${icon("trash")}</button></div></article>`;
}

function renderCandidateManager(targetSeason = nextSeasonYear()) {
  const seasons = [...new Set([
    nextSeasonYear(),
    ...(state.seasons || []).map((season) => Number(season.year)),
    ...(state.candidates || []).map((candidate) => Number(candidate.season)),
  ].filter(Boolean))].sort((a, b) => b - a);
  const selectedSeason = seasons.includes(Number(targetSeason)) ? Number(targetSeason) : nextSeasonYear();
  const candidates = candidatesForSeason(selectedSeason).sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1) || a.name.localeCompare(b.name, "fr");
  });
  const counts = candidates.reduce((all, candidate) => { all[candidate.status] = (all[candidate.status] || 0) + 1; return all; }, {});
  const toBuy = (counts["to-buy"] || 0) + (counts.candidate || 0);
  const inProgress = (counts.purchased || 0) + (counts.sown || 0) + (counts.planted || 0);
  const retained = counts.keep || 0;
  const sections = Object.entries(candidateStatusMeta).map(([status, meta]) => {
    const rows = candidates.filter((candidate) => candidate.status === status);
    if (!rows.length) return "";
    return `<section class="candidate-status-section"><div class="candidate-section-heading"><h3>${escapeHTML(meta.label)} <span>${rows.length}</span></h3><small>${status === "to-buy" ? "À commander ou trouver" : status === "candidate" ? "Idées à comparer" : status === "keep" ? "À garder pour la saison" : "Suivi de votre préparation"}</small></div><div class="candidate-list">${rows.map(renderCandidateRow).join("")}</div></section>`;
  }).join("");
  return `<div class="modal-backdrop"><div class="modal candidates-modal" role="dialog" aria-modal="true" aria-labelledby="candidates-title"><div class="modal-header"><div><span class="eyebrow">CAP SUR LA PROCHAINE SAISON</span><h2 id="candidates-title">Préparer la saison ${selectedSeason}</h2><p>Vos bons candidats, vos idées d’achat et l’avancement des semences au même endroit.</p></div><div class="modal-header-actions"><button class="button primary" data-action="add-candidate" data-season="${selectedSeason}" type="button">${icon("plus")} Ajouter</button><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div></div><div class="modal-body"><div class="candidate-toolbar"><label for="candidate-season-filter">Saison préparée</label><select id="candidate-season-filter" data-candidate-season-filter>${seasons.map((year) => `<option value="${year}" ${year === selectedSeason ? "selected" : ""}>${year}</option>`).join("")}</select><button class="button secondary" data-route="varieties" type="button">${icon("tag")} Parcourir le catalogue</button><button class="button secondary" data-action="open-crosses" type="button">${icon("leaf")} Croisements</button></div><div class="candidate-summary"><div><strong>${candidates.length}</strong><span>fiches préparées</span></div><div class="yellow"><strong>${toBuy}</strong><span>à étudier / acheter</span></div><div class="blue"><strong>${inProgress}</strong><span>en préparation</span></div><div class="green"><strong>${retained}</strong><span>retenues</span></div></div><div class="candidate-manager-note"><span>${icon("info")}</span><div><strong>Pas besoin d’avoir pesé la saison précédente</strong><small>Ajoutez une variété du catalogue ou une idée libre, puis faites évoluer son statut sans la mélanger avec les récoltes déjà enregistrées.</small></div></div>${sections || `<div class="empty-state candidate-empty"><div><div class="empty-illustration" style="color:var(--green);background:var(--green-soft)">${icon("leaf")}</div><h3>Aucun candidat pour ${selectedSeason}</h3><p>Ouvrez une fiche du catalogue ou ajoutez une idée à tester.</p><button class="button primary" data-action="add-candidate" data-season="${selectedSeason}" type="button">${icon("plus")} Ajouter le premier candidat</button></div></div>`}<div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Fermer</button></div></div></div></div>`;
}

function renderReviewForm(plant) {
  const review = seasonReviewForPlant(plant.id, plant.season);
  const select = (name, options, selected) => options.map(([value, label]) => `<option value="${value}" ${String(selected || "") === String(value) ? "selected" : ""}>${label}</option>`).join("");
  return `<div class="modal-backdrop"><div class="modal compact qualitative-form-modal" role="dialog" aria-modal="true" aria-labelledby="review-form-title"><div class="modal-header"><div><span class="eyebrow">BILAN QUALITATIF · ${plant.season}</span><h2 id="review-form-title">${escapeHTML(plant.name)}</h2><p>Notez ce que vous avez ressenti, même si aucune récolte n’a été pesée.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="season-review-form" class="modal-body" data-plant-id="${escapeHTML(plant.id)}" data-season="${plant.season}" data-edit-id="${review?.id || ""}"><div class="qualitative-intro"><span>${icon("star")}</span><div><strong>Un bilan sans chiffres obligatoires</strong><small>Ces observations servent à choisir vos variétés pour la prochaine saison. Les récoltes enregistrées restent inchangées.</small></div></div><div class="form-grid"><div class="form-field full"><label for="review-overall">Décision provisoire</label><select id="review-overall" name="overall"><option value="">Pas encore décidé</option><option value="keep" ${review?.overall === "keep" ? "selected" : ""}>À retenir</option><option value="maybe" ${review?.overall === "maybe" ? "selected" : ""}>À revoir</option><option value="discard" ${review?.overall === "discard" ? "selected" : ""}>À écarter</option></select></div><div class="form-field"><label for="review-taste">Goût / plaisir</label><select id="review-taste" name="taste"><option value="">Non noté</option>${select("taste", Object.entries(qualitativeMeta.taste), review?.taste)}</select></div><div class="form-field"><label for="review-vigor">Vigueur</label><select id="review-vigor" name="vigor"><option value="">Non notée</option>${select("vigor", Object.entries(qualitativeMeta.vigor), review?.vigor)}</select></div><div class="form-field"><label for="review-earliness">Précocité</label><select id="review-earliness" name="earliness"><option value="">Non notée</option>${select("earliness", Object.entries(qualitativeMeta.earliness), review?.earliness)}</select></div><div class="form-field"><label for="review-quantity">Quantité perçue</label><select id="review-quantity" name="quantity"><option value="">Non évaluée</option>${select("quantity", Object.entries(qualitativeMeta.quantity), review?.quantity)}</select></div><div class="form-field full"><label for="review-notes">Observations libres</label><textarea id="review-notes" name="notes" placeholder="Saveur, résistance, place prise, défauts, contexte…">${escapeHTML(review?.notes || "")}</textarea></div></div><div class="form-help">Laissez les champs vides si vous ne vous en souvenez pas. Le journal signalera simplement les informations manquantes.</div><div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("check")} Enregistrer le bilan</button></div></form></div></div>`;
}

function renderReviewSummary(review) {
  if (!reviewHasContent(review)) return `<div class="review-summary-empty"><span>${icon("info")}</span><div><strong>Bilan qualitatif non renseigné</strong><small>Ajoutez vos impressions sans avoir besoin de retrouver les poids.</small></div></div>`;
  const chips = [
    review.overall ? reviewOverallMeta[review.overall]?.label : "",
    review.taste ? `Goût · ${reviewValueLabel("taste", review.taste)}` : "",
    review.vigor ? `Vigueur · ${reviewValueLabel("vigor", review.vigor)}` : "",
    review.earliness ? `Précocité · ${reviewValueLabel("earliness", review.earliness)}` : "",
    review.quantity ? `Quantité · ${reviewValueLabel("quantity", review.quantity)}` : "",
  ].filter(Boolean);
  return `<div class="review-summary"><div class="review-chips">${chips.map((chip) => `<span>${escapeHTML(chip)}</span>`).join("")}</div>${review.notes ? `<p>${escapeHTML(review.notes)}</p>` : ""}</div>`;
}

function renderSeasonReviewRow(plant) {
  const review = seasonReviewForPlant(plant.id, plant.season);
  const decision = reviewOverallMeta[review?.overall];
  return `<article class="season-review-row"><div class="season-review-plant"><span class="review-plant-mark" style="--accent:${plantColorBackground(plant)};--accent-primary:${plantColorPrimary(plant)}">${icon("tomato")}</span><div><strong>${escapeHTML(plant.name)}</strong><small>${escapeHTML([plant.family, plant.subfamily].filter(Boolean).join(" · ") || plant.region || "Variété suivie")}</small></div></div><div class="season-review-result">${decision ? `<span class="review-decision ${decision.tone || ""}">${escapeHTML(decision.label)}</span>` : `<span class="review-pending">À noter</span>`}${review?.notes ? `<small>${escapeHTML(catalogShortText(review.notes, 110))}</small>` : ""}</div><button class="button ghost" data-action="review-plant" data-id="${escapeHTML(plant.id)}" type="button">${icon("edit")} ${reviewHasContent(review) ? "Modifier" : "Noter"}</button></article>`;
}

function renderSeasonReviewPanel(year = state.currentSeason, withLink = true) {
  const plants = seasonPlants(year).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const reviewed = plants.filter((plant) => reviewHasContent(seasonReviewForPlant(plant.id, year))).length;
  return `<section class="panel season-review-panel"><div class="panel-header"><div><h2>Bilan qualitatif <span class="counter-badge">${reviewed}/${plants.length}</span></h2><p>Goût, vigueur, précocité et quantité perçue, sans pesée obligatoire.</p></div>${withLink ? `<button class="button secondary" data-action="open-season-review" data-year="${year}" type="button">${icon("star")} Noter la saison</button>` : ""}</div>${plants.length ? `<div class="season-review-list">${plants.map(renderSeasonReviewRow).join("")}</div>` : `<div class="no-results">Aucune plante enregistrée pour cette saison.</div>`}</section>`;
}

function renderSeasonReviewManager(year = state.currentSeason) {
  return `<div class="modal-backdrop"><div class="modal qualitative-manager-modal" role="dialog" aria-modal="true" aria-labelledby="season-review-title"><div class="modal-header"><div><span class="eyebrow">SAISON ${year}</span><h2 id="season-review-title">Bilan qualitatif de la saison</h2><p>Une mémoire utile pour choisir la suite, même sans récoltes chiffrées.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><div class="modal-body">${renderSeasonReviewPanel(year, false)}<div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Fermer</button></div></div></div></div>`;
}

function renderCrossForm(cross = null) {
  const isEdit = Boolean(cross?.id);
  const selectedSeason = Number(cross?.targetSeason || nextSeasonYear());
  const status = crossStatusMeta[cross?.status] ? cross.status : "planned";
  const stability = crossStabilityMeta[cross?.stability] ? cross.stability : "observation";
  const femaleParent = cross?.femaleParent || {};
  const maleParent = cross?.maleParent || {};
  const inputValue = (value) => escapeHTML(value || "");
  const dateValue = (value) => value || "";
  const createCatalog = cross ? cross.createCatalog !== false : true;
  const createCandidate = cross ? cross.createCandidate !== false : true;
  return `<div class="modal-backdrop"><div class="modal cross-form-modal" role="dialog" aria-modal="true" aria-labelledby="cross-form-title"><div class="modal-header"><div><span class="eyebrow">CROISEMENT & SÉLECTION</span><h2 id="cross-form-title">${isEdit ? "Modifier le croisement" : "Nouveau croisement"}</h2><p>Suivez la lignée de la pollinisation jusqu’aux générations sélectionnées.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="cross-form" class="modal-body" data-edit-id="${escapeHTML(cross?.id || "")}"><div class="cross-form-intro"><span>${icon("leaf")}</span><div><strong>Une lignée peut vivre à côté du catalogue fourni</strong><small>Les parents peuvent venir du potager, du catalogue ou être saisis librement. À l’enregistrement, une fiche locale et un candidat ${selectedSeason} sont créés par défaut.</small></div></div><div class="form-grid"><div class="form-field full"><label for="cross-name">Nom de la lignée *</label><input id="cross-name" name="name" required value="${inputValue(cross?.name)}" placeholder="ex. Rouge sombre × Cœur précoce · F2" /></div><div class="form-field"><label for="cross-family">Famille</label><input id="cross-family" name="family" value="${inputValue(cross?.family || "Tomate (Solanum lycopersicum)")}" placeholder="ex. Tomate (Solanum lycopersicum)" /></div><div class="form-field"><label for="cross-subfamily">Sous-famille / lignée</label><input id="cross-subfamily" name="subfamily" value="${inputValue(cross?.subfamily)}" placeholder="ex. Sélection F2 rouge sombre" /></div><div class="form-field full"><label for="cross-female-parent">Parent femelle · porte-graines</label><select id="cross-female-parent" name="femaleParentRef" data-cross-parent="female">${crossParentOptionsHTML(femaleParent.ref || "")}</select></div><div class="form-field full"><label for="cross-female-name">Nom conservé du parent femelle</label><input id="cross-female-name" name="femaleParentName" value="${inputValue(femaleParent.name)}" placeholder="Sélectionnez une plante ou saisissez un nom" /></div><div class="form-field full"><label for="cross-male-parent">Parent mâle · pollen</label><select id="cross-male-parent" name="maleParentRef" data-cross-parent="male">${crossParentOptionsHTML(maleParent.ref || "")}</select></div><div class="form-field full"><label for="cross-male-name">Nom conservé du parent mâle</label><input id="cross-male-name" name="maleParentName" value="${inputValue(maleParent.name)}" placeholder="Sélectionnez une plante ou saisissez un nom" /></div><div class="form-field"><label for="cross-status">Étape du croisement</label><select id="cross-status" name="status">${Object.entries(crossStatusMeta).map(([value, meta]) => `<option value="${value}" ${status === value ? "selected" : ""}>${meta.label}</option>`).join("")}</select></div><div class="form-field"><label for="cross-generation">Génération</label><input id="cross-generation" name="generation" value="${inputValue(cross?.generation || "F1")}" placeholder="F1, F2, F3…" /></div><div class="form-field"><label for="cross-target-season">Saison cible</label><select id="cross-target-season" name="targetSeason">${candidateSeasonOptions(selectedSeason)}</select></div><div class="form-field"><label for="cross-stability">Stabilité / sélection</label><select id="cross-stability" name="stability">${Object.entries(crossStabilityMeta).map(([value, label]) => `<option value="${value}" ${stability === value ? "selected" : ""}>${label}</option>`).join("")}</select></div><div class="form-field"><label for="cross-planned-date">Date prévue</label><input id="cross-planned-date" name="plannedDate" type="date" value="${dateValue(cross?.plannedDate)}" /></div><div class="form-field"><label for="cross-crossed-date">Date de pollinisation</label><input id="cross-crossed-date" name="crossedDate" type="date" value="${dateValue(cross?.crossedDate)}" /></div><div class="form-field"><label for="cross-fruit-date">Fruit obtenu le</label><input id="cross-fruit-date" name="fruitDate" type="date" value="${dateValue(cross?.fruitDate)}" /></div><div class="form-field"><label for="cross-seed-date">Graines extraites le</label><input id="cross-seed-date" name="seedDate" type="date" value="${dateValue(cross?.seedDate)}" /></div><div class="form-field"><label for="cross-sown-date">Semée le</label><input id="cross-sown-date" name="sownDate" type="date" value="${dateValue(cross?.sownDate)}" /></div><div class="form-field"><label for="cross-seed-quantity">Nombre de graines</label><input id="cross-seed-quantity" name="seedQuantity" type="number" min="0" step="1" value="${cross?.seedQuantity ?? ""}" placeholder="ex. 24" /></div><div class="form-field"><label for="cross-selected-count">Plants sélectionnés</label><input id="cross-selected-count" name="selectedCount" type="number" min="0" step="1" value="${cross?.selectedCount ?? ""}" placeholder="ex. 3" /></div><div class="form-field full"><label for="cross-traits">Caractères recherchés</label><textarea id="cross-traits" name="traits" placeholder="Couleur, goût, précocité, résistance, port…">${inputValue(cross?.traits)}</textarea></div><div class="form-field full"><label for="cross-fruit-notes">Fruit obtenu / graines</label><textarea id="cross-fruit-notes" name="fruitNotes" placeholder="Fruit marqué, nombre de graines, méthode d’extraction…">${inputValue(cross?.fruitNotes)}</textarea></div><div class="form-field full"><label for="cross-selected-notes">Sélection des plants</label><textarea id="cross-selected-notes" name="selectedNotes" placeholder="Numéros des plants, critères retenus, différences observées…">${inputValue(cross?.selectedNotes)}</textarea></div><div class="form-field full"><label for="cross-notes">Notes générales</label><textarea id="cross-notes" name="notes" placeholder="Contexte du croisement, résultat, prochaine étape…">${inputValue(cross?.notes)}</textarea></div></div><div class="cross-output-options"><label class="option-check"><input type="checkbox" name="createCatalog" ${createCatalog ? "checked" : ""} /><span class="option-check-box">${icon("check")}</span><span><strong>Créer / mettre à jour la fiche de lignée</strong><small>La descendance sera disponible dans le catalogue local.</small></span></label><label class="option-check"><input type="checkbox" name="createCandidate" ${createCandidate ? "checked" : ""} /><span class="option-check-box">${icon("check")}</span><span><strong>Ajouter comme candidat ${selectedSeason}</strong><small>La lignée suivra ensuite le workflow candidat, achat, semis et sélection.</small></span></label></div><div class="form-actions">${isEdit ? `<button class="button danger" data-action="delete-cross" data-id="${escapeHTML(cross.id)}" type="button">${icon("trash")} Supprimer le croisement</button>` : ""}<span style="flex:1"></span><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("check")} ${isEdit ? "Enregistrer la lignée" : "Enregistrer le croisement"}</button></div></form></div></div>`;
}

function renderCrossRow(cross) {
  const status = crossStatusMeta[cross.status] || crossStatusMeta.planned;
  const parents = `${crossParentLabel(cross.femaleParent)} × ${crossParentLabel(cross.maleParent)}`;
  const details = [cross.generation || "Génération non renseignée", cross.targetSeason ? `Saison ${cross.targetSeason}` : "", cross.seedQuantity ? `${cross.seedQuantity} graines` : "", cross.selectedCount ? `${cross.selectedCount} plant${cross.selectedCount > 1 ? "s" : ""} sélectionné${cross.selectedCount > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");
  const output = [cross.catalogId ? "Fiche catalogue" : "", cross.candidateId ? "Candidat lié" : ""].filter(Boolean).join(" · ");
  return `<article class="cross-row"><div class="cross-row-icon ${status.tone || ""}">${icon("leaf")}</div><div class="cross-row-copy"><strong>${escapeHTML(cross.name)}</strong><span>♀ ${escapeHTML(crossParentLabel(cross.femaleParent))} · ♂ ${escapeHTML(crossParentLabel(cross.maleParent))}</span><small>${escapeHTML(details || "Aucun détail de génération")}${output ? ` · ${escapeHTML(output)}` : ""}</small>${cross.traits ? `<p>${escapeHTML(catalogShortText(cross.traits, 170))}</p>` : ""}</div><div class="cross-row-right"><span class="cross-status ${status.tone || ""}">${escapeHTML(status.label)}</span><small>${escapeHTML(crossStabilityMeta[cross.stability] || "En observation")}</small></div><div class="cross-row-actions"><button class="mini-button" data-action="edit-cross" data-id="${escapeHTML(cross.id)}" type="button" title="Modifier" aria-label="Modifier ${escapeHTML(cross.name)}">${icon("edit")}</button><button class="mini-button" data-action="delete-cross" data-id="${escapeHTML(cross.id)}" type="button" title="Supprimer" aria-label="Supprimer ${escapeHTML(cross.name)}">${icon("trash")}</button></div></article>`;
}

function renderCrossManager(targetSeason = "all") {
  const seasons = [...new Set([state.currentSeason, nextSeasonYear(), ...(state.crosses || []).map((cross) => Number(cross.targetSeason)).filter(Boolean)])].sort((a, b) => b - a);
  const selectedSeason = targetSeason === "all" || targetSeason === "" ? "all" : Number(targetSeason);
  const crosses = [...(state.crosses || [])].filter((cross) => selectedSeason === "all" || Number(cross.targetSeason || nextSeasonYear()) === selectedSeason).sort((a, b) => Number(a.targetSeason || 9999) - Number(b.targetSeason || 9999) || String(a.name).localeCompare(String(b.name), "fr"));
  const retained = crosses.filter((cross) => cross.status === "retained").length;
  const inProgress = crosses.filter((cross) => !["retained", "discarded"].includes(cross.status)).length;
  const lines = crosses.filter((cross) => cross.catalogId).length;
  const sections = Object.entries(crossStatusMeta).map(([status, meta]) => { const rows = crosses.filter((cross) => cross.status === status); if (!rows.length) return ""; return `<section class="cross-status-section"><div class="cross-section-heading"><h3>${escapeHTML(meta.label)} <span>${rows.length}</span></h3><small>${status === "selected" ? "Comparer les plants et garder les meilleurs" : status === "retained" ? "Lignées à reconduire" : status === "discarded" ? "Historique des essais écartés" : "Avancement du croisement"}</small></div><div class="cross-list">${rows.map(renderCrossRow).join("")}</div></section>`; }).join("");
  return `<div class="modal-backdrop"><div class="modal crosses-modal" role="dialog" aria-modal="true" aria-labelledby="crosses-title"><div class="modal-header"><div><span class="eyebrow">SÉLECTION PERSONNELLE</span><h2 id="crosses-title">Croisements & lignées</h2><p>Gardez la trace de vos parents, générations et plants sélectionnés.</p></div><div class="modal-header-actions"><button class="button primary" data-action="add-cross" type="button">${icon("plus")} Nouveau</button><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div></div><div class="modal-body"><div class="cross-toolbar"><label for="cross-season-filter">Afficher</label><select id="cross-season-filter" data-cross-season-filter><option value="all" ${selectedSeason === "all" ? "selected" : ""}>Toutes les saisons</option>${seasons.map((year) => `<option value="${year}" ${selectedSeason === year ? "selected" : ""}>Cible ${year}</option>`).join("")}</select><button class="button secondary" data-action="open-candidates" data-season="${nextSeasonYear()}" type="button">${icon("tag")} Voir les candidats ${nextSeasonYear()}</button></div><div class="cross-summary"><div><strong>${crosses.length}</strong><span>croisement${crosses.length > 1 ? "s" : ""}</span></div><div class="yellow"><strong>${inProgress}</strong><span>en sélection</span></div><div class="green"><strong>${retained}</strong><span>lignée${retained > 1 ? "s" : ""} retenue${retained > 1 ? "s" : ""}</span></div><div class="blue"><strong>${lines}</strong><span>fiches locales</span></div></div><div class="cross-manager-note"><span>${icon("info")}</span><div><strong>Chaque génération garde son histoire</strong><small>Les dates, parents, semences, caractères recherchés et observations restent attachés à la lignée. Les champs de sélection peuvent rester vides tant que vous n’avez pas encore semé.</small></div></div>${sections || `<div class="empty-state cross-empty"><div><div class="empty-illustration" style="color:var(--green);background:var(--green-soft)">${icon("leaf")}</div><h3>Aucun croisement enregistré</h3><p>Commencez par noter vos deux parents et votre objectif de sélection.</p><button class="button primary" data-action="add-cross" type="button">${icon("plus")} Enregistrer un croisement</button></div></div>`}<div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Fermer</button></div></div></div></div>`;
}

function renderExpenseForm(expense = null) {
  const isEdit = Boolean(expense);
  const seasons = [...new Set((state.seasons || []).map((item) => Number(item.year)).concat((state.plants || []).map((plant) => Number(plant.season)).filter(Boolean), [state.currentSeason]))].sort((a, b) => b - a);
  const plants = [...(state.plants || [])].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const regions = [...new Set([...(state.regions || []), ...plants.map((plant) => plant.region).filter(Boolean)])].sort((a, b) => a.localeCompare(b, "fr"));
  return `<div class="modal-backdrop"><div class="modal compact" role="dialog" aria-modal="true" aria-labelledby="expense-form-title"><div class="modal-header"><div><h2 id="expense-form-title">${isEdit ? "Modifier la dépense" : "Ajouter une dépense"}</h2><p>Gardez une trace simple du coût de vos semences et de votre matériel.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="expense-form" class="modal-body" data-edit-id="${escapeHTML(expense?.id || "")}"><div class="form-grid"><div class="form-field full"><label for="expense-label">Libellé *</label><input id="expense-label" name="label" required value="${escapeHTML(expense?.label || "")}" placeholder="ex. Terreau, semences, tuteurs…" /></div><div class="form-field"><label for="expense-amount">Montant (€) *</label><input id="expense-amount" name="amount" type="number" min="0.01" step="0.01" required value="${expense?.amount ?? ""}" placeholder="0,00" /></div><div class="form-field"><label for="expense-date">Date</label><input id="expense-date" name="date" type="date" value="${expense?.date || todayIso()}" /></div><div class="form-field"><label for="expense-category">Catégorie</label><select id="expense-category" name="category">${Object.entries(expenseMeta).map(([value, meta]) => `<option value="${value}" ${expense?.category === value ? "selected" : ""}>${meta.label}</option>`).join("")}</select></div><div class="form-field"><label for="expense-season">Saison</label><select id="expense-season" name="season">${seasons.map((year) => `<option value="${year}" ${Number(expense?.season || state.currentSeason) === year ? "selected" : ""}>${year}</option>`).join("")}</select></div><div class="form-field"><label for="expense-plant">Variété associée</label><select id="expense-plant" name="plantId"><option value="">Aucune / général</option>${plants.map((plant) => `<option value="${escapeHTML(plant.id)}" ${expense?.plantId === plant.id ? "selected" : ""}>${escapeHTML(plant.name)}</option>`).join("")}</select></div><div class="form-field"><label for="expense-region">Zone associée</label><select id="expense-region" name="region"><option value="">Aucune / déduire de la variété</option>${regions.map((region) => `<option value="${escapeHTML(region)}" ${expense?.region === region ? "selected" : ""}>${escapeHTML(region)}</option>`).join("")}</select></div><div class="form-field full"><label for="expense-notes">Note</label><textarea id="expense-notes" name="notes" placeholder="Détail utile pour la prochaine saison…">${escapeHTML(expense?.notes || "")}</textarea></div></div><p class="form-help">Une dépense peut être rattachée à une variété, à une zone, ou rester générale. Elle sera comptée dans la saison choisie.</p><div class="form-actions">${isEdit ? `<button class="button danger" data-action="delete-expense" data-id="${escapeHTML(expense.id)}" type="button">${icon("trash")} Supprimer</button>` : ""}<span style="flex:1"></span><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("check")} ${isEdit ? "Enregistrer" : "Ajouter"}</button></div></form></div></div>`;
}

function renderBudgetModal() {
  const budget = budgetStats();
  const maxCategory = Math.max(...budget.byCategory.map((item) => item.amount), 1);
  const maxZone = Math.max(...budget.zones.map((item) => item.amount), 1);
  const expenses = [...budget.expenses].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const rowLabel = (expense) => {
    const plant = expense.plantId ? findPlant(expense.plantId) : null;
    const scope = expense.region || plant?.region || "Dépense générale";
    return `${formatDateShort(expense.date)} · ${expenseMeta[expense.category]?.label || expense.category} · ${scope}`;
  };
  return `<div class="modal-backdrop"><div class="modal budget-modal" role="dialog" aria-modal="true" aria-labelledby="budget-title"><div class="modal-header"><div><h2 id="budget-title">Budget du potager</h2><p>Les dépenses de la saison ${state.currentSeason}, par catégorie, variété et zone.</p></div><div class="modal-header-actions"><button class="button primary" data-action="add-expense" type="button">${icon("plus")} Ajouter</button><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div></div><div class="modal-body"><div class="budget-summary"><div><strong>${formatCurrency(budget.total)}</strong><span>Total de la saison</span></div><div><strong>${budget.yieldKg ? formatCurrency(budget.total / budget.yieldKg) : "—"}</strong><span>Coût par kg récolté</span></div><div class="green"><strong>${formatCurrency(budget.marketValue)}</strong><span>Valeur au prix du commerce</span></div><div class="${budget.savings >= 0 ? "green" : "tomato"}"><strong>${formatCurrency(budget.savings)}</strong><span>${budget.savings >= 0 ? "Économie estimée" : "Écart à couvrir"}</span></div></div><section class="budget-projection"><div><span class="eyebrow">PROJECTION SAISON SUIVANTE</span><h3>${formatCurrency(budget.projectedExpenses)} de dépenses pour environ ${formatNumber(budget.projectedYieldKg, 1)} kg</h3><p>Avec le coefficient de projection actuel, la valeur commerciale estimée serait de ${formatCurrency(budget.projectedMarketValue)}.</p></div><form id="budget-settings-form" class="budget-settings-form"><label>Prix commerce / kg<input name="marketPricePerKg" type="number" min="0" step="0.1" value="${Number(budget.marketPricePerKg).toFixed(2)}" /></label><label>Projection<input name="projectionRate" type="number" min="0.1" step="0.05" value="${Number(state.budgetSettings?.projectionRate || 1.15).toFixed(2)}" /></label><button class="button ghost" type="submit">${icon("check")} Actualiser</button></form></section><div class="budget-columns"><section class="budget-breakdown"><div class="budget-section-head"><h3>Par catégorie</h3><span>${state.currentSeason}</span></div>${budget.byCategory.map((item) => `<div class="budget-line"><div><strong>${escapeHTML(item.label)}</strong><span>${formatCurrency(item.amount)}</span></div><div class="budget-track"><span class="${item.tone || ""}" style="width:${(item.amount / maxCategory) * 100}%"></span></div></div>`).join("") || `<div class="no-results">Aucune dépense enregistrée.</div>`}</section><section class="budget-breakdown"><div class="budget-section-head"><h3>Par zone</h3><span>${budget.zones.length}</span></div>${budget.zones.map((item) => `<div class="budget-line"><div><strong>${escapeHTML(item.label)}</strong><span>${formatCurrency(item.amount)}</span></div><div class="budget-track"><span style="width:${(item.amount / maxZone) * 100}%"></span></div></div>`).join("") || `<div class="no-results">Aucune zone associée.</div>`}</section></div><section class="budget-breakdown budget-varieties"><div class="budget-section-head"><h3>Par variété</h3><span>du plus coûteux au plus léger</span></div><div class="budget-variety-grid">${budget.varieties.map((item) => `<div class="budget-variety"><strong>${escapeHTML(item.label)}</strong><span>${formatCurrency(item.amount)}</span></div>`).join("") || `<div class="no-results">Aucune variété associée.</div>`}</div></section><section class="budget-list"><div class="budget-section-head"><h3>Détail des achats</h3><span>${expenses.length} ligne${expenses.length > 1 ? "s" : ""}</span></div>${expenses.map((expense) => `<div class="expense-row"><span class="expense-icon ${expenseMeta[expense.category]?.tone || ""}">${icon(expenseMeta[expense.category]?.tone === "yellow" ? "sun" : expenseMeta[expense.category]?.tone === "green" ? "leaf" : expenseMeta[expense.category]?.tone === "blue" ? "droplet" : "scale")}</span><div class="expense-copy"><strong>${escapeHTML(expense.label)}</strong><span>${escapeHTML(rowLabel(expense))}${expense.notes ? ` · ${escapeHTML(expense.notes)}` : ""}</span></div><b>${formatCurrency(expense.amount)}</b><button class="mini-button" data-action="edit-expense" data-id="${escapeHTML(expense.id)}" type="button" aria-label="Modifier ${escapeHTML(expense.label)}">${icon("edit")}</button><button class="mini-button" data-action="delete-expense" data-id="${escapeHTML(expense.id)}" type="button" aria-label="Supprimer ${escapeHTML(expense.label)}">${icon("trash")}</button></div>`).join("") || `<div class="no-results">Aucun achat pour cette saison.</div>`}</section><div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Fermer</button></div></div></div></div>`;
}

function exportReminderText() {
  if (!state.lastExportAt) return "Aucune sauvegarde récente · exportez vos données avant de changer d'appareil.";
  const date = new Date(state.lastExportAt);
  if (Number.isNaN(date.getTime())) return "Aucune sauvegarde récente · exportez vos données avant de changer d'appareil.";
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return "Dernier export : aujourd'hui · votre copie de sécurité est à jour.";
  if (days === 1) return "Dernier export : hier · pensez à sauvegarder après vos prochaines récoltes.";
  return `Dernier export : il y a ${days} jours · une nouvelle copie est recommandée.`;
}


function seedViabilityLabel(item) {
  if (!item.viabilityDate) return "Viabilité non renseignée";
  const days = Math.round((new Date(`${item.viabilityDate}T12:00:00`) - new Date(`${todayIso()}T12:00:00`)) / 86400000);
  if (days < 0) return `Viabilité dépassée de ${Math.abs(days)} j`;
  if (days <= 90) return `Viabilité estimée · ${formatDate(item.viabilityDate)}`;
  return `Viable jusqu'au ${formatDate(item.viabilityDate)}`;
}

function renderSeedForm(item = null, defaults = {}) {
  const isEdit = Boolean(item?.id);
  const candidates = [...(state.candidates || [])].sort((a, b) => Number(a.season) - Number(b.season) || a.name.localeCompare(b.name, "fr"));
  const candidateId = item?.candidateId || defaults.candidateId || "";
  const candidate = candidateById(candidateId);
  const initialName = item?.name ?? defaults.name ?? candidate?.name ?? "";
  const input = (value) => escapeHTML(value || "");
  return `<div class="modal-backdrop"><div class="modal compact seed-form-modal" role="dialog" aria-modal="true" aria-labelledby="seed-form-title"><div class="modal-header"><div><span class="eyebrow">INVENTAIRE DE GRAINES</span><h2 id="seed-form-title">${isEdit ? "Modifier un stock" : "Ajouter un stock"}</h2><p>Suivez les sachets, graines récoltées et leur viabilité estimée.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="seed-form" class="modal-body" data-edit-id="${escapeHTML(item?.id || "")}"><div class="form-grid"><div class="form-field full"><label for="seed-name">Variété / stock *</label><input id="seed-name" name="name" required value="${input(initialName)}" placeholder="ex. Fat Frog · semences 2026" /></div><div class="form-field"><label for="seed-candidate">Candidat lié</label><select id="seed-candidate" name="candidateId"><option value="">Aucun candidat</option>${candidates.map((candidateItem) => `<option value="${escapeHTML(candidateItem.id)}" ${candidateItem.id === candidateId ? "selected" : ""}>${escapeHTML(candidateItem.name)} · ${candidateStatusLabel(candidateItem.status)}</option>`).join("")}</select></div><div class="form-field"><label for="seed-catalog-id">Identifiant catalogue</label><input id="seed-catalog-id" name="catalogId" value="${input(item?.catalogId || defaults.catalogId || candidate?.catalogId)}" placeholder="Facultatif" /></div><div class="form-field"><label for="seed-quantity">Quantité restante *</label><input id="seed-quantity" name="quantity" type="number" min="0" step="1" required value="${item?.quantity ?? defaults.quantity ?? ""}" placeholder="ex. 24" /></div><div class="form-field"><label for="seed-unit">Unité</label><select id="seed-unit" name="unit"><option value="graines" ${item?.unit === "graines" || !item ? "selected" : ""}>Graines</option><option value="sachets" ${item?.unit === "sachets" ? "selected" : ""}>Sachets</option><option value="plants" ${item?.unit === "plants" ? "selected" : ""}>Plants</option></select></div><div class="form-field"><label for="seed-acquired-date">Date d'achat</label><input id="seed-acquired-date" name="acquiredDate" type="date" value="${input(item?.acquiredDate)}" /></div><div class="form-field"><label for="seed-harvest-date">Date de récolte des graines</label><input id="seed-harvest-date" name="harvestDate" type="date" value="${input(item?.harvestDate)}" /></div><div class="form-field"><label for="seed-viability-date">Viabilité estimée jusqu'au</label><input id="seed-viability-date" name="viabilityDate" type="date" value="${input(item?.viabilityDate)}" /></div><div class="form-field"><label for="seed-source">Source / lot</label><input id="seed-source" name="source" value="${input(item?.source)}" placeholder="Semencier, plant sélectionné…" /></div><div class="form-field"><label for="seed-location">Emplacement</label><input id="seed-location" name="location" value="${input(item?.location)}" placeholder="Boîte, tiroir, chambre froide…" /></div><div class="form-field full"><label for="seed-notes">Notes</label><textarea id="seed-notes" name="notes" placeholder="Taux de germination, sélection, conditions de stockage…">${input(item?.notes)}</textarea></div></div><div class="form-help">Un stock lié à une candidate « à acheter » disparaît de la liste des achats dès qu'une quantité positive est enregistrée.</div><div class="form-actions">${isEdit ? `<button class="button danger" data-action="delete-seed" data-id="${escapeHTML(item.id)}" type="button">${icon("trash")} Supprimer</button>` : ""}<span style="flex:1"></span><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("check")} ${isEdit ? "Enregistrer" : "Ajouter au stock"}</button></div></form></div></div>`;
}

function renderSeedInventoryManager() {
  const stats = seedInventoryStats();
  const rows = [...stats.items].sort((a, b) => String(a.viabilityDate || "9999").localeCompare(String(b.viabilityDate || "9999")) || a.name.localeCompare(b.name, "fr"));
  return `<div class="modal-backdrop"><div class="modal seed-inventory-modal" role="dialog" aria-modal="true" aria-labelledby="seed-inventory-title"><div class="modal-header"><div><span class="eyebrow">STOCKER, CONSERVER, RETROUVER</span><h2 id="seed-inventory-title">Inventaire de graines</h2><p>Le stock restant complète vos candidates, vos croisements et vos achats à prévoir.</p></div><div class="modal-header-actions"><button class="button primary" data-action="add-seed" type="button">${icon("plus")} Ajouter</button><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div></div><div class="modal-body"><div class="seed-summary"><div><strong>${formatNumber(stats.remaining)}</strong><span>unités restantes</span></div><div class="yellow"><strong>${stats.items.length}</strong><span>stocks suivis</span></div><div class="tomato"><strong>${stats.expired}</strong><span>viabilité à vérifier</span></div><div class="blue"><strong>${stats.toBuy.length}</strong><span>candidates encore à acheter</span></div></div>${stats.toBuy.length ? `<section class="seed-buy-list"><div class="budget-section-head"><h3>À acheter mais sans stock</h3><span>${stats.toBuy.length}</span></div>${stats.toBuy.map((candidate) => `<div class="seed-buy-row"><span>${icon("tag")}</span><div><strong>${escapeHTML(candidate.name)}</strong><small>${escapeHTML(candidate.family || "Variété à étudier")} · ${escapeHTML(candidatePriorityMeta[candidate.priority]?.label || "Priorité normale")}</small></div><button class="button ghost" data-action="add-seed-from-candidate" data-id="${escapeHTML(candidate.id)}" type="button">Ajouter au stock</button></div>`).join("")}</section>` : ""}<div class="seed-list">${rows.length ? rows.map((item) => { const candidate = candidateById(item.candidateId); const expired = item.viabilityDate && item.viabilityDate < todayIso() && Number(item.quantity || 0) > 0; return `<article class="seed-row ${expired ? "expired" : ""}"><span class="seed-row-icon">${icon("leaf")}</span><div class="seed-row-copy"><strong>${escapeHTML(item.name)}</strong><small>${formatNumber(item.quantity || 0)} ${escapeHTML(item.unit || "graines")} · ${escapeHTML(item.source || "Source non renseignée")}${candidate ? ` · candidate ${escapeHTML(candidateStatusLabel(candidate.status))}` : ""}</small><span>${escapeHTML(seedViabilityLabel(item))}${item.location ? ` · ${escapeHTML(item.location)}` : ""}</span>${item.notes ? `<p>${escapeHTML(item.notes)}</p>` : ""}</div><div class="seed-row-actions"><button class="mini-button" data-action="consume-seed" data-id="${escapeHTML(item.id)}" type="button" title="Consommer une quantité" aria-label="Consommer une quantité">−</button><button class="mini-button" data-action="edit-seed" data-id="${escapeHTML(item.id)}" type="button" title="Modifier">${icon("edit")}</button><button class="mini-button" data-action="delete-seed" data-id="${escapeHTML(item.id)}" type="button" title="Supprimer">${icon("trash")}</button></div></article>`; }).join("") : `<div class="empty-state seed-empty"><div><div class="empty-illustration" style="color:var(--green);background:var(--green-soft)">${icon("leaf")}</div><h3>Aucun stock enregistré</h3><p>Ajoutez vos sachets, vos graines récoltées ou les stocks de vos croisements.</p><button class="button primary" data-action="add-seed" type="button">${icon("plus")} Ajouter le premier stock</button></div></div>`}</div><div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Fermer</button></div></div></div></div>`;
}


function renderHealthForm(log = null, defaultPlantId = "") {
  const isEdit = Boolean(log?.id);
  const plants = [...(state.plants || [])].sort((a, b) => Number(b.season || 0) - Number(a.season || 0) || a.name.localeCompare(b.name, "fr"));
  const plantId = log?.plantId || defaultPlantId || plants[0]?.id || "";
  const photoOptions = (state.photos || []).filter((photo) => !plantId || photo.plantId === plantId).sort((a, b) => b.date.localeCompare(a.date));
  const input = (value) => escapeHTML(value || "");
  return `<div class="modal-backdrop"><div class="modal compact health-form-modal" role="dialog" aria-modal="true" aria-labelledby="health-form-title"><div class="modal-header"><div><span class="eyebrow">SUIVI SANITAIRE</span><h2 id="health-form-title">${isEdit ? "Modifier une observation" : "Ajouter une observation"}</h2><p>Structurez les symptômes, traitements et évolutions pour mieux comparer les saisons.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="health-form" class="modal-body" data-edit-id="${input(log?.id)}"><div class="form-grid"><div class="form-field full"><label for="health-plant">Plante *</label><select id="health-plant" name="plantId" required>${plants.map((plant) => `<option value="${escapeHTML(plant.id)}" ${plant.id === plantId ? "selected" : ""}>${escapeHTML(plant.name)}</option>`).join("")}</select></div><div class="form-field"><label for="health-date">Date</label><input id="health-date" name="date" type="date" value="${input(log?.date || todayIso())}" /></div><div class="form-field"><label for="health-symptom">Symptôme *</label><select id="health-symptom" name="symptom" required>${Object.entries(healthSymptomMeta).map(([value, meta]) => `<option value="${value}" ${log?.symptom === value ? "selected" : ""}>${meta.label}</option>`).join("")}</select></div><div class="form-field"><label for="health-severity">Intensité</label><select id="health-severity" name="severity">${Object.entries(healthSeverityMeta).map(([value, meta]) => `<option value="${value}" ${log?.severity === value ? "selected" : ""}>${meta.label}</option>`).join("")}</select></div><div class="form-field"><label for="health-treatment-date">Date du traitement</label><input id="health-treatment-date" name="treatmentDate" type="date" value="${input(log?.treatmentDate)}" /></div><div class="form-field"><label for="health-outcome">Évolution</label><select id="health-outcome" name="outcome"><option value="" ${!log?.outcome ? "selected" : ""}>Non renseignée</option><option value="improving" ${log?.outcome === "improving" ? "selected" : ""}>En amélioration</option><option value="stable" ${log?.outcome === "stable" ? "selected" : ""}>Stable</option><option value="worse" ${log?.outcome === "worse" ? "selected" : ""}>Aggravation</option><option value="resolved" ${log?.outcome === "resolved" ? "selected" : ""}>Résolu</option></select></div><div class="form-field full"><label for="health-treatment">Traitement / action</label><input id="health-treatment" name="treatment" value="${input(log?.treatment)}" placeholder="Retrait des feuilles, savon noir, aération…" /></div><div class="form-field"><label for="health-photo">Photo associée</label><select id="health-photo" name="photoId"><option value="">Aucune photo</option>${photoOptions.map((photo) => `<option value="${escapeHTML(photo.id)}" ${photo.id === log?.photoId ? "selected" : ""}>${escapeHTML(photo.title || `Photo du ${formatDateShort(photo.date)}`)}</option>`).join("")}</select></div><div class="form-field full"><label for="health-notes">Observations</label><textarea id="health-notes" name="notes" placeholder="Conditions météo, propagation, partie touchée, résultat observé…">${input(log?.notes)}</textarea></div></div><div class="form-help">Ajoutez d'abord une photo dans le journal photo pour pouvoir la relier à cette observation.</div><div class="form-actions">${isEdit ? `<button class="button danger" data-action="delete-health" data-id="${escapeHTML(log.id)}" type="button">${icon("trash")} Supprimer</button>` : ""}<span style="flex:1"></span><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("check")} ${isEdit ? "Enregistrer" : "Ajouter l'observation"}</button></div></form></div></div>`;
}

function renderHealthManager() {
  const logs = [...(state.healthLogs || [])].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const severe = logs.filter((log) => log.severity === "severe" || log.outcome === "worse").length;
  return `<div class="modal-backdrop"><div class="modal health-manager-modal" role="dialog" aria-modal="true" aria-labelledby="health-title"><div class="modal-header"><div><span class="eyebrow">OBSERVER POUR MIEUX DÉCIDER</span><h2 id="health-title">Suivi sanitaire</h2><p>Symptômes, traitements, photos et évolution par plante, toutes saisons confondues.</p></div><div class="modal-header-actions"><button class="button primary" data-action="add-health" type="button">${icon("plus")} Ajouter</button><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div></div><div class="modal-body"><div class="health-summary"><div><strong>${logs.length}</strong><span>observations</span></div><div class="tomato"><strong>${severe}</strong><span>à surveiller</span></div><div class="green"><strong>${logs.filter((log) => log.outcome === "resolved").length}</strong><span>résolues</span></div></div><div class="health-list">${logs.length ? logs.map((log) => { const plant = findPlant(log.plantId); const photo = healthPhotoForLog(log); const severity = healthSeverityMeta[log.severity] || healthSeverityMeta.observation; return `<article class="health-row"><span class="health-row-icon ${severity.tone || ""}">${icon(log.symptom === "mildew" ? "droplet" : "info")}</span><div class="health-row-copy"><strong>${escapeHTML(plant?.name || "Plante supprimée")} · ${escapeHTML(healthSymptomLabel(log.symptom))}</strong><small>${formatDate(log.date)} · <span class="health-severity ${severity.tone || ""}">${escapeHTML(severity.label)}</span>${log.outcome ? ` · ${escapeHTML({ improving: "amélioration", stable: "stable", worse: "aggravation", resolved: "résolu" }[log.outcome] || log.outcome)}` : ""}</small>${log.treatment ? `<p><b>Action :</b> ${escapeHTML(log.treatment)}</p>` : ""}${log.notes ? `<p>${escapeHTML(log.notes)}</p>` : ""}${photo ? `<span class="health-photo-link">${icon("camera")} ${escapeHTML(photo.title || "Photo associée")}</span>` : ""}</div><div class="health-row-actions"><button class="mini-button" data-action="edit-health" data-id="${escapeHTML(log.id)}" type="button" title="Modifier">${icon("edit")}</button><button class="mini-button" data-action="delete-health" data-id="${escapeHTML(log.id)}" type="button" title="Supprimer">${icon("trash")}</button></div></article>`; }).join("") : `<div class="empty-state health-empty"><div><div class="empty-illustration" style="color:var(--green);background:var(--green-soft)">${icon("leaf")}</div><h3>Aucune observation sanitaire</h3><p>Notez un symptôme ou un traitement pour conserver un historique exploitable.</p><button class="button primary" data-action="add-health" type="button">${icon("plus")} Ajouter la première</button></div></div>`}</div><div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Fermer</button></div></div></div></div>`;
}


function renderGardenMapModal() {
  const zones = [...new Set([...(state.regions || []), ...seasonPlants().map((plant) => plant.region).filter(Boolean)])].sort((a, b) => a.localeCompare(b, "fr"));
  const unassigned = seasonPlants().filter((plant) => !plant.region);
  const zoneRows = zones.map((zone) => ({ zone, plants: seasonPlants().filter((plant) => plant.region === zone) })).filter((row) => row.plants.length || state.regions.includes(row.zone));
  if (unassigned.length) zoneRows.push({ zone: "Sans zone", plants: unassigned });
  return `<div class="modal-backdrop"><div class="modal garden-map-modal" role="dialog" aria-modal="true" aria-labelledby="garden-map-title"><div class="modal-header"><div><span class="eyebrow">CARTE DE CULTURE · ${state.currentSeason}</span><h2 id="garden-map-title">Carte imprimable du potager</h2><p>Une vue simple par zone, idéale à imprimer ou à enregistrer en PDF depuis la boîte d'impression du navigateur.</p></div><div class="modal-header-actions"><button class="button primary" data-action="print-garden-map" type="button">${icon("download")} Imprimer / PDF</button><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div></div><div class="modal-body"><div id="printable-garden-map" class="printable-garden-map"><div class="printable-map-header"><div><strong>Tomato Journal</strong><span>PLAN DE CULTURE · SAISON ${state.currentSeason}</span></div><span>${formatDate(todayIso())}</span></div><div class="garden-map-grid">${zoneRows.map((row, index) => `<section class="garden-map-zone"><div class="garden-map-zone-header"><span class="garden-map-number">${String(index + 1).padStart(2, "0")}</span><div><h3>${escapeHTML(row.zone)}</h3><small>${row.plants.length} plant${row.plants.length > 1 ? "s" : ""}</small></div><span class="garden-map-rule"></span></div><div class="garden-map-plants">${row.plants.length ? row.plants.map((plant) => `<article class="garden-map-plant"><span class="garden-map-mark" style="--map-accent:${escapeHTML(plantColorBackground(plant))}">${icon("tomato")}</span><div><strong>${escapeHTML(plant.name)}</strong><span>${escapeHTML([plant.location, plant.family, plant.datePlanted ? `plantée le ${formatDateShort(plant.datePlanted)}` : ""].filter(Boolean).join(" · ") || "Emplacement à noter")}</span></div><b>${escapeHTML(statusMeta[plant.status]?.label || "À suivre")}</b></article>`).join("") : `<div class="garden-map-empty">Zone créée, aucun plant associé pour le moment.</div>`}</div></section>`).join("") || `<div class="empty-state"><div><h3>Aucune zone créée</h3><p>Créez une zone pour composer votre première carte.</p></div></div>`}</div><div class="printable-map-footer"><span>Notes : ________________________________________________</span><span>Plantes suivies : ${seasonPlants().length}</span></div></div><p class="form-help map-print-help">Astuce : choisissez « Enregistrer au format PDF » dans la fenêtre d'impression, ou imprimez cette carte sur papier pour l'emporter au potager.</p></div></div></div>`;
}

function renderMore() {
  return `${renderPageHeading(pageMeta.more.title, "Gardez votre journal simple, utile et toujours à portée de main.", "")}
    <div class="more-grid">
      <button class="more-card" data-action="open-recipes" type="button"><div class="more-card-icon">${icon("book")}</div><div><h3>Recettes de saison</h3><p>Des idées pour profiter des tomates fraîchement cueillies.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="share" type="button"><div class="more-card-icon green">${icon("share")}</div><div><h3>Partager un bilan</h3><p>Créez un résumé de votre saison à envoyer à vos proches.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="open-settings" type="button"><div class="more-card-icon blue">${icon("settings")}</div><div><h3>Préférences</h3><p>Unités, saison active et apparence de votre carnet.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="export-llm-context" type="button"><div class="more-card-icon yellow">${icon("message")}</div><div><h3>Contexte pour une IA</h3><p>Générez un fichier Markdown, JSON ou texte avec la synthèse et les données de votre potager.</p></div><span class="open-arrow">${icon("download")}</span></button>
      <button class="more-card" data-action="export-csv" type="button"><div class="more-card-icon blue">${icon("download")}</div><div><h3>Export CSV</h3><p>Ouvrez vos plantes et récoltes dans un tableur, en complément de la sauvegarde JSON.</p></div><span class="open-arrow">${icon("download")}</span></button>
      <button class="more-card" data-action="open-seed-inventory" type="button"><div class="more-card-icon green">${icon("leaf")}</div><div><h3>Inventaire de graines</h3><p>Quantités restantes, viabilité, lots et lien direct avec les candidates à acheter.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="open-health" type="button"><div class="more-card-icon tomato">${icon("info")}</div><div><h3>Suivi sanitaire</h3><p>Symptômes, traitements, évolution et photos associées par plante.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="open-garden-map" type="button"><div class="more-card-icon blue">${icon("map")}</div><div><h3>Carte imprimable</h3><p>Plan des zones et des plants, à imprimer ou enregistrer comme PDF.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="open-planning" type="button"><div class="more-card-icon green">${icon("leaf")}</div><div><h3>Analyser la prochaine saison</h3><p>Obtenez des recommandations à partir de vos rendements et de vos dégustations.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="open-candidates" data-season="${nextSeasonYear()}" type="button"><div class="more-card-icon yellow">${icon("tag")}</div><div><h3>Candidats & achats ${nextSeasonYear()}</h3><p>Classez vos idées, vos achats de graines et les variétés à reconduire.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="open-crosses" type="button"><div class="more-card-icon green">${icon("leaf")}</div><div><h3>Croisements & lignées</h3><p>Suivez les parents, générations, graines et plants sélectionnés.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="open-season-review" data-year="${state.currentSeason}" type="button"><div class="more-card-icon yellow">${icon("star")}</div><div><h3>Bilan qualitatif ${state.currentSeason}</h3><p>Notez le goût, la vigueur et la précocité sans devoir retrouver les pesées.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="open-budget" type="button"><div class="more-card-icon blue">${icon("scale")}</div><div><h3>Budget du potager</h3><p>Suivez les dépenses par variété, par zone et par catégorie.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card install-pwa-card" data-action="install-pwa" type="button"><div class="more-card-icon green">${icon("download")}</div><div><h3>Installer l'application</h3><p>Ajoutez Tomato Journal à l'écran d'accueil et utilisez-le comme une app hors ligne.</p><small class="install-pwa-status" data-install-status>Disponible dans le menu du navigateur</small></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="manage-regions" type="button"><div class="more-card-icon green">${icon("map")}</div><div><h3>Zones du potager</h3><p>Ajoutez, renommez ou supprimez vos bacs et espaces.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="open-tasks" type="button"><div class="more-card-icon blue">${icon("calendar")}</div><div><h3>Tâches & rappels</h3><p>Arrosage, fertilisation et gestes de culture avec dosage.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="open-calendar" type="button"><div class="more-card-icon green">${icon("calendar")}</div><div><h3>Calendrier de culture</h3><p>Plantations, maturités, tâches et récoltes sur l'année.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="open-photo-journal" type="button"><div class="more-card-icon yellow">${icon("camera")}</div><div><h3>Journal photo</h3><p>Suivez visuellement la croissance de chaque variété.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="open-taste" type="button"><div class="more-card-icon yellow">${icon("star")}</div><div><h3>Notes gustatives</h3><p>Notez le goût pour retrouver vos variétés préférées.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="open-trash" type="button"><div class="more-card-icon blue">${icon("trash")}</div><div><h3>Corbeille</h3><p>Restaurez les éléments supprimés ou videz la corbeille.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
      <button class="more-card" data-action="open-help" type="button"><div class="more-card-icon yellow">${icon("help")}</div><div><h3>Aide rapide</h3><p>Quelques repères pour tirer le meilleur de l’application.</p></div><span class="open-arrow">${icon("arrow")}</span></button>
    </div>
    <div style="height:17px"></div>
    <section class="panel storage-panel"><div class="panel-header"><div><h2>Vos données restent chez vous</h2><p>Les métadonnées restent légères dans le journal ; les photos sont stockées séparément dans IndexedDB.</p></div><span class="status-dot"></span></div><div class="storage-overview" data-storage-indicator><span class="storage-overview-icon">${icon("download")}</span><div><strong data-storage-status>Stockage local · vérification…</strong><small data-export-reminder>${escapeHTML(exportReminderText())}</small></div></div><div class="modal-body" style="padding-top:8px"><div style="display:flex;flex-wrap:wrap;gap:8px"><button class="button secondary" data-action="export-data" type="button">${icon("download")} Exporter mes données</button><button class="button secondary" data-action="export-csv" type="button">${icon("download")} Exporter en CSV</button><button class="button secondary" data-action="import-csv" type="button">${icon("upload")} Importer un CSV</button><button class="button secondary" data-action="import-data" type="button">${icon("upload")} Importer une sauvegarde</button><button class="button danger" data-action="reset-demo" type="button">Réinitialiser la démo</button><input type="file" id="import-file" accept="application/json" hidden /><input type="file" id="import-csv-file" accept=".csv,text/csv" hidden /></div></div></section>
    <div style="height:17px"></div>
    <section class="panel"><div class="panel-header"><div><h2>Tomato Journal</h2><p>Un carnet de culture local, pensé pour les saisons généreuses.</p></div><span style="color:var(--muted);font-size:11px">v1.0 · hors ligne</span></div><div class="recent-rows"><div class="recent-row"><div class="tomato-thumb">${icon("tomato")}</div><div class="recent-row-main"><strong>Conseil du jour</strong><span>Notez aussi les petits détails : arrosage, météo, goût et graines à conserver.</span></div></div></div></section>`;
}

function renderPlantForm(plant = null) {
  const isEdit = Boolean(plant?.id);
  const fromCatalog = Boolean(plant?.catalogId && !plant?.id);
  const hasCatalog = Boolean(plant?.catalogId);
  const catalogSummary = plant?.catalogDetails ? catalogShortText(catalogDetailValue({ details: plant.catalogDetails }, "description_histoire_particularités", "description", "fruit"), 190) : "";
  const colors = validColors(plant?.colors).slice(0, 3);
  if (!colors.length) colors.push("red");
  const colorMode = plantColorMode(plant || { colors });
  const selectedSeason = plant?.season || state.currentSeason;
  const regions = [...new Set((state.regions || []).concat(seasonPlants().map((item) => item.region).filter(Boolean)))];
  const title = isEdit ? "Modifier la plante" : fromCatalog ? "Ajouter une variété du catalogue" : "Ajouter une plante";
  const subtitle = isEdit ? "Mettez à jour les informations de ce plant." : fromCatalog ? "Les caractéristiques du fichier fourni sont déjà préremplies. Ajoutez vos informations de culture." : "Commencez par les informations essentielles. Vous pourrez enrichir la fiche plus tard.";
  return `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="plant-form-title"><div class="modal-header"><div><h2 id="plant-form-title">${title}</h2><p>${subtitle}</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="plant-form" class="modal-body" data-edit-id="${plant?.id || ""}" data-catalog-id="${escapeHTML(plant?.catalogId || "")}"><div class="catalog-form-source" data-catalog-selection-note ${hasCatalog ? "" : "hidden"}><span>${icon("tag")}</span><div><strong>${escapeHTML(plant?.family || "Catalogue fourni")}</strong><span>${escapeHTML(plant?.subfamily || "Fiche sélectionnée")} · les caractéristiques seront conservées avec la plante.</span>${catalogSummary ? `<small>${escapeHTML(catalogSummary)}</small>` : ""}${fromCatalog && catalogMaturityNotice(catalogEntryById(plant?.catalogId)) ? `<small class="catalog-planning-notice">${escapeHTML(catalogMaturityNotice(catalogEntryById(plant.catalogId)))}</small>` : ""}</div></div><div class="form-grid">
    <div class="form-field full"><label for="plant-name">Nom de la variété *</label><input id="plant-name" name="name" required value="${escapeHTML(plant?.name || "")}" placeholder="ex. Fat Frog, Koralik…" /></div>
    <div class="form-field full"><label for="plant-catalog-select">Choisir rapidement dans le catalogue</label><select id="plant-catalog-select" name="catalogSelect">${catalogOptionsHTML(plant?.catalogId || "")}</select><span class="form-help">Sélectionnez une fiche pour préremplir automatiquement le nom, le type, la taille, la forme, le port, la maturité et les couleurs.</span></div>
    <div class="form-field"><label for="plant-type">Type</label><select id="plant-type" name="type"><option value="heirloom" ${plant?.type === "heirloom" ? "selected" : ""}>Ancienne</option><option value="hybrid" ${plant?.type === "hybrid" ? "selected" : ""}>Hybride</option><option value="open" ${plant?.type === "open" ? "selected" : ""}>Pollinisation libre</option></select></div>
    <div class="form-field"><label for="plant-season">Saison</label><select id="plant-season" name="season">${[...new Set(state.seasons.map((s) => s.year).concat([state.currentSeason]))].sort((a,b)=>b-a).map((year) => `<option value="${year}" ${Number(selectedSeason) === Number(year) ? "selected" : ""}>${year}</option>`).join("")}</select></div>
    <div class="form-field"><label for="plant-region">Zone / jardin</label><select id="plant-region" name="region"><option value="">Sans zone</option>${regions.map((region) => `<option value="${escapeHTML(region)}" ${plant?.region === region ? "selected" : ""}>${escapeHTML(region)}</option>`).join("")}<option value="__new__">＋ Créer une nouvelle zone…</option></select><span class="form-help">Vous pourrez créer une zone depuis le champ.</span></div>
    <div class="form-field"><label for="plant-location">Emplacement</label><input id="plant-location" name="location" value="${escapeHTML(plant?.location || "")}" placeholder="ex. Bac 3 · plant 2" /></div>
    <div class="form-field"><label for="plant-date">Date de plantation</label><input id="plant-date" name="datePlanted" type="date" value="${plant?.datePlanted || todayIso()}" /></div>
    <div class="form-field"><label for="plant-days">Jours jusqu'à maturité</label><input id="plant-days" name="daysToMaturity" type="number" min="1" max="365" value="${plant?.daysToMaturity || 75}" /></div>
    <div class="form-field"><label for="plant-size">Taille du fruit</label><select id="plant-size" name="size"><option value="" ${!plant?.size ? "selected" : ""}>Non précisée</option>${["cerise","petit","moyen","gros"].map((item) => `<option value="${item}" ${plant?.size === item ? "selected" : ""}>${item[0].toUpperCase()+item.slice(1)}</option>`).join("")}</select></div>
    <div class="form-field"><label for="plant-fruit-type">Type de fruit / caractéristique</label><input id="plant-fruit-type" name="fruitType" value="${escapeHTML(plant?.fruitType || "")}" placeholder="ex. Cerise, cocktail, fleur…" /></div>
    <div class="form-field"><label for="plant-shape">Forme</label><select id="plant-shape" name="shape"><option value="" ${!plant?.shape ? "selected" : ""}>Non précisée</option>${FRUIT_SHAPES.map((item) => `<option value="${item}" ${plant?.shape === item ? "selected" : ""}>${item[0].toUpperCase()+item.slice(1)}</option>`).join("")}</select></div>
    <div class="form-field"><label for="plant-growth">Croissance de la plante</label><select id="plant-growth" name="growth">${growthOptionsHTML(plant?.growth)}</select></div>
    <div class="form-field"><label for="plant-breeder">Obtenteur / source</label><input id="plant-breeder" name="breeder" value="${escapeHTML(plant?.breeder || "")}" placeholder="ex. Sudduth, échange…" /></div>
    <div class="form-field full"><label>Couleur du fruit <span class="form-help">· jusqu'à 3 couleurs</span></label><div class="color-choice-layout"><div class="color-choice-controls"><div class="color-picker">${Object.entries(colorMeta).map(([key, meta]) => `<button class="color-option ${colors.includes(key) ? "selected" : ""}" style="--option-color:${meta.hex}" data-action="pick-color" data-color="${key}" type="button" title="${meta.label}" aria-label="${meta.label}" aria-pressed="${colors.includes(key)}"></button>`).join("")}</div><div class="form-help" id="color-help">${colors.map((color) => colorMeta[color]?.label).filter(Boolean).join(" · ") || "Aucune couleur sélectionnée"}</div><label class="color-mode-control" for="plant-color-mode">Affichage<select id="plant-color-mode" name="colorMode"><option value="solid" ${colorMode === "solid" ? "selected" : ""}>Couleur unie</option><option value="gradient" ${colorMode === "gradient" ? "selected" : ""}>Dégradé multicolore</option></select></label></div><div class="color-preview" data-color-preview style="background:${colorBackground(colors, colorMode)};color:${previewTextColor(colors, colorMode)}"><span class="color-preview-symbol">${icon("tomato")}</span><div><strong>Aperçu du fruit</strong><small data-color-preview-label>${colorMode === "gradient" ? (colors.length > 1 ? "Dégradé multicolore" : "Dégradé prêt · ajoutez une deuxième couleur") : "Couleur unie"}</small></div></div></div></div>
    <div class="form-field full"><label for="plant-notes">Notes</label><textarea id="plant-notes" name="notes" placeholder="Observations, provenance, idées pour la prochaine saison…">${escapeHTML(plant?.notes || "")}</textarea></div>
  </div><div class="form-actions">${isEdit ? `<button class="button danger" data-action="delete-plant" data-id="${escapeHTML(plant.id)}" type="button">${icon("trash")} Supprimer</button>` : ""}<span style="flex:1"></span><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("check")} ${isEdit ? "Enregistrer" : fromCatalog ? "Ajouter cette variété" : "Ajouter au potager"}</button></div></form></div></div>`;
}
function renderHarvestForm(plant = null) {
  const plants = seasonPlants();
  const defaultPlant = plant || plants.find((item) => item.status === "harvesting") || plants[0];
  return `<div class="modal-backdrop"><div class="modal compact" role="dialog" aria-modal="true" aria-labelledby="harvest-form-title"><div class="modal-header"><div><h2 id="harvest-form-title">Noter une récolte</h2><p>Un petit geste maintenant, un beau bilan à la fin de la saison.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="harvest-form" class="modal-body"><div class="form-grid">
    <div class="form-field full"><label for="harvest-plant">Variété *</label><select id="harvest-plant" name="plantId" required>${plants.map((item) => `<option value="${escapeHTML(item.id)}" ${defaultPlant?.id === item.id ? "selected" : ""}>${escapeHTML(item.name)}</option>`).join("")}</select></div>
    <div class="form-field"><label for="harvest-date">Date</label><input id="harvest-date" name="date" type="date" value="${todayIso()}" required /></div>
    <div class="form-field"><label for="harvest-weight">Poids (grammes) *</label><input id="harvest-weight" name="weight" type="number" min="0.1" step="0.1" inputmode="decimal" required placeholder="ex. 320,5" /><span class="form-help">Les dixièmes de gramme sont acceptés, par exemple 1 200,5 g.</span></div>
    <div class="form-field"><label for="harvest-fruits">Nombre de fruits</label><input id="harvest-fruits" name="fruits" type="number" min="0" step="1" value="1" /></div>
    <div class="form-field full"><label for="harvest-notes">Notes</label><textarea id="harvest-notes" name="notes" placeholder="Goût, météo, taille, prochaine action…"></textarea></div>
  </div><div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("check")} Enregistrer la récolte</button></div></form></div></div>`;
}

function renderPlantDetail(plant) {
  const totals = plantTotals(plant);
  const color = plantColorPrimary(plant);
  const detailBackground = plantColorBackground(plant);
  const harvests = [...(plant.harvests || [])].sort((a, b) => b.date.localeCompare(a.date));
  const review = seasonReviewForPlant(plant.id, plant.season);
  const healthLogs = [...(state.healthLogs || [])].filter((log) => log.plantId === plant.id).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const nextCandidate = candidateForPlant(plant, nextSeasonYear());
  const tags = [typeMeta[plant.type] || "Variété", ...validColors(plant.colors).slice(0, 3).map((item) => colorMeta[item]?.label), plant.size, plant.shape, growthMeta[plant.growth] || "", plant.family, plant.subfamily].filter(Boolean);
  const catalogInfo = Object.entries(plant.catalogDetails || {}).length ? `<section class="plant-catalog-inline"><div class="detail-section-title"><h3>Fiche du catalogue fourni</h3><span>${escapeHTML(plant.family || "")}${plant.subfamily ? ` · ${escapeHTML(plant.subfamily)}` : ""}</span></div><div class="plant-catalog-fields">${Object.entries(plant.catalogDetails).map(([label, value]) => `<div><strong>${escapeHTML(label.replaceAll("_", " "))}</strong><span>${escapeHTML(value)}</span></div>`).join("")}</div></section>` : "";
  return `<div class="modal-backdrop"><div class="modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><div class="detail-visual ${plant.colors?.includes("green") ? "green" : ""}" style="background:${detailBackground}"><div class="detail-visual-copy"><div class="eyebrow" style="color:rgba(255,255,255,.66)">${statusMeta[plant.status]?.label || "Plant"} · ${plant.season}</div><h2 id="detail-title">${escapeHTML(plant.name)}</h2><p>${escapeHTML(plant.region || "Zone non renseignée")} · ${escapeHTML(plant.location || "Emplacement non renseigné")}</p></div><div class="detail-tomato">${icon("tomato")}</div></div><div class="detail-main"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:15px"><div class="detail-tags">${tags.map((tag) => `<span class="detail-tag">${escapeHTML(tag)}</span>`).join("")}</div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><div class="detail-stats"><div class="detail-stat"><strong>${formatWeight(totals.weight)}</strong><span>Total récolté</span></div><div class="detail-stat"><strong>${formatNumber(totals.fruits)}</strong><span>Fruits</span></div><div class="detail-stat"><strong>${formatNumber(totals.harvests)}</strong><span>Récoltes</span></div><div class="detail-stat"><strong>${formatAverageFruit(totals.weight, totals.fruits)}</strong><span>Fruit moyen</span></div></div>${catalogInfo}<div class="detail-section-title"><h3>Journal photo</h3><button class="button ghost" data-action="add-photo" data-id="${escapeHTML(plant.id)}" type="button">${icon("camera")} Ajouter</button></div>${renderPlantPhotoStrip(plant.id)}<div class="detail-section-title"><h3>Notes gustatives</h3><button class="button ghost" data-action="rate-plant" data-id="${escapeHTML(plant.id)}" type="button">${icon("star")} Noter</button></div>${renderTasteSummary(plant.id)}<div class="detail-section-title"><h3>Bilan qualitatif ${plant.season}</h3><button class="button ghost" data-action="review-plant" data-id="${escapeHTML(plant.id)}" type="button">${icon("edit")} ${reviewHasContent(review) ? "Modifier" : "Noter"}</button></div>${renderReviewSummary(review)}<div class="detail-section-title"><h3>Suivi sanitaire</h3><button class="button ghost" data-action="add-health" data-id="${escapeHTML(plant.id)}" type="button">${icon("info")} ${healthLogs.length ? "Ajouter une observation" : "Observer"}</button></div>${healthLogs.length ? `<div class="health-inline-list">${healthLogs.slice(0, 3).map((log) => `<div class="health-inline-row"><span class="health-inline-mark">${icon(log.symptom === "mildew" ? "droplet" : "info")}</span><div><strong>${escapeHTML(healthSymptomLabel(log.symptom))}</strong><small>${formatDate(log.date)} · ${escapeHTML(healthSeverityLabel(log.severity))}${log.treatment ? ` · ${escapeHTML(log.treatment)}` : ""}</small></div><button class="mini-button" data-action="edit-health" data-id="${escapeHTML(log.id)}" type="button" title="Modifier">${icon("edit")}</button></div>`).join("")}</div>` : `<div class="photo-inline-empty"><span>${icon("info")}</span><div><strong>Aucune observation sanitaire</strong><small>Notez un symptôme pour garder un historique exploitable.</small></div><button class="button secondary" data-action="add-health" data-id="${escapeHTML(plant.id)}" type="button">Ajouter</button></div>`}<div class="detail-section-title"><h3>Journal de récolte</h3><span>Planté le ${formatDate(plant.datePlanted)}</span></div><div class="harvest-list">${harvests.slice(0, 8).map((harvest) => `<div class="harvest-line"><strong>${formatDate(harvest.date)}</strong><span>${harvest.fruits || 0} fruit${harvest.fruits > 1 ? "s" : ""}${harvest.notes ? ` · ${escapeHTML(harvest.notes)}` : ""}</span><span class="weight">${formatWeight(harvest.weight)}</span><button class="mini-button" data-action="delete-harvest" data-plant-id="${escapeHTML(plant.id)}" data-harvest-id="${harvest.id}" type="button" title="Supprimer cette récolte" aria-label="Supprimer cette récolte">${icon("trash")}</button></div>`).join("") || `<div class="no-results">Aucune récolte notée pour cette plante.</div>`}</div>${harvests.length > 8 ? `<div class="form-help" style="margin-top:9px">${harvests.length - 8} ancienne${harvests.length - 8 > 1 ? "s" : "e"} récolte${harvests.length - 8 > 1 ? "s" : ""} masquée${harvests.length - 8 > 1 ? "s" : ""} dans cet aperçu.</div>` : ""}<div class="detail-footer"><button class="button secondary" data-action="edit-plant" data-id="${escapeHTML(plant.id)}" type="button">${icon("edit")} Modifier la fiche</button><button class="button secondary" data-action="add-candidate-from-plant" data-id="${escapeHTML(plant.id)}" type="button">${icon("leaf")} ${nextCandidate ? "Modifier la préparation" : `Préparer ${nextSeasonYear()}`}</button><button class="button primary" data-action="log-harvest" data-id="${escapeHTML(plant.id)}" type="button">${icon("plus")} Noter une récolte</button></div></div></div></div>`;
}

function renderSeasonForm(season = null) {
  const isEdit = Boolean(season);
  const status = seasonStatusMeta[season?.status] ? season.status : (season?.end ? "incomplete" : "active");
  return `<div class="modal-backdrop"><div class="modal compact" role="dialog" aria-modal="true"><div class="modal-header"><div><h2>${isEdit ? "Modifier la saison" : "Nouvelle saison"}</h2><p>Donnez un cadre à vos observations de culture.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="season-form" class="modal-body" data-edit-year="${season?.year || ""}"><div class="form-grid"><div class="form-field full"><label for="season-year">Année *</label><input id="season-year" name="year" type="number" min="2000" max="2200" required value="${season?.year || new Date().getFullYear()}" /></div><div class="form-field"><label for="season-start">Début</label><input id="season-start" name="start" type="date" value="${season?.start || todayIso()}" /></div><div class="form-field"><label for="season-end">Fin prévue</label><input id="season-end" name="end" type="date" value="${season?.end || ""}" /></div><div class="form-field"><label for="season-status">État du bilan</label><select id="season-status" name="status">${Object.entries(seasonStatusMeta).map(([value, meta]) => `<option value="${value}" ${status === value ? "selected" : ""}>${meta.label}</option>`).join("")}</select><span class="form-help">Choisissez « Bilan incomplet » si vous n’avez pas pesé ou noté toutes les récoltes.</span></div><div class="form-field full"><label for="season-notes">Intention de saison</label><textarea id="season-notes" name="notes" placeholder="Ce que vous voulez observer cette année…">${escapeHTML(season?.notes || "")}</textarea></div></div><div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("check")} ${isEdit ? "Enregistrer" : "Créer la saison"}</button></div></form></div></div>`;
}

function renderHighlightForm(year) {
  return `<div class="modal-backdrop"><div class="modal compact" role="dialog" aria-modal="true"><div class="modal-header"><div><h2>Ajouter un moment</h2><p>Une observation, une réussite ou une idée à retenir.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="highlight-form" class="modal-body" data-year="${year}"><div class="form-grid"><div class="form-field full"><label for="highlight-title">Titre *</label><input id="highlight-title" name="title" required placeholder="ex. Première dégustation" /></div><div class="form-field full"><label for="highlight-text">Détail</label><textarea id="highlight-text" name="text" placeholder="Ce que vous voulez garder en mémoire…"></textarea></div><div class="form-field full"><label for="highlight-tone">Couleur</label><select id="highlight-tone" name="tone"><option value="">Tomate</option><option value="green">Sauge</option><option value="yellow">Soleil</option></select></div></div><div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("check")} Ajouter le moment</button></div></form></div></div>`;
}

function renderSeasonPicker() {
  const years = [...new Set(state.seasons.map((s) => s.year).concat(state.plants.map((p) => p.season)))].sort((a, b) => b - a);
  return `<div class="modal-backdrop"><div class="modal compact" role="dialog" aria-modal="true"><div class="modal-header"><div><h2>Changer de saison</h2><p>Affichez les plantes et récoltes d'une autre année.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><div class="modal-body"><div style="display:grid;gap:8px">${years.map((year) => `<button class="button ${Number(year) === Number(state.currentSeason) ? "primary" : "secondary"} full" data-action="select-season" data-year="${year}" type="button"><span style="flex:1;text-align:left">${year}</span>${Number(year) === Number(state.currentSeason) ? icon("check") : icon("chevron")}</button>`).join("")}<button class="button ghost full" data-action="add-season" type="button">${icon("plus")} Créer une nouvelle saison</button></div></div></div></div>`;
}

function renderRegionsModal() {
  const regions = [...new Set((state.regions || []).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const rows = regions.map((region) => {
    const plantCount = state.plants.filter((plant) => plant.region === region).length;
    return `<div class="region-row"><div class="region-marker">${icon("map")}</div><div class="region-copy"><strong>${escapeHTML(region)}</strong><span>${plantCount} plante${plantCount > 1 ? "s" : ""} associée${plantCount > 1 ? "s" : ""}</span></div><button class="mini-button" data-action="rename-region" data-region="${escapeHTML(region)}" type="button" title="Renommer ${escapeHTML(region)}" aria-label="Renommer ${escapeHTML(region)}">${icon("edit")}</button><button class="mini-button" data-action="delete-region" data-region="${escapeHTML(region)}" type="button" title="Supprimer ${escapeHTML(region)}" aria-label="Supprimer ${escapeHTML(region)}">${icon("trash")}</button></div>`;
  }).join("");
  return `<div class="modal-backdrop"><div class="modal compact" role="dialog" aria-modal="true" aria-labelledby="regions-title"><div class="modal-header"><div><h2 id="regions-title">Zones du potager</h2><p>Organisez vos bacs, votre serre et vos espaces de culture.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><div class="modal-body"><div class="region-list">${rows || `<div class="no-results" style="padding:24px 8px">Aucune zone créée pour le moment.</div>`}</div><form id="region-form" class="region-add"><div class="form-field"><label for="region-name">Nouvelle zone</label><input id="region-name" name="name" required placeholder="ex. Serre, Bac 4…" /></div><button class="button primary" type="submit">${icon("plus")} Ajouter</button></form><p class="form-help" style="margin:12px 2px 0">Supprimer une zone ne supprime pas les plantes : elles resteront dans le potager, sans zone associée. Une double confirmation sera demandée.</p><div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Fermer</button></div></div></div></div>`;
}

function renderTaskForm(task = null) {
  const isEdit = Boolean(task);
  const plants = seasonPlants();
  const plantId = task?.plantId || "";
  return `<div class="modal-backdrop"><div class="modal compact" role="dialog" aria-modal="true" aria-labelledby="task-form-title"><div class="modal-header"><div><h2 id="task-form-title">${isEdit ? "Modifier la tâche" : "Ajouter une tâche"}</h2><p>Programmez un geste de culture avec son dosage ou sa quantité.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="task-form" class="modal-body" data-edit-id="${task?.id || ""}"><div class="form-grid"><div class="form-field full"><label for="task-title">Action à réaliser *</label><input id="task-title" name="title" required value="${escapeHTML(task?.title || "")}" placeholder="ex. Arroser les plants de la serre" /></div><div class="form-field"><label for="task-type">Type de tâche</label><select id="task-type" name="type">${Object.entries(taskMeta).map(([value, meta]) => `<option value="${value}" ${task?.type === value ? "selected" : ""}>${meta.label}</option>`).join("")}</select></div><div class="form-field"><label for="task-date">À faire le</label><input id="task-date" name="dueDate" type="date" value="${task?.dueDate || todayIso()}" /></div><div class="form-field"><label for="task-plant">Plante concernée</label><select id="task-plant" name="plantId"><option value="">Tout le potager</option>${plants.map((plant) => `<option value="${escapeHTML(plant.id)}" ${plantId === plant.id ? "selected" : ""}>${escapeHTML(plant.name)}</option>`).join("")}</select></div><div class="form-field"><label for="task-repeat">Répétition</label><select id="task-repeat" name="repeat">${Object.entries(repeatMeta).map(([value, label]) => `<option value="${value}" ${task?.repeat === value || (!task && value === "once") ? "selected" : ""}>${label}</option>`).join("")}</select></div><div class="form-field full"><label for="task-amount">Quantité / dosage <span class="form-help">· facultatif</span></label><input id="task-amount" name="amount" value="${escapeHTML(task?.amount || "")}" placeholder="ex. 2 L par plant, 30 ml dans 5 L d'eau…" /></div><div class="form-field full"><label for="task-notes">Détails et méthode</label><textarea id="task-notes" name="notes" placeholder="Moment idéal, méthode, produit utilisé…">${escapeHTML(task?.notes || "")}</textarea></div></div><div class="form-actions">${isEdit ? `<button class="button danger" data-action="delete-task" data-id="${escapeHTML(task.id)}" type="button">${icon("trash")} Supprimer</button>` : ""}<span style="flex:1"></span><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("check")} ${isEdit ? "Enregistrer" : "Programmer"}</button></div></form></div></div>`;
}

function updateTaskRowView(task) {
  const rows = [...document.querySelectorAll("[data-task-row]")].filter((row) => row.dataset.taskRow === String(task.id));
  rows.forEach((row) => {
    row.classList.toggle("completed", Boolean(task.done));
    const check = row.querySelector(".task-check");
    if (check) {
      check.innerHTML = task.done ? icon("check") : "";
      check.setAttribute("aria-label", task.done ? "Marquer comme à faire" : "Marquer comme terminé");
    }
    const due = row.querySelector(".task-due");
    if (due) {
      due.textContent = task.done ? "Terminée" : taskDueLabel(task);
      due.classList.toggle("late", !task.done && taskIsLate(task));
      due.classList.toggle("done", Boolean(task.done));
    }
  });
  const tasks = seasonTasks();
  const summary = { pending: tasks.filter((item) => !item.done).length, late: tasks.filter(taskIsLate).length, done: tasks.filter((item) => item.done).length };
  document.querySelectorAll("[data-pending-task-count]").forEach((element) => { element.textContent = summary.pending; });
  Object.entries(summary).forEach(([key, value]) => document.querySelectorAll(`[data-task-summary="${key}"] strong`).forEach((element) => { element.textContent = value; }));
}

function renderTaskManager() {
  const tasks = seasonTasks().sort((a, b) => Number(a.done) - Number(b.done) || String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")));
  const pending = tasks.filter((task) => !task.done).length;
  const late = tasks.filter(taskIsLate).length;
  return `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="tasks-title"><div class="modal-header"><div><h2 id="tasks-title">Tâches & rappels</h2><p>Les prochains gestes importants pour la saison ${state.currentSeason}.</p></div><div style="display:flex;gap:7px;align-items:flex-start"><button class="button primary" data-action="add-task" type="button">${icon("plus")} Ajouter</button><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div></div><div class="modal-body"><div class="task-summary"><div data-task-summary="pending"><strong>${pending}</strong><span>à faire</span></div><div data-task-summary="late"><strong>${late}</strong><span>en retard</span></div><div data-task-summary="done"><strong>${tasks.length - pending}</strong><span>terminée${tasks.length - pending > 1 ? "s" : ""}</span></div></div><div class="task-list">${tasks.length ? tasks.map((task) => renderTaskRow(task)).join("") : `<div class="no-results" style="padding:40px 10px">Aucune tâche pour cette saison.</div>`}</div><p class="form-help" style="margin-top:15px">Cochez une tâche pour la terminer. Les rappels restent disponibles hors ligne et se mettent à jour à l'ouverture de l'application.</p></div></div></div>`;
}

function renderPhotoForm(plantId = "") {
  const plants = seasonPlants();
  const defaultPlant = findPlant(plantId) || plants[0];
  return `<div class="modal-backdrop"><div class="modal compact" role="dialog" aria-modal="true" aria-labelledby="photo-form-title"><div class="modal-header"><div><h2 id="photo-form-title">Ajouter une photo</h2><p>Gardez une trace de la croissance et des petits détails.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="photo-form" class="modal-body"><div class="form-grid"><div class="form-field full"><label for="photo-file">Photo *</label><input id="photo-file" name="file" type="file" accept="image/*" required /><span class="form-help">L'image sera compressée et enregistrée localement dans ce navigateur.</span></div><div class="form-field"><label for="photo-plant">Plante</label><select id="photo-plant" name="plantId">${plants.map((plant) => `<option value="${escapeHTML(plant.id)}" ${defaultPlant?.id === plant.id ? "selected" : ""}>${escapeHTML(plant.name)}</option>`).join("")}</select></div><div class="form-field"><label for="photo-date">Date</label><input id="photo-date" name="date" type="date" value="${todayIso()}" /></div><div class="form-field full"><label for="photo-title">Titre</label><input id="photo-title" name="title" placeholder="ex. Première grappe, vue du plant…" /></div><div class="form-field full"><label for="photo-caption">Légende / observation</label><textarea id="photo-caption" name="caption" placeholder="Taille, météo, évolution, problème observé…"></textarea></div></div><div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("camera")} Enregistrer la photo</button></div></form></div></div>`;
}

function renderPhotoCard(photo, showActions = true) {
  const plant = findPlant(photo.plantId);
  const source = photoSource(photo);
  const visual = source ? `<img src="${escapeHTML(source)}" alt="${escapeHTML(photo.title || `Photo de ${plant?.name || "la plante"}`)}" />` : `<div class="photo-missing">${icon("camera")}<span>Image en cours de chargement</span></div>`;
  return `<article class="photo-card">${visual}<div class="photo-card-copy"><strong>${escapeHTML(photo.title || "Observation")}</strong><span>${formatDate(photo.date)}${plant ? ` · ${escapeHTML(plant.name)}` : ""}</span>${photo.caption ? `<p>${escapeHTML(photo.caption)}</p>` : ""}</div>${showActions ? `<div class="photo-card-actions"><button class="mini-button" data-action="delete-photo" data-id="${escapeHTML(photo.id)}" type="button" title="Supprimer la photo" aria-label="Supprimer la photo">${icon("trash")}</button></div>` : ""}</article>`;
}

function renderPhotoJournalModal() {
  const photos = [...(state.photos || [])].filter((photo) => !photo.season || Number(photo.season) === Number(state.currentSeason)).sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="photos-title"><div class="modal-header"><div><h2 id="photos-title">Journal photo</h2><p>Les images de la saison ${state.currentSeason}, conservées sur cet appareil.</p></div><div style="display:flex;gap:7px;align-items:flex-start"><button class="button primary" data-action="add-photo" type="button">${icon("camera")} Ajouter</button><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div></div><div class="modal-body">${photos.length ? `<div class="photo-grid">${photos.map((photo) => renderPhotoCard(photo)).join("")}</div>` : `<div class="empty-state photo-empty"><div><div class="empty-illustration" style="color:var(--blue);background:var(--blue-soft)">${icon("camera")}</div><h3>Votre journal photo est vide</h3><p>Ajoutez la première image d'un plant, d'une fleur ou d'une récolte.</p><button class="button primary" data-action="add-photo" type="button">${icon("camera")} Ajouter une photo</button></div></div>`}</div></div></div>`;
}

function renderPlantPhotoStrip(plantId) {
  const photos = [...(state.photos || [])].filter((photo) => photo.plantId === plantId).sort((a, b) => b.date.localeCompare(a.date));
  if (!photos.length) return `<div class="photo-inline-empty"><span>${icon("camera")}</span><div><strong>Aucune photo pour le moment</strong><small>Ajoutez une image pour suivre l'évolution du plant.</small></div><button class="button secondary" data-action="add-photo" data-id="${escapeHTML(plantId)}" type="button">Ajouter</button></div>`;
  return `<div class="photo-strip">${photos.slice(0, 4).map((photo) => { const source = photoSource(photo); return `<figure class="photo-strip-item">${source ? `<img src="${escapeHTML(source)}" alt="${escapeHTML(photo.title || "Photo de la plante")}" />` : `<div class="photo-missing">${icon("camera")}</div>`}<figcaption>${escapeHTML(photo.title || formatDateShort(photo.date))}</figcaption></figure>`; }).join("")}<button class="photo-add-tile" data-action="add-photo" data-id="${escapeHTML(plantId)}" type="button">${icon("plus")}<span>Ajouter</span></button></div>`;
}

function renderTasteForm(rating = null, defaultPlantId = "") {
  const plants = seasonPlants();
  const plantId = rating?.plantId || defaultPlantId || plants[0]?.id || "";
  const selectOptions = (name, labels, selected) => labels.map((label, index) => `<option value="${index + 1}" ${Number(selected || 0) === index + 1 ? "selected" : ""}>${index + 1} · ${label}</option>`).join("");
  return `<div class="modal-backdrop"><div class="modal compact" role="dialog" aria-modal="true" aria-labelledby="taste-form-title"><div class="modal-header"><div><h2 id="taste-form-title">${rating ? "Modifier une dégustation" : "Noter le goût"}</h2><p>Gardez votre avis pour choisir les variétés à replanter.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="taste-form" class="modal-body" data-edit-id="${escapeHTML(rating?.id || "")}"><div class="form-grid"><div class="form-field full"><label for="taste-plant">Variété *</label><select id="taste-plant" name="plantId" required>${plants.map((plant) => `<option value="${escapeHTML(plant.id)}" ${plant.id === plantId ? "selected" : ""}>${escapeHTML(plant.name)}</option>`).join("")}</select></div><div class="form-field"><label for="taste-date">Date de dégustation</label><input id="taste-date" name="date" type="date" value="${rating?.date || todayIso()}" /></div><div class="form-field"><label for="taste-overall">Note globale *</label><select id="taste-overall" name="overall" required>${selectOptions("overall", ["À éviter", "Passable", "Bonne", "Très bonne", "Exceptionnelle"], rating?.overall || 5)}</select></div><div class="form-field"><label for="taste-flavour">Saveur</label><select id="taste-flavour" name="taste">${selectOptions("taste", ["Fade", "Légère", "Équilibrée", "Parfumée", "Très parfumée"], rating?.taste || 3)}</select></div><div class="form-field"><label for="taste-sweetness">Sucrosité</label><select id="taste-sweetness" name="sweetness">${selectOptions("sweetness", ["Peu sucrée", "Légère", "Moyenne", "Sucrée", "Très sucrée"], rating?.sweetness || 3)}</select></div><div class="form-field"><label for="taste-acidity">Acidité</label><select id="taste-acidity" name="acidity">${selectOptions("acidity", ["Très douce", "Douce", "Équilibrée", "Présente", "Vive"], rating?.acidity || 3)}</select></div><div class="form-field"><label for="taste-texture">Texture</label><select id="taste-texture" name="texture">${selectOptions("texture", ["Farineuse", "Moelleuse", "Fondante", "Ferme", "Très ferme"], rating?.texture || 3)}</select></div><div class="form-field full"><label for="taste-notes">Commentaire</label><textarea id="taste-notes" name="notes" placeholder="Goût, texture, utilisation idéale…">${escapeHTML(rating?.notes || "")}</textarea></div></div><div class="form-actions">${rating ? `<button class="button danger" data-action="delete-rating" data-id="${escapeHTML(rating.id)}" type="button">${icon("trash")} Supprimer</button>` : ""}<span style="flex:1"></span><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("check")} ${rating ? "Enregistrer" : "Ajouter la note"}</button></div></form></div></div>`;
}

function renderTasteCard(rating) {
  const plant = findPlant(rating.plantId);
  return `<article class="taste-card"><div class="taste-card-top"><div><strong>${escapeHTML(plant?.name || "Variété supprimée")}</strong><span>${formatDate(rating.date)}</span></div><div class="taste-score">${formatNumber(rating.overall, 1)} / 5</div></div><div class="taste-card-rating">${renderStars(rating.overall)}<span>Saveur ${rating.taste || "—"} · Sucrosité ${rating.sweetness || "—"} · Texture ${rating.texture || "—"}</span></div>${rating.notes ? `<p>${escapeHTML(rating.notes)}</p>` : ""}<div class="taste-card-actions"><button class="button ghost" data-action="edit-rating" data-id="${escapeHTML(rating.id)}" type="button">${icon("edit")} Modifier</button><button class="button ghost" data-action="delete-rating" data-id="${escapeHTML(rating.id)}" type="button">${icon("trash")} Supprimer</button></div></article>`;
}

function renderTasteSummary(plantId) {
  const ratings = getPlantRatings(plantId);
  if (!ratings.length) return `<div class="taste-empty"><span>${icon("star")}</span><div><strong>Pas encore de note gustative</strong><small>Ajoutez votre avis après une dégustation.</small></div><button class="button secondary" data-action="rate-plant" data-id="${plantId}" type="button">Noter</button></div>`;
  const average = ratingAverage(plantId);
  const latest = ratings[0];
  return `<div class="taste-summary"><div><div class="taste-summary-score">${formatNumber(average, 1)} <small>/ 5</small></div>${renderStars(average)}<span class="taste-count">${ratings.length} dégustation${ratings.length > 1 ? "s" : ""}</span></div><div class="taste-summary-note">${latest.notes ? `« ${escapeHTML(latest.notes)} »` : "Dernier avis enregistré."}<small>${formatDate(latest.date)}</small></div><button class="button secondary" data-action="rate-plant" data-id="${plantId}" type="button">${icon("plus")} Ajouter</button></div>`;
}

function renderTasteManager() {
  const ratings = [...(state.ratings || [])].filter((rating) => {
    const plant = findPlant(rating.plantId);
    return plant && Number(plant.season) === Number(state.currentSeason);
  }).sort((a, b) => b.date.localeCompare(a.date));
  const average = ratings.length ? ratings.reduce((sum, rating) => sum + Number(rating.overall || 0), 0) / ratings.length : 0;
  return `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="taste-title"><div class="modal-header"><div><h2 id="taste-title">Notes gustatives</h2><p>Vos dégustations et vos préférences pour la saison ${state.currentSeason}.</p></div><div style="display:flex;gap:7px;align-items:flex-start"><button class="button primary" data-action="add-rating" type="button">${icon("plus")} Noter</button><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div></div><div class="modal-body"><div class="taste-overview"><div><strong>${ratings.length ? `${formatNumber(average, 1)} / 5` : "—"}</strong><span>Note moyenne</span></div><div>${renderStars(average)}<span>${ratings.length} avis enregistré${ratings.length > 1 ? "s" : ""}</span></div><div><strong>${new Set(ratings.map((rating) => rating.plantId)).size}</strong><span>variété${new Set(ratings.map((rating) => rating.plantId)).size > 1 ? "s" : ""} goûtée${new Set(ratings.map((rating) => rating.plantId)).size > 1 ? "s" : ""}</span></div></div><div class="taste-list">${ratings.length ? ratings.map(renderTasteCard).join("") : `<div class="empty-state" style="min-height:270px"><div><div class="empty-illustration" style="color:var(--yellow);background:var(--yellow-soft)">${icon("star")}</div><h3>Aucune dégustation</h3><p>Notez votre première tomate pour commencer votre classement personnel.</p></div></div>`}</div></div></div></div>`;
}

function calendarMonthLabel(monthIndex) {
  const date = new Date(Number(state.currentSeason), monthIndex, 1, 12);
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function calendarEvents(year) {
  const events = [];
  seasonPlants(year).forEach((plant) => {
    if (plant.datePlanted) events.push({ date: plant.datePlanted, type: "planting", title: `Plantation · ${plant.name}`, detail: plant.region || "Zone non renseignée" });
    if (plant.datePlanted && plant.daysToMaturity) events.push({ date: addDays(plant.datePlanted, Number(plant.daysToMaturity)), type: "maturity", title: `Maturité estimée · ${plant.name}`, detail: `${plant.daysToMaturity} jours après plantation` });
    const harvests = [...(plant.harvests || [])].sort((a, b) => a.date.localeCompare(b.date));
    if (harvests.length) events.push({ date: harvests[0].date, type: "harvest", title: `Première récolte · ${plant.name}`, detail: formatWeight(harvests[0].weight) });
  });
  const harvestByDay = {};
  harvestEntries(year).forEach((entry) => {
    if (!harvestByDay[entry.date]) harvestByDay[entry.date] = { weight: 0, fruits: 0, varieties: new Set() };
    harvestByDay[entry.date].weight = roundWeight(harvestByDay[entry.date].weight + Number(entry.weight || 0));
    harvestByDay[entry.date].fruits += entry.fruits;
    harvestByDay[entry.date].varieties.add(entry.plantName);
  });
  Object.entries(harvestByDay).forEach(([date, value]) => events.push({ date, type: "harvest-day", title: `Récolte du jour`, detail: `${value.varieties.size} variété${value.varieties.size > 1 ? "s" : ""} · ${formatWeight(value.weight)} · ${value.fruits} fruits` }));
  seasonTasks(year).forEach((task) => { if (task.dueDate) events.push({ date: task.dueDate, type: "task", title: task.title, detail: task.amount || (findPlant(task.plantId)?.name || "Tout le potager"), taskId: task.id }); });
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
}

function renderCalendarEvent(event) {
  const meta = event.type === "task" ? taskMeta["other"] : event.type === "maturity" ? { icon: "sun", tone: "yellow" } : event.type.startsWith("harvest") ? { icon: "fruit", tone: "" } : { icon: "leaf", tone: "green" };
  const action = event.type === "task" ? `data-action="open-tasks"` : event.type.startsWith("harvest") ? `data-route="yields"` : "";
  return `<div class="calendar-event ${event.type} ${action ? "clickable" : ""}" ${action}><span class="calendar-event-icon ${meta.tone || ""}">${icon(meta.icon)}</span><div><strong>${escapeHTML(event.title)}</strong><small>${escapeHTML(event.detail || "")}</small></div></div>`;
}

function renderCalendarModal() {
  const events = calendarEvents(state.currentSeason);
  return `<div class="modal-backdrop"><div class="modal calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-title"><div class="modal-header"><div><h2 id="calendar-title">Calendrier de culture</h2><p>Plantations, maturités, tâches et récoltes de la saison ${state.currentSeason}.</p></div><div style="display:flex;gap:7px;align-items:flex-start"><button class="button primary" data-action="add-task" type="button">${icon("plus")} Ajouter une tâche</button><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div></div><div class="modal-body"><div class="calendar-legend"><span><i class="legend-dot green"></i>Plantation</span><span><i class="legend-dot yellow"></i>Maturité</span><span><i class="legend-dot tomato"></i>Récolte</span><span><i class="legend-dot blue"></i>Tâche</span></div><div class="calendar-grid">${Array.from({ length: 12 }, (_, monthIndex) => { const monthEvents = events.filter((event) => new Date(`${event.date}T12:00:00`).getMonth() === monthIndex && new Date(`${event.date}T12:00:00`).getFullYear() === Number(state.currentSeason)); return `<section class="calendar-month ${monthEvents.length ? "has-events" : ""}"><h3>${calendarMonthLabel(monthIndex)}</h3><div class="calendar-month-events">${monthEvents.length ? monthEvents.map((event) => `<div class="calendar-date-group"><time>${formatDate(event.date, { day: "numeric" })}</time>${renderCalendarEvent(event)}</div>`).join("") : `<span class="calendar-empty">Aucun repère</span>`}</div></section>`; }).join("")}</div></div></div></div>`;
}

function regionBreakdown(stats) {
  const groups = {};
  stats.plants.forEach((plant) => {
    const region = plant.region || "Sans zone";
    if (!groups[region]) groups[region] = { region, weight: 0, fruits: 0, plants: 0 };
    const totals = plantTotals(plant);
    groups[region].weight = roundWeight(groups[region].weight + totals.weight);
    groups[region].fruits += totals.fruits;
    groups[region].plants += 1;
  });
  return Object.values(groups).sort((a, b) => b.weight - a.weight);
}

function detailedStats(stats = seasonStats()) {
  const productive = stats.plants.filter((plant) => plantTotals(plant).weight > 0);
  const avgPerPlant = productive.length ? stats.totalWeight / productive.length : 0;
  const avgFruit = stats.totalFruits ? stats.totalWeight / stats.totalFruits : 0;
  const avgHarvest = stats.harvests ? stats.totalWeight / stats.harvests : 0;
  const zones = regionBreakdown(stats);
  const ratings = (state.ratings || []).filter((rating) => { const plant = findPlant(rating.plantId); return plant && Number(plant.season) === Number(state.currentSeason); });
  const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + Number(rating.overall || 0), 0) / ratings.length : 0;
  const days = {};
  stats.entries.forEach((entry) => { days[entry.date] = (days[entry.date] || 0) + entry.weight; });
  const bestDay = Object.entries(days).sort((a, b) => b[1] - a[1])[0];
  return { productive, avgPerPlant, avgFruit, avgHarvest, zones, averageRating, ratings, bestDay };
}

function renderAdvancedStatsPanel(stats = seasonStats(), withLink = true) {
  const details = detailedStats(stats);
  const maxZone = Math.max(...details.zones.map((zone) => zone.weight), 1);
  return `<section class="panel advanced-stats-panel"><div class="panel-header"><div><h2>Statistiques détaillées</h2><p>Des repères pour comprendre ce qui fonctionne dans votre potager.</p></div>${withLink ? `<button class="button ghost" data-action="open-advanced-stats" type="button">Vue détaillée ${icon("arrow")}</button>` : ""}</div><div class="detailed-metric-grid"><div class="detailed-metric"><span>Rendement moyen / plant</span><strong>${formatWeight(details.avgPerPlant)}</strong><small>${details.productive.length} plant${details.productive.length > 1 ? "s" : ""} productif${details.productive.length > 1 ? "s" : ""}</small></div><div class="detailed-metric"><span>Poids moyen / fruit</span><strong>${formatAverageFruit(stats.totalWeight, stats.totalFruits)}</strong><small>sur ${formatNumber(stats.totalFruits)} fruits</small></div><div class="detailed-metric"><span>Poids moyen / récolte</span><strong>${formatWeight(details.avgHarvest)}</strong><small>${formatNumber(stats.harvests)} événements</small></div><div class="detailed-metric"><span>Note gustative moyenne</span><strong>${details.averageRating ? `${formatNumber(details.averageRating, 1)} / 5` : "—"}</strong><small>${details.ratings.length} dégustation${details.ratings.length > 1 ? "s" : ""}</small></div></div><div class="advanced-lower"><div><h3>Rendement par zone</h3><div class="zone-bars">${details.zones.map((zone) => `<div class="zone-bar-row"><div><span>${escapeHTML(zone.region)}</span><strong>${formatWeight(zone.weight)}</strong></div><div class="breakdown-track"><div class="breakdown-fill" style="--fill:var(--green);width:${zone.weight / maxZone * 100}%"></div></div><small>${zone.plants} plant${zone.plants > 1 ? "s" : ""} · ${zone.fruits} fruits</small></div>`).join("") || `<div class="no-results">Pas encore de donnée.</div>`}</div></div><div><h3>Repères de saison</h3><div class="insight-list">${details.bestDay ? `<div class="insight-row"><span class="insight-icon">${icon("scale")}</span><div><strong>Meilleure journée</strong><small>${formatDate(details.bestDay[0])} · ${formatWeight(details.bestDay[1])}</small></div></div>` : ""}<div class="insight-row"><span class="insight-icon green">${icon("leaf")}</span><div><strong>Zone la plus généreuse</strong><small>${details.zones[0] ? `${escapeHTML(details.zones[0].region)} · ${formatWeight(details.zones[0].weight)}` : "Pas encore de récolte"}</small></div></div><div class="insight-row"><span class="insight-icon yellow">${icon("star")}</span><div><strong>Variété préférée</strong><small>${escapeHTML(getFavoriteVariety(stats.plants) || "Ajoutez une note gustative")}</small></div></div></div></div></div></section>`;
}

function getFavoriteVariety(plants) {
  const ranked = plants.map((plant) => ({ plant, average: ratingAverage(plant.id) })).filter((item) => item.average > 0).sort((a, b) => b.average - a.average);
  return ranked[0] ? `${ranked[0].plant.name} · ${formatNumber(ranked[0].average, 1)}/5` : "";
}

function renderAdvancedStatsModal() {
  return `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="advanced-stats-title"><div class="modal-header"><div><h2 id="advanced-stats-title">Analyse détaillée</h2><p>Les indicateurs de la saison ${state.currentSeason}, calculés à partir de votre journal.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><div class="modal-body">${renderAdvancedStatsPanel(seasonStats(), false)}</div></div></div>`;
}

function renderTrashModal() {
  const items = [...(state.trash || [])].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  return `<div class="modal-backdrop"><div class="modal compact" role="dialog" aria-modal="true" aria-labelledby="trash-title"><div class="modal-header"><div><h2 id="trash-title">Corbeille</h2><p>Restaurez un élément supprimé ou supprimez-le définitivement.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><div class="modal-body"><div class="trash-notice">${icon("info")}<span>Les éléments restent ici tant que vous ne les supprimez pas définitivement.</span></div><div class="trash-list">${items.length ? items.map((item) => `<div class="trash-row"><div class="trash-icon">${icon(item.type === "photo" ? "camera" : item.type === "region" ? "map" : item.type === "task" ? "calendar" : item.type === "rating" ? "star" : item.type === "expense" ? "scale" : item.type === "candidate" ? "leaf" : item.type === "cross" ? "leaf" : item.type === "catalog" ? "tag" : item.type === "seed" ? "leaf" : item.type === "health" ? "info" : "trash")}</div><div class="trash-copy"><strong>${escapeHTML(item.label)}</strong><span>${trashTypeLabel(item.type)} · supprimé le ${formatDate(item.deletedAt)}</span></div><button class="mini-button" data-action="restore-trash" data-id="${escapeHTML(item.id)}" type="button" title="Restaurer">${icon("upload")}</button><button class="mini-button" data-action="delete-trash" data-id="${escapeHTML(item.id)}" type="button" title="Supprimer définitivement">${icon("trash")}</button></div>`).join("") : `<div class="empty-state" style="min-height:230px"><div><div class="empty-illustration" style="color:var(--green);background:var(--green-soft)">${icon("check")}</div><h3>La corbeille est vide</h3><p>Les éléments supprimés pourront être restaurés ici.</p></div></div>`}</div><div class="form-actions">${items.length ? `<button class="button danger" data-action="empty-trash" type="button">${icon("trash")} Vider la corbeille</button>` : ""}<span style="flex:1"></span><button class="button secondary" data-action="close-modal" type="button">Fermer</button></div></div></div></div>`;
}

function renderSettingsModal() {
  return `<div class="modal-backdrop"><div class="modal compact" role="dialog" aria-modal="true"><div class="modal-header"><div><h2>Préférences</h2><p>Adaptez Tomato Journal à votre façon de jardiner.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="settings-form" class="modal-body"><div class="form-grid"><div class="form-field full"><label for="settings-units">Unités de poids</label><select id="settings-units" name="units"><option value="metric" ${state.units === "metric" ? "selected" : ""}>Métrique · grammes et kilogrammes</option><option value="imperial" ${state.units === "imperial" ? "selected" : ""}>Impérial · onces et livres</option></select></div><div class="form-field full"><label for="settings-theme">Ambiance visuelle</label><select id="settings-theme" name="theme"><option value="orbital" ${state.theme !== "night" ? "selected" : ""}>Bio-Orbital · mode clair</option><option value="night" ${state.theme === "night" ? "selected" : ""}>Night Garden HUD · mode sombre</option></select></div><div class="form-field full"><label for="settings-season">Saison affichée par défaut</label><select id="settings-season" name="season">${[...new Set(state.seasons.map((s) => s.year).concat(state.plants.map((p) => p.season)))].sort((a,b)=>b-a).map((year) => `<option value="${year}" ${Number(year) === Number(state.currentSeason) ? "selected" : ""}>${year}</option>`).join("")}</select></div></div><div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("check")} Enregistrer</button></div></form></div></div>`;
}

function shareInsights(stats) {
  const details = detailedStats(stats);
  const breakdown = getBreakdown(stats.plants);
  const heaviest = [...stats.entries].sort((a, b) => b.weight - a.weight)[0];
  const favorite = stats.plants.map((plant) => ({ plant, average: ratingAverage(plant.id) })).filter((item) => item.average > 0).sort((a, b) => b.average - a.average)[0];
  const score = Math.max(0, Math.min(100, Math.round(
    Math.min(stats.totalWeight / 12000, 1) * 35 +
    Math.min(stats.totalFruits / 800, 1) * 20 +
    Math.min(stats.varieties / 18, 1) * 20 +
    Math.min(stats.harvests / 150, 1) * 15 +
    (details.averageRating ? Math.min(details.averageRating / 5, 1) * 10 : 0)
  )));
  const level = score >= 95 ? "Légende du potager" : score >= 85 ? "Jardin champion" : score >= 70 ? "Potager solide" : score >= 50 ? "Plant prometteur" : "Graine en devenir";
  const badges = [];
  if (stats.totalWeight >= 10000) badges.push({ icon: "scale", title: "Cap des 10 kg", tone: "tomato" });
  if (stats.varieties >= 10) badges.push({ icon: "tag", title: `${stats.varieties} variétés`, tone: "green" });
  if (heaviest?.weight >= 400) badges.push({ icon: "fruit", title: "Fruit géant", tone: "yellow" });
  if (stats.harvests >= 50) badges.push({ icon: "calendar", title: "Récolteur régulier", tone: "blue" });
  if (details.averageRating >= 4.5) badges.push({ icon: "star", title: "Coup de cœur", tone: "yellow" });
  if (!badges.length) badges.push({ icon: "leaf", title: "Première saison", tone: "green" });
  let challenge;
  if (stats.totalWeight < 12000) challenge = { title: "Défi amical : passer les 12 kg", progress: Math.min(100, stats.totalWeight / 12000 * 100), detail: `${formatWeight(Math.max(0, 12000 - stats.totalWeight))} à récolter` };
  else if (stats.varieties < 18) challenge = { title: "Défi amical : goûter 18 variétés", progress: Math.min(100, stats.varieties / 18 * 100), detail: `${Math.max(0, 18 - stats.varieties)} variété${18 - stats.varieties > 1 ? "s" : ""} à découvrir` };
  else challenge = { title: "Défi amical : battre le record", progress: Math.min(100, heaviest ? heaviest.weight / 600 * 100 : 0), detail: heaviest ? `${formatWeight(Math.max(0, 600 - heaviest.weight))} pour atteindre 600 g` : "Votre premier record vous attend" };
  return { stats, details, breakdown, heaviest, favorite, score, level, badges, challenge };
}

function shareText(insights) {
  const { stats, details, breakdown, heaviest, favorite, score, level, challenge } = insights;
  const lines = [
    `🌱 BILAN TOMATES ${state.currentSeason} · ${level}`,
    `🏆 Indice potager : ${score}/100`,
    `📊 ${formatWeight(stats.totalWeight)} · ${formatNumber(stats.totalFruits)} fruits · ${formatNumber(stats.varieties)} variétés · ${formatNumber(stats.harvests)} récoltes`,
    `🥇 Variété la plus productive : ${breakdown[0] ? `${breakdown[0].plant.name} (${formatWeight(breakdown[0].weight)})` : "—"}`,
    `🍅 Plus beau fruit : ${heaviest ? `${formatWeight(heaviest.weight)} · ${heaviest.plantName}` : "—"}`,
    `⭐ Coup de cœur : ${favorite ? `${favorite.plant.name} (${formatNumber(favorite.average, 1)}/5)` : "à venir"}`,
    `📍 Zone la plus généreuse : ${details.zones[0] ? `${details.zones[0].region} (${formatWeight(details.zones[0].weight)})` : "—"}`,
    `🎯 ${challenge.title} · ${challenge.detail}`,
    "",
    "Bilan réalisé avec Tomato Journal · À qui le prochain record ? 🍅",
  ];
  return lines.join("\n");
}

function renderShareBadge(badge) {
  return `<div class="share-badge ${badge.tone || ""}"><span>${icon(badge.icon)}</span><strong>${escapeHTML(badge.title)}</strong></div>`;
}

function renderShareModal() {
  const insights = shareInsights(seasonStats());
  const { stats, details, breakdown, heaviest, favorite, score, level, badges, challenge } = insights;
  const text = shareText(insights);
  return `<div class="modal-backdrop"><div class="modal share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title"><div class="modal-header"><div><h2 id="share-title">Partager le bilan</h2><p>Une carte de saison riche, conviviale et prête à lancer un petit défi entre jardiniers.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><div class="modal-body"><div class="share-card" id="share-card"><div class="share-card-top"><div class="share-card-brand"><span class="share-brand-mark"><img src="assets/icon-192.png" alt="" /></span><div><strong>Tomato Journal</strong><small>MON CARNET DE CULTURE</small></div></div><span class="share-season">SAISON ${state.currentSeason}</span></div><div class="share-card-heading"><div><span class="share-overline">MON BILAN DE SAISON</span><h3>${escapeHTML(level)}</h3><p>Une saison qui se raconte en beaux fruits.</p></div><div class="share-score"><strong>${score}</strong><span>/100</span><small>INDICE POTAGER</small></div></div><div class="share-main-stats"><div><strong>${formatWeight(stats.totalWeight)}</strong><span>Poids récolté</span></div><div><strong>${formatNumber(stats.totalFruits)}</strong><span>Fruits</span></div><div><strong>${formatNumber(stats.varieties)}</strong><span>Variétés</span></div><div><strong>${formatNumber(stats.harvests)}</strong><span>Récoltes</span></div></div><div class="share-records"><div><span class="share-record-icon">${icon("tag")}</span><div><small>MEILLEURE PRODUCTIVITÉ</small><strong>${escapeHTML(breakdown[0]?.plant.name || "À découvrir")}</strong><span>${breakdown[0] ? formatWeight(breakdown[0].weight) : "Votre première récolte vous attend"}</span></div></div><div><span class="share-record-icon tomato">${icon("fruit")}</span><div><small>RECORD DE POIDS</small><strong>${heaviest ? formatWeight(heaviest.weight) : "—"}</strong><span>${heaviest ? escapeHTML(heaviest.plantName) : "Pas encore de record"}</span></div></div><div><span class="share-record-icon yellow">${icon("star")}</span><div><small>COUP DE CŒUR</small><strong>${favorite ? escapeHTML(favorite.plant.name) : "À venir"}</strong><span>${favorite ? `${formatNumber(favorite.average, 1)} / 5 · dégustation` : "Notez votre première dégustation"}</span></div></div><div><span class="share-record-icon green">${icon("map")}</span><div><small>ZONE LA PLUS GÉNÉREUSE</small><strong>${escapeHTML(details.zones[0]?.region || "À découvrir")}</strong><span>${details.zones[0] ? formatWeight(details.zones[0].weight) : "Pas encore de récolte"}</span></div></div></div><div class="share-badges"><small>BADGES DÉCROCHÉS</small><div>${badges.slice(0, 5).map(renderShareBadge).join("")}</div></div><div class="share-challenge"><div class="share-challenge-heading"><div><small>NEXT LEVEL</small><strong>${escapeHTML(challenge.title)}</strong></div><span>${Math.round(challenge.progress)}%</span></div><div class="share-progress"><span style="width:${challenge.progress}%"></span></div><p>${escapeHTML(challenge.detail)} · On se retrouve à la prochaine récolte&nbsp;!</p></div><div class="share-card-footer"><span>Récolte avec soin · partage avec plaisir</span><strong>🍅</strong></div></div><div class="share-copy-preview"><span>${icon("share")}</span><div><strong>Prêt à partager</strong><small>Le texte reprend vos chiffres, vos records et votre prochain défi.</small></div></div><div class="share-actions"><button class="button secondary" data-action="copy-share" data-text="${escapeHTML(text)}" type="button">${icon("copy")} Copier le texte</button><button class="button secondary" data-action="download-share-card" type="button">${icon("download")} Télécharger la carte</button><button class="button primary" data-action="native-share" data-text="${escapeHTML(text)}" type="button">${icon("share")} Partager</button></div></div></div></div>`;
}

function renderRecipesModal() {
  return `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><div class="modal-header"><div><h2>Recettes de saison</h2><p>Quand le panier déborde, quelques classiques faciles.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><div class="modal-body"><div class="stack"><div class="panel" style="box-shadow:none"><div class="panel-header"><div><h3>Tomates rôties au four</h3><p>Tomates mûres · ail · huile d'olive · herbes</p></div><span style="color:var(--tomato)">${icon("sun")}</span></div></div><div class="panel" style="box-shadow:none"><div class="panel-header"><div><h3>Salade minute du potager</h3><p>Tomates · basilic · oignon rouge · vinaigre</p></div><span style="color:var(--green)">${icon("leaf")}</span></div></div><div class="panel" style="box-shadow:none"><div class="panel-header"><div><h3>Salsa fraîche</h3><p>Tomates · citron vert · piment · coriandre</p></div><span style="color:var(--yellow)">${icon("fruit")}</span></div></div></div><div class="form-actions"><button class="button primary" data-action="close-modal" type="button">C'est noté</button></div></div></div></div>`;
}

function renderHelpModal() {
  return `<div class="modal-backdrop"><div class="modal compact" role="dialog" aria-modal="true"><div class="modal-header"><div><h2>Aide rapide</h2><p>Les trois gestes qui font vivre votre journal.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><div class="modal-body"><div class="highlight-list" style="padding:0"><div class="highlight-item"><div class="highlight-icon">1</div><div><strong>Ajoutez vos plants</strong><span>Renseignez la variété, sa zone et quelques caractéristiques. Les fiches restent modifiables.</span></div></div><div class="highlight-item"><div class="highlight-icon green">2</div><div><strong>Notez chaque passage</strong><span>Depuis Analyse détaillée ou la fiche d'une plante, indiquez le poids et le nombre de fruits.</span></div></div><div class="highlight-item"><div class="highlight-icon yellow">3</div><div><strong>Observez votre saison</strong><span>Les graphiques et répartitions se mettent à jour automatiquement, sans connexion internet.</span></div></div></div><div class="form-actions"><button class="button primary" data-action="close-modal" type="button">Compris</button></div></div></div></div>`;
}

function renderPWAHelpModal() {
  return `<div class="modal-backdrop"><div class="modal compact" role="dialog" aria-modal="true" aria-labelledby="pwa-title"><div class="modal-header"><div><h2 id="pwa-title">Installer Tomato Journal</h2><p>L'application peut fonctionner comme un carnet hors ligne sur téléphone ou ordinateur.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><div class="modal-body"><div class="pwa-install-intro"><span>${icon("download")}</span><div><strong>Une fois installé, vos données restent dans ce navigateur.</strong><small>Exportez une sauvegarde JSON avant de changer d'appareil ou de supprimer l'application.</small></div></div><div class="install-steps"><div><b>1</b><div><strong>Sur Chrome ou Edge</strong><span>Ouvrez le menu du navigateur puis choisissez « Installer Tomato Journal » ou utilisez l'icône d'installation dans la barre d'adresse.</span></div></div><div><b>2</b><div><strong>Sur iPhone ou iPad</strong><span>Dans Safari, touchez Partager puis « Sur l'écran d'accueil ».</span></div></div><div><b>3</b><div><strong>Sur Android</strong><span>Dans Chrome, ouvrez le menu ⋮ puis choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil ».</span></div></div></div><div class="form-help">L'application est installable uniquement via une adresse sécurisée : <code>https://</code> ou <code>http://localhost</code> pour le développement local.</div><div class="form-actions"><button class="button primary" data-action="close-modal" type="button">Compris</button></div></div></div></div>`;
}

function refreshInstallButtons() {
  const available = Boolean(deferredInstallPrompt);
  document.querySelectorAll("[data-install-status]").forEach((status) => {
    status.textContent = available ? "Installation directe disponible" : "Voir les instructions d'installation";
  });
}

async function installPWA() {
  if (!deferredInstallPrompt) {
    openModal(renderPWAHelpModal());
    return;
  }
  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  refreshInstallButtons();
  if (choice?.outcome === "accepted") toast("Tomato Journal a été ajouté à vos applications.");
  else toast("Installation non effectuée.", "error");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js", { scope: "./" }).then((registration) => registration.update()).catch((error) => {
    console.warn("Le mode hors ligne n'a pas pu être activé", error);
  });
}

function handleStartupAction() {
  const action = new URLSearchParams(window.location.search).get("action");
  if (action === "harvest") openModal(renderHarvestForm());
  if (action === "plant") openModal(renderPlantForm());
  if (action) window.history.replaceState({}, document.title, window.location.pathname);
}

function openModal(html) {
  const root = document.getElementById("modal-root");
  lastFocusedElement = document.activeElement;
  root.innerHTML = html;
  hydrateIcons(root);
  const backdrop = root.querySelector(".modal-backdrop");
  if (backdrop) backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeModal(); });
  const focusable = root.querySelector("input, select, textarea, button");
  if (focusable) setTimeout(() => focusable.focus(), 20);
}

function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
  const focusTarget = lastFocusedElement;
  lastFocusedElement = null;
  if (focusTarget) setTimeout(() => { if (document.contains(focusTarget)) focusTarget.focus(); }, 0);
}

function toast(message, type = "success", action = null) {
  const root = document.getElementById("toast-root");
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.innerHTML = `<span class="toast-icon">${icon(type === "success" ? "check" : "info")}</span><span class="toast-message">${escapeHTML(message)}</span>`;
  if (action) {
    const actionButton = document.createElement("button");
    actionButton.className = "toast-action";
    actionButton.type = "button";
    actionButton.textContent = action.label;
    actionButton.addEventListener("click", () => {
      item.remove();
      action.onClick();
    });
    item.appendChild(actionButton);
  }
  root.appendChild(item);
  setTimeout(() => item.remove(), 4200);
}

function restoredToastText(item) {
  return ({ plant: "Plante restaurée.", region: "Zone restaurée.", harvest: "Récolte restaurée.", task: "Tâche restaurée.", photo: "Photo restaurée.", rating: "Note gustative restaurée.", season: "Saison restaurée.", expense: "Dépense restaurée.", candidate: "Variété restaurée dans la préparation.", cross: "Croisement et lignée restaurés.", seed: "Stock de graines restauré.", health: "Observation sanitaire restaurée.", catalog: "Variété du catalogue restaurée.", backup: "Sauvegarde restaurée." })[item?.type] || "Élément restauré.";
}

function undoTrash(trashId) {
  closeModal();
  const restored = restoreTrashItem(trashId);
  if (restored) toast(restoredToastText(restored));
}

function confirmTwice(subject, extra = "") {
  const first = window.confirm(`Voulez-vous vraiment supprimer ${subject ? `« ${subject} »` : "cet élément"} ?${extra ? `\n\n${extra}` : ""}`);
  if (!first) return false;
  return window.confirm(`Dernière confirmation\\n\\nConfirmez-vous vraiment la suppression de ${subject ? `« ${subject} »` : "cet élément"} ?`);
}

function applyTheme() {
  const theme = state.theme === "night" ? "night" : "orbital";
  document.body.dataset.theme = theme;
  document.documentElement.style.backgroundColor = theme === "night" ? "#0d1814" : "#f5f0e3";
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", theme === "night" ? "#0d1814" : "#f5f0e3");
  const button = document.getElementById("theme-toggle-button");
  if (button) {
    const nextLabel = theme === "night" ? "Passer au mode clair Bio-Orbital" : "Passer au mode sombre Night Garden HUD";
    button.setAttribute("aria-label", nextLabel);
    button.title = nextLabel;
    const iconTarget = button.querySelector("[data-icon]");
    if (iconTarget) iconTarget.innerHTML = icon(theme === "night" ? "sun" : "moon");
  }
}

function toggleTheme() {
  state.theme = state.theme === "night" ? "orbital" : "night";
  saveState();
  render();
  toast(state.theme === "night" ? "Mode sombre Night Garden HUD activé." : "Mode clair Bio-Orbital activé.");
}

function renderOnboarding() {
  if (onboardingStep === 1) return `<div class="modal-backdrop onboarding-backdrop"><div class="modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><div class="onboarding-visual"><span class="onboarding-orbit"><img src="assets/icon-192.png" alt="" /></span><div class="onboarding-orbit-ring"></div></div><div class="modal-body"><span class="eyebrow">PARCOURS DE DÉMARRAGE · 1 / 3</span><h2 id="onboarding-title">Commencez par créer une zone</h2><p>Un bac, une serre ou un coin de balcon suffit. Vous pourrez toujours renommer ou supprimer vos zones plus tard.</p><div class="onboarding-steps"><span class="active"><b>1</b> Zone</span><span><b>2</b> Plante</span><span><b>3</b> Récolte</span></div><div class="form-actions"><button class="button ghost" data-action="onboarding-skip-zone" type="button">Passer cette étape</button><button class="button primary" data-action="onboarding-create-zone" type="button">${icon("map")} Créer une zone</button></div></div></div></div>`;
  if (onboardingStep === 2) return `<div class="modal-backdrop onboarding-backdrop"><div class="modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><div class="onboarding-visual green"><span class="onboarding-orbit">${icon("leaf")}</span><div class="onboarding-orbit-ring"></div></div><div class="modal-body"><span class="eyebrow">PARCOURS DE DÉMARRAGE · 2 / 3</span><h2 id="onboarding-title">Ajoutez votre première plante</h2><p>Choisissez une variété du catalogue ou saisissez votre plant manuellement. Une ou deux fiches suffisent pour commencer à apprendre votre saison.</p><div class="onboarding-steps"><span class="done"><b>${icon("check")}</b> Zone</span><span class="active"><b>2</b> Plante</span><span><b>3</b> Récolte</span></div><div class="form-actions"><button class="button ghost" data-action="onboarding-skip-plant" type="button">Plus tard</button><button class="button primary" data-action="onboarding-create-plant" type="button">${icon("plus")} Ajouter une plante</button></div></div></div></div>`;
  if (onboardingStep === 3) { const plant = state.plants[0]; return `<div class="modal-backdrop onboarding-backdrop"><div class="modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><div class="onboarding-visual tomato"><span class="onboarding-orbit">${icon("scale")}</span><div class="onboarding-orbit-ring"></div></div><div class="modal-body"><span class="eyebrow">PARCOURS DE DÉMARRAGE · 3 / 3</span><h2 id="onboarding-title">Votre carnet est prêt à récolter</h2><p>Quand vos premières tomates arrivent, notez leur poids — les grammes décimaux et la virgule française sont acceptés — pour faire grandir vos analyses.</p><div class="onboarding-steps"><span class="done"><b>${icon("check")}</b> Zone</span><span class="done"><b>${icon("check")}</b> Plante</span><span class="active"><b>3</b> Récolte</span></div><div class="form-actions"><button class="button ghost" data-action="onboarding-finish" type="button">Explorer le carnet</button><button class="button primary" data-action="onboarding-log-harvest" data-id="${escapeHTML(plant?.id || "")}" type="button" ${plant ? "" : "disabled"}>${icon("scale")} Noter ma première récolte</button></div></div></div></div>`; }
  return `<div class="modal-backdrop onboarding-backdrop"><div class="modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><div class="onboarding-visual"><span class="onboarding-orbit"><img src="assets/icon-192.png" alt="" /></span><div class="onboarding-orbit-ring"></div></div><div class="modal-body"><span class="eyebrow">TOMATO JOURNAL · CARNET LOCAL</span><h2 id="onboarding-title">Votre saison, en orbite</h2><p>Un carnet de culture local pour suivre vos tomates, vos récoltes et vos prochaines décisions — sans compte, sans météo connectée.</p><div class="onboarding-feature-grid"><div><span>${icon("map")}</span><strong>Zones</strong><small>Organisez vos espaces.</small></div><div><span>${icon("leaf")}</span><strong>Plants</strong><small>Gardez chaque fiche.</small></div><div><span>${icon("scale")}</span><strong>Récoltes</strong><small>Analysez vos progrès.</small></div></div><div class="onboarding-choice"><button class="button secondary" data-action="onboarding-keep-demo" type="button">${icon("tomato")} Garder la démo</button><button class="button primary" data-action="onboarding-start-blank" type="button">${icon("plus")} Commencer avec un carnet vide</button></div><p class="form-help">Vous pourrez importer une sauvegarde ou recréer des données de démo depuis vos exports à tout moment.</p></div></div></div>`;
}

function finishOnboarding(message = "Bienvenue dans votre carnet de culture.") {
  onboardingFlow = false;
  onboardingStep = 0;
  state.onboardingSeen = true;
  saveState();
  closeModal();
  render();
  toast(message);
}

function render() {
  applyTheme();
  const page = document.getElementById("page-content");
  const renderer = { garden: renderGarden, yields: renderYields, seasons: renderSeasons, varieties: renderVarieties, more: renderMore }[route] || renderGarden;
  page.innerHTML = renderer();
  hydrateIcons(page);
  document.querySelectorAll("[data-route]").forEach((button) => button.classList.toggle("active", button.dataset.route === route));
  const seasonYear = document.getElementById("sidebar-season-year");
  if (seasonYear) seasonYear.textContent = state.currentSeason;
  const topContext = document.getElementById("topbar-context");
  if (topContext) topContext.innerHTML = `Saison ${escapeHTML(state.currentSeason)} <span class="context-divider">·</span> ${escapeHTML(state.regions[0] || "Mon potager")}`;
  refreshInstallButtons();
  renderGlobalSearchResults();
  updateStorageIndicator();
  if (!state.onboardingSeen && !document.getElementById("onboarding-title")) openModal(renderOnboarding());
}

function goTo(nextRoute) {
  globalSearchQuery = "";
  bulkMode = false;
  selectedPlantIds.clear();
  route = nextRoute;
  closeModal();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function findPlant(id) {
  return state.plants.find((plant) => plant.id === id);
}

function globalSearchItems(query) {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  const results = [];
  const add = (kind, id, label, detail, iconName, season = "") => {
    const haystack = normalizeSearchText([label, detail].join(" "));
    if (!haystack.includes(normalized)) return;
    const starts = normalizeSearchText(label).startsWith(normalized);
    results.push({ kind, id: String(id || ""), label: String(label || ""), detail: String(detail || ""), icon: iconName, season, score: (starts ? 20 : 0) + (haystack.indexOf(normalized) === 0 ? 8 : 0) });
  };
  (state.plants || []).forEach((plant) => add("plant", plant.id, plant.name, [plant.family, plant.subfamily, plant.region, plant.location, plant.notes].filter(Boolean).join(" · "), "tomato", plant.season));
  currentSeedCatalog().forEach((entry) => add("catalog", entry.id || entry.catalogIndex, entry.name, [entry.family, entry.subfamily, catalogDetailsText(entry)].filter(Boolean).join(" · "), "tag", ""));
  (state.candidates || []).forEach((candidate) => add("candidate", candidate.id, candidate.name, [candidate.family, candidate.subfamily, candidate.status ? candidateStatusLabel(candidate.status) : "", candidate.notes].filter(Boolean).join(" · "), "leaf", candidate.season));
  (state.crosses || []).forEach((cross) => add("cross", cross.id, cross.name, [cross.generation, crossParentLabel(cross.femaleParent), crossParentLabel(cross.maleParent), cross.traits, cross.notes].filter(Boolean).join(" · "), "leaf", cross.targetSeason));
  (state.tasks || []).forEach((task) => add("task", task.id, task.title, [task.notes, findPlant(task.plantId)?.name, task.amount].filter(Boolean).join(" · "), "calendar", task.season));
  (state.photos || []).forEach((photo) => add("photo", photo.id, photo.title || "Photo", [photo.caption, findPlant(photo.plantId)?.name, photo.date].filter(Boolean).join(" · "), "camera", photo.season));
  (state.seedInventory || []).forEach((seed) => add("seed", seed.id, seed.name, [seed.source, seed.location, seed.notes, seed.candidateId ? candidateById(seed.candidateId)?.name : ""].filter(Boolean).join(" · "), "leaf", ""));
  (state.healthLogs || []).forEach((log) => add("health", log.id, `${healthSymptomLabel(log.symptom)} · ${findPlant(log.plantId)?.name || "Plante"}`, [log.date, healthSeverityLabel(log.severity), log.treatment, log.notes].filter(Boolean).join(" · "), "info", findPlant(log.plantId)?.season || ""));
  (state.plants || []).forEach((plant) => (plant.harvests || []).forEach((harvest) => add("harvest", plant.id, `Récolte · ${plant.name}`, [harvest.date, `${harvest.weight} g`, harvest.notes].filter(Boolean).join(" · "), "scale", plant.season)));
  return results.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "fr")).slice(0, 14);
}

function renderGlobalSearchResults() {
  const root = document.getElementById("global-search-results");
  const input = document.getElementById("global-search");
  const clear = document.querySelector("[data-action=clear-global-search]");
  if (input && input.value !== globalSearchQuery) input.value = globalSearchQuery;
  if (clear) clear.hidden = !globalSearchQuery;
  if (!root) return;
  if (!globalSearchQuery.trim()) {
    root.hidden = true;
    root.innerHTML = "";
    return;
  }
  const results = globalSearchItems(globalSearchQuery);
  root.hidden = false;
  root.innerHTML = results.length ? `<div class="global-search-result-heading">Résultats dans votre carnet</div>${results.map((result) => `<button class="global-search-result" data-action="global-search-result" data-kind="${escapeHTML(result.kind)}" data-id="${escapeHTML(result.id)}" data-season="${escapeHTML(result.season)}" type="button"><span class="global-search-result-icon">${icon(result.icon)}</span><span><strong>${escapeHTML(result.label)}</strong><small>${escapeHTML(result.detail || result.kind)}</small></span><span class="global-search-result-arrow">${icon("chevron")}</span></button>`).join("")}` : `<div class="global-search-empty">Aucun résultat pour « ${escapeHTML(globalSearchQuery)} ».</div>`;
  hydrateIcons(root);
}

function clearGlobalSearch() {
  globalSearchQuery = "";
  renderGlobalSearchResults();
  document.getElementById("global-search")?.focus();
}

function openGlobalSearchResult(element) {
  const kind = element.dataset.kind;
  const id = element.dataset.id;
  clearGlobalSearch();
  if (kind === "plant" || kind === "harvest") {
    const plant = findPlant(id);
    if (plant) openModal(renderPlantDetail(plant));
  } else if (kind === "catalog") {
    const entry = catalogEntryById(id);
    if (entry) openModal(renderCatalogDetail(entry));
  } else if (kind === "candidate") {
    const candidate = candidateById(id);
    if (candidate) openModal(renderCandidateForm(candidate));
  } else if (kind === "cross") {
    const cross = crossById(id);
    if (cross) openModal(renderCrossForm(cross));
  } else if (kind === "task") {
    openModal(renderTaskManager());
  } else if (kind === "photo") {
    openModal(renderPhotoJournalModal());
  } else if (kind === "seed") {
    openModal(renderSeedInventoryManager());
  } else if (kind === "health") {
    openModal(renderHealthManager());
  }
}

const actionDispatch = Object.freeze({
  "onboarding-keep-demo": () => finishOnboarding("La démo est prête à être explorée.") ,
  "onboarding-start-blank": () => { if ((state.plants || []).length && !confirmTwice("repartir avec un carnet vide", "Les données de démonstration ou les données locales actuelles seront remplacées. Exportez-les si vous souhaitez les conserver.")) return; const theme = state.theme; state = buildBlankState(); state.theme = theme; state.onboardingSeen = true; onboardingFlow = true; onboardingStep = 1; saveState(); closeModal(); render(); openModal(renderOnboarding()); },
  "onboarding-create-zone": () => openModal(renderRegionsModal()),
  "onboarding-skip-zone": () => { onboardingStep = 2; openModal(renderOnboarding()); },
  "onboarding-create-plant": () => openModal(renderPlantForm(state.regions[0] ? { region: state.regions[0], season: state.currentSeason, datePlanted: todayIso() } : { season: state.currentSeason, datePlanted: todayIso() })),
  "onboarding-skip-plant": () => finishOnboarding("Votre carnet est prêt. Ajoutez une plante quand vous le souhaitez."),
  "onboarding-finish": () => finishOnboarding("Votre carnet est prêt à grandir avec vous."),
  "onboarding-log-harvest": (_event, element) => { const plant = findPlant(element.dataset.id); if (plant) openModal(renderHarvestForm(plant)); },
  "global-search-result": (_event, element) => openGlobalSearchResult(element),
  "clear-global-search": () => clearGlobalSearch(),
  "export-csv": () => exportCsv(),
  "import-csv": () => document.getElementById("import-csv-file")?.click(),
  "toggle-bulk-mode": () => toggleBulkMode(),
  "toggle-plant-selection": (_event, element) => togglePlantSelection(element),
  "clear-plant-selection": () => { bulkMode = false; selectedPlantIds.clear(); render(); },
  "apply-bulk-action": () => applyBulkAction(),
  "add-catalog-photo": (_event, element) => { const entry = catalogEntryById(element.dataset.id); if (entry) openModal(renderCatalogPhotoForm(entry)); },
  "delete-catalog-photo": async (_event, element) => { const photo = (state.catalogPhotos || []).find((item) => item.id === element.dataset.id); if (!photo || !confirmTwice("cette photo de référence", "L'image locale sera supprimée de cette fiche et de la corbeille.")) return; await deleteCatalogPhotoRecord(photo); const entry = catalogEntryById(photo.catalogId); if (entry) delete entry.referencePhotoId; saveState(); if (entry) { closeModal(); openModal(renderCatalogDetail(entry)); } else { closeModal(); render(); } toast("Photo de référence retirée."); },
  "open-garden-map": () => openModal(renderGardenMapModal()),
  "print-garden-map": () => { document.body.classList.add("printing-map"); setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove("printing-map"), 500); }, 40); },
  "open-health": () => openModal(renderHealthManager()),
  "add-health": (_event, element) => openModal(renderHealthForm(null, element?.dataset?.id || "")),
  "edit-health": (_event, element) => { const log = (state.healthLogs || []).find((item) => item.id === element.dataset.id); if (log) openModal(renderHealthForm(log)); },
  "delete-health": (_event, element) => { const log = (state.healthLogs || []).find((item) => item.id === element.dataset.id); if (log && confirmTwice("cette observation sanitaire", "Elle sera placée dans la corbeille et pourra être restaurée.")) { const trashId = moveToTrash("health", log.plantId, log); state.healthLogs = (state.healthLogs || []).filter((item) => item.id !== log.id); saveState(); closeModal(); openModal(renderHealthManager()); toast("Observation déplacée dans la corbeille.", "success", { label: "Annuler", onClick: () => undoTrash(trashId) }); } },
  "open-seed-inventory": () => openModal(renderSeedInventoryManager()),
  "add-seed": () => openModal(renderSeedForm()),
  "edit-seed": (_event, element) => { const item = (state.seedInventory || []).find((seed) => seed.id === element.dataset.id); if (item) openModal(renderSeedForm(item)); },
  "add-seed-from-candidate": (_event, element) => { const candidate = candidateById(element.dataset.id); if (candidate) openModal(renderSeedForm(null, { candidateId: candidate.id, name: candidate.name, catalogId: candidate.catalogId, quantity: String(candidate.quantity || "").match(/\d+/)?.[0] || "" })); },
  "consume-seed": (_event, element) => { const item = (state.seedInventory || []).find((seed) => seed.id === element.dataset.id); if (!item) return; const amount = Number.parseInt(window.prompt(`Quantité à retirer du stock « ${item.name} »`, "1"), 10); if (!Number.isFinite(amount) || amount <= 0) return; item.quantity = Math.max(0, Number(item.quantity || 0) - amount); saveState(); openModal(renderSeedInventoryManager()); toast(`${amount} ${item.unit || "unités"} retirée${amount > 1 ? "s" : ""}.`); },
  "delete-seed": (_event, element) => { const item = (state.seedInventory || []).find((seed) => seed.id === element.dataset.id); if (item && confirmTwice(`le stock « ${item.name} »`, "Le stock sera placé dans la corbeille.")) { const trashId = moveToTrash("seed", item.name, item); state.seedInventory = (state.seedInventory || []).filter((seed) => seed.id !== item.id); saveState(); render(); openModal(renderSeedInventoryManager()); toast("Le stock a été déplacé dans la corbeille.", "success", { label: "Annuler", onClick: () => undoTrash(trashId) }); } },
  "smart-log-harvest": (_event, element) => { const plant = findPlant(element.dataset.id); if (plant) openModal(renderHarvestForm(plant)); },
});

function handleClick(event) {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) {
    event.preventDefault();
    goTo(routeButton.dataset.route);
    return;
  }

  if (event.target.classList.contains("modal-backdrop")) {
    closeModal();
    return;
  }

  const actionElement = event.target.closest("[data-action]");
  if (!actionElement) return;
  const action = actionElement.dataset.action;

  if (actionDispatch[action]) {
    actionDispatch[action](event, actionElement);
    return;
  }

  if (action === "close-modal") { closeModal(); return; }
  if (action === "add-plant") { openModal(renderPlantForm()); return; }
  if (action === "add-catalog") { openModal(renderCatalogForm()); return; }
  if (action === "open-candidates") { openModal(renderCandidateManager(actionElement.dataset.season || nextSeasonYear())); return; }
  if (action === "open-crosses") { openModal(renderCrossManager(actionElement.dataset.season || "all")); return; }
  if (action === "add-cross") { openModal(renderCrossForm()); return; }
  if (action === "edit-cross") {
    const cross = crossById(actionElement.dataset.id);
    if (cross) openModal(renderCrossForm(cross));
    return;
  }
  if (action === "delete-cross") {
    const cross = crossById(actionElement.dataset.id);
    if (cross && confirmTwice(`le croisement « ${cross.name} »`, "Le croisement, sa fiche de lignée et son candidat associé seront placés dans la corbeille. Les plantes déjà créées resteront intactes.")) {
      const linkedCatalog = (state.catalog || []).find((entry) => entry.crossId === cross.id || entry.id === cross.catalogId);
      const linkedCandidates = (state.candidates || []).filter((candidate) => candidate.crossId === cross.id || candidate.id === cross.candidateId);
      const trashId = moveToTrash("cross", cross.name, { cross, catalogEntry: linkedCatalog, candidates: linkedCandidates });
      state.crosses = (state.crosses || []).filter((item) => item.id !== cross.id);
      state.catalog = (state.catalog || []).filter((entry) => !(entry.crossId === cross.id || entry.id === cross.catalogId));
      state.candidates = (state.candidates || []).filter((candidate) => !(candidate.crossId === cross.id || candidate.id === cross.candidateId));
      saveState(); closeModal(); render();
      toast("Le croisement et ses liens de préparation ont été placés dans la corbeille.", "success", { label: "Annuler", onClick: () => undoTrash(trashId) });
    }
    return;
  }
  if (action === "add-candidate") {
    const entry = actionElement.dataset.id ? catalogEntryById(actionElement.dataset.id) : null;
    const season = Number(actionElement.dataset.season) || nextSeasonYear();
    const existing = entry ? candidateForCatalog(entry.id, season) : null;
    if (existing) openModal(renderCandidateForm(existing));
    else openModal(renderCandidateForm(null, { catalogId: entry?.id || "", season, status: actionElement.dataset.status || "candidate" }));
    return;
  }
  if (action === "edit-candidate") {
    const candidate = candidateById(actionElement.dataset.id);
    if (candidate) openModal(renderCandidateForm(candidate));
    return;
  }
  if (action === "delete-candidate") {
    const candidate = candidateById(actionElement.dataset.id);
    if (candidate && confirmTwice(`la variété « ${candidate.name} » de la préparation ${candidate.season}`, "Elle sera retirée de votre liste de préparation, mais sa fiche catalogue et vos plantes existantes resteront intactes.")) {
      const trashId = moveToTrash("candidate", candidate.name, candidate);
      state.candidates = (state.candidates || []).filter((item) => item.id !== candidate.id);
      saveState(); closeModal(); render();
      toast("La variété a été retirée de la préparation.", "success", { label: "Annuler", onClick: () => undoTrash(trashId) });
    }
    return;
  }
  if (action === "open-season-review") { openModal(renderSeasonReviewManager(Number(actionElement.dataset.year) || state.currentSeason)); return; }
  if (action === "review-plant") {
    const plant = findPlant(actionElement.dataset.id);
    if (plant) openModal(renderReviewForm(plant));
    return;
  }
  if (action === "add-candidate-from-plant") {
    const plant = findPlant(actionElement.dataset.id);
    if (plant) {
      const existing = candidateForPlant(plant, nextSeasonYear());
      const review = seasonReviewForPlant(plant.id, plant.season);
      if (existing) openModal(renderCandidateForm(existing));
      else openModal(renderCandidateForm(null, { catalogId: plant.catalogId || "", season: nextSeasonYear(), name: plant.name, family: plant.family, subfamily: plant.subfamily, status: review?.overall === "keep" ? "keep" : "candidate", notes: review?.notes ? `Bilan ${plant.season} : ${review.notes}` : "" }));
    }
    return;
  }
  if (action === "edit-catalog-entry") {
    const entry = catalogEntryById(actionElement.dataset.id);
    if (entry?.userAdded) openModal(renderCatalogForm(entry));
    return;
  }
  if (action === "delete-catalog-entry") {
    const entry = catalogEntryById(actionElement.dataset.id);
    if (entry?.userAdded && confirmTwice(`la variété « ${entry.name} »`, "La fiche sera placée dans la corbeille. Les plantes déjà créées resteront dans votre journal.")) {
      const catalogPhoto = catalogPhotoForEntry(entry);
      const trashId = moveToTrash("catalog", entry.name, { entry, catalogPhoto });
      state.catalog = currentSeedCatalog().filter((item) => item.id !== entry.id);
      if (catalogPhoto) state.catalogPhotos = (state.catalogPhotos || []).filter((photo) => photo.id !== catalogPhoto.id);
      saveState(); closeModal(); render();
      toast("La variété a été retirée du catalogue.", "success", { label: "Annuler", onClick: () => undoTrash(trashId) });
    }
    return;
  }
  if (action === "manage-regions") { openModal(renderRegionsModal()); return; }
  if (action === "open-tasks") { openModal(renderTaskManager()); return; }
  if (action === "add-task") { openModal(renderTaskForm()); return; }
  if (action === "edit-task") {
    const task = (state.tasks || []).find((item) => item.id === actionElement.dataset.id);
    if (task) openModal(renderTaskForm(task));
    return;
  }
  if (action === "toggle-task") {
    const task = (state.tasks || []).find((item) => item.id === actionElement.dataset.id);
    if (task) {
      const managerOpen = Boolean(document.getElementById("tasks-title"));
      task.done = !task.done;
      saveState();
      updateTaskRowView(task);
      if (!managerOpen) refreshStorageEstimate();
      toast(task.done ? "Tâche terminée." : "Tâche remise à faire.");
    }
    return;
  }
  if (action === "delete-task") {
    const task = (state.tasks || []).find((item) => item.id === actionElement.dataset.id);
    if (task && confirmTwice(task.title, "La tâche et ses détails seront placés dans la corbeille.")) {
      const managerOpen = Boolean(document.getElementById("tasks-title"));
      const trashId = moveToTrash("task", task.title, task);
      state.tasks = state.tasks.filter((item) => item.id !== task.id);
      saveState(); render();
      if (managerOpen) openModal(renderTaskManager()); else closeModal();
      toast("La tâche a été déplacée dans la corbeille.", "success", { label: "Annuler", onClick: () => undoTrash(trashId) });
    }
    return;
  }
  if (action === "open-calendar") { openModal(renderCalendarModal()); return; }
  if (action === "open-photo-journal") { openModal(renderPhotoJournalModal()); return; }
  if (action === "add-photo") { openModal(renderPhotoForm(actionElement.dataset.id || "")); return; }
  if (action === "delete-photo") {
    const photo = (state.photos || []).find((item) => item.id === actionElement.dataset.id);
    if (photo && confirmTwice(photo.title || "cette photo", "La photo sera placée dans la corbeille.")) {
      const photoJournalOpen = Boolean(document.getElementById("photos-title"));
      state.photos = state.photos.filter((item) => item.id !== photo.id);
      const trashId = moveToTrash("photo", photo.title || "Photo sans titre", photo);
      saveState(); render();
      if (photoJournalOpen) openModal(renderPhotoJournalModal()); else closeModal();
      toast("La photo a été déplacée dans la corbeille.", "success", { label: "Annuler", onClick: () => undoTrash(trashId) });
    }
    return;
  }
  if (action === "open-advanced-stats") { openModal(renderAdvancedStatsModal()); return; }
  if (action === "open-taste") { openModal(renderTasteManager()); return; }
  if (action === "add-rating") { openModal(renderTasteForm()); return; }
  if (action === "rate-plant") { openModal(renderTasteForm(null, actionElement.dataset.id || "")); return; }
  if (action === "edit-rating") {
    const rating = (state.ratings || []).find((item) => item.id === actionElement.dataset.id);
    if (rating) openModal(renderTasteForm(rating));
    return;
  }
  if (action === "delete-rating") {
    const rating = (state.ratings || []).find((item) => item.id === actionElement.dataset.id);
    const plant = rating ? findPlant(rating.plantId) : null;
    if (rating && confirmTwice(`la note de ${plant?.name || "cette dégustation"}`, "La dégustation sera placée dans la corbeille.")) {
      const tasteManagerOpen = Boolean(document.getElementById("taste-title"));
      state.ratings = state.ratings.filter((item) => item.id !== rating.id);
      const trashId = moveToTrash("rating", `Note gustative · ${plant?.name || "Variété"}`, rating);
      saveState(); render();
      if (tasteManagerOpen) openModal(renderTasteManager()); else closeModal();
      toast("La note gustative a été déplacée dans la corbeille.", "success", { label: "Annuler", onClick: () => undoTrash(trashId) });
    }
    return;
  }
  if (action === "open-trash") { openModal(renderTrashModal()); return; }
  if (action === "restore-trash") {
    const restored = restoreTrashItem(actionElement.dataset.id);
    if (restored) { openModal(renderTrashModal()); toast(restoredToastText(restored)); }
    return;
  }
  if (action === "delete-trash") {
    const item = (state.trash || []).find((entry) => entry.id === actionElement.dataset.id);
    if (item && confirmTwice(`${item.label} définitivement`, "Cet élément ne pourra plus être restauré.")) {
      void purgePhotoMedia(trashPhotoIds(item));
      state.trash = state.trash.filter((entry) => entry.id !== item.id);
      saveState(); render(); openModal(renderTrashModal()); toast("L’élément a été supprimé définitivement.");
    }
    return;
  }
  if (action === "empty-trash") {
    if (confirmTwice("tout le contenu de la corbeille", "Tous les éléments seront supprimés définitivement.")) {
      const photoIds = (state.trash || []).flatMap((item) => trashPhotoIds(item));
      void purgePhotoMedia(photoIds);
      state.trash = [];
      saveState(); render(); openModal(renderTrashModal()); toast("La corbeille est vide.");
    }
    return;
  }
  if (action === "delete-harvest") {
    const plant = findPlant(actionElement.dataset.plantId);
    const harvest = plant?.harvests?.find((item) => item.id === actionElement.dataset.harvestId);
    if (plant && harvest && confirmTwice(`la récolte du ${formatDate(harvest.date)}`, "La récolte sera placée dans la corbeille.")) {
      plant.harvests = plant.harvests.filter((item) => item.id !== harvest.id);
      const trashId = moveToTrash("harvest", `Récolte · ${plant.name} · ${formatDate(harvest.date)}`, { plantId: plant.id, harvest });
      saveState(); closeModal(); render(); toast("La récolte a été déplacée dans la corbeille.", "success", { label: "Annuler", onClick: () => undoTrash(trashId) });
    }
    return;
  }
  if (action === "quick-harvest") { openModal(renderHarvestForm()); return; }
  if (action === "log-harvest") {
    const plant = findPlant(actionElement.dataset.id);
    if (plant) openModal(renderHarvestForm(plant));
    return;
  }
  if (action === "open-plant") {
    const plant = findPlant(actionElement.dataset.id);
    if (plant) openModal(renderPlantDetail(plant));
    return;
  }
  if (action === "open-catalog-entry") {
    const entry = catalogEntryById(actionElement.dataset.id);
    if (entry) openModal(renderCatalogDetail(entry));
    return;
  }
  if (action === "add-catalog-entry") {
    const entry = catalogEntryById(actionElement.dataset.id);
    if (entry) openModal(renderPlantForm(catalogEntryToPlant(entry, { asNew: true, season: state.currentSeason })));
    return;
  }
  if (action === "edit-plant") {
    const plant = findPlant(actionElement.dataset.id);
    if (plant) openModal(renderPlantForm(plant));
    return;
  }
  if (action === "delete-plant") {
    const plant = findPlant(actionElement.dataset.id);
    if (plant && confirmTwice(`${plant.name} et toutes ses récoltes`, "La plante et son historique seront placés dans la corbeille.")) {
      const trashId = moveToTrash("plant", plant.name, plantTrashPayload(plant));
      removePlantRelations([plant.id]);
      saveState(); closeModal(); render(); toast("La plante et ses éléments associés ont été placés dans la corbeille.", "success", { label: "Annuler", onClick: () => undoTrash(trashId) });
    }
    return;
  }
  if (action === "rename-region") {
    const oldName = actionElement.dataset.region;
    const newName = window.prompt(`Nouveau nom pour « ${oldName} »`, oldName)?.trim();
    if (!newName || newName === oldName) return;
    if (state.regions.some((region) => region.toLowerCase() === newName.toLowerCase() && region !== oldName)) {
      toast("Une zone porte déjà ce nom.", "error");
      return;
    }
    state.regions = state.regions.map((region) => region === oldName ? newName : region);
    state.plants.forEach((plant) => { if (plant.region === oldName) plant.region = newName; });
    if (selectedRegion === oldName) selectedRegion = newName;
    saveState();
    openModal(renderRegionsModal());
    render();
    toast(`La zone « ${oldName} » a été renommée.`);
    return;
  }
  if (action === "delete-region") {
    const region = actionElement.dataset.region;
    const affectedPlants = state.plants.filter((plant) => plant.region === region);
    const extra = affectedPlants.length ? `${affectedPlants.length} plante${affectedPlants.length > 1 ? "s" : ""} garder${affectedPlants.length > 1 ? "ont" : "a"} sa fiche, mais sans zone associée.` : "Aucune plante ne sera supprimée.";
    if (confirmTwice(region, extra)) {
      const assignments = affectedPlants.map((plant) => ({ plantId: plant.id, region: plant.region }));
      const trashId = moveToTrash("region", region, { region, assignments });
      state.regions = state.regions.filter((item) => item !== region);
      state.plants.forEach((plant) => { if (plant.region === region) plant.region = ""; });
      if (selectedRegion === region) selectedRegion = "Toutes les zones";
      saveState();
      render();
      openModal(renderRegionsModal());
      toast(`La zone « ${region} » a été supprimée.`, "success", { label: "Annuler", onClick: () => undoTrash(trashId) });
    }
    return;
  }
  if (action === "pick-color") {
    const buttons = actionElement.closest(".color-picker")?.querySelectorAll(".color-option") || [];
    const selected = [...buttons].filter((button) => button.classList.contains("selected"));
    if (actionElement.classList.contains("selected")) {
      if (selected.length > 1) actionElement.classList.remove("selected");
    } else if (selected.length < 3) {
      actionElement.classList.add("selected");
    } else {
      toast("Vous pouvez sélectionner jusqu'à trois couleurs.", "error");
    }
    buttons.forEach((button) => button.setAttribute("aria-pressed", button.classList.contains("selected")));
    const help = actionElement.closest(".form-field")?.querySelector("#color-help");
    if (help) help.textContent = [...buttons].filter((button) => button.classList.contains("selected")).map((button) => colorMeta[button.dataset.color]?.label).join(" · ") || "Aucune couleur sélectionnée";
    updateColorPreview(actionElement.closest("form"));
    return;
  }
  if (action === "garden-filter") { gardenFilter = actionElement.dataset.filter; render(); return; }
  if (action === "select-region") { selectedRegion = actionElement.dataset.region; render(); return; }
  if (action === "view-mode") { viewMode = actionElement.dataset.mode; render(); return; }
  if (action === "variety-filter") {
    const selected = actionElement.dataset.filter;
    varietyFilter = varietyFilter === selected ? "all" : selected;
    render();
    document.querySelector(`[data-action="variety-filter"][data-filter="${selected}"]`)?.focus();
    return;
  }
  if (action === "select-season") {
    state.currentSeason = Number(actionElement.dataset.year);
    saveState();
    closeModal();
    render();
    toast(`Saison ${state.currentSeason} affichée.`);
    return;
  }
  if (action === "add-season") { openModal(renderSeasonForm()); return; }
  if (action === "edit-season") {
    const season = state.seasons.find((item) => Number(item.year) === Number(actionElement.dataset.year));
    if (season) openModal(renderSeasonForm(season));
    return;
  }
  if (action === "add-highlight") { openModal(renderHighlightForm(actionElement.dataset.year)); return; }
  if (action === "open-recipes") { openModal(renderRecipesModal()); return; }
  if (action === "open-help") { openModal(renderHelpModal()); return; }
  if (action === "open-settings") { openModal(renderSettingsModal()); return; }
  if (action === "open-planning") { openModal(renderPlanningModal()); return; }
  if (action === "open-budget") { openModal(renderBudgetModal()); return; }
  if (action === "install-pwa") { installPWA(); return; }
  if (action === "add-expense") { openModal(renderExpenseForm()); return; }
  if (action === "edit-expense") {
    const expense = (state.expenses || []).find((item) => item.id === actionElement.dataset.id);
    if (expense) openModal(renderExpenseForm(expense));
    return;
  }
  if (action === "delete-expense") {
    const expense = (state.expenses || []).find((item) => item.id === actionElement.dataset.id);
    if (expense && confirmTwice(`la dépense « ${expense.label} »`, "Elle sera placée dans la corbeille et retirée des totaux.")) {
      const budgetOpen = Boolean(document.getElementById("budget-title"));
      state.expenses = (state.expenses || []).filter((item) => item.id !== expense.id);
      const trashId = moveToTrash("expense", expense.label, expense);
      saveState(); render();
      if (budgetOpen) openModal(renderBudgetModal()); else closeModal();
      toast("La dépense a été déplacée dans la corbeille.", "success", { label: "Annuler", onClick: () => undoTrash(trashId) });
    }
    return;
  }
  if (action === "share") { openModal(renderShareModal()); return; }
  if (action === "copy-share") {
    const text = actionElement.dataset.text;
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    closeModal(); toast("Bilan copié dans le presse-papiers.");
    return;
  }
  if (action === "native-share") {
    shareSeasonText(actionElement.dataset.text);
    return;
  }
  if (action === "download-share-card") {
    downloadShareCard();
    return;
  }
  if (action === "export-data") { exportData(); return; }
  if (action === "export-llm-context") { openModal(renderLLMExportModal()); return; }
  if (action === "import-data") { document.getElementById("import-file")?.click(); return; }
  if (action === "reset-demo") {
    if (confirmTwice("la démonstration et toutes les données locales", "Toutes vos plantes, récoltes et notes actuelles seront remplacées par les données d'exemple.")) {
      const previousState = cloneData(state);
      const backupId = uid("trash");
      state = buildDemoState();
      state.currentSeason = 2026;
      state.trash = [{ id: backupId, type: "backup", label: "Sauvegarde avant réinitialisation", deletedAt: todayIso(), data: { snapshot: previousState } }];
      selectedRegion = "Toutes les zones";
      saveState(); route = "garden"; render(); toast("La démonstration a été réinitialisée. Votre état précédent est dans la corbeille.", "success", { label: "Annuler", onClick: () => undoTrash(backupId) });
    }
    return;
  }
}

function handleSubmit(event) {
  if (event.target.id === "budget-settings-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    state.budgetSettings = { marketPricePerKg: Math.max(0, Number(String(data.get("marketPricePerKg") || "").replace(",", ".")) || 4.5), projectionRate: Math.max(0.1, Number(String(data.get("projectionRate") || "").replace(",", ".")) || 1.15) };
    saveState();
    openModal(renderBudgetModal());
    toast("Paramètres de budget actualisés.");
    return;
  }
  if (event.target.id === "health-form") {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    const plantId = String(data.get("plantId") || "");
    const symptom = String(data.get("symptom") || "other");
    if (!plantId || !symptom) { toast("Choisissez la plante et le symptôme.", "error"); return; }
    const record = { plantId, season: findPlant(plantId)?.season || state.currentSeason, date: data.get("date") || todayIso(), symptom, severity: String(data.get("severity") || "observation"), treatment: String(data.get("treatment") || "").trim(), treatmentDate: data.get("treatmentDate") || "", outcome: String(data.get("outcome") || ""), photoId: String(data.get("photoId") || ""), notes: String(data.get("notes") || "").trim(), updatedAt: todayIso() };
    state.healthLogs = state.healthLogs || [];
    if (form.dataset.editId) {
      const existing = state.healthLogs.find((item) => item.id === form.dataset.editId);
      if (existing) Object.assign(existing, record);
      toast("Observation sanitaire mise à jour.");
    } else {
      state.healthLogs.unshift({ id: uid("health"), createdAt: todayIso(), ...record });
      toast("Observation sanitaire ajoutée.");
    }
    saveState(); closeModal(); render();
    return;
  }
  if (event.target.id === "seed-form") {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const quantity = Math.max(0, Number(data.get("quantity")) || 0);
    if (!name) { toast("Indiquez une variété ou un nom de stock.", "error"); return; }
    const record = { name, candidateId: String(data.get("candidateId") || ""), catalogId: String(data.get("catalogId") || "").trim(), quantity, unit: String(data.get("unit") || "graines"), acquiredDate: data.get("acquiredDate") || "", harvestDate: data.get("harvestDate") || "", viabilityDate: data.get("viabilityDate") || "", source: String(data.get("source") || "").trim(), location: String(data.get("location") || "").trim(), notes: String(data.get("notes") || "").trim(), updatedAt: todayIso() };
    state.seedInventory = state.seedInventory || [];
    if (form.dataset.editId) {
      const existing = state.seedInventory.find((item) => item.id === form.dataset.editId);
      if (existing) Object.assign(existing, record);
      toast("Stock de graines mis à jour.");
    } else {
      state.seedInventory.unshift({ id: uid("seed"), createdAt: todayIso(), ...record });
      toast("Stock de graines ajouté.");
    }
    saveState(); closeModal(); render();
    return;
  }
  if (event.target.id === "task-form") {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    const task = {
      title: String(data.get("title") || "").trim(),
      type: data.get("type") || "other",
      dueDate: data.get("dueDate") || todayIso(),
      plantId: data.get("plantId") || "",
      season: state.currentSeason,
      amount: String(data.get("amount") || "").trim(),
      repeat: data.get("repeat") || "once",
      notes: String(data.get("notes") || "").trim(),
    };
    if (!task.title) return;
    state.tasks = state.tasks || [];
    if (form.dataset.editId) {
      const existing = state.tasks.find((item) => item.id === form.dataset.editId);
      if (existing) Object.assign(existing, task);
      toast("Tâche mise à jour.");
    } else {
      state.tasks.unshift({ id: uid("task"), ...task, done: false });
      toast("Tâche programmée.");
    }
    saveState(); closeModal(); render();
    return;
  }

  if (event.target.id === "catalog-form") {
    event.preventDefault();
    const form = event.target;
    const entryData = catalogEntryFromForm(form);
    if (!entryData.name || !entryData.family) {
      toast("Indiquez au minimum un nom et une famille.", "error");
      return;
    }
    if (!isTomatoCatalogEntry(entryData)) {
      toast("Tomato Journal ne référence que des tomates : indiquez une famille de tomates (ex. Tomate, Solanum lycopersicum…).", "error");
      return;
    }
    state.catalog = Array.isArray(state.catalog) ? state.catalog : cloneData(defaultSeedCatalog());
    const duplicate = state.catalog.find((entry) => entry.id !== form.dataset.editId && normalizeSearchText(entry.name) === normalizeSearchText(entryData.name));
    if (duplicate) {
      toast("Cette variété existe déjà dans le catalogue.", "error");
      return;
    }
    if (form.dataset.editId) {
      const existing = state.catalog.find((entry) => entry.id === form.dataset.editId);
      if (existing?.userAdded) {
        Object.assign(existing, entryData);
        saveState(); closeModal(); render(); toast(`${entryData.name} a été mise à jour dans le catalogue.`);
      }
    } else {
      const numericIndexes = state.catalog.map((entry) => Number(entry.catalogIndex)).filter((value) => Number.isFinite(value));
      state.catalog.unshift({ id: uid("catalog"), catalogIndex: Math.max(0, ...numericIndexes) + 1, ...entryData });
      saveState(); closeModal(); render(); toast(`${entryData.name} a été ajoutée au catalogue.`);
    }
    return;
  }

  if (event.target.id === "cross-form") {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    if (!name) { toast("Indiquez un nom pour cette lignée.", "error"); return; }
    const cross = {
      name,
      family: String(data.get("family") || "Tomate (Solanum lycopersicum)").trim(),
      subfamily: String(data.get("subfamily") || "").trim(),
      femaleParent: crossParentFromRef(data.get("femaleParentRef"), data.get("femaleParentName")),
      maleParent: crossParentFromRef(data.get("maleParentRef"), data.get("maleParentName")),
      status: crossStatusMeta[data.get("status")] ? data.get("status") : "planned",
      generation: String(data.get("generation") || "F1").trim(),
      targetSeason: Number(data.get("targetSeason")) || nextSeasonYear(),
      stability: crossStabilityMeta[data.get("stability")] ? data.get("stability") : "observation",
      plannedDate: data.get("plannedDate") || "",
      crossedDate: data.get("crossedDate") || "",
      fruitDate: data.get("fruitDate") || "",
      seedDate: data.get("seedDate") || "",
      sownDate: data.get("sownDate") || "",
      seedQuantity: Math.max(0, Number(data.get("seedQuantity")) || 0),
      selectedCount: Math.max(0, Number(data.get("selectedCount")) || 0),
      traits: String(data.get("traits") || "").trim(),
      fruitNotes: String(data.get("fruitNotes") || "").trim(),
      selectedNotes: String(data.get("selectedNotes") || "").trim(),
      notes: String(data.get("notes") || "").trim(),
      createCatalog: data.get("createCatalog") === "on",
      createCandidate: data.get("createCandidate") === "on",
      sourceSeason: state.currentSeason,
      updatedAt: todayIso(),
    };
    state.crosses = state.crosses || [];
    if (form.dataset.editId) {
      const existing = state.crosses.find((item) => item.id === form.dataset.editId);
      if (existing) {
        Object.assign(existing, cross, { id: existing.id, createdAt: existing.createdAt || todayIso(), catalogId: existing.catalogId || "", candidateId: existing.candidateId || "" });
        ensureCrossOutputs(existing);
        toast(`${existing.name} a été mise à jour.`);
      }
    } else {
      const created = { id: uid("cross"), createdAt: todayIso(), ...cross };
      ensureCrossOutputs(created);
      state.crosses.unshift(created);
      toast(`${created.name} a été enregistré et relié à la préparation.`);
    }
    saveState(); closeModal(); render();
    return;
  }

  if (event.target.id === "candidate-form") {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    if (!name) { toast("Indiquez au minimum le nom de la variété.", "error"); return; }
    const catalogId = form.dataset.catalogId || String(data.get("catalogSelect") || "");
    const linkedEntry = catalogId ? catalogEntryById(catalogId) : null;
    const existingCandidate = form.dataset.editId ? (state.candidates || []).find((item) => item.id === form.dataset.editId) : null;
    const crossId = existingCandidate?.crossId || "";
    const candidate = {
      season: Number(data.get("season")) || nextSeasonYear(),
      catalogId: linkedEntry?.id || "",
      name,
      family: String(data.get("family") || linkedEntry?.family || "").trim(),
      subfamily: String(data.get("subfamily") || linkedEntry?.subfamily || "").trim(),
      status: candidateStatusMeta[data.get("status")] ? data.get("status") : "candidate",
      priority: candidatePriorityMeta[data.get("priority")] ? data.get("priority") : "medium",
      quantity: String(data.get("quantity") || "").trim(),
      notes: String(data.get("notes") || "").trim(),
      source: crossId ? "croisement" : linkedEntry ? "catalogue" : existingCandidate?.source || "manuel",
      crossId,
      updatedAt: todayIso(),
    };
    state.candidates = state.candidates || [];
    const duplicate = state.candidates.find((item) => item.id !== form.dataset.editId && Number(item.season) === candidate.season && ((candidate.catalogId && item.catalogId === candidate.catalogId) || (!candidate.catalogId && normalizeSearchText(item.name) === normalizeSearchText(candidate.name))));
    if (duplicate) {
      toast("Cette variété est déjà dans la préparation de cette saison.", "error");
      return;
    }
    if (form.dataset.editId) {
      const existing = existingCandidate;
      if (existing) Object.assign(existing, candidate, { createdAt: existing.createdAt || todayIso() });
      toast(`${candidate.name} a été mise à jour dans la préparation.`);
    } else {
      state.candidates.unshift({ id: uid("candidate"), createdAt: todayIso(), ...candidate });
      toast(`${candidate.name} a été ajoutée à la préparation.`);
    }
    saveState(); closeModal(); render();
    return;
  }

  if (event.target.id === "season-review-form") {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    const plant = findPlant(form.dataset.plantId);
    if (!plant) return;
    const review = {
      plantId: plant.id,
      season: Number(form.dataset.season) || plant.season || state.currentSeason,
      overall: String(data.get("overall") || ""),
      taste: String(data.get("taste") || ""),
      vigor: String(data.get("vigor") || ""),
      earliness: String(data.get("earliness") || ""),
      quantity: String(data.get("quantity") || ""),
      notes: String(data.get("notes") || "").trim(),
      updatedAt: todayIso(),
    };
    state.seasonReviews = state.seasonReviews || [];
    const existing = state.seasonReviews.find((item) => item.id === form.dataset.editId || (item.plantId === plant.id && Number(item.season) === Number(review.season)));
    if (existing) Object.assign(existing, review);
    else state.seasonReviews.unshift({ id: uid("review"), ...review });
    saveState(); closeModal(); render(); toast(`Bilan qualitatif de ${plant.name} enregistré.`);
    return;
  }

  if (event.target.id === "catalog-photo-form") {
    event.preventDefault();
    handleCatalogPhotoSubmit(event);
    return;
  }

  if (event.target.id === "photo-form") {
    event.preventDefault();
    handlePhotoSubmit(event);
    return;
  }

  if (event.target.id === "taste-form") {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    const rating = {
      plantId: String(data.get("plantId") || ""),
      season: state.currentSeason,
      date: data.get("date") || todayIso(),
      overall: Number(data.get("overall")) || 0,
      taste: Number(data.get("taste")) || 0,
      sweetness: Number(data.get("sweetness")) || 0,
      acidity: Number(data.get("acidity")) || 0,
      texture: Number(data.get("texture")) || 0,
      notes: String(data.get("notes") || "").trim(),
    };
    if (!rating.plantId || !rating.overall) { toast("Choisissez une variété et une note globale.", "error"); return; }
    state.ratings = state.ratings || [];
    if (form.dataset.editId) {
      const existing = state.ratings.find((item) => item.id === form.dataset.editId);
      if (existing) Object.assign(existing, rating);
      toast("Note gustative mise à jour.");
    } else {
      state.ratings.unshift({ id: uid("rating"), ...rating });
      toast("Note gustative enregistrée.");
    }
    saveState(); closeModal(); render();
    return;
  }

  if (event.target.id === "region-form") {
    event.preventDefault();
    const input = event.target.elements.name;
    const name = String(input?.value || "").trim();
    if (!name) return;
    if ((state.regions || []).some((region) => region.toLowerCase() === name.toLowerCase())) {
      toast("Une zone porte déjà ce nom.", "error");
      input.focus();
      return;
    }
    state.regions = state.regions || [];
    state.regions.push(name);
    saveState();
    if (onboardingFlow) {
      onboardingStep = 2;
      render();
      openModal(renderOnboarding());
    } else {
      openModal(renderRegionsModal());
      render();
    }
    toast(`La zone « ${name} » a été ajoutée.`);
    return;
  }

  if (event.target.id === "plant-form") {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    let region = String(data.get("region") || "");
    if (region === "__new__") {
      region = window.prompt("Nom de la nouvelle zone", "Mon nouveau bac")?.trim() || "";
      if (region && !state.regions.includes(region)) state.regions.push(region);
    }
    const selectedColors = [...form.querySelectorAll(".color-option.selected")].map((button) => button.dataset.color).filter((color) => colorMeta[color]).slice(0, 3);
    const catalogId = form.dataset.catalogId || "";
    const catalogEntry = catalogId ? catalogEntryById(catalogId) : null;
    const catalogPlant = catalogEntry ? catalogEntryToPlant(catalogEntry, { asNew: true, season: Number(data.get("season")) || state.currentSeason }) : null;
    const plantColors = selectedColors.length ? selectedColors : (catalogPlant?.colors?.length ? catalogPlant.colors : ["red"]);
    const colorMode = normalizeColorMode(data.get("colorMode"), plantColors);
    const id = form.dataset.editId;
    if (id) {
      const plant = findPlant(id);
      if (plant) {
        Object.assign(plant, {
          name,
          type: data.get("type"),
          season: Number(data.get("season")),
          region,
          location: String(data.get("location") || "").trim(),
          datePlanted: data.get("datePlanted") || todayIso(),
          daysToMaturity: Number(data.get("daysToMaturity")) || 75,
          fruitType: String(data.get("fruitType") || "").trim(),
          size: data.get("size"), shape: data.get("shape"), growth: data.get("growth"), breeder: String(data.get("breeder") || "").trim(), notes: String(data.get("notes") || "").trim(), colors: plantColors, colorMode, accent: colorBackground(plantColors, colorMode),
          ...(catalogPlant ? { fruitType: catalogPlant.fruitType, seedSource: catalogPlant.seedSource, catalogId: catalogEntry.id, family: catalogEntry.family, subfamily: catalogEntry.subfamily, catalogDetails: cloneData(catalogEntry.details || {}), ...(catalogEntry.catalogRevision ? { catalogRevision: catalogEntry.catalogRevision } : {}) } : {}),
        });
        if (!catalogPlant) {
          delete plant.catalogId;
          delete plant.family;
          delete plant.subfamily;
          delete plant.catalogDetails;
        }
        saveState(); closeModal(); render(); toast(`${name} a été mise à jour.`);
      }
    } else {
      state.plants.unshift({
        id: uid("plant"),
        name,
        type: data.get("type"),
        colors: plantColors,
        colorMode,
        size: data.get("size"),
        shape: data.get("shape"),
        growth: data.get("growth"),
        fruitType: String(data.get("fruitType") || catalogPlant?.fruitType || "tranche").trim(),
        breeder: String(data.get("breeder") || "").trim(),
        seedSource: catalogPlant?.seedSource || "Ajout manuel",
        datePlanted: data.get("datePlanted") || todayIso(),
        daysToMaturity: Number(data.get("daysToMaturity")) || 75,
        season: Number(data.get("season")) || state.currentSeason,
        region,
        location: String(data.get("location") || "").trim(),
        notes: String(data.get("notes") || "").trim(),
        status: "growing",
        accent: colorBackground(plantColors, colorMode),
        harvests: [],
        ...(catalogEntry ? { catalogId: catalogEntry.id, family: catalogEntry.family, subfamily: catalogEntry.subfamily, catalogDetails: cloneData(catalogEntry.details || {}), ...(catalogEntry.catalogRevision ? { catalogRevision: catalogEntry.catalogRevision } : {}) } : {}),
      });
      saveState();
      if (onboardingFlow) {
        onboardingStep = 3;
        closeModal();
        render();
        openModal(renderOnboarding());
        toast(`${name} a été ajoutée au potager.`);
      } else {
        closeModal(); render(); toast(`${name} a été ajoutée au potager.`);
      }
    }
    return;
  }

  if (event.target.id === "harvest-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    const plant = findPlant(String(data.get("plantId")));
    const weight = roundWeight(parseNumericInput(data.get("weight")));
    if (!plant || !Number.isFinite(weight) || weight <= 0) { toast("Indiquez un poids supérieur à zéro, avec ou sans décimales.", "error"); return; }
    plant.harvests = plant.harvests || [];
    plant.harvests.push({ id: uid("harvest"), date: data.get("date") || todayIso(), weight, fruits: Number(data.get("fruits")) || 0, notes: String(data.get("notes") || "").trim() });
    plant.status = "harvesting";
    saveState();
    if (onboardingFlow) finishOnboarding(`Première récolte de ${plant.name} enregistrée. Votre carnet est lancé !`);
    else { closeModal(); render(); toast(`Récolte ajoutée à ${plant.name}.`); }
    return;
  }

  if (event.target.id === "season-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    const year = Number(data.get("year"));
    if (!year) return;
    const existing = state.seasons.find((item) => Number(item.year) === year);
    if (existing && Number(event.target.dataset.editYear) !== year) { toast("Cette saison existe déjà.", "error"); return; }
    const seasonStatus = seasonStatusMeta[data.get("status")] ? data.get("status") : "active";
    if (existing) Object.assign(existing, { start: data.get("start"), end: data.get("end"), status: seasonStatus, notes: String(data.get("notes") || "").trim() });
    else state.seasons.push({ year, start: data.get("start") || `${year}-05-01`, end: data.get("end") || "", status: seasonStatus, notes: String(data.get("notes") || "").trim(), highlights: [] });
    state.currentSeason = year;
    saveState(); closeModal(); render(); toast(`Saison ${year} enregistrée.`);
    return;
  }

  if (event.target.id === "highlight-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    const season = state.seasons.find((item) => Number(item.year) === Number(event.target.dataset.year));
    if (!season) return;
    season.highlights = season.highlights || [];
    season.highlights.unshift({ icon: "star", tone: data.get("tone"), title: String(data.get("title") || "").trim(), text: String(data.get("text") || "").trim() });
    saveState(); closeModal(); render(); toast("Moment ajouté à la saison.");
    return;
  }

  if (event.target.id === "llm-export-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    closeModal();
    exportLLMContext({ fileType: data.get("fileType") || "markdown", scope: data.get("scope") === "all" ? "all" : "active", includeJson: data.get("includeJson") === "on", includeNotes: data.get("includeNotes") === "on" });
    return;
  }

  if (event.target.id === "planning-form") {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    const targetSeason = Number(data.get("targetSeason")) || (Number(state.currentSeason) + 1);
    const plantIds = [...form.querySelectorAll('input[name="plantIds"]:checked')].map((input) => input.value);
    state.plans = state.plans || [];
    const existingPlan = state.plans.find((plan) => Number(plan.season) === targetSeason);
    const plan = { season: targetSeason, sourceSeason: state.currentSeason, plantIds, notes: String(data.get("notes") || "").trim(), updatedAt: todayIso() };
    if (existingPlan) Object.assign(existingPlan, plan);
    else state.plans.unshift(plan);
    saveState(); closeModal(); render(); toast(`Plan de la saison ${targetSeason} enregistré.`);
    return;
  }

  if (event.target.id === "expense-form") {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    const label = String(data.get("label") || "").trim();
    const amount = parseNumericInput(data.get("amount"));
    if (!label || !amount || amount <= 0) { toast("Indiquez un libellé et un montant supérieur à zéro.", "error"); return; }
    const expense = { label, amount: Math.round(amount * 100) / 100, date: data.get("date") || todayIso(), category: data.get("category") || "other", season: Number(data.get("season")) || state.currentSeason, plantId: data.get("plantId") || "", region: String(data.get("region") || ""), notes: String(data.get("notes") || "").trim() };
    state.expenses = state.expenses || [];
    if (form.dataset.editId) {
      const existing = state.expenses.find((item) => item.id === form.dataset.editId);
      if (existing) Object.assign(existing, expense);
      toast("Dépense mise à jour.");
    } else {
      state.expenses.unshift({ id: uid("expense"), ...expense });
      toast("Dépense ajoutée au budget.");
    }
    saveState(); closeModal(); render();
    return;
  }

  if (event.target.id === "settings-form") {
    event.preventDefault();
    const data = new FormData(event.target);
    state.units = data.get("units") || "metric";
    state.theme = data.get("theme") === "night" ? "night" : "orbital";
    state.currentSeason = Number(data.get("season")) || state.currentSeason;
    saveState(); closeModal(); render(); toast("Préférences enregistrées.");
  }
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("image-required"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-error"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("image-error"));
      image.onload = () => {
        const maxDimension = 1400;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function deleteCatalogPhotoRecord(photo) {
  if (!photo) return;
  const mediaId = photo.mediaId || photo.id;
  state.catalogPhotos = (state.catalogPhotos || []).filter((item) => item.id !== photo.id);
  const cached = catalogPhotoUrlCache.get(photo.id);
  if (cached?.startsWith("blob:")) URL.revokeObjectURL(cached);
  catalogPhotoUrlCache.delete(photo.id);
  try { await deletePhotoBlob(mediaId); } catch (error) { console.warn("Impossible de supprimer la photo de référence", error); }
}

async function handleCatalogPhotoSubmit(event) {
  const form = event.target;
  const file = form.elements.file?.files?.[0];
  const entry = catalogEntryById(form.dataset.catalogId);
  if (!file || !entry) { toast("Choisissez une image avant d'enregistrer.", "error"); return; }
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) { submitButton.disabled = true; submitButton.textContent = "Compression et sauvegarde…"; }
  try {
    const data = new FormData(form);
    const dataUrl = await compressImage(file);
    const photoId = uid("catalog-photo");
    const blob = dataUrlToBlob(dataUrl);
    const photo = { id: photoId, mediaId: photoId, catalogId: entry.id, bytes: blob.size, mimeType: blob.type || "image/jpeg", date: todayIso(), title: String(data.get("title") || entry.name).trim(), caption: String(data.get("caption") || "").trim() };
    if (photoStorageSupported()) {
      await putPhotoBlob(photoId, blob);
      catalogPhotoUrlCache.set(photoId, dataUrl);
    } else {
      photo.dataUrl = dataUrl;
      catalogPhotoUrlCache.set(photoId, dataUrl);
    }
    state.catalogPhotos = state.catalogPhotos || [];
    const old = state.catalogPhotos.find((item) => item.id === form.dataset.existingId);
    if (old) await deleteCatalogPhotoRecord(old);
    state.catalogPhotos.push(photo);
    entry.referencePhotoId = photoId;
    if (!saveState()) throw new Error("local-save-failed");
    await refreshStorageEstimate();
    closeModal();
    openModal(renderCatalogDetail(entry));
    toast(`Photo de référence enregistrée pour ${entry.name}.`);
  } catch (error) {
    if (submitButton) { submitButton.disabled = false; submitButton.innerHTML = `${icon("camera")} Enregistrer`; }
    storageStatus.mediaError = error?.name === "QuotaExceededError" || /quota|storage|indexeddb/i.test(String(error?.message || ""));
    updateStorageIndicator();
    toast(storageStatus.mediaError ? "Espace photo insuffisant. Exportez une sauvegarde avant de réessayer." : "Impossible d'enregistrer cette image.", "error");
  }
}

async function handlePhotoSubmit(event) {
  const form = event.target;
  const file = form.elements.file?.files?.[0];
  if (!file) { toast("Choisissez une image avant d'enregistrer.", "error"); return; }
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) { submitButton.disabled = true; submitButton.textContent = "Compression et sauvegarde…"; }
  try {
    const data = new FormData(form);
    const dataUrl = await compressImage(file);
    const photoId = uid("photo");
    const blob = dataUrlToBlob(dataUrl);
    const photo = { id: photoId, mediaId: photoId, bytes: blob.size, mimeType: blob.type || "image/jpeg", plantId: String(data.get("plantId") || ""), season: state.currentSeason, date: data.get("date") || todayIso(), title: String(data.get("title") || "").trim(), caption: String(data.get("caption") || "").trim() };
    if (photoStorageSupported()) {
      await putPhotoBlob(photoId, blob);
      photoUrlCache.set(photoId, dataUrl);
      await hydratePhotoUrls();
    } else {
      photo.dataUrl = dataUrl;
      photoUrlCache.set(photoId, dataUrl);
    }
    const plant = findPlant(photo.plantId);
    state.photos = state.photos || [];
    state.photos.unshift(photo);
    if (!saveState()) throw new Error("local-save-failed");
    await refreshStorageEstimate();
    closeModal(); render(); toast(`Photo enregistrée${plant ? ` pour ${plant.name}` : ""}.`);
  } catch (error) {
    if (submitButton) { submitButton.disabled = false; submitButton.innerHTML = `${icon("camera")} Enregistrer la photo`; }
    storageStatus.mediaError = error?.name === "QuotaExceededError" || /quota|storage|indexeddb/i.test(String(error?.message || ""));
    updateStorageIndicator();
    toast(storageStatus.mediaError ? "Espace photo insuffisant. Exportez vos données et libérez de l'espace avant de réessayer." : "Impossible de lire ou d'enregistrer cette image.", "error");
  }
}

function shareSeasonText(text) {
  if (navigator.share) {
    navigator.share({ title: `Bilan tomates ${state.currentSeason}`, text }).then(() => toast("Bilan partagé avec succès.")).catch((error) => {
      if (error?.name !== "AbortError") toast("Le partage a été annulé ou n'est pas disponible.", "error");
    });
    return;
  }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => { closeModal(); toast("Le partage direct n'est pas disponible : le bilan a été copié."); }).catch(() => toast("Impossible de copier le bilan.", "error"));
    return;
  }
  toast("Le partage direct n'est pas disponible sur ce navigateur.", "error");
}

function shortLabel(value, maxLength = 28) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function buildShareCardSvg(insights) {
  const { stats, details, breakdown, heaviest, favorite, score, level, badges, challenge } = insights;
  const esc = (value) => escapeHTML(value);
  const text = (value, x, y, size, fill = "#ffffff", weight = 400, anchor = "start") => `<text x="${x}" y="${y}" fill="${fill}" font-family="Arial, Helvetica, sans-serif" font-size="${size}px" font-weight="${weight}" text-anchor="${anchor}">${esc(value)}</text>`;
  const statBlock = (x, label, value) => `${text(value, x, 470, 32, "#ffffff", 700, "middle")}${text(label, x, 500, 15, "#f8d5ca", 400, "middle")}`;
  const recordBlock = (x, y, label, value, detail) => `${text(label, x, y, 12, "#f5b9aa", 700)}${text(shortLabel(value, 30), x, y + 30, 19, "#ffffff", 700)}${text(shortLabel(detail, 34), x, y + 53, 13, "#f9ddd4", 400)}`;
  const badgePills = badges.slice(0, 4).map((badge, index) => { const x = 70 + (index % 2) * 275; const y = 925 + Math.floor(index / 2) * 54; return `<rect x="${x}" y="${y}" width="250" height="34" rx="17" fill="#ffffff" fill-opacity=".13"/>${text(`•  ${badge.title}`, x + 16, y + 22, 13, "#fff2ed", 600)}`; }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1380" viewBox="0 0 1200 1380"><defs><linearGradient id="shareGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9d3829"/><stop offset=".52" stop-color="#d75b3d"/><stop offset="1" stop-color="#eaa166"/></linearGradient></defs><rect width="1200" height="1380" rx="42" fill="url(#shareGradient)"/><circle cx="1060" cy="-10" r="265" fill="none" stroke="#fff" stroke-opacity=".15" stroke-width="3"/><circle cx="70" cy="1390" r="230" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="3"/>${text("🍅  TOMATO JOURNAL", 70, 87, 22, "#ffffff", 700)}${text(`SAISON ${state.currentSeason}`, 1130, 87, 16, "#f9d9cf", 700, "end")}${text("MON BILAN DE SAISON", 70, 180, 14, "#f8c5b7", 700)}${text(level, 70, 232, 49, "#ffffff", 700)}${text("Une saison qui se raconte en beaux fruits.", 70, 269, 18, "#f9ddd4", 400)}<circle cx="1020" cy="220" r="89" fill="#6d241d" fill-opacity=".35" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>${text(score, 1020, 226, 48, "#ffffff", 700, "middle")}${text("/100", 1020, 252, 16, "#f9ddd4", 400, "middle")}${text("INDICE POTAGER", 1020, 282, 11, "#f9ddd4", 700, "middle")}<rect x="70" y="390" width="1060" height="145" rx="18" fill="#6d241d" fill-opacity=".18" stroke="#fff" stroke-opacity=".16"/>${statBlock(205, "POIDS RÉCOLTÉ", formatWeight(stats.totalWeight))}${statBlock(470, "FRUITS", formatNumber(stats.totalFruits))}${statBlock(735, "VARIÉTÉS", formatNumber(stats.varieties))}${statBlock(1000, "RÉCOLTES", formatNumber(stats.harvests))}${recordBlock(70, 615, "MEILLEURE PRODUCTIVITÉ", breakdown[0]?.plant.name || "À découvrir", breakdown[0] ? formatWeight(breakdown[0].weight) : "Votre première récolte vous attend")}${recordBlock(610, 615, "RECORD DE POIDS", heaviest ? formatWeight(heaviest.weight) : "—", heaviest?.plantName || "Pas encore de record")}${recordBlock(70, 760, "COUP DE CŒUR", favorite?.plant.name || "À venir", favorite ? `${formatNumber(favorite.average, 1)} / 5` : "Notez une dégustation")}${recordBlock(610, 760, "ZONE LA PLUS GÉNÉREUSE", details.zones[0]?.region || "À découvrir", details.zones[0] ? formatWeight(details.zones[0].weight) : "Pas encore de récolte")}${text("BADGES DÉCROCHÉS", 70, 890, 13, "#f8c5b7", 700)}${badgePills}<rect x="70" y="1040" width="1060" height="175" rx="18" fill="#4f1d18" fill-opacity=".28" stroke="#fff" stroke-opacity=".18"/>${text("NEXT LEVEL", 98, 1080, 12, "#f6bdad", 700)}${text(shortLabel(challenge.title, 52), 98, 1114, 21, "#ffffff", 700)}${text(`${Math.round(challenge.progress)}%`, 1095, 1114, 20, "#ffe19c", 700, "end")}<rect x="98" y="1140" width="1004" height="13" rx="7" fill="#fff" fill-opacity=".18"/><rect x="98" y="1140" width="${1004 * Math.max(0, Math.min(100, challenge.progress)) / 100}" height="13" rx="7" fill="#ffe19c"/>${text(challenge.detail, 98, 1182, 15, "#f9ddd4", 400)}${text("Récolte avec soin · partage avec plaisir", 70, 1295, 13, "#f5cfc5", 400)}${text("🍅", 1130, 1300, 26, "#ffffff", 700, "end")}</svg>`;
}

function downloadShareCard() {
  const svg = buildShareCardSvg(shareInsights(seasonStats()));
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bilan-tomates-${state.currentSeason}.svg`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
  toast("La carte de saison a été téléchargée.");
}

function markdownCell(value, fallback = "—") {
  const text = String(value ?? "").trim();
  return (text || fallback).replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
}

function markdownText(value, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function buildLLMContext(options = {}) {
  const scope = options.scope === "all" ? "all" : "active";
  const includeJson = options.includeJson !== false;
  const includeNotes = options.includeNotes !== false;
  const generatedAt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date());
  const stats = seasonStats();
  const reportPlants = scope === "all" ? [...(state.plants || [])] : [...stats.plants];
  const reportEntries = scope === "all" ? (state.plants || []).flatMap((plant) => (plant.harvests || []).map((harvest) => ({ ...harvest, plant, plantName: plant.name }))) : [...stats.entries];
  const reportTasks = scope === "all" ? [...(state.tasks || [])] : [...seasonTasks()];
  const reportRatings = scope === "all" ? [...(state.ratings || [])] : [...(state.ratings || [])].filter((rating) => Number(rating.season || findPlant(rating.plantId)?.season || state.currentSeason) === Number(state.currentSeason));
  const reportStats = { plants: reportPlants, entries: reportEntries, totalWeight: roundWeight(reportEntries.reduce((sum, entry) => sum + Number(entry.weight || 0), 0)), totalFruits: reportEntries.reduce((sum, entry) => sum + Number(entry.fruits || 0), 0), harvests: reportEntries.length, varieties: reportPlants.filter((plant) => (plant.harvests || []).length > 0).length, activePlants: reportPlants.filter((plant) => plant.status !== "finished").length };
  const plants = [...reportPlants].sort((a, b) => plantTotals(b).weight - plantTotals(a).weight || a.name.localeCompare(b.name, "fr"));
  const entries = [...reportEntries].sort((a, b) => b.date.localeCompare(a.date));
  const tasks = [...reportTasks].sort((a, b) => Number(a.done) - Number(b.done) || String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")));
  const ratings = [...reportRatings].sort((a, b) => b.date.localeCompare(a.date));
  const season = state.seasons.find((item) => Number(item.year) === Number(state.currentSeason));
  const regionNames = [...new Set([...(state.regions || []), ...plants.map((plant) => plant.region).filter(Boolean)])];
  if (plants.some((plant) => !plant.region)) regionNames.push("Sans zone");
  const zones = regionNames.map((region) => {
    const zonePlants = plants.filter((plant) => (plant.region || "Sans zone") === region);
    const zoneEntries = entries.filter((entry) => (entry.plant.region || "Sans zone") === region);
    const weight = roundWeight(zoneEntries.reduce((sum, entry) => sum + Number(entry.weight || 0), 0));
    const fruits = zoneEntries.reduce((sum, entry) => sum + Number(entry.fruits || 0), 0);
    const top = [...zonePlants].sort((a, b) => plantTotals(b).weight - plantTotals(a).weight)[0];
    return { region, plants: zonePlants.length, weight, fruits, harvests: zoneEntries.length, top: top?.name || "—" };
  }).filter((zone) => zone.plants || zone.harvests);
  const averages = ratings.filter((rating) => Number(rating.overall) > 0);
  const tasteAverage = averages.length ? averages.reduce((sum, rating) => sum + Number(rating.overall), 0) / averages.length : 0;
  const pendingTasks = tasks.filter((task) => !task.done);
  const lateTasks = pendingTasks.filter(taskIsLate);
  const reportExpenses = (state.expenses || []).filter((expense) => scope === "all" || Number(expense.season || state.currentSeason) === Number(state.currentSeason));
  const reportExpenseTotal = reportExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const reportPlans = (state.plans || []).filter((plan) => scope === "all" || Number(plan.sourceSeason || state.currentSeason) === Number(state.currentSeason) || Number(plan.season) === Number(state.currentSeason) + 1);
  const reportCandidates = (state.candidates || []).filter((candidate) => scope === "all" || Number(candidate.season || nextSeasonYear()) === Number(state.currentSeason) || Number(candidate.season || nextSeasonYear()) === Number(nextSeasonYear()));
  const reportReviews = (state.seasonReviews || []).filter((review) => scope === "all" || Number(review.season || findPlant(review.plantId)?.season || state.currentSeason) === Number(state.currentSeason));
  const reportCrosses = (state.crosses || []).filter((cross) => scope === "all" || Number(cross.targetSeason || nextSeasonYear()) === Number(state.currentSeason) || Number(cross.targetSeason || nextSeasonYear()) === Number(nextSeasonYear()));
  const reportHealth = (state.healthLogs || []).filter((log) => scope === "all" || Number(log.season || findPlant(log.plantId)?.season || state.currentSeason) === Number(state.currentSeason));
  const reportSeedInventory = scope === "all" ? [...(state.seedInventory || [])] : [...(state.seedInventory || [])].filter((seed) => !seed.candidateId || Number(candidateById(seed.candidateId)?.season || nextSeasonYear()) === Number(nextSeasonYear()));
  const statusLabel = (plant) => statusMeta[plant.status]?.label || plant.status || "Non renseigné";
  const colorLabel = (plant) => validColors(plant.colors).map((color) => colorMeta[color]?.label || color).join(", ") || "Non renseignée";
  const colorModeLabel = (plant) => plantColorMode(plant) === "gradient" ? "Dégradé multicolore" : "Couleur unie";
  const ratingForPlant = (plantId) => {
    const values = ratings.filter((rating) => rating.plantId === plantId && Number(rating.overall) > 0);
    return values.length ? values.reduce((sum, rating) => sum + Number(rating.overall), 0) / values.length : 0;
  };
  const reportPhotos = (state.photos || []).filter((photo) => scope === "all" || !photo.season || Number(photo.season) === Number(state.currentSeason));
  const rawPhotos = reportPhotos.map((photo) => {
    const { dataUrl, ...metadata } = photo;
    return { ...metadata, imageIncluded: Boolean(dataUrl) };
  });
  const rawPlants = reportPlants.map((plant) => ({ ...cloneData(plant), colors: validColors(plant.colors), colorMode: plantColorMode(plant) }));
  const rawTasks = cloneData(reportTasks);
  const rawRatings = cloneData(reportRatings);
  const rawSeasons = cloneData(scope === "all" ? (state.seasons || []) : (state.seasons || []).filter((item) => Number(item.year) === Number(state.currentSeason)));
  const rawExpenses = cloneData((state.expenses || []).filter((expense) => scope === "all" || Number(expense.season || state.currentSeason) === Number(state.currentSeason)));
  const rawPlans = cloneData((state.plans || []).filter((plan) => scope === "all" || Number(plan.sourceSeason || state.currentSeason) === Number(state.currentSeason) || Number(plan.season) === Number(state.currentSeason) + 1));
  const rawCandidates = cloneData(reportCandidates);
  const rawSeasonReviews = cloneData(reportReviews);
  const rawCrosses = cloneData(reportCrosses);
  const rawHealthLogs = cloneData(reportHealth);
  const rawSeedInventory = cloneData(reportSeedInventory);
  const rawCatalogPhotos = cloneData((state.catalogPhotos || []).map((photo) => { const { dataUrl, ...metadata } = photo; return { ...metadata, imageIncluded: Boolean(dataUrl) }; }));
  const rawCatalog = currentSeedCatalog().map((entry) => {
    const copy = cloneData(entry);
    copy.plantDefaults = { ...(copy.plantDefaults || {}), colors: catalogColors(entry), colorMode: catalogColorMode(entry) };
    return copy;
  });
  const catalogFamilies = [...new Set(rawCatalog.map((entry) => entry.family).filter(Boolean))];
  if (!includeNotes) {
    rawPlants.forEach((plant) => { plant.notes = ""; (plant.harvests || []).forEach((harvest) => { harvest.notes = ""; }); });
    rawTasks.forEach((task) => { task.notes = ""; });
    rawRatings.forEach((rating) => { rating.notes = ""; });
    rawSeasons.forEach((item) => { item.notes = ""; item.highlights = []; });
    rawPhotos.forEach((photo) => { delete photo.title; delete photo.caption; delete photo.notes; });
    rawExpenses.forEach((expense) => { expense.notes = ""; });
    rawPlans.forEach((plan) => { plan.notes = ""; });
    rawCandidates.forEach((candidate) => { candidate.notes = ""; });
    rawSeasonReviews.forEach((review) => { review.notes = ""; });
    rawCrosses.forEach((cross) => { cross.notes = ""; cross.fruitNotes = ""; cross.selectedNotes = ""; });
    rawHealthLogs.forEach((log) => { log.notes = ""; });
    rawSeedInventory.forEach((seed) => { seed.notes = ""; });
  }
  const rawData = {
    application: "Tomato Journal",
    exportType: "llm-context",
    generatedAt: new Date().toISOString(),
    scope,
    currentSeason: state.currentSeason,
    units: state.units,
    overview: {
      plants: reportStats.plants.length,
      activePlants: reportStats.activePlants,
      producingVarieties: reportStats.varieties,
      harvestEvents: reportStats.harvests,
      totalWeightGrams: reportStats.totalWeight,
      totalFruits: reportStats.totalFruits,
      averageFruitGrams: reportStats.totalFruits ? reportStats.totalWeight / reportStats.totalFruits : 0,
      averageTaste: tasteAverage,
      pendingTasks: pendingTasks.length,
      lateTasks: lateTasks.length,
      expenseTotalEuros: reportExpenseTotal,
      catalogEntries: rawCatalog.length,
      catalogFamilies: catalogFamilies.length,
      qualitativeReviews: rawSeasonReviews.length,
      crosses: rawCrosses.length,
      nextSeasonCandidates: rawCandidates.filter((candidate) => Number(candidate.season) === Number(nextSeasonYear())).length,
      productiveZones: zones.map((zone) => ({ name: zone.region, weightGrams: zone.weight, fruits: zone.fruits, harvests: zone.harvests })),
    },
    regions: state.regions || [],
    seasons: rawSeasons,
    plants: rawPlants,
    tasks: rawTasks,
    photos: rawPhotos,
    ratings: rawRatings,
    expenses: rawExpenses,
    plans: rawPlans,
    candidates: rawCandidates,
    seasonReviews: rawSeasonReviews,
    crosses: rawCrosses,
    healthLogs: rawHealthLogs,
    seedInventory: rawSeedInventory,
    catalogPhotos: rawCatalogPhotos,
    catalog: rawCatalog,
    trashItems: (state.trash || []).map(({ id, type, label, deletedAt }) => ({ id, type, label, deletedAt })),
  };

  const seasonHighlights = includeNotes ? (season?.highlights || []).map((highlight) => `- **${markdownText(highlight.title)}** : ${markdownText(highlight.text)}`).join("\n") || "- Aucun moment fort renseigné." : "- Notes personnelles masquées dans cet export.";
  const zoneRows = zones.map((zone) => `| ${markdownCell(zone.region)} | ${zone.plants} | ${zone.harvests} | ${zone.weight ? markdownCell(formatWeight(zone.weight)) : "—"} | ${zone.fruits || "—"} | ${markdownCell(zone.top)} |`).join("\n") || "| — | 0 | 0 | — | — | — |";
  const plantRows = plants.map((plant) => {
    const totals = plantTotals(plant);
    const taste = ratingForPlant(plant.id);
    return `| ${markdownCell(plant.name)} | ${markdownCell(statusLabel(plant))} | ${markdownCell(typeMeta[plant.type] || plant.type)} | ${markdownCell(plant.region || "Sans zone")} | ${markdownCell(plant.location)} | ${markdownCell(colorLabel(plant))} | ${markdownCell(colorModeLabel(plant))} | ${markdownCell(plant.datePlanted)} | ${plant.daysToMaturity ? `${plant.daysToMaturity} j` : "—"} | ${totals.weight ? markdownCell(formatWeight(totals.weight)) : "—"} | ${totals.fruits || "—"} | ${totals.harvests || "—"} | ${totals.fruits ? markdownCell(formatAverageFruit(totals.weight, totals.fruits)) : "—"} | ${taste ? `${formatNumber(taste, 1)} / 5` : "—"} | ${markdownCell(includeNotes ? plant.notes : "Notes masquées")} |`;
  }).join("\n") || "| — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |";
  const catalogRows = rawCatalog.map((entry) => `| ${markdownCell(entry.family)} | ${markdownCell(entry.subfamily)} | ${markdownCell(entry.name)} | ${markdownCell(catalogDetailValue(entry, "type_de_fruit", "fruit"))} | ${markdownCell(catalogColors(entry).map((color) => colorMeta[color]?.label).join(", "))} | ${markdownCell(catalogColorMode(entry) === "gradient" ? "Dégradé multicolore" : "Couleur unie")} | ${markdownCell(catalogDetailValue(entry, "maturité", "maturity"))} |`).join("\n") || "| — | — | — | — | — | — | — |";
  const harvestRows = entries.map((entry) => `| ${markdownCell(entry.date)} | ${markdownCell(entry.plantName)} | ${markdownCell(entry.plant.region || "Sans zone")} | ${markdownCell(formatWeight(entry.weight))} | ${entry.fruits || "—"} | ${markdownCell(includeNotes ? entry.notes : "Notes masquées")} |`).join("\n") || "| — | — | — | — | — | — |";
  const taskRows = tasks.map((task) => {
    const plant = task.plantId ? findPlant(task.plantId) : null;
    return `| ${markdownCell(task.dueDate)} | ${task.done ? "Terminée" : taskIsLate(task) ? "En retard" : "À faire"} | ${markdownCell(taskMeta[task.type]?.label || task.type)} | ${markdownCell(task.title)} | ${markdownCell(plant?.name || "Tout le potager")} | ${markdownCell(repeatMeta[task.repeat] || task.repeat)} | ${markdownCell(task.amount)} | ${markdownCell(includeNotes ? task.notes : "Notes masquées")} |`;
  }).join("\n") || "| — | — | — | — | — | — | — | — |";
  const ratingRows = ratings.map((rating) => {
    const plant = findPlant(rating.plantId);
    return `| ${markdownCell(rating.date)} | ${markdownCell(plant?.name || "Plante supprimée")} | ${rating.overall || "—"} / 5 | ${rating.taste || "—"} / 5 | ${rating.sweetness || "—"} / 5 | ${rating.acidity || "—"} / 5 | ${rating.texture || "—"} / 5 | ${markdownCell(includeNotes ? rating.notes : "Notes masquées")} |`;
  }).join("\n") || "| — | — | — | — | — | — | — | — |";
  const seasonRows = [...(state.seasons || [])].sort((a, b) => Number(b.year) - Number(a.year)).map((item) => {
    const itemStats = seasonStats(item.year);
    return `| ${item.year} | ${markdownCell(seasonStatusLabel(item))} | ${markdownCell(item.start)} | ${markdownCell(item.end)} | ${itemStats.plants.length} | ${itemStats.harvests} | ${itemStats.totalWeight ? markdownCell(formatWeight(itemStats.totalWeight)) : "—"} | ${itemStats.totalFruits || "—"} |`;
  }).join("\n") || "| — | — | — | — | — | — | — | — |";
  const photoRows = reportPhotos.map((photo) => `| ${markdownCell(photo.date)} | ${markdownCell(findPlant(photo.plantId)?.name || "Plante supprimée")} | ${markdownCell(photo.stage || photo.title)} | ${markdownCell(includeNotes ? [photo.caption, photo.notes].filter(Boolean).join(" · ") : "Notes masquées")} | Oui, image locale non incluse |`).join("\n") || "| — | — | — | — | — |";
  const expenseRows = reportExpenses.sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).map((expense) => { const plant = expense.plantId ? findPlant(expense.plantId) : null; return `| ${markdownCell(expense.date)} | ${markdownCell(expense.label)} | ${markdownCell(expenseMeta[expense.category]?.label || expense.category)} | ${formatCurrency(expense.amount)} | ${markdownCell(plant?.name || "Général")} | ${markdownCell(expense.region || plant?.region || "Sans zone")} | ${markdownCell(includeNotes ? expense.notes : "Notes masquées")} |`; }).join("\n") || "| — | — | — | — | — | — | — |";
  const planRows = reportPlans.map((plan) => `| ${plan.season} | ${plan.sourceSeason || "—"} | ${(plan.plantIds || []).map((plantId) => findPlant(plantId)?.name || "Plante supprimée").join(", ") || "Aucune variété sélectionnée"} | ${markdownCell(includeNotes ? plan.notes : "Notes masquées")} | ${markdownCell(plan.updatedAt)} |`).join("\n") || "| — | — | — | — | — |";
  const reviewRows = reportReviews.map((review) => { const plant = findPlant(review.plantId); return `| ${review.season || plant?.season || "—"} | ${markdownCell(plant?.name || "Plante supprimée")} | ${markdownCell(reviewOverallMeta[review.overall]?.label || "À décider")} | ${markdownCell(reviewValueLabel("taste", review.taste))} | ${markdownCell(reviewValueLabel("vigor", review.vigor))} | ${markdownCell(reviewValueLabel("earliness", review.earliness))} | ${markdownCell(reviewValueLabel("quantity", review.quantity))} | ${markdownCell(includeNotes ? review.notes : "Notes masquées")} |`; }).join("\n") || "| — | — | — | — | — | — | — | — |";
  const candidateRows = [...reportCandidates].sort((a, b) => Number(a.season) - Number(b.season) || a.name.localeCompare(b.name, "fr")).map((candidate) => `| ${candidate.season || "—"} | ${markdownCell(candidate.name)} | ${markdownCell(candidateStatusLabel(candidate.status))} | ${markdownCell(candidatePriorityMeta[candidate.priority]?.label || "Priorité normale")} | ${markdownCell(candidate.family)} | ${markdownCell(candidate.subfamily)} | ${markdownCell(candidate.quantity)} | ${markdownCell(includeNotes ? candidate.notes : "Notes masquées")} |`).join("\n") || "| — | — | — | — | — | — | — | — |";
  const crossRows = reportCrosses.map((cross) => `| ${markdownCell(cross.name)} | ${markdownCell(`♀ ${crossParentLabel(cross.femaleParent)} · ♂ ${crossParentLabel(cross.maleParent)}`)} | ${markdownCell(crossStatusLabel(cross.status))} | ${markdownCell(cross.generation)} | ${cross.targetSeason || "—"} | ${cross.seedQuantity || "—"} | ${cross.selectedCount || "—"} | ${markdownCell(includeNotes ? [cross.traits, cross.selectedNotes, cross.notes].filter(Boolean).join(" · ") : "Notes masquées")} |`).join("\n") || "| — | — | — | — | — | — | — | — |";
  const healthRows = reportHealth.map((log) => `| ${markdownCell(log.date)} | ${markdownCell(findPlant(log.plantId)?.name || "Plante supprimée")} | ${markdownCell(healthSymptomLabel(log.symptom))} | ${markdownCell(healthSeverityLabel(log.severity))} | ${markdownCell(log.treatment)} | ${markdownCell(log.treatmentDate)} | ${markdownCell(log.outcome || "—")} | ${markdownCell(includeNotes ? log.notes : "Notes masquées")} |`).join("\n") || "| — | — | — | — | — | — | — | — |";
  const seedRows = reportSeedInventory.map((seed) => `| ${markdownCell(seed.name)} | ${seed.quantity ?? "—"} | ${markdownCell(seed.unit)} | ${markdownCell(seed.acquiredDate)} | ${markdownCell(seed.harvestDate)} | ${markdownCell(seed.viabilityDate)} | ${markdownCell(seed.location)} | ${markdownCell(seed.source)} | ${markdownCell(seed.candidateId ? candidateById(seed.candidateId)?.name || seed.candidateId : "—")} | ${markdownCell(includeNotes ? seed.notes : "Notes masquées")} |`).join("\n") || "| — | — | — | — | — | — | — | — | — | — |";
  const jsonSection = includeJson ? `## 14. Données structurées

Le bloc JSON suivant permet à un assistant IA de retrouver les données originales. Les pixels des photos et le contenu détaillé de la corbeille sont volontairement exclus pour garder le fichier léger et éviter de transmettre des sauvegardes supprimées. ${includeNotes ? "Les notes et les récoltes sont conservées." : "Les notes personnelles ont été masquées."}

\`\`\`json
${JSON.stringify(rawData, null, 2)}
\`\`\`` : "## 14. Données structurées\n\nLe bloc JSON n'a pas été inclus dans cet export. Utilisez l'export JSON brut si vous avez besoin du format complet.";

  return `# Contexte potager — Tomato Journal ${state.currentSeason}

> Fichier préparé pour être transmis à un assistant IA. Utiliser les données ci-dessous comme source de vérité, ne pas inventer les valeurs manquantes et signaler clairement toute hypothèse. Les conseils doivent tenir compte des cultures concernées, des familles du catalogue et des dates indiquées.
>
> **Avant de partager :** ce fichier contient les notes de culture que vous avez saisies. Vérifiez qu'elles ne contiennent pas d'informations personnelles que vous ne souhaitez pas transmettre.

## 1. Vue d'ensemble

- **Application :** Tomato Journal, carnet local hors ligne
- **Fichier généré le :** ${generatedAt}
- **Périmètre :** ${scope === "all" ? `Toutes les saisons (${state.seasons?.length || 0})` : `Saison active ${state.currentSeason}`}
- **Unités :** ${state.units === "imperial" ? "impériales (onces / livres)" : "métriques (grammes / kilogrammes)"}
- **Thème de l'application :** ${state.theme === "night" ? "Night Garden HUD" : "Bio-Orbital"}
- **Zones connues :** ${state.regions?.length || 0}

### Indicateurs du périmètre sélectionné

| Indicateur | Valeur |
| --- | ---: |
| Plantes suivies | ${reportStats.plants.length} |
| Plantes encore actives | ${reportStats.activePlants} |
| Variétés ayant produit | ${reportStats.varieties} |
| Événements de récolte | ${reportStats.harvests} |
| Poids total récolté | ${reportStats.totalWeight ? formatWeight(reportStats.totalWeight) : "—"} |
| Fruits récoltés | ${reportStats.totalFruits || "—"} |
| Poids moyen par fruit | ${reportStats.totalFruits ? formatAverageFruit(reportStats.totalWeight, reportStats.totalFruits) : "—"} |
| Note gustative moyenne | ${tasteAverage ? `${formatNumber(tasteAverage, 1)} / 5` : "Aucune note"} |
| Tâches à faire | ${pendingTasks.length} |
| Tâches en retard | ${lateTasks.length} |
| Photos documentées | ${reportPhotos.length} |
| Fiches du catalogue | ${rawCatalog.length} (tomates · ${catalogSubfamilyList(rawCatalog).length} sous-familles) |
| Bilans qualitatifs | ${reportReviews.length} |
| Croisements / lignées | ${reportCrosses.length} |
| Candidats pour ${nextSeasonYear()} | ${reportCandidates.filter((candidate) => Number(candidate.season) === Number(nextSeasonYear())).length} |

### Résumé de la saison

${includeNotes ? markdownText(season?.notes, "Aucune intention ou note générale renseignée pour cette saison.") : "Notes personnelles masquées dans cet export."}

### Moments forts

${seasonHighlights}

## 2. Zones de culture

| Zone | Plantes | Récoltes | Poids | Fruits | Variété la plus productive |
| --- | ---: | ---: | ---: | ---: | --- |
${zoneRows}

## 3. Fiches des plantes et variétés

Les poids et nombres ci-dessous sont calculés à partir des récoltes enregistrées pour chaque plante du périmètre sélectionné.

| Variété | Statut | Type | Zone | Emplacement | Couleur | Rendu | Plantation | Maturité | Poids | Fruits | Récoltes | Poids moyen | Goût | Notes |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${plantRows}

### Catalogue de semences

Les ${rawCatalog.length} fiches du catalogue sont conservées avec leur famille, leur sous-famille et leurs détails botaniques. Les ajouts personnels portent également leur statut de fiche locale. Le bloc JSON plus bas contient également les descriptions complètes.

| Famille | Sous-famille | Variété | Type de fruit / caractéristique | Couleurs | Rendu | Maturité |
| --- | --- | --- | --- | --- |
${catalogRows}

## 4. Historique des récoltes

| Date | Variété | Zone | Poids | Fruits | Notes |
| --- | --- | --- | ---: | ---: | --- |
${harvestRows}

## 5. Tâches et rappels

| Échéance | État | Type | Action | Plante | Répétition | Quantité / dosage | Détails |
| --- | --- | --- | --- | --- | --- | --- | --- |
${taskRows}

## 6. Notes gustatives

| Date | Variété | Note globale | Goût | Sucré | Acidité | Texture | Commentaire |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
${ratingRows}

## 7. Journal photo

Les images restent dans le stockage local du navigateur et ne sont pas embarquées dans ce fichier texte. Seules leurs métadonnées sont listées.

| Date | Variété | Étape | Note | Image |
| --- | --- | --- | --- | --- |
${photoRows}

## 8. Historique des saisons

| Saison | État | Début | Fin | Plantes | Récoltes | Poids | Fruits |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: |
${seasonRows}

## 9. Budget du potager

| Date | Dépense | Catégorie | Montant | Variété | Zone | Note |
| --- | --- | --- | ---: | --- | --- | --- |
${expenseRows}

**Total du périmètre : ${formatCurrency(reportExpenseTotal)}.**

## 10. Plans de saison

| Saison cible | Saison source | Variétés sélectionnées | Notes | Mis à jour |
| ---: | ---: | --- | --- | --- |
${planRows}

## 11. Bilan qualitatif et préparation de la prochaine saison

### Croisements et lignées personnelles

Les croisements conservent leurs deux parents, leur génération et l’avancement de la sélection. Les champs non renseignés restent explicitement vides.

| Lignée | Parents | Étape | Génération | Saison cible | Graines | Plants sélectionnés | Caractères et observations |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
${crossRows}

### Bilan qualitatif de la saison

Une saison peut rester utile même lorsque les récoltes n’ont pas été pesées ou notées. Les champs vides ci-dessous sont volontairement laissés comme « non renseignés » : aucune quantité n’est inventée.

| Saison | Variété | Décision | Goût / plaisir | Vigueur | Précocité | Quantité perçue | Observations |
| ---: | --- | --- | --- | --- | --- | --- | --- |
${reviewRows}

### Candidats, variétés à acheter et suivi ${nextSeasonYear()}

| Saison cible | Variété | Étape | Priorité | Famille | Sous-famille | Quantité envisagée | Notes |
| ---: | --- | --- | --- | --- | --- | --- | --- |
${candidateRows}

## 12. Inventaire de graines

| Stock | Quantité | Unité | Date d'achat | Date de récolte | Viabilité estimée | Emplacement | Source | Candidate liée | Notes |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
${seedRows}

## 13. Suivi sanitaire structuré

| Date | Plante | Symptôme | Gravité | Traitement | Date du traitement | Résultat | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
${healthRows}

${jsonSection}

## 15. Demandes possibles à une IA

- Résumer la saison et identifier les variétés les plus performantes.
- Comparer les zones du potager et suggérer des ajustements pour la prochaine saison.
- Repérer les tâches en retard et proposer un ordre de priorité.
- Analyser les notes gustatives pour recommander les variétés à replanter.
- Transformer les observations en plan d'action hebdomadaire.
- Signaler les données manquantes utiles, sans inventer de résultats.
`;
}

function renderLLMExportModal() {
  return `<div class="modal-backdrop"><div class="modal compact" role="dialog" aria-modal="true" aria-labelledby="llm-export-title"><div class="modal-header"><div><h2 id="llm-export-title">Préparer un fichier pour une IA</h2><p>Choisissez le périmètre et le niveau de détail avant de télécharger le contexte.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><form id="llm-export-form" class="modal-body"><div class="llm-export-intro"><span>${icon("message")}</span><div><strong>Un fichier lisible et exploitable</strong><p>Le document contient une synthèse en français, des tableaux et, si vous le souhaitez, les données JSON structurées.</p></div></div><div class="form-field full"><label for="llm-file-type">Type de fichier</label><select id="llm-file-type" name="fileType"><option value="markdown">Markdown lisible · .md</option><option value="json">JSON structuré · .json</option><option value="text">Texte brut · .txt</option></select></div><div class="form-field full"><label for="llm-scope">Périmètre du fichier</label><select id="llm-scope" name="scope"><option value="active">Saison active uniquement · ${state.currentSeason}</option><option value="all">Toutes les saisons et toutes les données</option></select></div><div class="llm-export-options"><label class="option-check"><input type="checkbox" name="includeJson" checked /><span class="option-check-box">${icon("check")}</span><span><strong>Inclure le JSON structuré</strong><small>Plus précis pour l'analyse automatique, mais fichier plus long.</small></span></label><label class="option-check"><input type="checkbox" name="includeNotes" checked /><span class="option-check-box">${icon("check")}</span><span><strong>Inclure les notes personnelles</strong><small>Décochez cette option avant de partager des observations sensibles.</small></span></label></div><div class="form-help llm-export-privacy">Les images restent locales et ne sont jamais intégrées au fichier texte. Vous pourrez les transmettre séparément si une analyse visuelle est nécessaire.</div><div class="form-actions"><button class="button secondary" data-action="close-modal" type="button">Annuler</button><button class="button primary" type="submit">${icon("download")} Générer le fichier</button></div></form></div></div>`;
}

function buildLLMJson(options = {}) {
  const markdown = buildLLMContext({ ...options, includeJson: true });
  const match = markdown.match(/```json\n([\s\S]*?)\n```/);
  if (!match) throw new Error("json-export-unavailable");
  return JSON.stringify(JSON.parse(match[1]), null, 2);
}

function buildLLMPlainText(options = {}) {
  return buildLLMContext(options)
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^> ?/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/```json\n?/g, "JSON STRUCTURÉ\n")
    .replace(/```/g, "")
    .replace(/^\|[ \t]*/gm, "")
    .replace(/[ \t]*\|[ \t]*/g, " · ")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
}

function exportLLMContext(options = {}) {
  const fileType = ["markdown", "json", "text"].includes(options.fileType) ? options.fileType : "markdown";
  let content;
  let mime;
  let extension;
  if (fileType === "json") {
    content = buildLLMJson(options);
    mime = "application/json;charset=utf-8";
    extension = "json";
  } else if (fileType === "text") {
    content = buildLLMPlainText(options);
    mime = "text/plain;charset=utf-8";
    extension = "txt";
  } else {
    content = buildLLMContext(options);
    mime = "text/markdown;charset=utf-8";
    extension = "md";
  }
  const scopeLabel = options.scope === "all" ? "toutes-saisons" : `saison-${state.currentSeason}`;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `contexte-potager-${scopeLabel}.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
  toast(`Fichier ${extension.toUpperCase()} de contexte IA téléchargé.`);
}

async function exportData() {
  try {
    state.lastExportAt = new Date().toISOString();
    saveState();
    const snapshot = cloneData(state);
    snapshot.photos = await Promise.all((state.photos || []).map(async (photo) => {
      const copy = { ...photo };
      if (!copy.dataUrl && copy.mediaId && photoStorageSupported()) {
        try { copy.dataUrl = await readBlobAsDataUrl(await getPhotoBlob(copy.mediaId)); } catch (error) { console.warn("Photo absente de l'export", error); }
      }
      return copy;
    }));
    snapshot.catalogPhotos = await Promise.all((state.catalogPhotos || []).map(async (photo) => {
      const copy = { ...photo };
      if (!copy.dataUrl && copy.mediaId && photoStorageSupported()) {
        try { copy.dataUrl = await readBlobAsDataUrl(await getPhotoBlob(copy.mediaId)); } catch (error) { console.warn("Photo catalogue absente de l'export", error); }
      }
      return copy;
    }));
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tomato-journal-${state.currentSeason}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    render();
    toast("Votre sauvegarde JSON, photos incluses, a été téléchargée.");
  } catch (error) {
    toast("La sauvegarde n'a pas pu être générée. Vérifiez l'espace disponible.", "error");
  }
}

function csvCell(value) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv() {
  const rows = [["Type", "Saison", "Variété", "Date", "Poids (g)", "Fruits", "Zone", "Emplacement", "Couleurs", "Statut", "Notes"]];
  (state.plants || []).forEach((plant) => {
    const colors = validColors(plant.colors).map((color) => colorMeta[color]?.label).join(" · ");
    const harvests = plant.harvests || [];
    if (!harvests.length) rows.push(["plante", plant.season, plant.name, plant.datePlanted, "", "", plant.region, plant.location, colors, statusMeta[plant.status]?.label || plant.status, plant.notes]);
    harvests.forEach((harvest) => rows.push(["récolte", plant.season, plant.name, harvest.date, Number(harvest.weight || 0), Number(harvest.fruits || 0), plant.region, plant.location, colors, statusMeta[plant.status]?.label || plant.status, harvest.notes]));
  });
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}\r\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tomato-journal-${state.currentSeason}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
  toast("Export CSV des plantes et récoltes téléchargé.");
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (character === '"' && quoted && next === '"') { field += '"'; index += 1; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (character === ";" && !quoted) { row.push(field); field = ""; continue; }
    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field); field = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    field += character;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((value) => value.trim() !== "")) rows.push(row); }
  return rows;
}

function csvColorValues(value) {
  const normalized = normalizeSearchText(value).split(/[·/,]+/).map((item) => item.trim()).filter(Boolean);
  return Object.entries(colorMeta).filter(([, meta]) => normalized.some((item) => normalizeSearchText(meta.label) === item || normalizeSearchText(meta.group) === item)).map(([key]) => key).slice(0, 3);
}

function csvStatusValue(value) {
  const normalized = normalizeSearchText(value);
  return Object.entries(statusMeta).find(([, meta]) => normalizeSearchText(meta.label) === normalized)?.[0] || "growing";
}

async function importCsv(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const rows = parseCsvRows(text);
    if (rows.length < 2) throw new Error("empty-csv");
    const headers = rows[0].map((header) => normalizeSearchText(header));
    const required = ["type", "saison", "variete", "date"];
    if (!required.every((header) => headers.includes(header))) throw new Error("csv-header");
    const valueAt = (row, header) => row[headers.indexOf(normalizeSearchText(header))] || "";
    let importedPlants = 0;
    let importedHarvests = 0;
    const seasonKeys = new Set((state.seasons || []).map((season) => Number(season.year)));
    for (const row of rows.slice(1)) {
      const kind = normalizeSearchText(valueAt(row, "type"));
      if (!kind || !["plante", "recolte"].includes(kind)) continue;
      const name = String(valueAt(row, "variété") || valueAt(row, "variete")).trim();
      if (!name) continue;
      const season = Number.parseInt(valueAt(row, "saison"), 10) || state.currentSeason;
      let plant = (state.plants || []).find((item) => Number(item.season) === season && normalizeSearchText(item.name) === normalizeSearchText(name));
      if (!plant) {
        plant = { id: uid("plant"), name, type: "open", colors: csvColorValues(valueAt(row, "couleurs")), size: "", shape: "", growth: "", fruitType: "", breeder: "", seedSource: "Import CSV", datePlanted: kind === "plante" ? valueAt(row, "date") || todayIso() : todayIso(), daysToMaturity: 75, season, region: String(valueAt(row, "zone")).trim(), location: String(valueAt(row, "emplacement")).trim(), notes: "", status: "growing", harvests: [] };
        state.plants.push(plant);
        importedPlants += 1;
      }
      const region = String(valueAt(row, "zone")).trim();
      const location = String(valueAt(row, "emplacement")).trim();
      if (region) plant.region = region;
      if (location) plant.location = location;
      const notes = String(valueAt(row, "notes")).trim();
      if (kind === "plante") {
        if (valueAt(row, "date")) plant.datePlanted = valueAt(row, "date");
        if (notes) plant.notes = notes;
        plant.status = csvStatusValue(valueAt(row, "statut"));
        const colors = csvColorValues(valueAt(row, "couleurs"));
        if (colors.length) plant.colors = colors;
      } else {
        const weight = roundWeight(parseNumericInput(valueAt(row, "poids (g)")));
        const fruits = Math.max(0, Number.parseInt(valueAt(row, "fruits"), 10) || 0);
        const date = valueAt(row, "date") || todayIso();
        if (weight > 0 && !(plant.harvests || []).some((harvest) => harvest.date === date && Number(harvest.weight) === weight && Number(harvest.fruits || 0) === fruits)) {
          plant.harvests = plant.harvests || [];
          plant.harvests.push({ id: uid("harvest"), date, weight, fruits, notes });
          plant.status = "harvesting";
          importedHarvests += 1;
        }
      }
      if (!seasonKeys.has(season)) {
        state.seasons = state.seasons || [];
        state.seasons.push({ year: season, start: `${season}-01-01`, end: "", status: "incomplete", notes: "Saison créée lors d'un import CSV.", highlights: [] });
        seasonKeys.add(season);
      }
    }
    if (!importedPlants && !importedHarvests) throw new Error("csv-no-data");
    saveState(); render();
    toast(`${importedPlants} plante${importedPlants > 1 ? "s" : ""} et ${importedHarvests} récolte${importedHarvests > 1 ? "s" : ""} importée${importedPlants + importedHarvests > 1 ? "s" : ""}.`);
  } catch (error) {
    toast("Ce fichier CSV doit provenir de Tomato Journal et contenir les colonnes Type, Saison, Variété et Date.", "error");
  }
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const incoming = JSON.parse(reader.result);
      if (!incoming || !Array.isArray(incoming.plants) || !Array.isArray(incoming.seasons)) throw new Error("format");
      state = { ...buildDemoState(), ...incoming };
      if (!Object.prototype.hasOwnProperty.call(incoming, "expenses") || !Array.isArray(state.expenses)) state.expenses = [];
      if (!Object.prototype.hasOwnProperty.call(incoming, "plans") || !Array.isArray(state.plans)) state.plans = [];
      if (!Object.prototype.hasOwnProperty.call(incoming, "candidates") || !Array.isArray(state.candidates)) state.candidates = [];
      if (!Object.prototype.hasOwnProperty.call(incoming, "seasonReviews") || !Array.isArray(state.seasonReviews)) state.seasonReviews = [];
      if (!Object.prototype.hasOwnProperty.call(incoming, "crosses") || !Array.isArray(state.crosses)) state.crosses = [];
      if (!Array.isArray(state.photos)) state.photos = [];
      if (!Array.isArray(state.catalogPhotos)) state.catalogPhotos = [];
      if (!Array.isArray(state.trash)) state.trash = [];
      if (!Array.isArray(state.seedInventory)) state.seedInventory = [];
      if (!Array.isArray(state.healthLogs)) state.healthLogs = [];
      if (typeof state.onboardingSeen !== "boolean") state.onboardingSeen = true;
      if (!state.budgetSettings || typeof state.budgetSettings !== "object") state.budgetSettings = { marketPricePerKg: 4.5, projectionRate: 1.15 };
      state.budgetSettings.marketPricePerKg = Number(state.budgetSettings.marketPricePerKg) > 0 ? Number(state.budgetSettings.marketPricePerKg) : 4.5;
      state.budgetSettings.projectionRate = Number(state.budgetSettings.projectionRate) > 0 ? Number(state.budgetSettings.projectionRate) : 1.15;
      if (!Array.isArray(state.catalog)) state.catalog = cloneData(defaultSeedCatalog());
      mergeReferenceCatalog(state);
      migrateCatalogTypes(state);
      if (!["orbital", "night"].includes(state.theme)) state.theme = "orbital";
      storageWarningShown = false;
      render();
      await initializePhotoStorage();
      saveState(); render();
      toast("Sauvegarde importée avec succès, photos vérifiées.");
    } catch (error) {
      toast("Ce fichier ne ressemble pas à une sauvegarde Tomato Journal.", "error");
    }
  };
  reader.readAsText(file);
}

function init() {
  hydrateIcons();
  render();
  if (pendingCatalogPruneNotice > 0 || pendingCatalogEnrichNotice > 0 || pendingCatalogTypesNotice) {
    const parts = [];
    if (pendingCatalogPruneNotice > 0) {
      const n = pendingCatalogPruneNotice;
      parts.push(`${n} fiche${n > 1 ? "s" : ""} autre${n > 1 ? "s" : ""} que la tomate retirée${n > 1 ? "s" : ""} de la page Variétés`);
    }
    if (pendingCatalogEnrichNotice > 0) {
      const n = pendingCatalogEnrichNotice;
      parts.push(`${n} nouvelle${n > 1 ? "s" : ""} variété${n > 1 ? "s" : ""} de tomates ajoutée${n > 1 ? "s" : ""} au catalogue`);
    }
    if (pendingCatalogTypesNotice) parts.push("fiches de référence et classement actualisés");
    pendingCatalogPruneNotice = 0;
    pendingCatalogEnrichNotice = 0;
    pendingCatalogTypesNotice = false;
    saveState();
    setTimeout(() => toast(`Catalogue mis à jour : ${parts.join(" et ")}.`, "success"), 0);
  }
  document.addEventListener("click", handleClick);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && document.getElementById("modal-root")?.innerHTML) closeModal(); });
  document.addEventListener("input", (event) => {
    if (event.target.id === "global-search") {
      globalSearchQuery = event.target.value;
      renderGlobalSearchResults();
      return;
    }
    if (event.target.id === "variety-search") {
      varietySearch = event.target.value;
      const cursor = event.target.selectionStart;
      render();
      const replacement = document.getElementById("variety-search");
      if (replacement) { replacement.focus(); replacement.setSelectionRange(cursor, cursor); }
    }
  });
  document.addEventListener("focusin", (event) => {
    if (event.target.id === "global-search" && globalSearchQuery.trim()) renderGlobalSearchResults();
  });
  document.addEventListener("change", (event) => {
    if (event.target.id === "bulk-select-all") {
      visibleGardenPlants().forEach((plant) => event.target.checked ? selectedPlantIds.add(plant.id) : selectedPlantIds.delete(plant.id));
      render();
      return;
    }
    if (event.target.matches("#plant-color-mode, #catalog-color-mode")) {
      updateColorPreview(event.target.closest("form"));
      return;
    }
    if (event.target.id === "cross-season-filter") {
      openModal(renderCrossManager(event.target.value));
      return;
    }
    if (event.target.matches("[data-cross-parent]")) {
      const form = event.target.closest("#cross-form");
      const parent = crossParentFromRef(event.target.value, "");
      const role = event.target.dataset.crossParent;
      if (form && parent.ref !== "manual" && parent.name) setPlantFormField(form, `${role}ParentName`, parent.name);
      return;
    }
    if (event.target.id === "plant-catalog-select") {
      const form = event.target.closest("#plant-form");
      const entry = catalogEntryById(event.target.value);
      if (form && entry) applyCatalogToPlantForm(form, entry);
      else if (form) {
        form.dataset.catalogId = "";
        const source = form.querySelector("[data-catalog-selection-note]");
        if (source) source.hidden = true;
      }
      return;
    }
    if (event.target.id === "candidate-catalog-select") {
      const form = event.target.closest("#candidate-form");
      const entry = catalogEntryById(event.target.value);
      if (form && entry) {
        form.dataset.catalogId = entry.id || "";
        setPlantFormField(form, "name", entry.name);
        setPlantFormField(form, "family", entry.family);
        setPlantFormField(form, "subfamily", entry.subfamily);
        const source = form.querySelector("[data-candidate-source-note]");
        if (source) { source.hidden = false; source.innerHTML = `${icon("tag")} <span>Liée à la fiche catalogue « ${escapeHTML(entry.name)} » · ${escapeHTML(entry.family || "Famille non précisée")}.</span>`; }
      } else if (form) {
        form.dataset.catalogId = "";
        const source = form.querySelector("[data-candidate-source-note]");
        if (source) { source.hidden = true; source.innerHTML = ""; }
      }
      return;
    }
    if (event.target.id === "candidate-season-filter") {
      openModal(renderCandidateManager(event.target.value));
      return;
    }
    if (event.target.id === "import-file") importData(event.target.files?.[0]);
    if (event.target.id === "import-csv-file") importCsv(event.target.files?.[0]);
  });
  document.getElementById("quick-add-button")?.addEventListener("click", () => openModal(renderPlantForm()));
  document.getElementById("theme-toggle-button")?.addEventListener("click", toggleTheme);
  document.getElementById("profile-button")?.addEventListener("click", () => openModal(`<div class="modal-backdrop"><div class="modal compact" role="dialog" aria-modal="true"><div class="modal-header"><div><h2>Votre carnet</h2><p>Un espace personnel, sans compte et sans serveur.</p></div><button class="close-button" data-action="close-modal" type="button" aria-label="Fermer">${icon("close")}</button></div><div class="modal-body"><div class="highlight-item" style="padding-top:0"><div class="highlight-icon green">${icon("check")}</div><div><strong>Données locales activées</strong><span>Vos plantes et récoltes sont conservées dans le stockage de ce navigateur. Pensez à exporter une sauvegarde si vous changez d'appareil.</span></div></div><div class="form-actions"><button class="button primary" data-action="close-modal" type="button">Fermer</button></div></div></div></div>`));
  document.getElementById("sidebar-season-button")?.addEventListener("click", () => openModal(renderSeasonPicker()));
  handleStartupAction();
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  refreshInstallButtons();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  refreshInstallButtons();
  toast("Tomato Journal est maintenant installé.");
});

document.addEventListener("DOMContentLoaded", () => {
  init();
  registerServiceWorker();
  initializePhotoStorage();
  refreshStorageEstimate();
});
