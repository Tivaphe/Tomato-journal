/* Vérifications de cohérence du dépôt — exécuté par la CI et par `npm run check`.
 * Complète les tests unitaires (tests/) sur tout ce qui vit en dehors du
 * catalogue : documentation, service worker, captures d'écran. */
import { readFileSync, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const check = (label, condition, detail = "") => {
  if (condition) console.log(`  ok   ${label}`);
  else failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
};

const read = (file) => readFileSync(join(root, file), "utf8");

/* --- Catalogue de référence ------------------------------------------------ */
const seedContext = vm.createContext({ window: {} });
vm.runInContext(read("src/seed-catalog.js"), seedContext);
const catalogSize = seedContext.window.SEED_CATALOG.length;
const readme = read("README.md");

const declared = [...readme.matchAll(/1987|(\d{3,4})\s*(?:variétés|fiches|varieties|sheets)/g)]
  .map((match) => Number(match[1] || 1987))
  .filter((value) => Number.isFinite(value));
check(
  "le README annonce le bon nombre de fiches",
  declared.length > 0 && declared.every((value) => value === catalogSize),
  `README ${[...new Set(declared)].join(", ")} · catalogue ${catalogSize}`,
);

/* --- Service worker -------------------------------------------------------- */
const serviceWorker = read("sw.js");
const cacheName = serviceWorker.match(/const CACHE_NAME = "([^"]+)"/)?.[1];
check("sw.js déclare un nom de cache", Boolean(cacheName));
check(
  "le README cite le cache courant de sw.js",
  Boolean(cacheName) && readme.includes(cacheName),
  `sw.js ${cacheName}`,
);
const staleCaches = [...readme.matchAll(/tomato-journal-shell-[0-9a-f]{12}/g)]
  .map((match) => match[0])
  .filter((name) => name !== cacheName);
check("le README ne cite pas d'ancien cache", staleCaches.length === 0, staleCaches.join(", "));

const shellEntries = [...serviceWorker.matchAll(/^ {2}"(\.\/[^"]+)",?$/gm)].map((match) => match[1]);
check("sw.js liste un shell applicatif", shellEntries.length > 0, `${shellEntries.length} entrées`);
const missingShell = shellEntries.filter((entry) => !existsSync(join(root, entry)));
check("chaque fichier du shell existe", missingShell.length === 0, missingShell.join(", "));

/* --- Captures d'écran ------------------------------------------------------ */
const screenshots = [...readme.matchAll(/docs\/screenshots\/([A-Za-z0-9._-]+)/g)].map((match) => match[1]);
const missingShots = [...new Set(screenshots)].filter((file) => !existsSync(join(root, "docs/screenshots", file)));
check("chaque capture référencée existe", missingShots.length === 0, missingShots.join(", "));

/* --- Documentation du stockage -------------------------------------------- */
check(
  "le README documente le modèle de stockage du catalogue",
  /jamais recopi|never copied/i.test(readme),
  "mentionner que les fiches de référence ne sont pas recopiées dans localStorage",
);

if (failures.length) {
  console.error(`\n${failures.length} vérification(s) en échec :`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`\nCohérence OK (${catalogSize} fiches de référence).`);
}
