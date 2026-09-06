# Tomato Journal

Une application web locale, sans dépendance, pour suivre une saison de culture de tomates.

## Lancer en local

Depuis ce dossier :

```bash
npm start
```

Puis ouvrir [http://localhost:4173](http://localhost:4173).

Alternative si npm n'est pas disponible :

```bash
python3 -m http.server 4173
```

## Fonctionnalités

- Potager : plantes, zones, filtres et affichage grille/liste.
- Gestion des zones : ajout, renommage et suppression d'une zone depuis Potager ou Plus.
- Les actions destructives demandent une double confirmation avant suppression.
- Fiche plante : variété, caractéristiques, emplacement et notes.
- Tâches et rappels : arrosage, fertilisation, tuteurage, échéance, répétition, quantité/dosage et détails.
- Journal photo : photos compressées et conservées localement avec titre, date et observation.
- Calendrier de culture : plantations, maturités estimées, tâches et jours de récolte.
- Analyse détaillée : récoltes, rythmes, répartitions, rendements par zone et comparaison des saisons au même endroit. Un graphique annuel affiche les douze mois avec des barres empilées par variété : la hauteur représente le poids récolté et chaque segment reprend la couleur de la fiche concernée. Les poids acceptent les décimales en grammes (par exemple 1 200,5 g) et restent pris en compte dans tous les totaux et moyennes.
- L’analyse détaillée comprend aussi les rendements par plant et par zone, les moyennes, la meilleure journée et la note gustative moyenne. Les fenêtres longues de planification et de budget restent défilables sur ordinateur comme sur mobile.
- Notes gustatives : saveur, sucrosité, acidité, texture, note globale et commentaires.
- Saisons : résumé annuel, état du bilan (en cours, incomplet ou clôturé) et moments à retenir.
- Bilan qualitatif : goût, vigueur, précocité, quantité perçue et décision à retenir/revoir/écarter, sans pesée obligatoire.
- Comparaison de saisons : rendement, variétés productives, zones, notes gustatives et budget année par année.
- Planification : sélection pour la prochaine saison et recommandations basées sur les performances actuelles.
- Candidats et achats : liste séparée pour la saison suivante avec statuts candidate, à acheter, achetée, semée, plantée, retenue ou écartée, priorité, quantité et notes.
- Croisements et lignées : parents femelle/mâle issus du potager ou du catalogue, génération F1/F2/F3, dates de pollinisation et d’extraction, quantité de graines, plants sélectionnés, caractères recherchés et stabilité. Chaque lignée peut alimenter automatiquement le catalogue local et les candidats de saison.
- Budget du potager : dépenses par catégorie, variété et zone, avec restauration depuis la corbeille.
- Catalogue de variétés : 130 fiches importées depuis `claud6 catalogue seed.html`, réparties dans 25 familles, avec familles, sous-familles et détails botaniques conservés ; recherche, filtres, consultation de fiche, ajout de nouvelles variétés et ajout prérempli au potager. Le formulaire « Ajouter une plante » propose aussi un menu déroulant du catalogue pour remplir automatiquement les champs correspondants.
- Corbeille : restauration des plantes, zones, récoltes, tâches, photos, dégustations, dépenses, candidats de saison, croisements et fiches de catalogue.
- Bilan partageable : carte visuelle, badges, indice potager, records et défi amical, avec copie du texte, partage natif et téléchargement de la carte SVG.
- Thèmes visuels : **Bio-Orbital** en mode clair et **Night Garden HUD** en mode sombre, avec bascule rapide et préférence mémorisée.
- Palette des fruits : sélection de 1 à 3 teintes, prévisualisation immédiate, choix **Couleur unie** ou **Dégradé multicolore**. En mode uni, plusieurs teintes sont mélangées en une couleur résultante ; en mode dégradé, elles restent visibles séparément. La palette calculée alimente les bandes latérales des fiches plantes et variétés, les repères et encadrés de la page Récoltes, ainsi que les détails et les exports. Les anciennes données sans `colorMode` restent compatibles : une palette multiple est affichée en dégradé par défaut.
- Export de données : sauvegarde JSON complète et fichier **Contexte pour une IA** en Markdown, JSON structuré ou texte brut, avec vue d'ensemble, zones, plantes, récoltes, tâches, dégustations, journal photo, budget, bilans qualitatifs, croisements, candidats et plans de saison.
- Sauvegarde locale dans le navigateur, export/import JSON. Le catalogue fourni est inclus dans les sauvegardes et dans le contexte exporté pour une IA.
- Les données de démonstration peuvent être réinitialisées dans **Plus**.

## Installer comme une application (PWA)

Tomato Journal peut être installé depuis Chrome, Edge ou Safari. Ouvrez l'application avec `http://localhost:4173` en développement, ou avec une adresse `https://` en production. Dans **Plus → Installer l'application**, retrouvez les instructions adaptées à votre appareil.

- **Chrome / Edge sur ordinateur** : utilisez l'icône d'installation dans la barre d'adresse ou le menu du navigateur.
- **Android** : menu `⋮` puis **Installer l'application** ou **Ajouter à l'écran d'accueil**.
- **iPhone / iPad** : dans Safari, bouton **Partager** puis **Sur l'écran d'accueil**.

Après installation, l'application s'ouvre dans une fenêtre dédiée et fonctionne hors ligne grâce au service worker. Les données restent propres à ce navigateur et à cet appareil : exportez régulièrement une sauvegarde JSON avant de désinstaller ou de changer d'appareil.

Aucun compte, serveur externe ou appel réseau n'est nécessaire pour les fonctionnalités de culture : les données restent dans le `localStorage` du navigateur.

## Améliorations locales — phase stockage et outils

- Les photos sont compressées puis conservées dans IndexedDB (`tomato-journal-media-v1`). L'état JSON ne conserve que les métadonnées et l'identifiant média. Les photos existantes portant encore `dataUrl` sont migrées au premier lancement ; corbeille, restauration, import et export JSON les prennent en charge.
- Le panneau **Plus** affiche une estimation du stockage, le nombre de photos séparées et un avertissement en cas d'erreur ou de quota élevé. L'export JSON reconstitue les `dataUrl` uniquement dans le fichier de sauvegarde afin de ne pas perdre les images.
- La recherche globale de la barre supérieure couvre les plantes, les fiches catalogue, les candidates, les croisements, les tâches, les photos et les récoltes.
- Un export CSV des plantes et récoltes complète l'export JSON ; le même format peut être réimporté pour ajouter ou mettre à jour les plantes et récoltes, avec dédoublonnage des événements identiques. Un rappel indique la date relative du dernier export.
- `photo-storage.js` est le premier module ES isolé : il encapsule la persistance binaire IndexedDB sans dépendance externe. La table `actionDispatch` dans `app.js` constitue le point d'entrée du dispatch des actions UI pendant la poursuite du découpage.
- Le versionnage du cache PWA est automatisé : `npm run build:sw` calcule un hash des assets du shell et régénère `sw.js`. Le cache courant est `tomato-journal-shell-6f4c97731c2f`.
- L'audit de rendu a notamment sécurisé le contexte de zone de la topbar, les titres de page, les tâches et les résultats de recherche avec `escapeHTML()`.

## Améliorations produit — onboarding et suivi avancé

- **Première visite** : un parcours léger propose de conserver la démo ou de repartir avec un carnet vide, puis guide vers une zone, une plante et une première récolte.
- **Actions groupées** : le bouton « Sélectionner » du Potager permet de sélectionner plusieurs plantes et d'appliquer un statut, une zone, l'archivage, la comparaison ou une suppression vers la corbeille avec double confirmation.
- **Inventaire de graines** : stocks restants, unités, achat/récolte, viabilité, emplacement, source, notes et candidate associée. Les candidates « à acheter » sans stock sont signalées.
- **Suivi sanitaire** : symptômes structurés, gravité, traitement, date, évolution, notes et photo locale associée. L'historique est modifiable, exporté pour l'IA et restaurable depuis la corbeille.
- **Comparaison et rappels** : tableau de comparaison entre plants avec poids, fruits, précocité et goût ; rappels calculés depuis la date de plantation et les jours de maturité de chaque fiche.
- **Budget enrichi** : coût par kilogramme, ventilation par zone, prix commercial de référence, économies/écart estimé et projection de la saison suivante. Les paramètres sont modifiables dans la fenêtre Budget.
- **Carte imprimable** : Plus → Carte imprimable affiche les zones et les plants, avec impression navigateur ou « Enregistrer au format PDF ».
- **Photos catalogue** : chaque fiche catalogue peut recevoir une photo de référence locale, stockée dans IndexedDB et incluse dans les sauvegardes JSON.
- Les nouveaux inventaires, observations, photos catalogue et liens de corbeille sont inclus dans l'export **Contexte pour une IA**.
