<div align="center">

# 🍅 Tomato Journal

**Une application web locale, sans dépendance, pour suivre une saison de culture de tomates.**
*A local, dependency-free web app for tracking a tomato growing season.*

**[🇫🇷 Français](#français)** · **[🇬🇧 English](#english)**

</div>

---

<a id="français"></a>

## 🇫🇷 Français

> 🇬🇧 Switch to [English](#english)

### Lancer en local

Depuis ce dossier :

```bash
npm start
```

Puis ouvrir [http://localhost:4173](http://localhost:4173).

Alternative si npm n'est pas disponible :

```bash
python3 -m http.server 4173
```

### Fonctionnalités

- Potager : plantes, zones, filtres et affichage grille/liste.

![Potager — thème clair Bio-Orbital](screen/potager-theme-clair.png)
*Le Potager en thème clair **Bio-Orbital** : statistiques de la saison, filtres par zone et cartes des plantes.*

- Gestion des zones : ajout, renommage et suppression d'une zone depuis Potager ou Plus.
- Les actions destructives demandent une double confirmation avant suppression.
- Fiche plante : variété, caractéristiques, emplacement et notes.
- Tâches et rappels : arrosage, fertilisation, tuteurage, échéance, répétition, quantité/dosage et détails.
- Journal photo : photos compressées et conservées localement avec titre, date et observation.
- Calendrier de culture : plantations, maturités estimées, tâches et jours de récolte.
- Analyse détaillée : récoltes, rythmes, répartitions, rendements par zone et comparaison des saisons au même endroit. Un graphique annuel affiche les douze mois avec des barres empilées par variété : la hauteur représente le poids récolté et chaque segment reprend la couleur de la fiche concernée. Les poids acceptent les décimales en grammes (par exemple 1 200,5 g) et restent pris en compte dans tous les totaux et moyennes.
- L’analyse détaillée comprend aussi les rendements par plant et par zone, les moyennes, la meilleure journée et la note gustative moyenne. Les fenêtres longues de planification et de budget restent défilables sur ordinateur comme sur mobile.

![Analyse détaillée — récoltes par mois et par variété](screen/analyse-detaillee-mois-varietes.png)
*Graphique annuel : douze mois en barres empilées par variété, la hauteur représente le poids récolté et chaque segment reprend la couleur de la fiche plante.*

![Analyse détaillée — rythme, répartition et records](screen/analyse-detaillee-rythme-repartition.png)
*Rythme hebdomadaire des récoltes, répartition par variété, plus beaux fruits et journal des récoltes.*

- Notes gustatives : saveur, sucrosité, acidité, texture, note globale et commentaires.
- Saisons : résumé annuel, état du bilan (en cours, incomplet ou clôturé) et moments à retenir.
- Bilan qualitatif : goût, vigueur, précocité, quantité perçue et décision à retenir/revoir/écarter, sans pesée obligatoire.

![Saisons et bilan qualitatif](screen/saisons-bilan-qualitatif.png)
*La page Saisons : résumé de l'année, état du bilan et bilan qualitatif variété par variété.*

- Comparaison de saisons : rendement, variétés productives, zones, notes gustatives et budget année par année.
- Planification : sélection pour la prochaine saison et recommandations basées sur les performances actuelles.
- Candidats et achats : liste séparée pour la saison suivante avec statuts candidate, à acheter, achetée, semée, plantée, retenue ou écartée, priorité, quantité et notes.
- Croisements et lignées : parents femelle/mâle issus du potager ou du catalogue, génération F1/F2/F3, dates de pollinisation et d’extraction, quantité de graines, plants sélectionnés, caractères recherchés et stabilité. Chaque lignée peut alimenter automatiquement le catalogue local et les candidats de saison.
- Budget du potager : dépenses par catégorie, variété et zone, avec restauration depuis la corbeille.
- Catalogue de variétés : 130 fiches importées depuis `claud6 catalogue seed.html`, réparties dans 25 familles, avec familles, sous-familles et détails botaniques conservés ; recherche, filtres, consultation de fiche, ajout de nouvelles variétés et ajout prérempli au potager. Le formulaire « Ajouter une plante » propose aussi un menu déroulant du catalogue pour remplir automatiquement les champs correspondants.

![Catalogue de variétés](screen/catalogue-varietes.png)
*Le catalogue : 130 fiches réparties dans 25 familles, avec recherche et filtres par type.*

- Corbeille : restauration des plantes, zones, récoltes, tâches, photos, dégustations, dépenses, candidats de saison, croisements et fiches de catalogue.
- Bilan partageable : carte visuelle, badges, indice potager, records et défi amical, avec copie du texte, partage natif et téléchargement de la carte SVG.
- Thèmes visuels : **Bio-Orbital** en mode clair et **Night Garden HUD** en mode sombre, avec bascule rapide et préférence mémorisée.

![Potager — thème sombre Night Garden HUD](screen/potager-theme-sombre.png)
*Le même écran avec le thème sombre **Night Garden HUD**.*

- Palette des fruits : sélection de 1 à 3 teintes, prévisualisation immédiate, choix **Couleur unie** ou **Dégradé multicolore**. En mode uni, plusieurs teintes sont mélangées en une couleur résultante ; en mode dégradé, elles restent visibles séparément. La palette calculée alimente les bandes latérales des fiches plantes et variétés, les repères et encadrés de la page Récoltes, ainsi que les détails et les exports. Les anciennes données sans `colorMode` restent compatibles : une palette multiple est affichée en dégradé par défaut.
- Export de données : sauvegarde JSON complète et fichier **Contexte pour une IA** en Markdown, JSON structuré ou texte brut, avec vue d'ensemble, zones, plantes, récoltes, tâches, dégustations, journal photo, budget, bilans qualitatifs, croisements, candidats et plans de saison.
- Sauvegarde locale dans le navigateur, export/import JSON. Le catalogue fourni est inclus dans les sauvegardes et dans le contexte exporté pour une IA.
- Les données de démonstration peuvent être réinitialisées dans **Plus**.

### Installer comme une application (PWA)

Tomato Journal peut être installé depuis Chrome, Edge ou Safari. Ouvrez l'application avec `http://localhost:4173` en développement, ou avec une adresse `https://` en production. Dans **Plus → Installer l'application**, retrouvez les instructions adaptées à votre appareil.

- **Chrome / Edge sur ordinateur** : utilisez l'icône d'installation dans la barre d'adresse ou le menu du navigateur.
- **Android** : menu `⋮` puis **Installer l'application** ou **Ajouter à l'écran d'accueil**.
- **iPhone / iPad** : dans Safari, bouton **Partager** puis **Sur l'écran d'accueil**.

Après installation, l'application s'ouvre dans une fenêtre dédiée et fonctionne hors ligne grâce au service worker. Les données restent propres à ce navigateur et à cet appareil : exportez régulièrement une sauvegarde JSON avant de désinstaller ou de changer d'appareil.

Aucun compte, serveur externe ou appel réseau n'est nécessaire pour les fonctionnalités de culture : les données restent dans le `localStorage` du navigateur.

### Améliorations locales — phase stockage et outils

- Les photos sont compressées puis conservées dans IndexedDB (`tomato-journal-media-v1`). L'état JSON ne conserve que les métadonnées et l'identifiant média. Les photos existantes portant encore `dataUrl` sont migrées au premier lancement ; corbeille, restauration, import et export JSON les prennent en charge.
- Le panneau **Plus** affiche une estimation du stockage, le nombre de photos séparées et un avertissement en cas d'erreur ou de quota élevé. L'export JSON reconstitue les `dataUrl` uniquement dans le fichier de sauvegarde afin de ne pas perdre les images.
- La recherche globale de la barre supérieure couvre les plantes, les fiches catalogue, les candidates, les croisements, les tâches, les photos et les récoltes.
- Un export CSV des plantes et récoltes complète l'export JSON ; le même format peut être réimporté pour ajouter ou mettre à jour les plantes et récoltes, avec dédoublonnage des événements identiques. Un rappel indique la date relative du dernier export.
- `photo-storage.js` est le premier module ES isolé : il encapsule la persistance binaire IndexedDB sans dépendance externe. La table `actionDispatch` dans `app.js` constitue le point d'entrée du dispatch des actions UI pendant la poursuite du découpage.
- Le versionnage du cache PWA est automatisé : `npm run build:sw` calcule un hash des assets du shell et régénère `sw.js`. Le cache courant est `tomato-journal-shell-6f4c97731c2f`.
- L'audit de rendu a notamment sécurisé le contexte de zone de la topbar, les titres de page, les tâches et les résultats de recherche avec `escapeHTML()`.

### Améliorations produit — onboarding et suivi avancé

- **Première visite** : un parcours léger propose de conserver la démo ou de repartir avec un carnet vide, puis guide vers une zone, une plante et une première récolte.

![Première visite — onboarding](screen/onboarding-premiere-visite.png)
*Première visite : conserver la démo ou commencer avec un carnet vide.*

- **Actions groupées** : le bouton « Sélectionner » du Potager permet de sélectionner plusieurs plantes et d'appliquer un statut, une zone, l'archivage, la comparaison ou une suppression vers la corbeille avec double confirmation.
- **Inventaire de graines** : stocks restants, unités, achat/récolte, viabilité, emplacement, source, notes et candidate associée. Les candidates « à acheter » sans stock sont signalées.
- **Suivi sanitaire** : symptômes structurés, gravité, traitement, date, évolution, notes et photo locale associée. L'historique est modifiable, exporté pour l'IA et restaurable depuis la corbeille.
- **Comparaison et rappels** : tableau de comparaison entre plants avec poids, fruits, précocité et goût ; rappels calculés depuis la date de plantation et les jours de maturité de chaque fiche.
- **Budget enrichi** : coût par kilogramme, ventilation par zone, prix commercial de référence, économies/écart estimé et projection de la saison suivante. Les paramètres sont modifiables dans la fenêtre Budget.
- **Carte imprimable** : Plus → Carte imprimable affiche les zones et les plants, avec impression navigateur ou « Enregistrer au format PDF ».
- **Photos catalogue** : chaque fiche catalogue peut recevoir une photo de référence locale, stockée dans IndexedDB et incluse dans les sauvegardes JSON.
- Les nouveaux inventaires, observations, photos catalogue et liens de corbeille sont inclus dans l'export **Contexte pour une IA**.

---

<a id="english"></a>

## 🇬🇧 English

> 🇫🇷 Revenir au [français](#français)

A local, dependency-free web app for tracking a tomato growing season — from sowing to harvest, with no account and no server.

### Run locally

From this folder:

```bash
npm start
```

Then open [http://localhost:4173](http://localhost:4173).

Alternative if npm is not available:

```bash
python3 -m http.server 4173
```

### Features

- **Garden** (*Potager*): plants, zones, filters, and grid/list views.

![Garden — Bio-Orbital light theme](screen/potager-theme-clair.png)
*The Garden in the **Bio-Orbital** light theme: season stats, zone filters and plant cards.*

- Zone management: add, rename and delete a zone from the Garden or More screens.
- Destructive actions require double confirmation before deletion.
- Plant sheet: variety, characteristics, location and notes.
- Tasks and reminders: watering, fertilizing, staking, due date, recurrence, quantity/dosage and details.
- Photo journal: photos compressed and stored locally with a title, date and observation.
- Growing calendar: plantings, estimated maturity dates, tasks and harvest days.
- Detailed analysis: harvests, pacing, distributions, yields per zone and season-over-season comparison for the same spot. A yearly chart shows all twelve months with stacked bars per variety: the height represents the harvested weight and each segment reuses the color of the related plant sheet. Weights accept decimals in grams (e.g. 1200.5 g) and count toward every total and average.
- The detailed analysis also covers yields per plant and per zone, averages, the best day and the average taste rating. Long planning and budget windows stay scrollable on desktop and mobile.

![Detailed analysis — harvests per month and per variety](screen/analyse-detaillee-mois-varietes.png)
*Yearly chart: twelve months as stacked bars per variety — the height is the harvested weight and each segment reuses the color of the related plant sheet.*

![Detailed analysis — pace, distribution and records](screen/analyse-detaillee-rythme-repartition.png)
*Weekly harvest pace, distribution per variety, biggest fruits and harvest journal.*

- Taste notes: flavor, sweetness, acidity, texture, overall rating and comments.
- Seasons: yearly summary, review status (in progress, incomplete or closed) and highlights worth remembering.
- Qualitative review: taste, vigor, earliness, perceived quantity and a keep/reconsider/drop decision — no weighing required.

![Seasons and qualitative review](screen/saisons-bilan-qualitatif.png)
*The Seasons page: yearly summary, review status and the qualitative review, variety by variety.*

- Season comparison: yield, most productive varieties, zones, taste ratings and budget, year by year.
- Planning: selection for the next season and recommendations based on current performance.
- Candidates and purchases: a separate list for next season with statuses (candidate, to buy, bought, sown, planted, kept or dropped), priority, quantity and notes.
- Crosses and lines: female/male parents from the garden or the catalog, F1/F2/F3 generation, pollination and extraction dates, seed count, selected seedlings, target traits and stability. Each line can automatically feed the local catalog and the season candidates.
- Garden budget: expenses by category, variety and zone, with restore from the trash.
- Variety catalog: 130 sheets imported from `claud6 catalogue seed.html`, spread across 25 families with families, sub-families and botanical details preserved; search, filters, sheet viewing, adding new varieties and pre-filled add to garden. The "Add a plant" form also offers a catalog dropdown to fill the matching fields automatically.

![Variety catalog](screen/catalogue-varietes.png)
*The catalog: 130 sheets spread across 25 families, with search and type filters.*

- Trash: restore plants, zones, harvests, tasks, photos, tastings, expenses, season candidates, crosses and catalog sheets.
- Shareable summary: visual card, badges, garden score, records and a friendly challenge, with copy-to-text, native sharing and SVG card download.
- Visual themes: **Bio-Orbital** in light mode and **Night Garden HUD** in dark mode, with a quick toggle and a remembered preference.

![Garden — Night Garden HUD dark theme](screen/potager-theme-sombre.png)
*The same screen with the **Night Garden HUD** dark theme.*

- Fruit palette: pick 1 to 3 hues with instant preview, then choose **Solid color** or **Multicolor gradient**. In solid mode, several hues blend into one resulting color; in gradient mode they stay separately visible. The computed palette drives the side bands of plant and variety sheets, the markers and boxes on the Harvests page, as well as details and exports. Older data without `colorMode` remains compatible: a multi-hue palette is shown as a gradient by default.
- Data export: full JSON backup and a **Context for an AI** file in Markdown, structured JSON or plain text, covering the overview, zones, plants, harvests, tasks, tastings, photo journal, budget, qualitative reviews, crosses, candidates and season plans.
- Local browser storage with JSON export/import. The bundled catalog is included in backups and in the exported AI context.
- Demo data can be reset from the **More** screen.

### Install as an application (PWA)

Tomato Journal can be installed from Chrome, Edge or Safari. Open the app at `http://localhost:4173` in development, or at an `https://` address in production. In **More → Install the app**, you will find instructions tailored to your device.

- **Chrome / Edge on desktop**: use the install icon in the address bar or the browser menu.
- **Android**: menu `⋮` then **Install the app** or **Add to Home screen**.
- **iPhone / iPad**: in Safari, tap the **Share** button, then **Add to Home Screen**.

Once installed, the app opens in its own window and works offline thanks to the service worker. Data stays tied to this browser and device: export a JSON backup regularly before uninstalling or switching devices.

No account, external server or network call is required for the growing features: everything stays in the browser's `localStorage`.

### Local improvements — storage and tooling phase

- Photos are compressed, then kept in IndexedDB (`tomato-journal-media-v1`). The JSON state only keeps metadata and the media id. Existing photos still carrying a `dataUrl` are migrated on first launch; trash, restore, import and JSON export all handle them.
- The **More** panel shows a storage estimate, the separate photo count, and a warning on errors or high quota. JSON export rebuilds `dataUrl` values only inside the backup file, so images are never lost.
- The global search in the top bar covers plants, catalog sheets, candidates, crosses, tasks, photos and harvests.
- A CSV export of plants and harvests complements the JSON export; the same format can be re-imported to add or update plants and harvests, with deduplication of identical events. A reminder shows the relative date of the last export.
- `photo-storage.js` is the first isolated ES module: it wraps IndexedDB binary persistence with no external dependency. The `actionDispatch` table in `app.js` is the entry point for UI action dispatch while the code split continues.
- PWA cache versioning is automated: `npm run build:sw` hashes the shell assets and regenerates `sw.js`. The current cache is `tomato-journal-shell-6f4c97731c2f`.
- The rendering audit hardened the zone context of the top bar, page titles, tasks and search results with `escapeHTML()`.

### Product improvements — onboarding and advanced tracking

- **First visit**: a lightweight onboarding offers to keep the demo data or start with an empty journal, then guides you toward a zone, a plant and a first harvest.

![First visit — onboarding](screen/onboarding-premiere-visite.png)
*First visit: keep the demo data or start with an empty journal.*

- **Bulk actions**: the "Select" button in the Garden lets you pick several plants and apply a status, a zone, archiving, comparison, or a deletion to the trash with double confirmation.
- **Seed inventory**: remaining stock, units, purchase/harvest, viability, location, source, notes and the linked candidate. "To buy" candidates without stock are flagged.
- **Plant health tracking**: structured symptoms, severity, treatment, date, evolution, notes and an attached local photo. The history is editable, exported for AI and restorable from the trash.
- **Comparison and reminders**: a side-by-side table across plants with weight, fruit count, earliness and taste; reminders computed from the planting date and each sheet's days to maturity.
- **Enriched budget**: cost per kilogram, breakdown per zone, reference retail price, estimated savings/gap and next-season projection. Parameters are editable in the Budget window.
- **Printable map**: More → Printable map shows zones and plants, with browser printing or "Save as PDF".
- **Catalog photos**: every catalog sheet can carry a local reference photo, stored in IndexedDB and included in JSON backups.
- The new inventories, observations, catalog photos and trash links are included in the **Context for an AI** export.
