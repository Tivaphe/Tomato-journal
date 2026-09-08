import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(fileURLToPath(import.meta.url));
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(join(root, "seed-catalog.js"), "utf8"), context);
const entries = context.window.SEED_CATALOG;
const labels = {
  partial: "Contrôle partiel",
  conflicting: "Sources divergentes",
  identity: "Souche à préciser",
  unconfirmed: "Documentation insuffisante",
  accession: "Accession à identifier",
  local: "Lot personnel",
};
const escape = (value) => String(value ?? "").replace(/[\\`*_[\]<>|]/g, "\\$&").replace(/\s+/g, " ").trim();
const counts = Object.fromEntries(Object.keys(labels).map((key) => [key, entries.filter((entry) => entry.verification?.status === key).length]));
const changedTypes = entries.filter((entry) => entry.verification?.previousType);
const updated = entries.filter((entry) => entry.verification?.updatedFields?.length);
const sourceCount = new Set(entries.flatMap((entry) => (entry.verification?.sources || []).map((source) => source.url))).size;
const withSources = entries.filter((entry) => entry.verification?.sources?.length).length;
const knownTransplantDays = entries.filter((entry) => Number(entry.plantDefaults?.daysToMaturity) > 0).length;

const lines = [
  "# Vérification documentaire du catalogue de tomates",
  "",
  "**Date du contrôle : 7 septembre 2026.**",
  "",
  "## Verdict et portée",
  "",
  `Les **${entries.length} fiches** ont été passées en revue. Le catalogue contenait des erreurs et des informations trop affirmatives : ports de plante, précocités, couleurs, feuillages, origines et confusion entre calibre du fruit et hauteur du plant.`,
  "",
  "**Il ne s’agit pas d’une certification de toutes les informations ni des lots de graines.** Les points effectivement recoupés sont indiqués pour chaque fiche. Toute autre caractéristique conservée reste à confirmer, même si elle figure encore dans le catalogue.",
  "",
  `- ${withSources} fiches possèdent au moins une référence documentaire ; ${sourceCount} URL distinctes sont répertoriées. Une référence peut ne couvrir qu’un caractère ou le contexte d’un lot, et non sa conformité.`,
  `- ${updated.length} fiches ont reçu des mises à jour de texte ou de structuration. Cela ne signifie pas que ces ${updated.length} fiches étaient entièrement fausses.`,
  `- ${changedTypes.length} classements ont été révisés. Les cinq filtres demandés sont conservés.`,
  `- ${knownTransplantDays} fiches disposent d’un délai chiffré explicitement rapporté à la plantation dans les références retenues.`,
  "- Aucun identifiant, nom de variété ou lien de photo n’a été supprimé. Les doublons potentiels sont signalés, pas fusionnés.",
  "",
  "| État du contrôle | Fiches | Signification |",
  "| --- | ---: | --- |",
  `| Contrôle partiel | ${counts.partial} | Certains caractères ont été recoupés ; les autres ne sont pas certifiés. |`,
  `| Sources divergentes | ${counts.conflicting} | Les références ne concordent pas sur un ou plusieurs caractères. |`,
  `| Souche à préciser | ${counts.identity} | Homonymie, synonymie incertaine, sélection distincte ou doublon potentiel. |`,
  `| Documentation insuffisante | ${counts.unconfirmed} | Pas de référence indépendante assez précise pour identifier la dénomination et valider la fiche. |`,
  `| Accession à identifier | ${counts.accession} | Une espèce sauvage comprend plusieurs populations et lots génétiques différents. |`,
  `| Lot personnel | ${counts.local} | La filiation, la génération ou la stabilité demandent les observations du jardinier. |`,
  "",
  "## Méthode et limites",
  "",
  "Priorité aux obtenteurs et diffuseurs historiques, puis aux organismes horticoles, semenciers spécialisés et bases de collectionneurs. Le contrôle utilise des fiches publiques, des catalogues PDF et des extraits indexés. Il ne repose pas systématiquement sur deux sources indépendantes : les semenciers peuvent reprendre une description commune. Les observations de jardiniers sont conservées comme observations, pas comme essais contrôlés.",
  "",
  "- **Port et croissance sont deux notions différentes.** Micro-naine, dwarf et bush décrivent surtout un port ; déterminée, semi-déterminée et indéterminée décrivent la croissance. Les cinq filtres sont des rangements pratiques, parfois provisoires, pas des catégories génétiques exclusives. Une plante courte n’est pas nécessairement déterminée.",
  "- **Les délais ne se comparent que sur la même base.** Jours depuis semis, levée, plantation ou floraison ne sont pas interchangeables. Les chiffres sans base explicite sont signalés. Ils ne prédisent pas une date locale de récolte.",
  "- **Pré-saisie du calendrier :** en l’absence de délai documenté depuis plantation, l’application propose 75 jours comme hypothèse à ajuster et l’indique dans la fiche et le formulaire. Ce nombre n’est pas une caractéristique vérifiée de la variété.",
  "- **Hauteur ≠ poids ou diamètre du fruit.** Les mesures de fruits ne sont plus affichées comme hauteurs de plantes ; les hauteurs manquantes ne sont pas inventées. Les valeurs antérieures non couvertes par le contrôle restent à confirmer.",
  "- **Couleurs et tailles :** les couleurs de référence et le calibre ne sont plus déduits du feuillage, du nom des parents ou du port nain. Les descriptions gustatives et les fourchettes de poids restent indicatives.",
  "- **Génétique et résistance :** un aspect panaché, laineux ou bleu ne démontre pas un génotype précis. Les codes et promesses sanitaires non étayés ont été retirés ou qualifiés. Les résistances annoncées par un fabricant doivent être relues sur la notice du lot ; elles ne signifient pas immunité.",
  "- **Espèces sauvages :** demander un numéro d’accession. La comestibilité d’un lot sauvage non identifié ne se déduit pas de sa ressemblance avec une tomate de jardin ; l’assurance alimentaire générale de la fiche Solanum habrochaites a été retirée.",
  "- **Histoires de variétés :** distinguer récit familial, première mention commerciale et filiation démontrée. Les dates et les pays d’origine divergent parfois sans que les caractères du fruit divergent.",
  "",
  "Repère général sur la culture et le calcul depuis plantation : [1](https://extension.umd.edu/resource/growing-tomatoes-home-garden/), University of Maryland Extension. Les références variétales figurent sous chaque fiche.",
  "",
  "## Priorités nécessitant la provenance du lot",
  "",
  "- **UG 849 14 F1, Petros, Azure** : fournir une photo du sachet ou une référence précise du fabricant.",
  "- **Bleue P20 Mutant, Kumato F2** : documenter la plante mère, la génération, les photos de fruits et le suivi des descendants.",
  "- **Romovaya Babka / Romovaja Baba**, **Marizol Purple / Marizol Korney**, **Musk Zebra** : descriptions suffisamment différentes pour éviter une correction automatique vers un autre cultivar.",
  "- **Cornue des Andes / Andine Cornue** : doublon probable, maintenu pour ne pas casser les liens du carnet.",
  "- **Brandywine / Brandywine Pink** et **White Beauty / Beauté Blanche du Canada** : équivalences possibles, à confirmer avant fusion. La souche Sudduth n’est pas fusionnée avec les autres Brandywine.",
  "",
  "## Classements modifiés",
  "",
  "| Variété | Avant | Après |",
  "| --- | --- | --- |",
  ...changedTypes.map((entry) => `| ${escape(entry.name)} | ${escape(entry.verification.previousType)} | ${escape(entry.subfamily)} |`),
  "",
  "Les réserves sur ces rangements sont détaillées ci-dessous : un changement de filtre ne vaut pas certification du lot.",
  "",
  "## Résultats variété par variété",
  "",
];

for (const entry of entries) {
  const review = entry.verification;
  if (!review || !labels[review.status]) throw new Error(`Missing review for ${entry.id}`);
  lines.push(
    `<a id="${entry.id}"></a>`,
    "",
    `### ${String(entry.catalogIndex).padStart(3, "0")} — ${escape(entry.name)}`,
    "",
    `**${labels[review.status]}** · Filtre : **${escape(entry.subfamily)}** · Identifiant : \`${entry.id}\``,
    "",
    `**Portée du contrôle :** ${review.scope.length ? review.scope.map(escape).join(", ") : "aucun caractère du lot confirmé par une source publique exploitable"}.`,
    "",
    escape(review.note),
    "",
    `- **Croissance renseignée :** ${escape(entry.details.croissance || "Non confirmée")}.`,
    `- **Maturité affichée :** ${escape(entry.details.maturité || "Non renseignée")}`,
    `- **Hauteur affichée :** ${escape(entry.details.taille || "Non renseignée")}`,
    `- **Champs mis à jour :** ${review.updatedFields.length ? review.updatedFields.map(escape).join(", ") : "aucun changement de texte botanique ; ajout de la traçabilité"}.`,
  );
  if (review.sources.length) {
    lines.push("", "**Références consultées :**", "");
    review.sources.forEach((source, index) => lines.push(`- ${escape(source.title)} — [${index + 1}](${source.url})`));
  } else {
    lines.push("", "**Référence exploitable :** aucune pour cette dénomination exacte. Une recherche infructueuse ne prouve pas que la variété n’existe pas.");
  }
  lines.push("");
}
await mkdir(join(root, "docs"), { recursive: true });
await writeFile(join(root, "docs/verification-catalogue.md"), lines.join("\n"));
console.log(`${entries.length} fiches, ${sourceCount} références, ${changedTypes.length} classements révisés.`);
