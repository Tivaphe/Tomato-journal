# Collecte Tomatofifou — compléter le catalogue sans doublon

Source : <https://www.tomatofifou.com/categorie-produit/tomates/> (Cycle en Terre Semences, BE).
Relevé de la catégorie au 9 septembre 2026 : **2 999 fiches**, 15 par page, pagination `/page/N/`.

Chaque fiche produit publie un tableau « Caractéristiques » : calibre, couleur, forme,
précocité, climat, feuillage, croissance, origine, hauteur. C'est exactement le
vocabulaire attendu par les fiches du catalogue, d'où un collecteur dédié.

## Pourquoi un script à lancer localement

Le catalogue n'est pas aspiré depuis l'environnement de développement : l'accès
sortant y est coupé. Le collecteur est donc livré prêt à l'emploi, à lancer depuis
une machine connectée. Il est relançable, reprend où il s'est arrêté et n'écrit
rien dans `src/seed-catalog.js` : l'intégration se fait ensuite par la chaîne de
construction habituelle.

```bash
npm run collect:tomatofifou -- --verify 25    # sonde 25 fiches, n'écrit rien
npm run collect:tomatofifou -- --limit 100    # première passe bornée
npm run collect:tomatofifou                   # la catégorie complète
npm run build:enrich && npm run build:catalog # intègre au catalogue
```

| Option | Effet |
| --- | --- |
| `--verify N` | analyse N fiches, affiche le taux de remplissage, n'écrit rien |
| `--limit N` | n'analyse que les N premières fiches manquantes |
| `--only-listing` | ne récupère que la liste (rapide, pour mesurer le doublonnage) |
| `--fresh` | repart de zéro (sinon les fiches déjà collectées sont conservées) |
| `--delay MS` | pause entre deux requêtes (700 ms par défaut) |
| `--fixture dossier` | rejoue des pages locales, sans réseau (utilisé par les tests) |
| `--out dossier` | répertoire de sortie, par défaut `data/enrichissement-2026/tomatofifou` |

Le relevé produit `manifest.json`, `listing.tsv`, `profiles.json`,
`identity-decisions.json`, `identity-review.json` et `progress.json`, au même
format que les autres sources de `data/enrichissement-2026/`.

## Sans doublon : la règle

1. **Aucune requête inutile.** Avant d'ouvrir une fiche, le nom est comparé à
   ceux déjà présents dans `src/seed-catalog.js` (noms **et** synonymes
   déclarés, normalisés : casse, accents, `œ`/`æ`, ponctuation et tirets
   ignorés). Une variété déjà connue est déclarée dans
   `identity-decisions.json` et n'est jamais réécrite.
2. **Aucune fusion approximative.** « 1884 » et « 1884 Purple », « Aker's West
   Virginia » et « Aker's West Virginia, Chuck Wyatt's » restent des fiches
   distinctes : ce sont des cultivars différents. Ces voisinages sont listés
   dans `identity-review.json` pour relecture humaine, jamais fusionnés
   automatiquement.
3. **L'intégration reste la même que pour les autres sources.**
   `scripts/build-catalog-enrich.mjs` refuse un identifiant ou un nom en
   double : une variété reconnue est rattachée comme synonyme à la fiche
   existante, sinon une nouvelle fiche est créée.

Mesure à disposition : `npm run collect:tomatofifou -- --only-listing` affiche
« Déjà au catalogue : X · à documenter : Y · à relire : Z », donc le gain réel
de la source avant de lancer la collecte complète.

## Correspondances site → catalogue

Les tables vivent dans `scripts/lib/tomatofifou.mjs` et sont indexées par
libellé normalisé : un libellé inconnu fait échouer la fiche (signal clair qu'il
faut étendre la table), une valeur absente est écrite « non documentée ».

| Champ du site | Valeurs | Traduction |
| --- | --- | --- |
| Croissance | Indéterminée / Déterminée / Semi-déterminée / Dwarf Indéterminée / Dwarf Déterminée | `I` / `D` / `S` / `WI` / `WD` ; vide → `U` (provisoire) |
| Dwarf *(facette)* | Micro Dwarf, Naine, Dwarf Pot, Dwarf Tomato Project | `M` si « micro », sinon déclinaison dwarf du type ci-dessus |
| Couleur | Rouge, Rose, Jaune, Orange, Verte, Noire, Noire à Pourpre, Pourpre violacé, Acajou, Blanche, Bleue, Bicolore Jaune-Rouge | red, pink, yellow, orange, green, purple, purple, purple, brown, cream, anthocyanin, yellow+red |
| Couleur | Bigarrée, Zébrée | **couleurs vides** : le motif est décrit, la couleur de fond n'est pas devinée |
| Forme | Beefsteak, Ronde, Aplatie, Côtelée, Ovale-Prune-Allongée, Cordiforme, Renflée, Piriforme, Variable, Ronde à ovale, Téton, Nervurée, Poivron-Piment, Irrégulière | beefsteak, rond, aplat, côtelé, prune, cœur, variable, poire, variable, ovale, variable, côtelé, poivron, variable |
| Feuillage | Régulier, Pomme de terre, Rugosa, Angora, Carotte, Panache, Pompom | formulations reconnues par `catalogLeafTypes()` : régulier, pomme-de-terre, rugueux, laineux, feuille-carotte, panaché, stick |
| Calibre | Cerise → Gros à très gros (10 valeurs) | texte repris tel quel, complété du poids annoncé dans la description |
| Précocité | Hâtive, Mi-Précoce, Précoce, Mi-Saison, Tardive | texte repris tel quel, **jamais** converti en nombre de jours |
| Climat, Hauteur, Origine | — | reportés dans la note et les champs concernés |

Sont explicitement **non** collectés : prix, stock, avis, promesses de
rendement, nombre de graines. Une information absente reste « non documentée ».

Le port « nain » déduit d'une mention en toutes lettres dans la description
(« Dwarf Tomato Project », « variété naine ») est signalé comme tel dans la
note : c'est une lecture de la source, pas une mesure.

## Tests

`npm test` couvre l'analyse hors ligne (liste, fiche, tableau des
caractéristiques), l'ensemble du vocabulaire publié par les filtres du site, la
reconnaissance des feuillages par `catalogLeafTypes()`, la déduplication et le
refus de fusionner des noms voisins. Une intégration rejoue le collecteur sur
`tests/fixtures/tomatofifou` sans réseau.
