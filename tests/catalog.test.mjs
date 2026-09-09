import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const scripts = ["src/seed-catalog.js", "src/app.js"].map((file) => ({
  file,
  source: readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
}));
const types = ["Micro-naine", "Dwarf", "Bush", "Déterminée", "Indéterminée"];
const seedContext = vm.createContext({ window: {} });
vm.runInContext(scripts[0].source, seedContext);
const referenceCount = seedContext.window.SEED_CATALOG.length;
const clone = (value) => JSON.parse(JSON.stringify(value));

function createApp(saved = null) {
  let stored = saved ? JSON.stringify(saved) : null;
  const context = vm.createContext({
    window: { addEventListener() {} },
    document: { addEventListener() {}, querySelector() { return null; } },
    localStorage: {
      getItem() { return stored; },
      setItem(key, value) { stored = value; },
    },
    console,
    setTimeout,
    URL,
  });
  for (const { file, source } of scripts) vm.runInContext(source, context, { filename: file });
  const run = (source) => vm.runInContext(source, context);
  return {
    context,
    run,
    read: (expression) => JSON.parse(run(`JSON.stringify(${expression})`)),
    stored: () => JSON.parse(stored),
  };
}

function legacyState() {
  const app = createApp();
  const entry = app.read('catalogEntryById("catalog-077")');
  entry.subfamily = "Ancien fournisseur · Green";
  entry.source = "Ancien fournisseur";
  entry.sourceUrl = "https://example.org/old-seed-catalog";
  entry.details.description_histoire_particularités = "Variété proposée par un ancien fournisseur.";
  entry.details.fruit = "Couleur indiquée par un ancien fournisseur : green.";
  entry.details.type_de_fruit = "Voir la fiche produit du fournisseur.";
  entry.details.observation_personnelle = "Graines reçues d’une amie.";
  const plant = {
    id: "plant-local",
    catalogId: entry.id,
    name: entry.name,
    family: entry.family,
    subfamily: entry.subfamily,
    catalogDetails: clone(entry.details),
    notes: "Planter près du mur.",
    season: 2026,
    harvests: [{ id: "harvest-local", date: "2026-08-20", weight: 125, fruits: 2 }],
  };
  const candidate = {
    id: "candidate-local",
    catalogId: entry.id,
    name: entry.name,
    family: entry.family,
    subfamily: entry.subfamily,
    notes: "Garder trois plants.",
    source: "catalogue",
    season: 2027,
  };
  const personal = {
    id: "catalog-personal",
    name: "Ma sélection naine",
    family: entry.family,
    subfamily: "Dwarf (Naine)",
    details: { description: "Mon croisement à conserver.", fruit: "Jaune, très doux." },
    plantDefaults: { growth: "indeterminate" },
    source: "Échange entre amis",
    sourceUrl: "https://example.org/personal-selection",
    userAdded: true,
  };
  return {
    currentSeason: 2026,
    onboardingSeen: true,
    catalog: [entry, personal],
    plants: [plant],
    seasons: [{ year: 2026, start: "2026-01-01", highlights: [] }],
    catalogPhotos: [{ id: "photo-reference", catalogId: entry.id, title: "Fruit mûr", size: 1234 }],
    photos: [{ id: "photo-local", plantId: plant.id, title: "Première récolte" }],
    candidates: [candidate],
    crosses: [{ id: "cross-local", femaleParent: { ...candidate, ref: `catalog:${entry.id}` } }],
    trash: [
      { id: "trash-catalog", type: "catalog", data: { entry: clone(entry) } },
      { id: "trash-plant", type: "plant", data: { plant: clone(plant) } },
      { id: "trash-cross", type: "cross", data: { catalogEntry: clone(entry), candidates: [clone(candidate)] } },
      { id: "trash-backup", type: "backup", data: { snapshot: { catalog: [clone(entry)], plants: [clone(plant)] } } },
    ],
  };
}

test("the complete reference catalogue preserves its 193 original sheets and five types", () => {
  const app = createApp();
  const catalog = app.read("defaultSeedCatalog()");
  assert.equal(catalog.length, referenceCount);
  assert.equal(catalog.filter((entry) => !entry.importedFrom).length, 193);
  assert.equal(new Set(catalog.map((entry) => entry.id)).size, referenceCount);
  assert.deepEqual(app.read("CATALOG_SUBFAMILY_ORDER"), types);
  assert.deepEqual(app.read("catalogSubfamilyList(defaultSeedCatalog())"), types);
  assert.ok(catalog.every((entry) => types.includes(entry.subfamily)));
  for (const [id, expected] of Object.entries({
    "catalog-001": "Micro-naine",
    "catalog-012": "Dwarf",
    "catalog-141": "Bush",
    "catalog-049": "Déterminée",
    "catalog-057": "Indéterminée",
    "catalog-085": "Déterminée",
    "catalog-109": "Dwarf",
  })) assert.equal(catalog.find((entry) => entry.id === id).subfamily, expected);
});

test("supplied sheets contain no legacy supplier fields or product-page placeholders", () => {
  const catalog = createApp().read("defaultSeedCatalog()");
  for (const entry of catalog) {
    assert.ok(!Object.hasOwn(entry, "source"));
    assert.ok(!Object.hasOwn(entry, "sourceUrl"));
    assert.doesNotMatch(JSON.stringify(entry.details), /fiche produit|couleur indiquée par|https?:\/\//i);
  }
});

test("legacy spellings and personal growth descriptions normalize consistently", () => {
  const app = createApp();
  const cases = [
    [{ subfamily: "micro-naine" }, "Micro-naine"],
    [{ subfamily: "Micro naine" }, "Micro-naine"],
    [{ subfamily: "Dwarf (Naine)" }, "Dwarf"],
    [{ subfamily: "bush" }, "Bush"],
    [{ subfamily: "determiner" }, "Déterminée"],
    [{ subfamily: "indeterminer" }, "Indéterminée"],
    [{ subfamily: "Normale", details: { description: "Croissance indéterminée." } }, "Indéterminée"],
    [{ subfamily: "Normale", details: { description: "Croissance déterminée, compacte." } }, "Déterminée"],
    [{ details: { description: "Port en buisson." } }, "Bush"],
    [{ details: { description: "Micro dwarf déterminé." } }, "Micro-naine"],
    [{ plantDefaults: { growth: "indeterminate" } }, "Indéterminée"],
    [{ plantDefaults: { growth: "déterminée" } }, "Déterminée"],
  ];
  for (const [entry, expected] of cases) {
    app.context.entry = entry;
    assert.equal(app.run("catalogSubfamily(entry)"), expected);
  }
});

test("the catalogue renders only five filter buttons with accurate counts", () => {
  const app = createApp();
  const html = app.run("renderVarieties()");
  const filters = [...html.matchAll(/data-action="variety-filter" data-filter="([^"]+)"[^>]*>([^<]+)<\/button>/g)];
  assert.deepEqual(filters.map(([, value]) => value), types);
  for (const [, value, label] of filters) {
    app.context.selectedType = value;
    const count = app.run("currentSeedCatalog().filter(entry => catalogSubfamily(entry) === selectedType).length");
    assert.equal(label, `${value} · ${count}`);
  }
  assert.equal((html.match(/class="variety-card catalog-card"/g) || []).length, referenceCount);
  app.run("state.catalog = []");
  assert.equal((app.run("renderVarieties()").match(/data-action="variety-filter"/g) || []).length, 5);
});

test("each filter selects its own group and combines with accent-insensitive search", () => {
  const app = createApp();
  let total = 0;
  for (const type of types) {
    app.context.selectedType = type;
    app.run("varietyFilter = selectedType");
    const entries = app.read("varietiesForFilter()");
    assert.ok(entries.length > 0);
    assert.ok(entries.every((entry) => entry.subfamily === type));
    total += entries.length;
  }
  assert.equal(total, referenceCount);
  app.run('varietyFilter = "Bush"; varietySearch = "delice"');
  assert.deepEqual(app.read("varietiesForFilter().map(entry => entry.name)"), ["Délice d’Or"]);
  app.run('varietyFilter = "Dwarf"');
  assert.equal(app.run("varietiesForFilter().length"), 0);
});

test("clicking the active type again restores the unfiltered catalogue", () => {
  const app = createApp();
  app.run("render = () => {}");
  const microNaineCount = app.run('defaultSeedCatalog().filter((entry) => entry.subfamily === "Micro-naine").length');
  const click = (type) => {
    app.context.selectedType = type;
    app.run(`handleClick({ target: {
      classList: { contains: () => false },
      closest: (selector) => selector === "[data-action]" ? { dataset: { action: "variety-filter", filter: selectedType } } : null,
    } })`);
  };
  click("Micro-naine");
  assert.equal(app.run("varietyFilter"), "Micro-naine");
  assert.equal(app.run("varietiesForFilter().length"), microNaineCount);
  click("Dwarf");
  assert.equal(app.run("varietyFilter"), "Dwarf");
  click("Dwarf");
  assert.equal(app.run("varietyFilter"), "all");
  assert.equal(app.run("varietiesForFilter().length"), referenceCount);
});

test("catalogue forms and cross outputs cannot introduce a sixth type", () => {
  const app = createApp();
  const html = app.run("renderCatalogForm()");
  const select = html.match(/<select id="catalog-subfamily"[^>]*>(.*?)<\/select>/s)?.[1];
  assert.ok(select);
  assert.deepEqual([...select.matchAll(/<option value="([^"]+)"/g)].map(([, value]) => value), types);
  assert.match(app.run('catalogSubfamilyOptionsHTML({ subfamily: "Dwarf (Naine)" })'), /value="Dwarf" selected/);
  assert.ok(types.includes(app.run('crossCatalogEntryFromCross({ id: "cross-new", name: "Lignée F2", generation: "F2" }).subfamily')));
  assert.equal(app.run('catalogEntryToPlant(catalogEntryById("catalog-085")).growth'), "déterminée");
  assert.equal(app.run('catalogEntryToPlant(catalogEntryById("catalog-057")).growth'), "indeterminate");
});

test("migration cleans bundled copies without losing personal records or media links", () => {
  const original = legacyState();
  const app = createApp();
  app.context.fixture = clone(original);
  assert.equal(app.run("migrateCatalogTypes(fixture)"), true);
  const migrated = app.read("fixture");
  const clean = app.read('catalogEntryById("catalog-077")');
  assert.equal(migrated.catalog.length, original.catalog.length);
  assert.equal(migrated.catalog[0].id, original.catalog[0].id);
  assert.equal(migrated.catalog[0].subfamily, clean.subfamily);
  assert.equal(migrated.catalog[0].details.description_histoire_particularités, clean.details.description_histoire_particularités);
  assert.ok(!Object.hasOwn(migrated.catalog[0], "source"));
  assert.ok(!Object.hasOwn(migrated.catalog[0], "sourceUrl"));
  assert.equal(migrated.catalog[0].details.observation_personnelle, original.catalog[0].details.observation_personnelle);
  assert.deepEqual(migrated.catalog[1], { ...original.catalog[1], subfamily: "Dwarf" });
  assert.equal(migrated.plants[0].notes, original.plants[0].notes);
  assert.deepEqual(migrated.plants[0].harvests, original.plants[0].harvests);
  assert.equal(migrated.plants[0].catalogDetails.fruit, clean.details.fruit);
  assert.deepEqual(migrated.photos, original.photos);
  assert.deepEqual(migrated.catalogPhotos, original.catalogPhotos);
  assert.equal(migrated.candidates[0].source, "catalogue");
  assert.equal(migrated.candidates[0].notes, original.candidates[0].notes);
  assert.equal(migrated.crosses[0].femaleParent.subfamily, clean.subfamily);
  assert.equal(migrated.trash[0].data.entry.subfamily, clean.subfamily);
  assert.equal(migrated.trash[1].data.plant.catalogDetails.fruit, clean.details.fruit);
  assert.equal(migrated.trash[2].data.candidates[0].subfamily, clean.subfamily);
  assert.equal(migrated.trash[3].data.snapshot.catalog[0].subfamily, clean.subfamily);
  assert.doesNotMatch(JSON.stringify(migrated), /ancien fournisseur|fiche produit/i);
  assert.equal(app.run("migrateCatalogTypes(fixture)"), false);
  assert.deepEqual(app.read("fixture"), migrated);
});

test("saved catalogues are migrated on load and remain clean after saving and reloading", () => {
  const app = createApp(legacyState());
  assert.equal(app.run("pendingCatalogTypesNotice"), true);
  assert.equal(app.run("state.catalog.length"), referenceCount + 1);
  assert.equal(app.run('state.catalog.find(entry => entry.id === "catalog-077").subfamily'), "Indéterminée");
  app.run("refreshStorageEstimate = () => {}; saveState()");
  const reloaded = createApp(app.stored());
  assert.equal(reloaded.run("pendingCatalogTypesNotice"), false);
  assert.deepEqual(reloaded.read("state"), app.read("state"));
});

test("imported backups are cleaned before their first render and save", async () => {
  const app = createApp();
  app.context.FileReader = class {
    readAsText(content) {
      this.result = content;
      app.context.importFinished = this.onload();
    }
  };
  app.context.incoming = JSON.stringify(legacyState());
  app.context.renderedStates = [];
  app.run(`
    render = () => renderedStates.push(cloneData(state));
    initializePhotoStorage = async () => {};
    refreshStorageEstimate = () => {};
    toast = () => {};
    importData(incoming);
  `);
  await app.context.importFinished;
  const rendered = app.read("renderedStates");
  assert.equal(rendered.length, 2);
  assert.doesNotMatch(JSON.stringify(rendered), /ancien fournisseur|fiche produit/i);
  assert.deepEqual(app.stored().plants[0].harvests, legacyState().plants[0].harvests);
  const overlay = app.stored().catalogOverlay;
  assert.equal(overlay.length, 2);
  assert.equal(overlay[1].subfamily, "Dwarf");
  assert.equal(app.stored().catalog, undefined);
});

test("the reference catalogue is never persisted, only the local overlay", () => {
  const app = createApp(legacyState());
  assert.equal(app.run("state.catalog.length"), referenceCount + 1);
  app.run("refreshStorageEstimate = () => {}; saveState()");
  const stored = app.stored();
  // Le catalogue de référence est livré avec l'application : le recopier dans
  // localStorage saturerait le quota (~5 Mio) et ferait échouer saveState().
  assert.equal(stored.catalog, undefined);
  assert.deepEqual(stored.catalogOverlay.map((entry) => entry.id), ["catalog-077", "catalog-personal"]);
  assert.deepEqual(stored.catalogRemoved, []);
  assert.ok(JSON.stringify(stored).length < 200_000);
  const reloaded = createApp(stored);
  assert.equal(reloaded.run("state.catalog.length"), referenceCount + 1);
  assert.equal(reloaded.run('state.catalog.find(entry => entry.id === "catalog-077").subfamily'), "Indéterminée");
  assert.equal(reloaded.run('state.catalog.find(entry => entry.id === "catalog-personal").name'), "Ma sélection naine");
});

test("restoring a backup snapshot keeps its local sheets, overlay format included", () => {
  const app = createApp();
  app.run(`
    state.catalog = state.catalog.slice(0, 5);
    state.catalogRemoved = defaultSeedCatalog().slice(5).map((entry) => entry.id);
    state.catalog.unshift({ id: "catalog-perso", name: "Ma lignée", family: "Tomate (Solanum lycopersicum)", subfamily: "Dwarf", details: {}, plantDefaults: {}, userAdded: true });
    refreshStorageEstimate = () => {};
    saveState();
  `);
  const snapshot = app.stored();
  assert.equal(snapshot.catalog, undefined);
  const restored = createApp({ ...snapshot, trash: [{ id: "trash-backup", type: "backup", data: { snapshot } }] });
  restored.run(`
    render = () => {};
    initializePhotoStorage = async () => {};
    refreshStorageEstimate = () => {};
    restoreTrashItem("trash-backup");
  `);
  assert.equal(restored.run('state.catalog.some(entry => entry.id === "catalog-perso")'), true);
  assert.equal(restored.run("state.catalog.some(entry => entry.id === defaultSeedCatalog()[9].id)"), false);
});

test("a removed reference sheet is not reintroduced by the next merge", () => {
  const app = createApp();
  const removedId = app.run("defaultSeedCatalog()[0].id");
  app.run(`
    state.catalog = state.catalog.filter((entry) => entry.id !== "${removedId}");
    state.catalogRemoved = ["${removedId}"];
    refreshStorageEstimate = () => {};
    saveState();
  `);
  assert.equal(app.run(`mergeReferenceCatalog(state)`), 0);
  assert.equal(app.run(`state.catalog.some(entry => entry.id === "${removedId}")`), false);
  const reloaded = createApp(app.stored());
  assert.equal(reloaded.run(`state.catalog.some(entry => entry.id === "${removedId}")`), false);
  assert.equal(reloaded.run("state.catalog.length"), referenceCount - 1);
});

test("restoring an older catalogue sheet does not reintroduce legacy categories", () => {
  const app = createApp();
  app.context.fixture = legacyState();
  app.run(`
    state = fixture;
    state.catalog = [];
    render = () => {};
    initializePhotoStorage = async () => {};
    refreshStorageEstimate = () => {};
    restoreTrashItem("trash-catalog");
  `);
  assert.equal(app.run("state.catalog.length"), 1);
  assert.equal(app.run("state.catalog[0].subfamily"), "Indéterminée");
  assert.doesNotMatch(JSON.stringify(app.stored()), /ancien fournisseur|fiche produit/i);
});

test("closing a catalogue dialog safely restores its original focus target", () => {
  const app = createApp();
  const callbacks = [];
  let focusCalls = 0;
  const target = { focus() { focusCalls += 1; } };
  app.context.setTimeout = (callback) => callbacks.push(callback);
  app.context.document.getElementById = () => ({ innerHTML: "dialog" });
  app.context.document.contains = (element) => element === target;
  app.context.target = target;
  app.run("lastFocusedElement = target; closeModal()");
  assert.equal(app.run("lastFocusedElement"), null);
  callbacks.forEach((callback) => callback());
  assert.equal(focusCalls, 1);
});

test("each supplied sheet has a scoped documentary review, not a blanket certification", () => {
  const app = createApp();
  const catalog = app.read("defaultSeedCatalog()");
  for (const entry of catalog) {
    assert.ok(entry.catalogRevision >= 2);
    assert.equal(entry.verification.checkedAt, "2026-09-07");
    assert.ok(["partial", "identity", "conflicting", "local", "accession", "unconfirmed"].includes(entry.verification.status));
    assert.ok(Array.isArray(entry.verification.scope));
    assert.ok(entry.verification.note.length > 20);
    assert.ok(Array.isArray(entry.verification.sources));
    for (const source of entry.verification.sources) {
      assert.ok(source.title);
      assert.ok(["http:", "https:"].includes(new URL(source.url).protocol));
    }
    if (entry.verification.status === "unconfirmed") {
      assert.equal(entry.verification.sources.length, 0);
      assert.equal(entry.verification.scope.length, 0);
      assert.equal(entry.plantDefaults.growth, "");
    }
  }
  assert.equal(catalog.filter((entry) => entry.verification.previousType).length, 17);
});

test("documented factual corrections reach the catalogue and plant prefill", () => {
  const app = createApp();
  const groovy = app.read('catalogEntryById("catalog-009")');
  assert.equal(groovy.plantDefaults.growth, "déterminée");
  assert.match(groovy.details.maturité, /Précoce à mi-saison/);
  assert.doesNotMatch(groovy.details.description_histoire_particularités, /chlorina|cp\/cp/);
  for (const id of ["catalog-023", "catalog-097", "catalog-146", "catalog-150", "catalog-169", "catalog-188"]) {
    app.context.selectedId = id;
    assert.equal(app.run("catalogEntryById(selectedId).subfamily"), "Indéterminée");
  }
  assert.equal(app.run('catalogEntryById("catalog-014").subfamily'), "Micro-naine");
  assert.equal(app.run('catalogEntryById("catalog-056").subfamily'), "Bush");
  assert.match(app.run('catalogEntryById("catalog-074").details.description_histoire_particularités'), /feuillage : régulier/i);
  assert.match(app.run('catalogEntryById("catalog-075").details.fruit'), /ronds/);
  assert.match(app.run('catalogEntryById("catalog-138").details.description_histoire_particularités'), /feuillage régulier/);
  assert.equal(app.run('catalogEntryToPlant(catalogEntryById("catalog-052")).daysToMaturity'), 57);
  assert.equal(app.run('catalogEntryToPlant(catalogEntryById("catalog-165")).daysToMaturity'), 90);
});

test("a compact habit, an ancestor name or leaf color does not invent fruit traits", () => {
  const app = createApp();
  assert.equal(app.run('catalogSize({ subfamily: "Dwarf", details: { type_de_fruit: "Beefsteak", fruit: "Gros fruit de 300 à 500 g." } })'), "gros");
  assert.equal(app.run('catalogSize({ subfamily: "Indéterminée", details: { type_de_fruit: "Cerise", taille: "3 m" } })'), "cerise");
  assert.deepEqual(app.read('catalogColors({ name: "Green Giant", details: { description: "Feuillage vert et rose", fruit: "Fruit rouge." } })'), ["red"]);
  assert.deepEqual(app.read('catalogColors({ name: "Pêche Blanche", details: { fruit: "Fruit blanc ivoire." } })'), ["cream"]);
  assert.deepEqual(app.read('catalogColors({ name: "Blue Unknown", plantDefaults: { colors: [] } })'), []);
  assert.equal(app.run('catalogShape({ name: "Tomate inconnue", details: {} })'), "");
  assert.equal(app.run('catalogShape({ details: { fruit: "Fruit cordiforme rose." } })'), "cœur");
  assert.equal(app.run('catalogShape({ details: { fruit: "Fruit en poire." } })'), "poire");
  assert.equal(app.run('catalogGrowth({ subfamily: "Dwarf", details: { description: "Plant vigoureux de 1,2 m." } })'), "");
  assert.equal(app.run('catalogType(catalogEntryById("catalog-109"))'), "open");
  assert.equal(app.run('catalogEntryToPlant(catalogEntryById("catalog-012")).growth'), "indeterminate");
});

test("semi-determinate growth and deliberately unknown growth are preserved", () => {
  const app = createApp();
  for (const id of ["catalog-042", "catalog-081", "catalog-093", "catalog-142"]) {
    app.context.selectedId = id;
    assert.equal(app.run("catalogEntryToPlant(catalogEntryById(selectedId)).growth"), "semi-determinate");
  }
  assert.match(app.run('growthOptionsHTML("semi-determinate")'), /value="semi-determinate" selected/);
  assert.equal(app.run('catalogGrowth({ subfamily: "Indéterminée", plantDefaults: { growth: "" } })'), "");
  assert.equal(app.run('catalogGrowth({ details: { description: "Croissance semi-déterminée." } })'), "semi-determinate");
  assert.match(app.run('renderPlantForm(catalogEntryToPlant(catalogEntryById("catalog-042"), { asNew: true }))'), /value="semi-determinate" selected/);
});

test("audited calendar defaults require an explicit transplant-based value", () => {
  const app = createApp();
  for (const entry of app.read("defaultSeedCatalog()")) {
    app.context.entry = entry;
    if (entry.plantDefaults.daysToMaturity > 0) {
      assert.match(entry.details.maturité, /après plantation/);
      assert.equal(app.run("catalogMaturityDays(entry)"), entry.plantDefaults.daysToMaturity);
      assert.equal(app.run("catalogMaturityNotice(entry)"), "");
    } else {
      assert.equal(app.run("catalogMaturityDays(entry)"), 75);
      assert.match(app.run("catalogMaturityNotice(entry)"), /hypothèse de calendrier/);
    }
  }
  // The seed-based 110-day claim must never become 110 days from transplant.
  assert.equal(app.run('catalogMaturityDays(catalogEntryById("catalog-003"))'), 75);
  assert.match(app.run('renderPlantForm(catalogEntryToPlant(catalogEntryById("catalog-003"), { asNew: true }))'), /ce n’est pas une donnée vérifiée/);
  assert.equal(app.run('catalogMaturityDays({ userAdded: true, plantDefaults: { daysToMaturity: 82 } })'), 82);
});

test("the plant height column contains no fruit weights and unsupported genotypes are not asserted", () => {
  const catalog = createApp().read("defaultSeedCatalog()");
  for (const entry of catalog) {
    assert.doesNotMatch(entry.details.taille, /\b\d+\s*(?:g|kg|grammes?)\b/i);
    assert.doesNotMatch(JSON.stringify(entry.details), /wo\/wo|cp\/cp|sp\/sp|vgv|ftsH|bipinnata|mutation wiry/);
  }
  assert.match(catalog.find((entry) => entry.id === "catalog-037").details.fruit, /ne pas traiter un lot sauvage non identifié/);
});

test("revision two updates already-canonical stored sheets without changing observed plant traits", () => {
  const app = createApp();
  const old = app.read('catalogEntryById("catalog-097")');
  old.catalogRevision = 1;
  old.subfamily = "Déterminée";
  old.details.description_histoire_particularités = "Ancienne description à corriger.";
  old.details.observation_personnelle = "Garder mes notes.";
  old.plantDefaults.growth = "déterminée";
  old.plantDefaults.colors = ["green"];
  delete old.verification;
  const personal = { ...clone(old), id: "personal", name: "Ma lignée", userAdded: true };
  const observed = {
    id: "observed", catalogId: old.id, catalogRevision: 1, subfamily: old.subfamily,
    catalogDetails: clone(old.details), growth: "déterminée", colors: ["green"],
    daysToMaturity: 99, notes: "Mon observation est différente de la référence.",
    harvests: [{ id: "h-1", weight: 90, fruits: 1 }],
  };
  app.context.fixture = { catalog: [old, personal], plants: [observed], trash: [] };
  assert.equal(app.run("migrateCatalogTypes(fixture)"), true);
  const migrated = app.read("fixture");
  assert.equal(migrated.catalog[0].catalogRevision, app.run('catalogEntryById("catalog-097").catalogRevision'));
  assert.equal(migrated.catalog[0].subfamily, "Indéterminée");
  assert.equal(migrated.catalog[0].plantDefaults.growth, "indeterminate");
  assert.equal(migrated.catalog[0].details.observation_personnelle, "Garder mes notes.");
  assert.equal(migrated.plants[0].subfamily, "Indéterminée");
  assert.equal(migrated.plants[0].catalogRevision, migrated.catalog[0].catalogRevision);
  for (const key of ["growth", "colors", "daysToMaturity", "notes", "harvests"]) assert.deepEqual(migrated.plants[0][key], observed[key]);
  assert.deepEqual(migrated.catalog[1], personal);
  assert.equal(app.run("migrateCatalogTypes(fixture)"), false);
});

test("documentary references are escaped and unsafe links are not rendered", () => {
  const app = createApp();
  app.context.entry = {
    verification: {
      checkedAt: "not-a-date", status: "conflicting", scope: ["<script>scope</script>"],
      note: '<img src=x onerror="alert(1)">',
      sources: [
        { title: "Do not open", url: "javascript:alert(1)" },
        { title: "Do not open either", url: "data:text/html,bad" },
        { title: "Private", url: "https://user:secret@example.org/" },
        { title: "Safe & useful", url: "https://example.org/variety" },
      ],
    },
  };
  const html = app.run("renderCatalogVerification(entry)");
  assert.doesNotMatch(html, /javascript:|data:text|user:secret|<script>|<img/);
  assert.match(html, /&lt;img/);
  assert.match(html, /Safe &amp; useful/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /Date non renseignée/);
});

test("the report covers every stable catalogue ID and every listed reference", () => {
  const report = readFileSync(new URL("../docs/verification-catalogue.md", import.meta.url), "utf8");
  const catalog = createApp().read("defaultSeedCatalog()");
  assert.equal((report.match(/<a id="catalog-[^"]+"><\/a>/g) || []).length, referenceCount);
  assert.match(report, /Il ne s’agit pas d’une certification/);
  for (const entry of catalog) {
    assert.ok(report.includes(`<a id="${entry.id}"></a>`));
    for (const source of entry.verification.sources) assert.ok(report.includes(source.url));
  }
});

test("a fresh demo already carries the current catalogue revision", () => {
  const app = createApp();
  assert.equal(app.run("migrateCatalogTypes(state)"), false);
  const byId = new Map(app.read("defaultSeedCatalog()").map((entry) => [entry.id, entry]));
  assert.ok(app.read("state.plants").every((plant) => plant.catalogRevision === byId.get(plant.catalogId).catalogRevision));
});

test("empty technical fields are not displayed as empty catalogue facts", () => {
  const app = createApp();
  const html = app.run('renderCatalogDetail(catalogEntryById("catalog-009"))');
  assert.doesNotMatch(html, /<dt>gènes potentiels<\/dt>/);
  assert.match(html, /Vérification documentaire/);
});

test("the readme catalog count matches the reference catalog size", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const patterns = [
    /(Catalogue-)\d+(_variétés)/g,
    /(alt=")\d+( varieties")/g,
    /\b\d{2,5}(?=\s+(?:fiches|variétés|sheets|tomato\s+(?:sheets|varieties)))/g,
  ];
  const found = patterns.flatMap((pattern) => [...readme.matchAll(pattern)].map((m) => Number(m[0].match(/\d+/)[0])));
  // Le nombre exact d'occurrences évolue avec la documentation : on vérifie
  // surtout que toutes les mentions trouvées sont justes, et que les motifs
  // n'ont pas cessé de fonctionner (sinon found serait vide).
  assert.ok(found.length >= 10, `${found.length} occurrences trouvées`);
  assert.ok(found.every((count) => count === referenceCount), found.join(", "));
});

test("rare documented leaf types are offered and filter with the intended varieties", () => {
  const app = createApp();
  const options = app.run("CATALOG_FACET_OPTIONS.leaf.map(([value]) => value)");
  for (const value of ["feuille-carotte", "stick", "oreille-souris", "chou-kale", "panaché"]) assert.ok(options.includes(value));
  const filter = (leaf) => {
    app.run(`varietyFacets.leaf = ${JSON.stringify(leaf)}`);
    return app.read("varietiesForFilter().map((entry) => entry.id)");
  };
  // Carotte : Silvery Fir Tree et les autres variétés documentées, sans variété voisine.
  assert.deepEqual(new Set(filter("feuille-carotte")), new Set([
    "catalog-016",
    "catalog-ref-meraki-carrot-mini-micro-dwarf-tomato",
    "catalog-ref-meraki-lucinda-tomato",
    "catalog-ref-meraki-spike-bush-tomato",
  ]));
  // Stick / pompon : le gène stick, pas tous les « bouquets » de fruits ou de fleurs.
  const stick = filter("stick");
  assert.ok(stick.includes("catalog-030"));
  assert.ok(stick.includes("catalog-ref-meraki-mooncalf-stick-cherry-tomato"));
  assert.ok(stick.includes("catalog-ref-meraki-stick-brown-cherry-tomato"));
  assert.ok(stick.includes("catalog-ref-meraki-stick-red-tomato"));
  assert.ok(stick.includes("catalog-ref-meraki-stick-yellow-cherry-tomato"));
  assert.ok(!stick.includes("catalog-025"));
  assert.ok(!stick.includes("catalog-055"));
  assert.ok(!stick.includes("catalog-ref-meraki-curly-kaley-tomato"));
  // Oreille de souris : seule la fiche Maushor ajoutée pour ce feuillage rare.
  assert.deepEqual(filter("oreille-souris"), ["catalog-ref-grainedecarotte-maushor"]);
  // Chou kale : les deux Curly Kaley, sans Kaleidoscopic Jewel (nom seulement) ni George's Greek.
  const kale = filter("chou-kale");
  assert.deepEqual(new Set(kale), new Set([
    "catalog-ref-meraki-curly-kaley-long-micro-dwarf-tomato",
    "catalog-ref-meraki-curly-kaley-tomato",
  ]));
  assert.ok(!kale.includes("catalog-ref-L0105"));
  assert.ok(!kale.includes("catalog-ref-meraki-georges-greek-beefsteak-tomato"));
  // Panaché : le feuillage panaché, y compris Sweet Splash Electra, sans les fruits simplement multicolores.
  const panache = filter("panaché");
  assert.ok(panache.includes("catalog-ref-meraki-sweet-splash-electra-dwarf-tomato"));
  assert.ok(panache.includes("catalog-017"));
  assert.ok(panache.includes("catalog-031"));
  assert.ok(panache.includes("catalog-ref-meraki-variegated-dragon-tomato"));
  assert.ok(!panache.includes("catalog-ref-L0105"));
  assert.ok(!panache.includes("catalog-ref-meraki-georges-greek-beefsteak-tomato"));
});

test("catalogMaturityClass buckets maturity keywords and numeric ranges", () => {
  const app = createApp();
  assert.equal(app.run("catalogMaturityClass({ details: { maturité: \"Précoce\" } })"), "précoce");
  assert.equal(app.run("catalogMaturityClass({ details: { maturité: \"Mi-saison\" } })"), "mi-saison");
  assert.equal(app.run("catalogMaturityClass({ details: { maturité: \"Tardive\" } })"), "tardive");
  assert.equal(app.run("catalogMaturityClass({ details: { maturité: \"60 jours annoncés, base non précisée.\" } })"), "précoce");
  assert.equal(app.run("catalogMaturityClass({ details: { maturité: \"90 jours annoncés, base non précisée.\" } })"), "tardive");
  assert.equal(app.run("catalogMaturityClass({ details: {} })"), "");
});

test("catalogLeafType recognises documented leaf shapes and ignores unknowns", () => {
  const app = createApp();
  assert.equal(app.run('catalogLeafType({ details: { feuillage: "Pomme de terre (rugueux), vert sombre" } })'), "pomme-de-terre");
  assert.equal(app.run('catalogLeafType({ details: { feuillage: "Régulier" } })'), "régulier");
  assert.equal(app.run('catalogLeafType({ details: { feuillage: "Laineux argenté" } })'), "laineux");
  assert.equal(app.run('catalogLeafType({ details: { feuillage: "Non documenté" } })'), "");
  assert.equal(app.run("catalogLeafType({ details: {} })"), "");
});

test("catalogToleranceLabels flags heat, cold and declared disease resistance", () => {
  const app = createApp();
  const labels = app.read('catalogToleranceLabels({ details: { fruit: "résistante au mildiou, tolère la chaleur", description_histoire_particularités: "réussit par temps froid" } })');
  assert.ok(labels.includes("maladies"));
  assert.ok(labels.includes("chaleur"));
  assert.ok(labels.includes("froid"));
  assert.deepEqual(app.read("catalogToleranceLabels({ details: { fruit: \"aucune résistance générale garantie\" } })"), []);
});

test("catalogToleranceLabels never promotes a trait that is negated or unrelated", () => {
  const app = createApp();
  const read = (details) => app.read(`catalogToleranceLabels({ details: ${JSON.stringify(details)} })`);
  // Explicit positive claims are kept.
  assert.deepEqual(read({ fruit: "résistante à la sécheresse et à la chaleur" }), ["chaleur"]);
  assert.deepEqual(read({ "description_histoire_particularités": "réussit aussi par temps plus frais" }), ["froid"]);
  assert.deepEqual(read({ fruit: "décrite comme peu sensible aux maladies" }), ["maladies"]);
  // Negations are discarded, not promoted.
  assert.deepEqual(read({ fruit: "aucune résistance générale aux maladies ou à la sécheresse n’est garantie" }), []);
  assert.deepEqual(read({ "description_histoire_particularités": "les observations ne garantissent ni précocité ni résistance au mildiou" }), []);
  assert.deepEqual(read({ "description_histoire_particularités": "cela ne démontre pas une résistance aux maladies" }), []);
  // Unrelated words must not leak in ("usage frais" is fresh use, "chaleureuse" is a colour word).
  assert.deepEqual(read({ fruit: "saveur douce, usage frais, sauce ou conserve" }), []);
  assert.deepEqual(read({ fruit: "belle couleur orange profonde et chaleureuse" }), []);
});

test("the verification block is a collapsed disclosure by default", () => {
  const app = createApp();
  const html = app.run('renderCatalogDetail(catalogEntryById("catalog-009"))');
  assert.match(html, /<details class="catalog-verification/);
  assert.doesNotMatch(html, /<details class="catalog-verification[^"]*"\s+open/);
  assert.match(html, /Vérification documentaire/);
  assert.match(html, /catalog-verification-chevron/);
});

test("variety facets narrow the catalogue by fruit colour", () => {
  const app = createApp();
  app.run("varietyFacets.color = 'red'; varietyFacets.size = 'all'; varietyFacets.shape = 'all'; varietyFacets.maturity = 'all'; varietyFacets.leaf = 'all'; varietyFacets.tolerance = 'all';");
  const rows = app.read("varietiesForFilter().map((entry) => entry.id)");
  const colors = app.read("varietiesForFilter().map((entry) => catalogColors(entry))");
  assert.ok(rows.length > 0 && rows.length < referenceCount);
  assert.ok(colors.every((list) => list.includes("red")));
});
