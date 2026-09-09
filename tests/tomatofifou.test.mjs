/* Tests hors ligne du collecteur Tomatofifou (pas d'accès réseau) :
 * analyse du HTML, correspondance des libellés et déduplication. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import {
  findKnownEntry,
  findNeighbours,
  identityKeys,
  normalizeName,
  parseListingPage,
  parseProductPage,
  titleCase,
  toProfile,
} from "../scripts/lib/tomatofifou.mjs";

const listingPage = (names) => `<ul class="products">${names
  .map(
    ([slug, name]) => `<li class="product type-product">
    <a href="https://www.tomatofifou.com/produit/${slug}/" class="woocommerce-LoopProduct-link">
      <img src="https://www.tomatofifou.com/static/uploads/x.jpg" alt="" />
      <h2 class="woocommerce-loop-product__title">${name}</h2>
    </a>
    <a href="https://www.tomatofifou.com/produit/${slug}/?add-to-cart=1">Ajouter au panier</a>
  </li>`,
  )
  .join("")}</ul><p class="woocommerce-result-count">Affichage de 1–15 sur 2999 résultats</p>`;

const productPage = ({
  title = "ABAKANSKIY ROZOVYI - Абаканский розовый",
  rows = [["Calibre", "Moyen à Gros"], ["Couleur", "Rose"], ["Forme", "Cordiforme"], ["Précocité", "Mi-Saison"], ["Climat", "Tous"], ["Feuillage", "Régulier"], ["Croissance", "Indéterminée"], ["Origine", "Russie"], ["Hauteur", "+ ou - 1.8m"]],
  paragraphs = [
    "Variété héritage originaire des monts de l’Altaï, Russie. Son nom signifie « rose de la région Abakan ».",
    "Gros fruit très lisse rose, cordiforme de 300 à 500 grammes.",
    "Chair charnue contenant peu de graines, mais des grosses. Bonne saveur de tomates anciennes.",
    "Plant à l’allure frêle au feuillage vaporeux, croissance indéterminée.",
  ],
  ug = "557",
  unavailable = true,
} = {}) => `<div class="product">
  <h1 class="product_title entry-title">${title}</h1>
  <p>${paragraphs[0]}</p>
  <p>Variété héritage Russie.. Gros fruit très lisse rose, cordiforme de 300 à 500 grammes..</p>
  <span class="sku_wrapper">UGS&nbsp;: <span class="sku">${ug}</span></span>
  <span class="posted_in">Catégories&nbsp;: <a href="https://www.tomatofifou.com/categorie-produit/${unavailable ? "non-dispo" : "tomates"}/">${unavailable ? "Non Disponible" : "Tomates"}</a></span>
  <p>Les frais de port sont détaillés ici dans nos Conditions Générales de Vente (C.G.V.).</p>
  <p>Les sachets contiennent 12 à 15 graines sauf indication contraire pour les variétés rares.</p>
  ${paragraphs.slice(1).map((text) => `<p>${text}</p>`).join("\n  ")}
  <h2>Caractéristiques</h2>
  <table><tbody>${rows.map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`).join("")}</tbody></table>
</div>`;

const collectedAt = "2026-09-09";

test("the listing page yields one entry per product, deduplicated and readable", () => {
  const { items, total } = parseListingPage(listingPage([["0-33", "0-33"], ["abakanskiy-rozovyi", "ABAKANSKIY ROZOVYI"], ["akers-oxheart", "AKER'S OXHEART"]]), 1);
  assert.equal(total, 2999);
  assert.deepEqual(items.map((item) => item.slug), ["0-33", "abakanskiy-rozovyi", "akers-oxheart"]);
  assert.deepEqual(items.map((item) => item.name), ["0-33", "Abakanskiy Rozovyi", "Aker's Oxheart"]);
  assert.equal(items[0].url, "https://www.tomatofifou.com/produit/0-33/");
});

test("capital letters are softened but numbers and mixed case are preserved", () => {
  assert.equal(titleCase("1884"), "1884");
  assert.equal(titleCase("ABC POTATO LEAF"), "Abc Potato Leaf");
  assert.equal(titleCase("Rose de Berne"), "Rose de Berne");
});

test("the product page exposes the characteristics table and skips the shop boilerplate", () => {
  const product = parseProductPage(productPage());
  assert.equal(product.name, "Abakanskiy Rozovyi");
  assert.deepEqual(product.aliases, ["Абаканский розовый"]);
  assert.equal(product.sku, "557");
  assert.equal(product.unavailable, true);
  assert.equal(product.characteristics.croissance, "Indéterminée");
  assert.equal(product.characteristics.hauteur, "+ ou - 1.8m");
  assert.ok(product.paragraphs.length >= 4);
  assert.ok(!product.paragraphs.some((text) => /frais de port|sachets? contiennent/i.test(text)));
});

test("a missing characteristics table is a hard error, never a silent sheet", () => {
  assert.throws(() => parseProductPage("<div><h1>Test</h1><p>Description suffisamment longue pour passer le filtre.</p></div>"), /Caractéristiques/);
});

test("the profile matches the schema expected by build-catalog-enrich", () => {
  const product = parseProductPage(productPage());
  const profile = toProfile(product, { url: "https://www.tomatofifou.com/produit/abakanskiy-rozovyi/", page: 1, collectedAt });
  assert.equal(profile.growth, "I");
  assert.deepEqual(profile.colors, ["pink"]);
  assert.equal(profile.shape, "cœur");
  assert.match(profile.weight, /300 à 500 g/);
  assert.match(profile.maturity, /Mi-Saison/);
  assert.equal(profile.origin, "Russie");
  assert.match(profile.height, /1\.8m/);
  assert.deepEqual(profile.sources, ["https://www.tomatofifou.com/produit/abakanskiy-rozovyi/"]);
  assert.equal(profile.daysFromTransplant, 0);
  assert.equal(profile.status, "partial");
  assert.match(profile.note, /UGS 557/);
  assert.match(profile.note, /non disponible/i);
});

test("dwarf and micro-dwarf mentions drive the plant type", () => {
  const build = (rows, paragraphs) => toProfile(parseProductPage(productPage({ rows, paragraphs })), { url: "https://www.tomatofifou.com/produit/x/", collectedAt });
  const growth = (rows, paragraphs) => build(rows, paragraphs).growth;
  assert.equal(growth([["Croissance", "Déterminée"]]), "D");
  assert.equal(growth([["Croissance", "Semi-déterminée"]]), "S");
  assert.equal(growth([["Croissance", "Dwarf Indéterminée"]]), "WI");
  assert.equal(growth([["Croissance", ""]]), "U");
  // Le site ne publie pas la taxonomie « Dwarf » sur la fiche : la mention
  // explicite du semencier dans la description est alors la seule source.
  const dwarfText = ["Variété développée dans le cadre du « Dwarf Tomato Project ».", "Gros fruit rouge de type beefsteak de 200 à 400 grammes.", "Plant au port nain et au feuillage rugueux."];
  assert.equal(growth([["Croissance", "Indéterminée"]], dwarfText), "WI");
  assert.equal(growth([["Croissance", "Déterminée"]], dwarfText), "WD");
  const microText = ["Variété micro dwarf adaptée à la culture en pot.", "Petit fruit rouge rond de 20 à 30 grammes."];
  assert.equal(growth([["Croissance", "Déterminée"]], microText), "M");
  assert.match(build([["Croissance", "Indéterminée"]], dwarfText).note, /Port « nain » d[eé]duit de la description/);
  // Rien dans la description, rien déduit.
  assert.equal(growth([["Croissance", "Indéterminée"]], ["Variété ancienne originaire des USA.", "Gros fruit rouge de 300 à 500 grammes."]), "I");
});

test("striped and marbled fruits keep an empty colour rather than a guessed one", () => {
  const profile = toProfile(
    parseProductPage(productPage({ rows: [["Couleur", "Zébrée"], ["Forme", "Ronde"], ["Croissance", "Indéterminée"]] })),
    { url: "https://www.tomatofifou.com/produit/x/", collectedAt },
  );
  assert.deepEqual(profile.colors, []);
  assert.match(profile.note, /couleur de fond n’est pas précisée/);
});

test("the leaf wording is the one catalogLeafTypes recognises", () => {
  // Même harnais que tests/catalog.test.mjs : src/app.js a besoin d'un DOM minimal.
  const app = vm.createContext({
    window: { addEventListener() {} },
    document: { addEventListener() {}, querySelector() { return null; } },
    localStorage: { getItem() { return null; }, setItem() {} },
    console,
    setTimeout,
    URL,
  });
  vm.runInContext(readFileSync(new URL("../src/seed-catalog.js", import.meta.url), "utf8"), app, { filename: "src/seed-catalog.js" });
  vm.runInContext(readFileSync(new URL("../src/app.js", import.meta.url), "utf8"), app, { filename: "src/app.js" });
  const expectations = [["Régulier", "régulier"], ["Pomme de terre", "pomme-de-terre"], ["Carotte", "feuille-carotte"], ["Panache", "panaché"], ["Pompom", "stick"], ["Angora", "laineux"], ["Régulier - Rugosa", "rugueux"]];
  for (const [label, expected] of expectations) {
    const profile = toProfile(parseProductPage(productPage({ rows: [["Feuillage", label], ["Croissance", "Indéterminée"], ["Forme", "Ronde"], ["Couleur", "Rouge"]] })), { url: "https://www.tomatofifou.com/produit/x/", collectedAt });
    const types = vm.runInContext(`catalogLeafTypes({ details: { feuillage: ${JSON.stringify(profile.leaf)}, description_histoire_particularités: ${JSON.stringify(profile.description)} } })`, app);
    assert.ok(types.includes(expected), `${label} -> ${JSON.stringify(types)} (attendu ${expected})`);
  }
  // Une mention « non documenté » ne doit jamais créer de type.
  const unknown = toProfile(parseProductPage(productPage({ rows: [["Feuillage", ""], ["Croissance", "Indéterminée"], ["Forme", "Ronde"], ["Couleur", "Rouge"]] })), { url: "https://www.tomatofifou.com/produit/x/", collectedAt });
  const types = vm.runInContext(`catalogLeafTypes({ details: { feuillage: ${JSON.stringify(unknown.leaf)} } })`, app);
  assert.equal(types.length, 0);
});

test("every vocabulary value published by the site is mapped", () => {
  const source = readFileSync(new URL("../scripts/lib/tomatofifou.mjs", import.meta.url), "utf8");
  const published = {
    couleur: ["Acajou", "Bicolore Jaune-Rouge", "Bigarrée", "Blanche", "Bleue", "Jaune", "Noire", "Noire à Pourpre", "Orange", "Pourpre violacé", "Rose", "Rouge", "Verte", "Zébrée"],
    forme: ["Beefsteak", "Ronde", "Aplatie", "Côtelée", "Ovale-Prune-Allongée", "Cordiforme", "Renflée", "Piriforme", "Variable", "Ronde à ovale", "Téton", "Nervurée", "Poivron-Piment", "Irrégulière"],
    feuillage: ["Angora", "Carotte", "Panache", "Pomme de terre", "Pomme de terre - Rugosa", "Pompom", "Régulier", "Régulier - Rugosa"],
    croissance: ["Déterminée", "Dwarf Déterminée", "Dwarf Indéterminée", "Indéterminée", "Semi-déterminée"],
  };
  for (const [group, values] of Object.entries(published)) {
    for (const value of values) {
      const rows = [[group === "couleur" ? "Couleur" : group === "forme" ? "Forme" : group === "feuillage" ? "Feuillage" : "Croissance", value]];
      if (group !== "forme") rows.push(["Forme", "Ronde"]);
      if (group !== "couleur") rows.push(["Couleur", "Rouge"]);
      if (group !== "croissance") rows.push(["Croissance", "Indéterminée"]);
      const profile = toProfile(parseProductPage(productPage({ rows })), { url: "https://www.tomatofifou.com/produit/x/", collectedAt });
      assert.ok(profile.shape && Array.isArray(profile.colors) && profile.growth, `${group} ${value} non traité`);
    }
  }
  assert.match(source, /Zébrée|zebree/);
});

test("an existing variety is recognised and never duplicated", () => {
  const catalogue = [{ id: "catalog-1", name: "Abakanskiy Rozovyi", aliases: ["Абаканский розовый"] }, { id: "catalog-2", name: "1884" }];
  // Correspondance par nom, par synonyme déclaré, ou par casse/accents.
  assert.equal(findKnownEntry(catalogue, "Abakanskiy Rozovyi")?.id, "catalog-1");
  assert.equal(findKnownEntry(catalogue, "Абаканский розовый")?.id, "catalog-1");
  assert.equal(findKnownEntry(catalogue, "abakanskiy rozovyi")?.id, "catalog-1");
  assert.equal(findKnownEntry(catalogue, "Rose de Berne"), null);
  assert.deepEqual(identityKeys("Rose-de-Berne", ["Rose de Berne "]), ["rosedeberne"]);
});

test("near names are flagged for review, never merged", () => {
  const catalogue = [{ id: "catalog-2", name: "1884" }];
  // « 1884 Purple » est un cultivar distinct : à relire, pas à fusionner.
  assert.equal(findKnownEntry(catalogue, "1884 Purple"), null);
  const neighbours = findNeighbours(catalogue, "1884 Purple");
  assert.deepEqual(neighbours, [{ id: "catalog-2", name: "1884" }]);
  assert.deepEqual(findNeighbours(catalogue, "Rose"), []);
  assert.equal(normalizeName("Aker's West Virginia, Chuck Wyatt's"), "akerswestvirginiachuckwyatts");
});

test("the collector replays a fixture and skips what the catalogue already has", async () => {
  const rootUrl = new URL("../", import.meta.url);
  const out = ".tmp-collect-test";
  const outDir = new URL(`../${out}/`, import.meta.url);
  rmSync(outDir, { recursive: true, force: true });
  try {
    execFileSync(process.execPath, ["scripts/collect-tomatofifou.mjs", "--fixture", "tests/fixtures/tomatofifou", "--out", out, "--delay", "0", "--fresh"], { cwd: fileURLToPath(rootUrl), encoding: "utf8" });
    const manifest = JSON.parse(await readFile(new URL("../.tmp-collect-test/manifest.json", import.meta.url), "utf8"));
    const listing = (await readFile(new URL("../.tmp-collect-test/listing.tsv", import.meta.url), "utf8")).trim().split(/\r?\n/);
    const profiles = JSON.parse(await readFile(new URL("../.tmp-collect-test/profiles.json", import.meta.url), "utf8"));
    const decisions = JSON.parse(await readFile(new URL("../.tmp-collect-test/identity-decisions.json", import.meta.url), "utf8"));
    const progress = JSON.parse(await readFile(new URL("../.tmp-collect-test/progress.json", import.meta.url), "utf8"));

    assert.equal(manifest.advertisedProductCount, 3);
    assert.deepEqual(listing, ["page\tslug\tname", "1\t0-33\t0-33", "1\tabakanskiy-rozovyi\tAbakanskiy Rozovyi", "1\tfixture-test-tomato\tFixture Test Tomato"]);
    // Seule la variété inconnue est documentée : les deux autres existent déjà.
    assert.deepEqual(Object.keys(profiles), ["fixture-test-tomato"]);
    assert.equal(decisions.existing["0-33"].catalogId, "catalog-ref-cultivetarue-0-33");
    assert.equal(decisions.existing["abakanskiy-rozovyi"].catalogId, "catalog-ref-cultivetarue-abakanskiy-rozovyi");
    assert.equal(progress.listed, 3);
    assert.equal(progress.known, 2);
    assert.deepEqual(progress.failures, []);
    assert.match(profiles["fixture-test-tomato"].description, /monts de l’Altaï/);
    assert.equal(profiles["fixture-test-tomato"].growth, "I");
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});
