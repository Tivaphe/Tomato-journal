# Enrichissement 2026 — suivi des vagues

Ajout de variétés au catalogue de référence depuis quatre catalogues en ligne, sans doublon.
Mécanique : chaque source = un dossier `data/enrichissement-2026/<source>/` avec `manifest.json`,
`listing.tsv` (page<TAB>slug<TAB>nom), `profiles.json` (détails par slug), `identity-decisions.json`.
Puis : `node scripts/build-catalog-enrich.mjs` (reconstruit `src/seed-catalog.js`), `node scripts/build-catalog-report.mjs`
(régénère `docs/verification-catalogue.md`), `node --test`.

Règles communes (validées par l'utilisateur le 7 septembre 2026) :
- Objectif : volume maximal (« automatiser sur les 4 sites »), en vagues successives (contrainte technique :
  les contenus doivent transiter par les outils de lecture web ; chaque vague est persistée avant la suivante).
- Priorité utilisateur (dernier message) : **Cultive ta rue et Meraki Seeds = sources les plus importantes** ;
  **Tomatofifou n'est pas une obligation** (beaucoup de doublons attendus avec les autres sources) → à ne
  traiter qu'en dernier et seulement sur demande. RareSeeds reste en cours d'enrichissement en parallèle.
- Description = informations du site d'origine, reformulées en français, sources citées (pas de recherche
  web individuelle systématique ; pas d'invention : « non documenté » si absent).
- Champ `gènes_potentiels` : toujours vide. Aucun doublon (dédup par nom normalisé + alias ; rattachement
  des noms de semencier aux fiches existantes via `identity-decisions.json` → la fiche existante gagne un
  alias + une sourceRef, sans réécriture de ses champs).

## Accès techniques par source (mesurés le 07/09/2026)
- **rareseeds.com** (Baker Creek) — Magento, pas d'API publique. Catégorie tomates = liste alphabétique
  continue chargée par « Load Next Page » (l'URL ne change pas). Les pages de catégorie sont très
  bruitées (19 morceaux, ~2 produits/morceau avec alt d'images). Les pages produit = 7 morceaux,
  description complète dans le morceau index 4 (SKU, prix, description, attributs, guides). SKU = TM…/TS…/TP… .
- **cultivetarue.fr** — Shopify. API `/collections/tomate/products.json?limit=250&page=N` publique mais
  volumineuse (le paramètre fields= est ignoré : body_html, images et variantes inclus, ~59 morceaux par
  page de 250). 2 866 résultats. Descriptions en français, courtes.
- **merakiseeds.com** — nopCommerce. **La liste de catégorie contient la description complète inline**
  (~12-14 produits/morceau à pagesize=100, 9 morceaux/page). Pagination `?pagesize=100&pagenumber=N` :
  **17 pages pour la racine Tomatoes (1659 produits)**, tri alphabétique A→Z par défaut.
  Sous-catégories : determinate-tomato-seeds (Low Growing, 549) / indeterminate-tomato-seeds (High
  Growing, 888) / other-tomatoes-seeds (Other, 270) ; New for 2026 (233). Filtres par type de plante
  (Cascading, Micro Dwarf, Mini Dwarf & Bush, Bush, Dwarf, Indeterminate Vining) disponibles en pied de page.
- **tomatofifou.com** — WooCommerce. API REST en 401 (réservée aux membres) ; pages publiques en HTML
  (`/en/produit/<slug>/`), liste paginée 15/page avec extrait court. 2 973 résultats.

## Avancement — RareSeeds (vague en cours, arrière-plan)
Énumération page 1 partielle (A-Grappoli → Brandywine Sudduth's Strain), 21 références listées dans
`listing.tsv`. Dédup effectué contre le catalogue :
**12 nouvelles** : A Grappoli D'Inverno, Abe Lincoln Original, Aichi First, Alice's Dream,
Ananas Noire or Black Pineapple, Apricot Zebra, Berkeley Tie-Dye Green, Berkeley Tie-Dye Pink,
Big Rainbow, Blue Cream Berries, Blush Tiger, Brad's Atomic Grape.
Déjà présentes (9) : Amish Paste, Aunt Ruby's German Green, Auriga, Barry's Crazy Cherry, Black Beauty,
Black Cherry, Black from Tula, Bonny Best, Brandywine Sudduth's Strain.

**Profil écrit : 1/12** (`tomato-a-grappoli-d-inverno`). **Restent à documenter (11)** : lire page produit
(morceau 4), compléter `profiles.json`, puis poursuivre l'énumération B–Z (morceaux 4-18, « Load Next Page »).
NB : les croisements avec Meraki seront rattachés automatiquement par alias (ex. Atomic Grape ↔ Brad's
Atomic Grape, Apricot Zebra) — vérifier la dédup lors de l'écriture des profils RareSeeds.
- **Page 1 soldée (07/09/2026).** Les 11 « nouvelles » restantes ont été vérifiées une à une (pages
  produit, morceau 4) : une seule était réellement nouvelle. **Aichi First** (nouvelle fiche,
  `tomato-seeds-aichi-first`, statut partial : heirloom japonais de Toyohashi 1938 issu de la lignée
  Ponderosa, fruits rose-rouge à pointe, 80-90 jours, hauteur non documentée ; sources Baker Creek +
  Verdantly + Tomato Revolution). Les 10 autres sont rattachées par décisions explicites :
  Abe Lincoln Original → Abraham Lincoln (catalog-ref-P6200, Baker Creek cite Buckbee 1923),
  Ananas Noire or Black Pineapple → Ananas Noir (catalog-ref-P7444, Pascal Moreau des deux côtés),
  Big Rainbow / Blue Cream Berries / Blush Tiger → fiches Meraki (descriptions concordantes :
  SSE 85 j, Wild Boar Farms, Artisan Seeds 75 j), Alice's Dream / Apricot Zebra / Brad's Atomic
  Grape / Berkeley Tie-Dye Green / Berkeley Tie-Dye Pink → fiches Meraki (alias exacts).
  Les 9 « déjà présentes » sont rattachées par décisions explicites (catalog-025/051/061/077/098/137/154,
  catalog-ref-P6500/L0097). Au passage : fiche A Grappoli D'Inverno passée en `conflicting` (le lot
  Meraki Grappoli d'Invierno, semi-déterminé annoncé mais spécifié « Indeterminate », est cité en
  note + source, avec alias) et raison du rattachement Meraki enrichie.
  → **Page 1 : 21 listées, 2 ajoutées, 19 rattachées, pending 0. Catalogue : 1 972 fiches.**
  Reste : poursuivre l'énumération B–Z (morceaux 4-18, « Load Next Page »).

## Avancement — Meraki (vague prioritaire 1/2 : racine tomatoes)
- **Page 1 (A, 100 références) : terminée.** `listing.tsv` = 100 lignes ; relecture complète des morceaux
  0→7 effectuée pour vérifier noms/slugs/descriptions. `identity-decisions.json` : **11 rattachements**
  à des fiches existantes (1884, Absinthe, Adelaide Festival, Ailsa Craig, Alki Blue Blood, Amana Orange,
  Ananas, Ananas Noir, Anna Russian, Auriga, Aunt Ruby's German Green) — alias + sourceRef ajoutés.
  `profiles.json` : **89 nouvelles fiches** (reformulations françaises vérifiées morceau par morceau ;
  vocabulaire croissance corrigé d'après le générateur : M = micro-naine, W* = dwarf, S = semi-déterminée,
  B = bush, U = non documentée).
  → **Catalogue : 527 fiches** (438 + 89 Meraki), tests 23/23, rapport 924 références.
- **Page 2 (Aurora Blue → Blue Canary, 100 références) : terminée.** 15 rattachements (Barry's Crazy
  Cherry, Banana Legs, Bear Claw, Beauté Blanche → White Beauty, Black and Brown Boar, Black Beauty,
  Black Cherry, Black From Tula, Black Icicle, Black Krim, Black Plum, Black Prince, Black Sea Man,
  Black Shadow, Blonde Boar) + **85 nouvelles fiches** (profils vérifiés morceaux 0→7).
  → **Catalogue : 612 fiches** (527 + 85), tests 23/23, rapport 1 009 références.
- **Page 3 (Blue Candles → Cereshenka, 100 références) : terminée.** 17 rattachements (Bonny Best,
  Boxer Rebellion, BrandyFred, Brandywine, Brandywine Black, Brandywine OTV, Brandywine Pink,
  Red Brandywine, Yellow Brandywine, Brin de Muguet, Burbank, Burracker's Favorite, Dwarf Caitydid,
  Canestrino di Lucca, Carbon, Caro Rich, Bosque Blue) + **83 nouvelles fiches** (profils vérifiés
  morceaux 0→7). Pièges d'identité écartés : Blue Green Zebra ≠ Blue Zebra ; Blue Streaks (RareSeeds)
  ≠ Blue Streak (Meraki) ; Brandywine Pink Joyce's Strain conservée distincte de Brandywine Pink.
  → **Catalogue : 695 fiches** (612 + 83), tests 23/23, rapport 1 092 références.
- **Page 4 (Cerise Champagne → Csikos Botermo, 100 références) : terminée.** 8 rattachements
  (Cherokee Green, Cherokee Purple, Chestnut Chocolate, Chocolate Lightning, Copia,
  Costoluto Fiorentino, Cream Sausage, Corbarino → A Grappoli Corbarino Round) + **92 nouvelles
  fiches** (profils vérifiés morceaux 0→7). Attention : Cherokee Purple Cherry et Cherokee Purple
  Heart conservées distinctes de Cherokee Purple ; « Crazy Calliope Dark » = mutation 2025 de
  Crazy Calliope (2 fiches) ; souches F2/F3 Pick-&-Joy signalées.
  → **Catalogue : 787 fiches** (695 + 92), tests 23/23, rapport 1 184 références.
- **Page 5 (Cuban Like Pepper → Enchanting Cascade, 100 références) : terminée.** 8 rattachements
  (Dark Galaxy, Dark Queen, Delicious → Delicious de Burpee, Dorothy's Green, Emerald Apple,
  Emerald Evergreen → Evergreen, Dwarf Emerald Giant, Elberta Peach) + **92 nouvelles fiches**.
  Pièges écartés : Solar Flare ≠ Dark Solar Flare ; De Barao Jaune déjà au catalogue mais pas les
  De Barao Black/Pink/Red (3 nouvelles) ; souches signalées (Damascus Steel supposée naine mais
  indéterminée, Deaton's Dwarf – NOT, Dwarf Multiflora non multiflore, Elf Tears White vs Elf Tears).
  → **Catalogue : 879 fiches** (787 + 92), tests 23/23, rapport 1 278 références.
- **Page 6 (E-Obsidian → Gobstopper, 100 références) : terminée.** 4 rattachements (Esmeralda Golosina,
  Fat Frog, Florida Petite, Glacier) + **96 nouvelles fiches**. Pièges écartés : Eros Orange conservée
  distincte de la « Eros » d'un autre catalogue (note d'identité) ; Florentine Beauty NOT = sélection
  rouge reçue sous le nom 'Florentine Beauty' (jaune) ; Gelbes Trier présentée « buissonnante » mais
  indéterminée (statut identity) ; couleurs non précisées par le semencier signalées en note
  (Furry Bumblebee, Ginestar).
  → **Catalogue : 975 fiches** (879 + 96), tests 23/23, rapport 1 374 références.
- **Page 7 (Gogoshary Polosaty → Hazy's Dream, 100 références) : terminée.** 12 rattachements
  (Gold Dust, Golden Jubilee, Golden Sunray, Grappoli d'Invierno → A Grappoli D'Inverno,
  Green Bell Pepper, Green Brandy, Green Moldovan → Moldovan Green, Green Sleeves → Green Sausage,
  Groovy Tunes, Halfmoon China, Hawaiian Pineapple, Great White → Grosse Blanche) + **88 nouvelles
  fiches**. Pièges écartés : alias « Black Pear »/« Pink Pear » supprimés (noms déjà portés par
  d'autres fiches du catalogue, calibres divergents) pour préserver l'unicité des identités ;
  Grappoli (sans d'Inverno) conservée distincte malgré la suspicion du semencier (statut identity) ;
  Golden Dwarf Champion NOT (orange au lieu de jaune citron), Great Scott NOT (aplatie au lieu de
  cœur), Green Krim Cherry (mutation instable de Black Krim Cherry) signalées.
  → **Catalogue : 1 063 fiches** (975 + 88), tests 23/23, rapport 1 463 références.
- **Page 8 (Health Kick → Kartofelny Malinovyi, 100 références) : terminée.** 6 rattachements
  (Hillbilly, Indigo Apple, Japanese Trifele Black → Japanese Black Trifele, Jochalos,
  Kaleidoscopic Jewel, Kangaroo Paw Green) + **94 nouvelles fiches** (65 p8a + 29 p8b).
  Pièges écartés : Jaune Flamme conservée distincte de « Jaune Flammée » (déjà au catalogue,
  petits fruits de 40 à 60 g — note sur la fiche) ; Japanese Mini Dwarf distincte de Japanese Black
  Trifele et des Cœur de Bœuf Japonais ; Jantar (couleur non documentée par le semencier,
  « ambre » en polonais) distincte de 'Yantarniy' ; « Pink Potato » déclaré en alias de
  Kartofelny Malinovyi sans collision ; Kangaroo Paw Red/Yellow/Brown en nouvelles fiches (seule
  Green existait) ; série « Karma Project » (Apricot, Miracle, Peach, Pink, Purple,
  Purple Multiflora) transcrite en 6 fiches ; 1 er produit « type coulis » Health Kick, séries Yoder
  (Duran Duran, The Cure, Depeche Mode, Beastie Boys) étendues.
  → **Catalogue : 1 157 fiches** (1 063 + 94), tests 23/23, rapport 1 557 références ;
  compteurs : profiles 719, existing 70, listing 800 (8 pages × 100).
- **Héritage page 1 à solder (11 fiches « pending », ni profil ni décision)** : 1884 Beefsteak,
  Absinthe, Adelaide Festival, Ailsa Craig, Alki Blue Blood, Amana Orange, Ananas, Ananas Noir,
  Anna Russian, Aunt Ruby's German Green, Auriga — rattacher aux fiches existantes si noms
  identiques, sinon rédiger les profils. À traiter dans une passe dédiée (les décisions se font
  depuis les chunks de la page 1).
- **Page 9 (Katja Bush → Lufichoise Cherry, 100 références) : terminée.** 7 rattachements
  (Kootenai → Kootenai Mini Dwarf, Koralik, Legend, Lime Green Salad → Lime Green, Loxton Lass,
  Lucid Gem, Köning Humbert Longkeeper → Roi Humbert 1884) + **93 nouvelles fiches** (62 p9a +
  31 p9b). Pièges écartés : Köning Humbert = Re Umberto / King Humbert / Roi Humbert (Burpee 1884,
  vignette Meraki « Roi Humbert 1884 ») rattaché sans confondre avec le « longkeeper » générique
  (croisement type Moneymaker, conservation 6-7 mois, resté en fiche distincte, comme Lolek et
  Long Store) ; « LimeLight Mini Dwarf » = Lucid Gem (Brad Gates / Wild Boar Farms, jamais de
  « LimeLight » distinct) ; Lemon Plum en fiche distincte de Wonderlight/Plum Lemon (nom inversé
  signalé en note) ; famille DTP étendue — Loxton Lad (famille Rosy, frère de Loxton Lass),
  Lucky Swirl (d'abord « Jaunty », Ray South), Kookaburra Cackle → Sleepy, Kelly Green → Sneezy,
  Kodiak King → Grizzly, Kip's Stripes (Tiger Tom × Dwarf Mr. Snow, chat Maine Coon de Craig
  LeHoullier), Lemon Ice → Nosey, Laura's Bounty → Leggy ; Kozula # → Anna Jankowska (Pologne) ;
  Lille Lise = sachet bonus non vendu (note en fiche, fiche conservée) ; Loaghtan Woolies /
  « NOT » (non laineuse, côtelée) en 2 fiches liées par note ; Jantar URL réelle sans « o » final.
  → **Catalogue : 1 250 fiches** (1 157 + 93), tests 23/23, rapport 1 650 références ;
  compteurs : profiles 812, existing 77, listing 900 (9 pages × 100).
- **Héritage page 1 à solder (11 fiches « pending », ni profil ni décision)** : 1884 Beefsteak,
  Absinthe, Adelaide Festival, Ailsa Craig, Alki Blue Blood, Amana Orange, Ananas, Ananas Noir,
  Anna Russian, Aunt Ruby's German Green, Auriga — rattacher aux fiches existantes si noms
  identiques, sinon rédiger les profils. À traiter dans une passe dédiée (les décisions se font
  depuis les chunks de la page 1).
- **Page 10 (Lukoshko on the Window → Mini Amish Paste, 100 références) : terminée.** 3 rattachements
  (Maskotka, Manitoba, Matina — noms identiques déjà au catalogue) + **97 nouvelles fiches** (49 p10a +
  48 p10b). Séries/groupes transcrits : Märchen-Série du Kleverhof (12 variétés, Elf → Zauber), Micro*
  (Micro Cherry cascade, Gemma, Mars, Purple, Sun, Tina, Tom Gold, Microbel, Microwein — Micro Gemma/
  Tina développées pour la Station spatiale), 10 sélections de la maison Meraki Seeds (Green Boy ex
  « Purple Boy Green », Ivory Beef ex « Dirty Curty », Mini Grub ex « Grubs Mystery Green », Ochre
  Square ex « Harvard Square », Pink Paste ex « Sinister Minister », Pretty Queen ex « Dark Queen »,
  Red Heart Cherry F1 ex « Terracotta Cherry », Saboteur ex « Sabotage » de Bill Yoder, Shimmering Gem
  ex « Idaho Gem » DTP, Striped Zula ex « Kozula 139 »), longkeepers espagnols (Mala Cara, Mallorquí
  Vilanova B, Mallorquìn, Mas Calceran, Mateta), famille Mikado (Black/Red/Violettor/White — Red =
  Peter Henderson 1886, premier feuillage pomme de terre en catalogue), DTP (Mahogany, Mallee Rose,
  Maralinga + NOT, Mandurang Moon, Mary's Cherry, Maura's Cardinal, Melanie's Ballet, Metallica,
  Mignonne), Bill Yoder (Lullaby « The Cure », Master « Depeche Mode »), Karen Olivier (Midnight Sun,
  projet True North). Pièges : Marmande VR/Verte/Blue en fiches distinctes de la Marmande classique ;
  Mini Amish distincte d'Amish Paste ; Micro Purple « possible Tartufo » signalé ; 6e produit « NOT »
  (Maralinga NOT, note). Footer p10 « 8 9 10 11 12 … Last → 17 » : **17 pages confirmées**.
  → **Catalogue : 1 347 fiches** (1 250 + 97), tests 23/23, rapport 1 761 références ;
  compteurs : profiles 909, existing 80, listing 1 000 (10 pages × 100).
- **Page 11 (Mini Green Zebra → Oriole DTP, 100 références) : terminée.** 12 rattachements
  (Moskvich, Mountain Gold, Opalka, Orange Queen, Moonglow, Orange Banana, Orange Strawberry,
  Orange Crimea, Mohamed, Mint Julep → Michael Pollan, Mr. Snow → Dwarf Mr. Snow, Noire
  Charbonneuse → Charbonneuse) + **88 nouvelles fiches** (44 p11a + 44 p11b). Groupes transcrits :
  section N (napa Rosé/Chardonnay Blush de Wild Boar Farms, longkeepers italiens/espagnols —
  Napoletana Galatino, Nariz de Bruja, Montgrì, Montmelo —, Bill Yoder « Depeche Mode »/
  « Duran Duran » : Never Let Me Down, New Moon on Monday, Notorious), DTP (Mint Streak « Kiwi »,
  Moby's Cherry « Reddy », Mochas Cherry « Anthy », Moliagul Moon/Marong « Snowy », Mystic Lady/
  Maura's Cardinal « Dainty », Noah's Stripes « Beauty », Numbat « Quirky », Orange Cream
  « Tipsy » — dwarf indéterminé type arbre, Oriole « Fancy »), Orange Keyes #1/#2/#3 de Dean Slater
  (2025, formes Oval/Pointy/Ribbed), Karen Olivier (Nightingale, One Trick Pony), séries micro
  (Orange Hat/Dream/Russian/Mini Marzano, Minibel, Mohamed, Nepas 11, Nina Neutron). Pièges :
  Orange Bourgoin NOT en fiche distincte (feuillage pomme de terre) de l'Orange Bourgois existante ;
  Mystery Tomato distincte de Grub's Mystery Green ; « Nepas 11 » écrit en titre mais URL nepas-ii ;
  URL sans « o » final pour Orange Fleshed Purple Smudge (-tomat) et « Orangutang » vs « Orangutan ».
  → **Catalogue : 1 435 fiches** (1 347 + 88), tests 23/23, rapport 1 852 références ;
  compteurs : profiles 997, existing 92, listing 1 100 (11 pages × 100).
- **Page 12 (Orions Belt Mini Dwarf → Potatoleaf Variegated Cherry, 100 références) : terminée.**
  11 rattachements (Pa's Pride → catalog-008, Perestroika → catalog-097, Paul Robeson →
  catalog-ref-P7315, Peach Blow Sutton → catalog-ref-P6265, Persimmon → catalog-ref-P6616,
  Polar Beauty → catalog-ref-P6147, Persuasion → catalog-ref-L0101, Pink Furry Boar →
  catalog-ref-L0111, Pineapple Pig → catalog-ref-L0110, Petit Ananas → catalog-ref-L0064,
  Oxheart Orange → catalog-ref-P6604 alias « Orange Oxheart ») + **89 nouvelles fiches**
  (42 p12a + 47 p12b). Groupes transcrits : DTP (Parfait « Fancy », Perfect Harmony « Harmony »,
  Perth Pride « Happy », Peppermint Stripes « Beauty », Phyl's Ivory Beauty, Pico's Pride « Acey »
  panaché, Pink Livija « Harmony », Pink Opal « Muddy », Pink Passion « Nosey »), Wild Boar Farms
  (Painted Lady panachée, Pink Boar, Pork Chop, Pink Sapphire), Karen Olivier « True North »
  (Polaris — série complète : Midnight Sun, Taiga, Tundra, True Colors), Blane Horton (Orions Belt,
  Pit Viper), Dean Slater (Pascal de Picardie, Pink Sapphire), Alaska John Holm (Polar Baby/Gem/Star),
  Bill Yoder (Planet Earth « Duran Duran »), longkeepers piennolo (Patanara AOP, Casas Barones,
  Piennolo Lungo, Pomodorino del Vesuvio, Pequeño del Ramallet, Ponderosa jaune ≠ Ponderosa rose,
  Peter the Durable, Pink Grapefruit), Keith Mueller (Potatoleaf Variegated ≠ Variegated catalog-031
  à fruits rouges). Pièges : Pera de Abrusso (description « Abruzzo ») ; Peach Blow Sutton Blue en
  fiche distincte (collet anthocyane) ; Pinocchio ORANGE sous URL pinocchio-tomato ; Pit Viper = dwarf
  déterminé ; Pipochka de Syzran sans couleur documentée ; Potatoleaf Variegated = fruits jaune doré.
  → **Catalogue : 1 524 fiches** (1 435 + 89), tests 23/23, rapport 1 941 références ;
  compteurs : profiles 1 086, existing 103, listing 1 200 (12 pages × 100).
- **Page 13 (Powers Heirloom → Russian Queen, 100 références) : terminée.** 8 rattachements
  (Primary Colors → catalog-ref-P6092, Purple Calabash → catalog-193, Purple Russian Plum →
  catalog-024, Red Zebra → catalog-ref-P7453, Re Umberto → catalog-100 (même variété que
  Roi Humbert/König Humbert, Burpee 1884), Roman Candle → catalog-ref-P6762, Rosella Crimson →
  catalog-072, Rosella Purple → catalog-067) + **92 nouvelles fiches** (46 p13a + 46 p13b).
  Groupes transcrits : Rebel Starfighter (série de Russ Crowe : Blane's Moonlight, Dippers Delight,
  Grandpa's Heart, Kayleigh Anne ×2, Marsha's ×2, Penny Lane, Prime ×2, VT16), Wild Boar Farms
  (Red Beauty, Red Striped Furry Hog), Reinhard Kraft (Goldkirsche, Green/Black/White Heart,
  Purple Sugar), Bill Yoder (Raspberry Beret), Karen Olivier (Ruby Slippers « Short and Sweet »),
  DTP (Purple Heart « Porky », Heartthrob « Hearty », Rosella Crimson/Purple « Sleepy », Round
  Robin « Kiwi », Kangaroo Paw — fin de série), longkeepers (Principe Borghese AOP, Regina, Punta,
  Rama de Mallorca, Ramallet Rodona, Risentraube NOT, Reverend Morrow's Long Keeper), Bunny Hop
  Seeds (Raindrop, Raspberry Mochi), Blane Horton (Rumpelstiltskin, Renegade, Reverend Michael
  Keyes), Little Birdy (Red Robin, Rosy Finch). Pièges : Professor Klapprott's Spitze = conserve
  longue RDA pointue 20-30 g ≠ Spitze roumaine (P7515) ; Purple Russian Plum sous URL
  purple-russian-plum-tomato ; Red Viper sous URL red-viper-dwarf-tomato ; Ruby Slippers sous URL
  ruby-slippers-dwarf-tomato ; Risentraube « NOT » (bout pointu) ≠ Risentraube classique ;
  Rosa de L'etern ≠ Rosa Plé ; Rev. Morrow ≠ Long Keeper générique (P6218) ; Roman Candle = jaune
  (sélection de Speckled Roman) ; Rosa Ple en sachet de 5 graines.
  → **Catalogue : 1 616 fiches** (1 524 + 92), tests 23/23, rapport 2 032 références ;
  compteurs : profiles 1 178, existing 111, listing 1 300 (13 pages × 100).
- **Page 14 (Russian Rose → St Jaume de Sesoliveres, 100 références) : terminée.** 9 rattachements
  (Saint Pierre → catalog-043, San Marzano → catalog-048 (Redorta reste distincte), Sart Roloise →
  catalog-ref-L0814, Schneewittchen → catalog-ref-P7521 alias « Schneewittchen » (Joe Bratka,
  Super Snow White), Shimofuri → catalog-017 (seule la souche « NOT » ronde est en fiche nouvelle),
  Sibirische Zimmertomate → catalog-002, Silvery Fir Tree → catalog-016, Sleeping Lady →
  catalog-ref-P6170, Speckled Roman → catalog-ref-P7491) + **91 nouvelles fiches** (46 p14a + 45
  p14b). Groupes transcrits : DTP (Russian Swirl « Dopey », Sarah's Red/Sneaky Sauce « Sneaky »,
  Sarandipity « Cheeky »/Black Zebra, Saucy Mary/Scarlet Heart, Sean's Yellow « Witty », Snakebite
  « Grizzly », Sonrojo Monster « Ivalde », Speckled Heart « Speckly », Sleeping Lady rattachée,
  Shimmering Beauty — Beauty King × Dwarf Wild Fred, 2025), Bill Yoder série « Depeche Mode »
  (Servant version jaune de Master, Shake the Disease), séries russes « sucre » (Sakhar Beliy,
  Sakharnyi Pudovichok/Slon, Sahar Zeljony), longkeepers catalans/majorquins (Secà, Solereta,
  Son Burges 1 an, Son Gil, St Jaume de Sesoliveres, Serendipity 7 mois, Sibirische Appeltomaat,
  Spugnillo dei Monti Lattari), penjar/ramallet, Tom Wagner (Shadow Boxing ×2, Spring Noire),
  Bunny Hop Seeds (Spunky Bird), Artisan/Fred Hempel (Spike), Shimofuri + NOT, Spanish Dancer +
  Round. Pièges : Shimofuri « NOT » ronde ≠ Shimofuri pointue (fiche 017) ; Sorbet de Citron ≠
  Garden Peach (celle-ci plus laineuse) ; Solguld ≠ Sungold ; Sinichka probablement = Titmouse ;
  URLs : sandy-stripes (sans -project), shimmering-beauty-dtp-…, seans-yellow-dwarf-DWARF-…,
  speckled-heart-…-tomato-TOMATO (redoublé), snegrijok vs Snegirjok, sprint-time vs Sprint Timer,
  siberian-tomato sans « bush », Schwartse Sarah = Joe Bratka (écrit « Batka ») ; White Icicle =
  Sosulka Belaya (distincte de Sosulka Chernaya) ; Spike en 5 graines ; Sons… (type penjar).
  → **Catalogue : 1 707 fiches** (1 616 + 91), tests 23/23, rapport 2 123 références ;
  compteurs : profiles 1 269, existing 120, listing 1 400 (14 pages × 100).
- **Page 15 (Starburst Nebula → Tiny Tim, 100 références) : terminée.** 10 rattachements
  (Striped Cavern → P7306, Stump of the World → P7190, Sub-Arctic Plenty → P6015, Summer Cider →
  L0589 (alias « Summer Cider »), Summertime Gold → catalog-069, Tangerine → P6758, Tasmanian
  Chocolate → catalog-071, Taxi → P6637 (Taxi = Taxi Yellow, mêmes textes commerciaux), Tiffen
  Mennonite → catalog-157, Tigerella → P7201) + **90 nouvelles fiches** (45 p15a + 45 p15b).
  Groupes transcrits : DTP « Summer » (Summer Sunrise, Summertime Gold/Green, Summer Sweet Gold,
  Sweet Sue — famille Sneezy GDC × Green Giant ; Sweet Scarlet « Tipsy » Elbe × GDC ; Sweet
  Adelaide « Happy » ; Sturt Desert Pea « Plentiful » ; Strawberry Lemonade/Sunny's Pear/Tanager
  « Fancy » ; Suz's Beauty « Beauty » ; Stony Brook ×2 « Worry » Speckled Roman × Wherokowhai ;
  Tennessee Suited Rosella Purple × PBTD ; TastyWine DWF × Brandywine ; Tiger Eye « Leggy »),
  Bill Yoder (Suffer Well, The Chauffeur — Depeche Mode/Duran Duran), Wild Boar Farms (Strawberry
  Leopard, Summer of Love, Sweet Tooth, Streak Lightning, Tim's Taste of Paradise ex « Fruity
  Mix » sauvée par Tien Chiu), Karen Olivier (Sweet Baby Jade « Short and Sweet », Taiga « True
  North »), série Stick (Brown/Red/Yellow, gène stick), Sweet & Neat (Red/Scarlet/Yellow), Tigret
  Red/Yellow chartreuse, Fred Hempel (Sunrise Jazz, Taste Patio), Reinhard Kraft (Sungold Select 2,
  sélection OP de Sungold F1), Bunny Hop Seeds (Superbunny), Millard Murdock (Sweet as Linda),
  multiflores (Stormin Norman « famille Keyes », Sweet Beverly/Sharon, Tempete de Sable). Pièges :
  Sun Baby ≠ micro « Baby » ; Sungold Select 2 ≠ Sungold F1 hybride ni Big Sungold Select ; Taiga =
  5e variété True North ; Sweet Sharon = mutation de Sweet Beverly ; Taiwan Teardrops ≈ Taiwan
  Goddess ; Summertime Gold ≠ Summer Sunrise/Summer Sweet Gold (fiches distinctes de la même
  famille) ; Super Choice/Super Nova distinctes ; Tiny Tiger ≠ « Tigret » ; sachets 5 graines :
  Stick Brown, Sunkissed Peach ; Tiffen Mennonite : le semencier décrit rouge brillant (la fiche
  existante dit rose).
  → **Catalogue : 1 797 fiches** (1 707 + 90), tests 23/23, rapport 2 213 références ;
  compteurs : profiles 1 359, existing 130, listing 1 500 (15 pages × 100).
- **Page 16 (Tiny Totem → Wolverine, 100 références) : terminée.** 8 rattachements (Titmouse →
  catalog-ref-meraki-sinichka (le semencier indique « Probably the same variety as Sinichka » ; синичка =
  « mésange », traduction de Titmouse), Tumbling Tom Red → catalog-056, Valencia → P6621, Violet Jasper →
  catalog-176, White Queen → catalog-128, White Tomesol → catalog-029 (URL « tomasol »), White Wonder →
  catalog-079, Wild Fred → catalog-074 (alias Wild Fred)) + **92 nouvelles fiches** (46 p16a + 46 p16b).
  Groupes transcrits : longkeepers catalans/espagnols (Tisica de Vilajuïga, Tomate de Colgar Domingo/
  générique/Mallorquin — 3 fiches distinctes des Mallorquí et Mallorquìn déjà au catalogue ; Tondo con
  Pizzo, Treccia Rossa, Vesuviano Giallo type piennolo, True Love « Vernaya Ljubov », Winter Wonder
  « Zimnye Chudo »), Karen Olivier « True North » (True Colors, Tundra — série complète : Midnight Sun,
  Taiga, Polaris), DTP (Uluru Ochre « Rosy », Velvet Night « Muddy », Vince's Haze « Hazy », Walters Fancy
  « Acey » panaché — 1re variété DTP panachée, Waratah « Plentiful », Waverley « Rosy », Wherokowhai
  « Dizzy » + NOT, Willa's Cariboo Rose et Wilpena « Sleepy », Wild Spudleaf), Vernissage ×5 (Ukraine),
  micro-nains et mini-dwarfs (Tiny Totem, Tom Thumb, Tomfall, Topless, Venus, Vilma, Visibly Invisibly,
  Utyonok « caneton », Window Box Red/Yellow, Window Dwarf), Tom Wagner (Verde Claro ex Raisin Vert,
  Wagner's Blue Green), Wild Boar Farms (Wine Jug), Blane Horton (Uptown Funk), Reinhard Kraft + Dean
  Slater (Wolverine), Joe Bratka (Velvet Red laineux), Bill Jeffers (Wild Thyme), tumbling (Jester,
  Tigress, Tom Yellow), laineux (Wapsipinicon Peach gagnante SSE 2006, Weissbehaarte). Pièges : Tumbling
  Jester ≈ Rambling Red Stripe mais conservé distinct (fruits plus bruns) ; Wagner's Blue Green ≠ Blue
  Green Woolly ni Blue Green Zebra ; White Zebra ≠ Red Zebra/Black Zebra Cherry ; Verde Claro ≠ Join or
  Die × Beyond Verde Claro ; Wherokowhai NOT = souche rouge issue de graines reçues comme 'Wherokowhai' ;
  True Black Brandywine ≠ Brandywine Black ; Tomate de Colgar Mallorquin ≠ Mallorquí (Vilanova B) ≠
  Mallorquìn (Solsona) ; sachets 5 graines : True Black Brandywine, Tundra, Walters Fancy ; slugs courts :
  utyonok-tomato, venus-tomato, vilma-tomato, window-box-yellow-tomato (sans micro-dwarf).
  → **Catalogue : 1 889 fiches** (1 797 + 92), tests 23/23, rapport 2 304 références ;
  compteurs : profiles 1 451, existing 138, listing 1 600 (16 pages × 100).
- **Page 17 (Wonder of the Earth Orange → Zyska Bush Tomato, 59 références) : terminée.**
  5 rattachements (Woolly Green Zebra → catalog-171, Yellow Furry Boar → catalog-ref-L0113 (forme jaune
  des Furry Boar), Yellow Pear → catalog-050 « Poire jaune (Yellow Pearshape) », Yellow Perfection →
  catalog-078, Zimmertomate Blau → catalog-004 « Blaue Zimmertomate ») + **54 nouvelles fiches**.
  Groupes transcrits : série Woolly de Tom Wagner (Blue Jay, Green Zebra rattachée, Kate/Kate Red/Kate
  Yellow, Zwerg), Wild Boar Farms (Yellow Furry Hog, Yellow Striped Boar), Bill Yoder (World in My Eyes
  « Depeche Mode »), Karen Olivier (Yellow Brick Road « Short and Sweet », thème Wizard of Oz), Bunny Hop
  Seeds (Yellow Budgie), série Little Birdy (Yellow Canary), multiflores (Yellow Centiflor, Zauberglöcken
  de Kleverhof, Zluta Kytice), Fred Hempel (Yellow Taste), DTP (Yukon Quest « Grumpy », Zoe's Sweet
  « Morty » chartreuse), russes (Yamal 200 registre d'État 2007, Yantarnyi, Wozd Krasnokozhik, Zagadka
  Prirody, Zdorovjak, Zolotoe Serdtse/Samorodok/Kupola, Zelenskij Prinz mutation GWR de Tschernij Prinz),
  Ukraine (Yellow Icicle, Zlatava), stuffing (Yellow Ruffled, Yellow Stuffer). Pièges : Zimmertomate Blau
  = Blaue Zimmertomate (catalog-004) ≠ Sibirische Zimmertomate (catalog-002) ; Zelenskij Prinz ≠ Black
  Prince (mutation GWR) ; Yellow Dragon ≠ Siberian Tiger (issue de sa lignée) ; Yellow Centiflor ≠
  Black/Orange Centiflor ; Yellow Furry Hog ≠ Red Striped Furry Hog ; Yellow Pigmy ≠ Pigmy rouge ;
  Yellow Delight ≠ Gardener's Delight (version jaune) ; Wonder of the Earth Orange ≠ White Wonder ;
  You Can't, You Won't and You Don't Stop (nom de chanson) ; Zauberglöcken sous slug ö (zaubergl%C3%B6cken).
  → **Catalogue : 1 943 fiches** (1 889 + 54), tests 23/23, rapport 2 357 références ;
  compteurs : profiles 1 505, existing 143, listing 1 659 = 17 pages × 100 + 59 → **racine terminée**.
- **Pending page 1 soldés (11)** : les rattachements de la page 1 (1884, Absinthe, Adelaide Festival,
  Ailsa Craig, Alki Blue Blood, Amana Orange, Ananas, Ananas Noir, Anna Russian, Aunt Ruby's German
  Green, Auriga) avaient été faits via la branche auto-« matched » du build (non persistante) : décisions
  absentes de `identity-decisions.json`. Les 11 décisions ont été réécrites avec les catalogId confirmés
  par les sourceRefs de page 1 déjà portées par les fiches → **pending 0** ; compteurs finaux racine :
  profiles 1 505, existing 154, listing 1 659.
- Après la racine : décider si les sous-catégories (Low 549 / High 888 / Other 270) apportent des produits
  hors racine (recouvrement probable → vérifier par comptage avant de lancer) ; puis « New for 2026 » (233)
  et « New for 2027 » (7) le cas échéant.

## Avancement — Cultive ta rue (vague prioritaire 2/2, lancée le 08/09/2026)
Énumération par pages collection HTML triées A-Z (`?sort_by=title-ascending`, 18 produits/page,
~160 pages pour 2 866). Méthode retenue : titres + slugs depuis la page de liste (1-2 morceaux),
puis **1 page produit HTML par variété** (`/products/<slug>`, 1 seul morceau) qui contient la
description FR **et** les attributs structurés (calibre, couleur, dwarf Oui/Non, forme, origine,
port, pot Oui/Non, précocité). Le JSON `/products/<slug>.js` est plus compact mais sans attributs ;
l'API `products.json?limit=250` est inexploitable via les outils web (~59 morceaux/page).
Conventions de transcription : port Indéterminé/Déterminé → I/D (croiser avec dwarf : Oui +
Déterminé → WD, Oui + Indéterminé → WI) ; couleur noire → brown, vert;bigarré/vert;strié → green
(+ mention en description), pourpre → purple ; forme renflée → variable par défaut (ajusté au cas
par cas, ex. Abe Hall difforme) ; calibre double (« Gros fruit;Fruit moyen ») transcrit en
fourchette ; GWR explicité ; synonymes cyrilliques conservés en alias (ex. Абаканский розовый).
**Ne pas utiliser d'autre date que 2026-09-07 dans les manifestes** (test 13 fige
`verification.checkedAt`).
- **Page 1 A-Z (0-33 → Abrikos, 18 références) : terminée.** 4 rattachements (Abraham Lincoln →
  catalog-ref-P6200 ; Abraca zebra → fiche Meraki Abracazebra, stries jaunes contre vert sombre ;
  AAA sweet solano → fiche Meraki, 120-150 g contre 50-100 g ; 42 days → fiche Meraki, origine
  Angleterre) + **14 nouvelles fiches** (0-33 Saraev, 1884 purple — mutation pourpre conservée
  distincte de la 1884 rose, 1999 Yoder naine, 646 Khilenko, 900 gramovyy iz minusinska, A.B. tiger
  orange/pilar, Abakanskiy rozovyi + alias cyrillique, Abano Piémont, Abbattista paste — slug à un
  seul « t », Abe Hall SSE 1997 — forme variable, Abraham brown Murdock PL, Abraham green GWR,
  Abrikos Lituanie « peau de pêche »).
  → **Catalogue : 1 986 fiches** (1 972 + 14), tests 23/23, rapport 2 448 références.
  Reste : pages 2 → ~160 (énumération + profils au fil des vagues).

## Tomatofifou — en attente
Non obligatoire ; à ne traiter que si l'utilisateur le redemande après CTR/Meraki/RareSeeds.

Après chaque vague : relancer enrich + report + tests ; tenir ce document à jour. Le report
synchronise aussi le compteur du README (12 mentions, motifs + test « readme catalog count ») :
ne jamais le mettre à jour à la main.

## Recoupement web multi-sources des fiches existantes (lancé le 08/09/2026)
Complément au contrôle documentaire : recherche web croisée pour vérifier et enrichir des fiches
**déjà présentes** (identifiées comme « sources divergentes », « souche à préciser » ou doublons
potentiels). Les fiches enrichies sont des fiches de base du catalogue (sans `importedFrom`) : la
modification se fait directement dans `src/seed-catalog.js`, puis `npm run build:audit` régénère
`docs/verification-catalogue.md`. Contraintes tests respectées : `checkedAt` reste 2026-09-07,
`subfamily` et `plantDefaults` inchangés (sauf Early Siberian → croissance déterminée alignée),
aucune URL nouvelle hors `verification.sources`, aucune fiche ajoutée/supprimée.
- **Lot 1 (15 fiches « sources divergentes » / identité) : terminé.** Koralik, Romovaya Babka,
  Variegated, Orange Crimea, "Spoon", Api Rouge, Mission Dike, Double Rich, Early Siberian /
  Sibirskiy Skorospelyi, Azoychka, Roma, Brandywine, Cœur de Bœuf de Nice, Woolly Green Zebra,
  Russian Cossack. Apports : généalogies et origines précisées (ex. Azoychka → V. P. Krouglova,
  nom « Azochka »/« Zolotoy Borago » ; Double Rich → 1953 A. Yeager Dakota du Nord × New Hampshire ;
  Early Siberian → station ouest-sibérienne, zonage 1959, déterminée ; Roma → USDA Beltsville ~1955 ;
  Russian Cossack → Tom Wagner, sélection de « Bearded Cossack » ; Brandywine → mention 1889
  Johnson & Stokes), port tranché où les sources concordent (Early Siberian déterminée), divergences
  restantes signalées sans certifier. Références ajoutées : Tatiana’s TOMATObase, Kokopelli,
  Reimer, Sand Hill Preservation, etc.
  → **Rapport : 1 986 fiches, 2 471 références (2 448 → 2 471), tests 30/30.**
  Prochain lot : autres fiches signalées non encore recoupées (identité/doublons, puis « sources
  divergentes » des catalog-ref enrichissement).
