import { NR } from "../config.mjs";

const { HandlebarsApplicationMixin, ApplicationV2, DialogV2 } = foundry.applications.api;

/**
 * Charaktergenerator nach „Step by Step“ (NoReturn 2E, S. 134–136).
 * Liest Spezies, Abnormitäten, Eigenschaften, Style-Skills, Vor-/Nachteile, Merkmale, PSI und Ausrüstung aus den Compendien.
 */
export class NRCharacterGenerator extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: "noreturn-character-generator",
    classes: ["noreturn", "nr-generator"],
    tag: "form",
    window: { title: "NR.Gen.Title", icon: "fa-solid fa-user-plus", resizable: true },
    position: { width: 960, height: 760 },
    form: { handler: () => {}, submitOnChange: false, closeOnSubmit: false },
    actions: {
      goto: NRCharacterGenerator.#onGoto,
      next: NRCharacterGenerator.#onNext,
      prev: NRCharacterGenerator.#onPrev,
      toggle: NRCharacterGenerator.#onToggle,
      attr: NRCharacterGenerator.#onAttr,
      skill: NRCharacterGenerator.#onSkill,
      psiLevel: NRCharacterGenerator.#onPsiLevel,
      level: NRCharacterGenerator.#onLevel,
      meditation: NRCharacterGenerator.#onMeditation,
      advMarkers: NRCharacterGenerator.#onAdvMarkers,
      addLanguage: NRCharacterGenerator.#onAddLanguage,
      removeLanguage: NRCharacterGenerator.#onRemoveLanguage,
      cart: NRCharacterGenerator.#onCart,
      rollButterfly: NRCharacterGenerator.#onRollButterfly,
      randomTraits: NRCharacterGenerator.#onRandomTraits,
      pickImage: NRCharacterGenerator.#onPickImage,
      create: NRCharacterGenerator.#onCreate,
      showItem: NRCharacterGenerator.#onShowItem
    }
  };

  static PARTS = {
    main: { template: "systems/noreturn/templates/apps/character-generator.hbs", scrollable: [".nr-gen-body"] }
  };

  static STEPS = [
    { id: "concept", icon: "fa-lightbulb" },
    { id: "species", icon: "fa-dna" },
    { id: "abnormal", icon: "fa-biohazard" },
    { id: "attributes", icon: "fa-dumbbell" },
    { id: "skills", icon: "fa-list-check" },
    { id: "psi", icon: "fa-brain" },
    { id: "style", icon: "fa-hand-fist" },
    { id: "advantages", icon: "fa-scale-balanced" },
    { id: "gear", icon: "fa-cart-shopping" },
    { id: "traits", icon: "fa-masks-theater" },
    { id: "summary", icon: "fa-flag-checkered" }
  ];

  constructor(options = {}) {
    super(options);
    this.gen = {
      step: 0, name: "", concept: "", gender: "", age: "", img: "icons/svg/mystery-man.svg", biography: "",
      powerLevel: "standard", speciesId: null, mutantAttrs: [],
      abnormalities: [], bioTraits: {}, attributes: Object.fromEntries(Object.keys(NR.attributes).map(k => [k, 1])),
      skills: {}, nativeName: "Babel", languages: [], psi: {}, psiApps: [], styleSkills: {}, advantages: [], weakAttrs: [], designs: [],
      meditation: 1, n2Skills: [], masterySkills: [], implantSkills: [], hmoPowers: [], advMarkers: {}, retractable: [],
      cart: {}, moneyGp: 0, traits: [], butterfly: { red: null, white: null, choice: "", choice2: "" }, shopFilter: "waffen", shopSearch: ""
    };
    this.data = null;
  }

  /* -------------------------------------------- */
  /*  Daten                                        */
  /* -------------------------------------------- */

  async _loadData() {
    if (this.data) return this.data;
    const load = async name => {
      const pack = game.packs.get(`noreturn.${name}`);
      if (!pack) return [];
      const docs = await pack.getDocuments();
      return docs.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    };
    const [species, abnormalities, bioTraits, styleSkills, advantages, traits, powers, apps, waffen, ruestungen, ausruestung, munition, augmentierung] = await Promise.all(
      ["spezies", "abnormitaeten", "bio-eigenschaften", "style-skills", "vor-nachteile", "merkmale", "psi-kraefte", "psi-apps", "waffen", "ruestungen", "ausruestung", "munition", "augmentierung"].map(load));
    const byId = new Map();
    for (const list of [species, abnormalities, bioTraits, styleSkills, advantages, traits, powers, apps, waffen, ruestungen, ausruestung, munition, augmentierung]) {
      for (const d of list) byId.set(d.uuid, d);
    }
    this.data = { species, abnormalities, bioTraits, styleSkills, advantages, traits, powers: powers.filter(p => p.system.key !== "kategorieB"), hmo: powers.filter(p => p.system.key === "kategorieB"), apps,
      shop: { waffen, ruestungen, ausruestung, munition, augmentierung }, byId };
    return this.data;
  }

  get species() {
    return this.gen.speciesId ? this.data?.byId.get(this.gen.speciesId) : null;
  }

  _has(list, name) {
    return list.some(uuid => this.data.byId.get(uuid)?.name.toLowerCase().startsWith(name.toLowerCase()));
  }

  /* -------------------------------------------- */
  /*  Regelberechnung                              */
  /* -------------------------------------------- */

  /** Vollständige GP-Bilanz und Prüfungen. */
  _compute() {
    const s = this.gen;
    const d = this.data;
    const sp = this.species;
    const level = NR.powerLevels[s.powerLevel];
    const advDocs = s.advantages.map(u => d.byId.get(u)).filter(Boolean);
    const extraGp = advDocs.some(a => a.name.startsWith("Tausendsassa")) ? 20 : 0;
    const restricted = advDocs.some(a => a.name.startsWith("Eingeschränkte Ausrüstung"));
    const analphabet = advDocs.some(a => a.name.startsWith("Analphabet"));
    const outOfShape = advDocs.some(a => a.name.startsWith("Außer Form"));
    const isMutant = sp?.name === "Mutant";
    const awakened = !!sp?.system.awakened;
    const psiAllowed = !!sp?.system.psi;
    const bodyKeys = ["ge", "st", "ko", "be", "wa"];

    const gp = { species: sp?.system.gp ?? 0, abnormal: 0, bio: 0, design: 0, attributes: 0, skills: 0, languages: 0, psi: 0, style: 0, money: s.moneyGp };
    for (const u of s.abnormalities) gp.abnormal += d.byId.get(u)?.system.gp ?? 0;
    for (const u of s.designs) gp.design += d.byId.get(u)?.system.gp ?? 0;

    // Biologische Eigenschaften
    const mutations = s.abnormalities.filter(u => d.byId.get(u)?.name === "Tierische Mutation").length;
    let bioTotal = 0, hiddenTotal = 0, covers = 0;
    for (const [u, lvl] of Object.entries(s.bioTraits)) {
      const t = d.byId.get(u);
      if (!t) continue;
      // „Einziehbar“ (S. 165): +5 GP, sichtbare Eigenschaft bis 15 GP wird verborgen
      const retract = s.retractable.includes(u) && t.system.kind === "sichtbar" && t.system.gp <= 15;
      const cost = (t.system.perLevel ? t.system.gp * lvl : t.system.gp) + (retract ? 5 : 0);
      if (t.system.kind === "auffaelligkeit") covers += t.system.covers;
      else {
        bioTotal += cost;
        // Robotische Adaption (Erwachte): keine Auffälligkeiten nötig
        if ((t.system.kind === "verborgen" || retract) && !awakened) hiddenTotal += cost;
      }
    }
    const bioBudget = awakened ? NR.awakened.adaptionMax : isMutant ? (sp.system.bioGp || 120) : mutations * 5;
    gp.bio = (isMutant || awakened) ? bioTotal : 0;

    // Attribute (Schwaches Attribut: max. 2, Stufe 2 kostet 20 GP)
    const attrMax = {};
    for (const k of Object.keys(NR.attributes)) {
      let max = 99;
      if (outOfShape && ["st", "ko", "be"].includes(k)) max = 2;
      if (s.weakAttrs.includes(k)) max = 2;
      if (sp?.name === "Zeneritone" && ["st", "ko"].includes(k)) max = 2;
      attrMax[k] = max;
      const v = s.attributes[k];
      if (awakened && bodyKeys.includes(k)) { attrMax[k] = v; continue; }
      gp.attributes += (s.weakAttrs.includes(k) || (sp?.name === "Zeneritone" && ["st", "ko"].includes(k))) && v >= 2 ? 20 : NR.attributeGpCost(v);
    }

    for (const v of Object.values(s.skills)) gp.skills += v * 2;
    const hasN2 = this._has(s.abnormalities, "N²");
    const hasImplant = this._has(s.abnormalities, "Mysteriöses Implantat");
    const hasMastery = this._has(s.advantages, "Meisterschaft");
    for (const l of s.languages) gp.languages += l.value * 2;

    // PSI
    const freePowers = sp?.system.freePsi ?? 0;
    const powerEntries = Object.entries(s.psi).filter(([, v]) => v > 0);
    powerEntries.forEach(([key, v], i) => {
      const free = i < freePowers ? 3 : 0;
      gp.psi += Math.max(0, v - free) * 5;
    });

    // HMO-Kräfte der Kategorie B (S. 154/214): eine frei, jede weitere 7 GP
    const hmoDoc = s.abnormalities.map(u => d.byId.get(u)).find(a => a?.name.startsWith("HMO"));
    gp.hmo = hmoDoc ? Math.max(0, s.hmoPowers.length - 1) * 7 : 0;

    // Style-Skills
    let hasMeditation = false;
    for (const [u, lvl] of Object.entries(s.styleSkills)) {
      const t = d.byId.get(u);
      if (!t || lvl <= 0) continue;
      gp.style += t.system.kind === "kampfkunst" ? t.system.gp * lvl : t.system.gp;
      if (t.name === "Meditation") hasMeditation = true;
    }
    // Meditation: Stufe 1 inklusive, bei Erschaffung 5 GP je weitere Stufe bis 5 (S. 182)
    if (hasMeditation) gp.style += (Math.max(1, Math.min(5, s.meditation)) - 1) * 5;

    const spent = Object.values(gp).reduce((a, b) => a + b, 0);
    const available = level.gp + extraGp;

    // Vorteilsmarker
    let markersGained = 0, markersSpent = 0, disadvantages = 0;
    for (const a of advDocs) {
      const m = s.advMarkers[a.uuid] ?? a.system.markers;
      if (a.system.kind === "vorteil") markersSpent += a.name.startsWith("Meisterschaft") ? m * Math.max(1, s.masterySkills.length) : m;
      else { markersGained += m * (a.name.startsWith("Schwaches Attribut") ? Math.max(1, s.weakAttrs.length) : 1); disadvantages++; }
    }

    // Geld
    let money = s.moneyGp * level.money;
    if (restricted) money = Math.floor(money / 2);
    let cartCost = 0;
    for (const [u, q] of Object.entries(s.cart)) cartCost += (d.byId.get(u)?.system.price ?? 0) * q;

    // PSI-Hierarchie
    const tiers = { 1: 0, 2: 0, 3: 0 };
    for (const [key] of powerEntries) tiers[NR.psiPowers[key]?.tier ?? 1]++;
    const hierarchyOk = tiers[2] <= tiers[1] && tiers[3] <= Math.min(tiers[1], tiers[2]);

    // Prüfungen
    const issues = [];
    const warn = (step, msg) => issues.push({ step, msg });
    if (!s.name.trim()) warn(0, game.i18n.localize("NR.Gen.Issue.Name"));
    if (!sp) warn(1, game.i18n.localize("NR.Gen.Issue.Species"));
    if (isMutant && s.mutantAttrs.length !== 2) warn(1, game.i18n.localize("NR.Gen.Issue.MutantAttrs"));
    if (spent > available) warn(10, game.i18n.format("NR.Gen.Issue.Gp", { n: spent - available }));
    if (bioTotal > bioBudget) warn(awakened ? 1 : 2, game.i18n.format(awakened ? "NR.Gen.Issue.AdaptionBudget" : "NR.Gen.Issue.BioBudget", { n: bioTotal, max: bioBudget }));
    if (hiddenTotal > covers) warn(2, game.i18n.format("NR.Gen.Issue.Conspicuity", { n: hiddenTotal, c: covers }));
    if (this._has(s.abnormalities, "Demigod") && s.abnormalities.length < 4) warn(2, game.i18n.localize("NR.Gen.Issue.Demigod"));
    for (const [k, v] of Object.entries(s.attributes)) if (v > attrMax[k]) warn(3, game.i18n.format("NR.Gen.Issue.AttrMax", { a: NR.attributes[k].label, max: attrMax[k] }));
    if (powerEntries.length && !psiAllowed) warn(5, game.i18n.localize("NR.Gen.Issue.PsiNotAllowed"));
    if (!hierarchyOk) warn(5, game.i18n.localize("NR.Gen.Issue.Hierarchy"));
    for (const [key, v] of powerEntries) {
      const apps = s.psiApps.filter(u => d.byId.get(u)?.system.power === key).length;
      if (apps > v) warn(5, game.i18n.format("NR.Gen.Issue.TooManyApps", { p: NR.psiPowers[key].label, n: apps, max: v }));
    }
    for (const [k, v] of Object.entries(s.skills)) {
      const lim = hasN2 && s.n2Skills.includes(k) ? 6 : 4;
      if (v > lim) warn(4, game.i18n.format("NR.Gen.Issue.SkillMax", { s: NR.skills[k]?.label ?? k, max: lim }));
    }
    if (hasN2 && s.n2Skills.length !== 2) warn(4, game.i18n.format("NR.Gen.Issue.N2", { n: s.n2Skills.length }));
    if (hasImplant && s.implantSkills.length !== 2) warn(4, game.i18n.format("NR.Gen.Issue.Implant", { n: s.implantSkills.length }));
    if (hasMastery && !s.masterySkills.length) warn(4, game.i18n.localize("NR.Gen.Issue.Mastery"));
    if (hmoDoc) {
      if (!s.hmoPowers.length) warn(5, game.i18n.localize("NR.Gen.Issue.HmoNone"));
      const shadow = d.hmo.find(x => x.name.startsWith("Unaufhaltsamer Schatten"));
      if (hmoDoc.system.variant === "iHMO" && shadow && !s.hmoPowers.includes(shadow.uuid)) warn(5, game.i18n.localize("NR.Gen.Issue.HmoShadow"));
      for (const u of s.hmoPowers) if (d.byId.get(u)?.name.startsWith("Bloodwalker") && !this._has(s.abnormalities, "Demigod")) warn(5, game.i18n.localize("NR.Gen.Issue.Bloodwalker"));
    } else if (s.hmoPowers.length) warn(5, game.i18n.localize("NR.Gen.Issue.HmoMissing"));
    if (markersSpent > markersGained) warn(7, game.i18n.format("NR.Gen.Issue.Markers", { s: markersSpent, g: markersGained }));
    if (disadvantages > 4) warn(7, game.i18n.localize("NR.Gen.Issue.MaxDisadvantages"));
    if (cartCost > money) warn(8, game.i18n.format("NR.Gen.Issue.Money", { n: cartCost - money }));
    if (s.traits.length !== 3) warn(9, game.i18n.format("NR.Gen.Issue.Traits", { n: s.traits.length }));
    if (!s.butterfly.choice) warn(9, game.i18n.localize("NR.Gen.Issue.Butterfly"));
    if (awakened) {
      for (const u of s.abnormalities) if (!d.byId.get(u)?.name.startsWith("Mysteriöses Implantat")) warn(2, game.i18n.format("NR.Gen.Issue.AwakenedAbnormal", { n: d.byId.get(u)?.name }));
      for (const [u, lvl] of Object.entries(s.bioTraits)) {
        const t = d.byId.get(u);
        if (lvl > 0 && t && NR.awakened.excludedTraits.some(x => t.name.startsWith(x))) warn(1, game.i18n.format("NR.Gen.Issue.AwakenedTrait", { n: t.name }));
      }
      const fin = this._finalAttributes();
      for (const [k, max] of Object.entries(NR.awakened.maxima)) if (fin[k] > max) warn(8, game.i18n.format("NR.Gen.Issue.AttrMax", { a: NR.attributes[k].label, max }));
      const cap = this._awakenedCapacity();
      if (cap > NR.awakened.capacity) warn(8, game.i18n.format("NR.Gen.Issue.Capacity", { n: cap, max: NR.awakened.capacity }));
    }

    const nativeLevel = (s.attributes.wi <= 1 || analphabet) ? 2 : 5;
    return {
      gp, spent, available, left: available - spent, level, extraGp, money, cartCost, moneyLeft: money - cartCost, restricted,
      markersGained, markersSpent, disadvantages, bioTotal, bioBudget, hiddenTotal, covers, isMutant, awakened, psiAllowed, freePowers,
      capacity: awakened ? this._awakenedCapacity() : 0,
      capacityParts: awakened ? this._awakenedCapacityParts() : [],
      hasN2, hasImplant, hasMastery, hasMeditation, hmo: !!hmoDoc, hmoVariant: hmoDoc?.system.variant ?? "",
      tiers, hierarchyOk, issues, attrMax, nativeLevel, extraTalented: advDocs.some(a => a.name.startsWith("Extrem talentiert"))
    };
  }

  /** Erwachte: Aufschlüsselung der Kapazität je Ganzkörper-Paket (S. 146: GE/BE 0,5, ST/KO 0,25 je Stufe). */
  _awakenedCapacityParts() {
    const parts = [];
    for (const [u, q] of Object.entries(this.gen.cart)) {
      const i = this.data.byId.get(u);
      if (i?.type !== "augment" || !i.system.fullBody || !q) continue;
      const per = i.system.capacityCost || 0;
      parts.push({ name: i.name.replace(/^Ganzkörper:\s*/, "").replace(/\s*\(\+\d+\)$/, ""), q, per: per.toLocaleString("de-DE"), total: (per * q).toLocaleString("de-DE") });
    }
    return parts;
  }

  /** Erwachte: verbrauchte Kapazität je Zone durch Ganzkörper-Pakete im Warenkorb. */
  _awakenedCapacity() {
    let used = 0;
    for (const [u, q] of Object.entries(this.gen.cart)) {
      const i = this.data.byId.get(u);
      if (i?.type === "augment" && i.system.fullBody) used += (i.system.capacityCost || 0) * q;
    }
    return used;
  }

  /** Endwerte der Attribute inkl. Spezies- und Mutantenboni. */
  _finalAttributes() {
    const sp = this.species;
    const out = {};
    for (const k of Object.keys(NR.attributes)) {
      let v = this.gen.attributes[k];
      // Erwachte: Ganzkörper-Upgrade-Pakete aus dem Warenkorb
      if (sp?.system.awakened) {
        for (const [u, q] of Object.entries(this.gen.cart)) {
          const i = this.data.byId.get(u);
          if (i?.type === "augment" && i.system.fullBody) for (const m of i.system.modifiers ?? []) if (m.target === `attributes.${k}`) v += m.value * q;
        }
      }
      for (const m of sp?.system.modifiers ?? []) if (m.target === `attributes.${k}`) v += m.value;
      if (this.gen.mutantAttrs.includes(k)) v += 1;
      for (const u of this.gen.abnormalities) for (const m of this.data.byId.get(u)?.system.modifiers ?? []) if (m.target === `attributes.${k}`) v += m.value;
      for (const [u, lvl] of Object.entries(this.gen.bioTraits)) {
        const t = this.data.byId.get(u);
        if (!t || lvl <= 0) continue;
        for (const m of t.system.modifiers ?? []) if (m.target === `attributes.${k}`) v += m.value * (t.system.perLevel ? lvl : 1);
      }
      out[k] = v;
    }
    return out;
  }

  /* -------------------------------------------- */
  /*  Rendering                                    */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const d = await this._loadData();
    const s = this.gen;
    const c = this._compute();
    const sp = this.species;
    const finalAttr = this._finalAttributes();
    const has = (list, u) => list.includes(u);
    const stepDef = NRCharacterGenerator.STEPS;

    const steps = stepDef.map((st, i) => ({
      ...st, index: i, label: game.i18n.localize(`NR.Gen.Step.${st.id}`), active: i === s.step,
      done: i < s.step, issues: c.issues.filter(x => x.step === i).length
    }));

    // Attribute
    const attributes = Object.entries(NR.attributes).map(([k, a]) => {
      const v = s.attributes[k];
      return {
        key: k, label: a.label, abbr: a.abbr, value: v, final: finalAttr[k], bonus: finalAttr[k] - v,
        fixed: c.awakened && ["ge", "st", "ko", "be", "wa"].includes(k),
        cost: (c.awakened && ["ge", "st", "ko", "be", "wa"].includes(k)) ? 0 : NR.attributeGpCost(v), next: NR.attributeGpCost(v + 1) - NR.attributeGpCost(v), max: c.attrMax[k], atMax: v >= c.attrMax[k]
      };
    });

    // Fertigkeiten
    const butterflySkills = NR.butterflyEffects[s.butterfly.choice]?.skills ?? [];
    const skillGroups = Object.entries(NR.attributes).map(([k, a]) => ({
      key: k, label: a.label, final: finalAttr[k],
      skills: Object.entries(NR.skills).filter(([, sk]) => sk.attr === k).map(([key, sk]) => {
        const v = s.skills[key] ?? 0;
        const n2 = c.hasN2 && s.n2Skills.includes(key);
        const mastery = c.hasMastery && s.masterySkills.includes(key);
        const implant = c.hasImplant && s.implantSkills.includes(key);
        const mod = (sp?.system.modifiers ?? []).filter(m => m.target === `skills.${key}`).reduce((a2, m) => a2 + m.value, 0)
          + (n2 ? 1 : 0) + (mastery ? 1 : 0) + (implant ? 1 : 0);
        return {
          key, label: sk.label, value: v, mod, pool: v + mod > 0 ? finalAttr[k] + v + mod : Math.max(1, finalAttr[k] - 2), butterfly: butterflySkills.includes(key),
          n2, mastery, implant, canImplant: c.hasImplant && k === "wi", atMax: v >= (n2 ? 6 : 4)
        };
      })
    }));

    // PSI
    const powerList = Object.entries(s.psi).filter(([, v]) => v > 0).map(([k]) => k);
    const powers = d.powers.map(p => {
      const key = p.system.key;
      const lvl = s.psi[key] ?? 0;
      const free = lvl > 0 && powerList.indexOf(key) < c.freePowers;
      return {
        doc: p, key, tier: NR.psiPowers[key]?.tier, level: lvl, free,
        apps: d.apps.filter(a => a.system.power === key).map(a => ({
          doc: a, uuid: a.uuid, selected: has(s.psiApps, a.uuid), diff: NR.psiDifficulties[a.system.difficulty]?.label
        })),
        appsChosen: s.psiApps.filter(u => d.byId.get(u)?.system.power === key).length
      };
    });

    // Biologische Eigenschaften
    const bioRows = d.bioTraits.map(t => ({ doc: t, uuid: t.uuid, level: s.bioTraits[t.uuid] ?? 0, selected: (s.bioTraits[t.uuid] ?? 0) > 0 }));

    // Shop
    const shopKeys = { waffen: "Waffen", ruestungen: "Schutzkleidung", ausruestung: "Ausrüstung", munition: "Munition", augmentierung: "Augmentierung" };
    const search = s.shopSearch.toLowerCase();
    const shop = (d.shop[s.shopFilter] ?? [])
      .filter(i => !search || i.name.toLowerCase().includes(search))
      .filter(i => !c.restricted || (i.system.ts ?? 0) <= 2)
      .map(i => ({ doc: i, uuid: i.uuid, price: i.system.price ?? 0, ts: NR.techLevels[i.system.ts ?? 0], qty: s.cart[i.uuid] ?? 0, stats: i.chatStats?.() ?? [] }));
    const cart = Object.entries(s.cart).filter(([, q]) => q > 0).map(([u, q]) => {
      const i = d.byId.get(u);
      return { uuid: u, name: i?.name, qty: q, price: i?.system.price ?? 0, total: (i?.system.price ?? 0) * q };
    });

    // Butterfly-Optionen
    const redKeys = ["artisan", "athlete", "craftsman", "leader", "marksman", "medic"];
    const whiteKeys = ["operator", "rogue", "scholar", "scout", "trickster", "warrior"];
    const b = s.butterfly;
    const butterflyOptions = [];
    if (b.red) butterflyOptions.push(redKeys[b.red - 1]);
    if (b.white) butterflyOptions.push(whiteKeys[b.white - 1]);
    if (b.red && b.red === b.white) butterflyOptions.push(b.red <= 4 ? "copycat" : "skillmaster");
    const allButterfly = Object.entries(NR.butterflyEffects).filter(([k]) => k).map(([k, v]) => ({ key: k, label: v.label, skills: v.skills.map(x => NR.skills[x].label).join(", "), rolled: butterflyOptions.includes(k), selected: b.choice === k, selected2: b.choice2 === k }));

    Object.assign(ctx, {
      s, c, d, sp, steps, step: s.step, stepId: stepDef[s.step].id, isFirst: s.step === 0, isLast: s.step === stepDef.length - 1,
      config: NR, powerLevels: Object.entries(NR.powerLevels).map(([k, v]) => ({ key: k, ...v, selected: s.powerLevel === k })),
      species: d.species.map(x => ({ doc: x, uuid: x.uuid, selected: x.uuid === s.speciesId, mods: (x.system.modifiers ?? []).map(m => `${NR.modifierTargets[m.target] ?? m.target} ${m.value > 0 ? "+" : ""}${m.value}`).join(", ") })),
      attrChoices: Object.entries(NR.attributes).map(([k, a]) => ({ key: k, label: a.label, selected: s.mutantAttrs.includes(k), weak: s.weakAttrs.includes(k) })),
      abnormalities: d.abnormalities.map(x => ({ doc: x, uuid: x.uuid, selected: has(s.abnormalities, x.uuid) })),
      bioVisible: bioRows.filter(r => r.doc.system.kind === "sichtbar").map(r => ({ ...r, canRetract: r.doc.system.gp <= 15, retract: s.retractable.includes(r.uuid) })),
      hmoPowers: (d.hmo ?? []).map(x => ({ doc: x, uuid: x.uuid, selected: has(s.hmoPowers, x.uuid) })),
      meditation: Math.max(1, Math.min(5, s.meditation)),
      bioHidden: bioRows.filter(r => r.doc.system.kind === "verborgen" && r.doc.name !== "Einziehbar"),
      bioConspicuity: bioRows.filter(r => r.doc.system.kind === "auffaelligkeit"),
      showBio: c.isMutant || c.awakened || c.bioBudget > 0,
      designs: (d.shop.augmentierung ?? []).filter(x => x.system.kind === "design").map(x => ({ doc: x, uuid: x.uuid, selected: has(s.designs, x.uuid) })),
      adaptionVisible: bioRows.filter(r => r.doc.system.kind !== "auffaelligkeit" && r.doc.name !== "Einziehbar" && !NR.awakened.excludedTraits.some(n => r.doc.name.startsWith(n))).map(r => ({ ...r, canRetract: r.doc.system.kind === "sichtbar" && r.doc.system.gp <= 15, retract: s.retractable.includes(r.uuid) })),
      attributes, skillGroups,
      languages: s.languages.map((l, i) => ({ ...l, index: i })),
      powers, styleExpert: d.styleSkills.filter(x => x.system.kind === "expert").map(x => ({ doc: x, uuid: x.uuid, selected: (s.styleSkills[x.uuid] ?? 0) > 0 })),
      styleArts: d.styleSkills.filter(x => x.system.kind === "kampfkunst").map(x => ({ doc: x, uuid: x.uuid, level: s.styleSkills[x.uuid] ?? 0, levels: x.system.levels.map((l, i) => ({ ...l, n: i + 1, active: i < (s.styleSkills[x.uuid] ?? 0) })) })),
      vorteile: d.advantages.filter(x => x.system.kind === "vorteil").map(x => ({ doc: x, uuid: x.uuid, selected: has(s.advantages, x.uuid), markers: s.advMarkers[x.uuid] ?? x.system.markers })),
      nachteile: d.advantages.filter(x => x.system.kind === "nachteil").map(x => ({ doc: x, uuid: x.uuid, selected: has(s.advantages, x.uuid), markers: s.advMarkers[x.uuid] ?? x.system.markers })),
      weakSelected: this._has(s.advantages, "Schwaches Attribut"),
      shop, cart, shopTabs: Object.entries(shopKeys).map(([k, v]) => ({ key: k, label: v, active: s.shopFilter === k })),
      justice: d.traits.filter(x => x.system.kind === "justice").map(x => ({ doc: x, uuid: x.uuid, selected: has(s.traits, x.uuid) })),
      chaos: d.traits.filter(x => x.system.kind === "chaos").map(x => ({ doc: x, uuid: x.uuid, selected: has(s.traits, x.uuid) })),
      butterflyOptions: allButterfly,
      summary: s.step === stepDef.length - 1 ? this._summary(finalAttr) : null,
      canCreate: c.issues.length === 0
    });
    return ctx;
  }

  _summary(finalAttr) {
    const d = this.data;
    const s = this.gen;
    const names = list => list.map(u => d.byId.get(u)?.name).filter(Boolean).join(", ") || "–";
    return {
      attributes: Object.entries(NR.attributes).map(([k, a]) => `${a.abbr} ${finalAttr[k]}`).join(" · "),
      skills: Object.entries(s.skills).filter(([, v]) => v > 0).map(([k, v]) => `${NR.skills[k].label} ${v}`).join(", ") || "–",
      psi: Object.entries(s.psi).filter(([, v]) => v > 0).map(([k, v]) => `${NR.psiPowers[k].label} ${v}`).join(", ") || "–",
      apps: [names(s.psiApps), s.hmoPowers.length ? `HMO: ${names(s.hmoPowers)}` : ""].filter(x => x && x !== "–").join(" · ") || "–",
      abnormal: names(s.abnormalities),
      bio: Object.entries(s.bioTraits).filter(([, l]) => l > 0).map(([u, l]) => `${d.byId.get(u)?.name}${l > 1 ? ` ${l}` : ""}`).join(", ") || "–",
      style: Object.entries(s.styleSkills).filter(([, l]) => l > 0).map(([u, l]) => `${d.byId.get(u)?.name}${d.byId.get(u)?.system.kind === "kampfkunst" ? ` ${l}` : ""}`).join(", ") || "–",
      advantages: names(s.advantages),
      traits: names(s.traits),
      butterfly: [s.butterfly.choice, s.butterfly.choice2].filter(Boolean).map(k => NR.butterflyEffects[k]?.label).join(" + ") || "–",
      languages: [`${s.nativeName} ${this._compute().nativeLevel}`, ...s.languages.map(l => `${l.name} ${l.value}`)].join(", ")
    };
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    const el = this.element;
    el.querySelectorAll("[data-field]").forEach(input => {
      input.addEventListener("change", ev => this._onField(ev));
    });
    const search = el.querySelector("[name=shopSearch]");
    if (search) search.addEventListener("input", foundry.utils.debounce(ev => { this.gen.shopSearch = ev.target.value; this.render({ parts: ["main"] }).then(() => { const s2 = this.element.querySelector("[name=shopSearch]"); s2?.focus(); s2?.setSelectionRange(s2.value.length, s2.value.length); }); }, 350));
  }

  _onField(ev) {
    const t = ev.currentTarget;
    const field = t.dataset.field;
    let value = t.type === "checkbox" ? t.checked : t.value;
    if (t.type === "number") value = Number(value) || 0;
    if (field.startsWith("lang.")) {
      const [, idx, key] = field.split(".");
      this.gen.languages[Number(idx)][key] = key === "value" ? Math.max(1, value) : value;
    } else foundry.utils.setProperty(this.gen, field, value);
    const rerender = !["name", "concept", "gender", "age", "biography", "nativeName"].includes(field) && !field.endsWith(".name");
    if (rerender) this.render({ parts: ["main"] });
  }

  /* -------------------------------------------- */
  /*  Aktionen                                     */
  /* -------------------------------------------- */

  static #onGoto(event, target) {
    this.gen.step = Number(target.dataset.step);
    this.render({ parts: ["main"] });
  }

  static #onNext() {
    this.gen.step = Math.min(NRCharacterGenerator.STEPS.length - 1, this.gen.step + 1);
    this.render({ parts: ["main"] });
  }

  static #onPrev() {
    this.gen.step = Math.max(0, this.gen.step - 1);
    this.render({ parts: ["main"] });
  }

  /** Auswahl umschalten: data-list = Statusfeld, data-uuid / data-key. */
  static #onToggle(event, target) {
    const { list, uuid, key, max } = target.dataset;
    const s = this.gen;
    const id = uuid ?? key;
    if (list === "species") {
      const wasAwakened = !!this.species?.system.awakened;
      s.speciesId = id;
      s.mutantAttrs = [];
      const isAwakened = !!this.species?.system.awakened;
      if (isAwakened) {
        Object.assign(s.attributes, NR.awakened.physical, { wa: NR.awakened.perception });
        s.abnormalities = s.abnormalities.filter(u => this.data.byId.get(u)?.name.startsWith("Mysteriöses Implantat"));
      } else if (wasAwakened) {
        for (const k of ["ge", "st", "ko", "be", "wa"]) s.attributes[k] = 1;
        s.designs = [];
      }
      if (!this.species?.system.psi) { s.psi = {}; s.psiApps = []; }
      if (!(this.species?.system.bioGp > 0) && !this.species?.system.awakened) s.bioTraits = {};
    } else if (list === "bioTraits") {
      s.bioTraits[id] = (s.bioTraits[id] ?? 0) > 0 ? 0 : 1;
      if (!s.bioTraits[id]) s.retractable = s.retractable.filter(u => u !== id);
    } else if (list === "styleSkills") {
      s.styleSkills[id] = (s.styleSkills[id] ?? 0) > 0 ? 0 : 1;
    } else {
      const arr = s[list];
      const i = arr.indexOf(id);
      if (i >= 0) arr.splice(i, 1);
      else {
        if (max && arr.length >= Number(max)) arr.shift();
        arr.push(id);
      }
    }
    this.render({ parts: ["main"] });
  }

  static #onAttr(event, target) {
    const k = target.dataset.key;
    const delta = Number(target.dataset.delta);
    const c = this._compute();
    this.gen.attributes[k] = Math.max(1, Math.min(c.attrMax[k], this.gen.attributes[k] + delta));
    this.render({ parts: ["main"] });
  }

  static #onSkill(event, target) {
    const k = target.dataset.key;
    const delta = Number(target.dataset.delta);
    const n2 = this._has(this.gen.abnormalities, "N²") && this.gen.n2Skills.includes(k);
    const max = n2 ? 6 : 4;
    this.gen.skills[k] = Math.max(0, Math.min(max, (this.gen.skills[k] ?? 0) + delta));
    this.render({ parts: ["main"] });
  }

  static #onPsiLevel(event, target) {
    const k = target.dataset.key;
    const delta = Number(target.dataset.delta);
    const v = Math.max(0, Math.min(6, (this.gen.psi[k] ?? 0) + delta));
    this.gen.psi[k] = v;
    if (v === 0) this.gen.psiApps = this.gen.psiApps.filter(u => this.data.byId.get(u)?.system.power !== k);
    this.render({ parts: ["main"] });
  }

  static #onLevel(event, target) {
    const { list, uuid, delta, max } = target.dataset;
    const cur = this.gen[list][uuid] ?? 0;
    this.gen[list][uuid] = Math.max(0, Math.min(Number(max) || 3, cur + Number(delta)));
    this.render({ parts: ["main"] });
  }

  static #onMeditation(event, target) {
    this.gen.meditation = Math.max(1, Math.min(5, (this.gen.meditation ?? 1) + Number(target.dataset.delta)));
    this.render({ parts: ["main"] });
  }

  static #onAdvMarkers(event, target) {
    const { uuid, delta } = target.dataset;
    const doc = this.data.byId.get(uuid);
    const cur = this.gen.advMarkers[uuid] ?? doc?.system.markers ?? 1;
    this.gen.advMarkers[uuid] = Math.max(1, Math.min(10, cur + Number(delta)));
    this.render({ parts: ["main"] });
  }

  static #onAddLanguage() {
    this.gen.languages.push({ name: "Neue Sprache", value: 1 });
    this.render({ parts: ["main"] });
  }

  static #onRemoveLanguage(event, target) {
    this.gen.languages.splice(Number(target.dataset.index), 1);
    this.render({ parts: ["main"] });
  }

  static #onCart(event, target) {
    const { uuid, delta } = target.dataset;
    const q = Math.max(0, (this.gen.cart[uuid] ?? 0) + Number(delta));
    if (q) this.gen.cart[uuid] = q;
    else delete this.gen.cart[uuid];
    this.render({ parts: ["main"] });
  }

  static async #onRollButterfly() {
    const red = await new Roll("1d6").evaluate();
    const white = await new Roll("1d6").evaluate();
    this.gen.butterfly = { red: red.total, white: white.total, choice: "", choice2: "" };
    await ChatMessage.create({
      speaker: { alias: this.gen.name || game.i18n.localize("NR.Gen.Title") }, rolls: [red, white],
      content: `<div class="nr-card"><h3>Butterfly Effect</h3><p>${game.i18n.format("NR.Gen.ButterflyRolled", { red: red.total, white: white.total })}</p></div>`
    });
    this.render({ parts: ["main"] });
  }

  static #onRandomTraits() {
    const all = this.data.traits.map(t => t.uuid);
    const pick = [];
    while (pick.length < 3 && all.length) pick.push(all.splice(Math.floor(Math.random() * all.length), 1)[0]);
    this.gen.traits = pick;
    this.render({ parts: ["main"] });
  }

  static #onPickImage() {
    const FP = foundry.applications.apps.FilePicker.implementation;
    new FP({ type: "image", current: this.gen.img, callback: path => { this.gen.img = path; this.render({ parts: ["main"] }); } }).render(true);
  }

  static async #onShowItem(event, target) {
    const doc = this.data.byId.get(target.dataset.uuid);
    doc?.sheet.render(true);
  }

  /** Charakter anlegen. */
  static async #onCreate() {
    const c = this._compute();
    if (c.issues.length) {
      const ok = await DialogV2.confirm({
        window: { title: game.i18n.localize("NR.Gen.Title") },
        content: `<p>${game.i18n.localize("NR.Gen.CreateAnyway")}</p><ul>${c.issues.map(i => `<li>${i.msg}</li>`).join("")}</ul>`
      });
      if (!ok) return;
    }
    if (!game.user.can("ACTOR_CREATE")) return ui.notifications.error(game.i18n.localize("NR.Gen.NoPermission"));
    const actor = await this.createActor(c);
    if (actor) {
      ui.notifications.info(game.i18n.format("NR.Gen.Created", { name: actor.name }));
      actor.sheet.render(true);
      this.close();
    }
  }

  async createActor(c) {
    const s = this.gen;
    const d = this.data;
    const sp = this.species;
    const attrs = {};
    for (const k of Object.keys(NR.attributes)) attrs[k] = { value: s.attributes[k], bonus: s.mutantAttrs.includes(k) ? 1 : 0, leiden: 0 };
    const skills = Object.fromEntries(Object.keys(NR.skills).map(k => [k, { value: s.skills[k] ?? 0 }]));
    const system = {
      attributes: attrs, skills,
      special: { adrenalin: { value: sp?.system.awakened ? 0 : (sp?.system.adrenalin ?? 2), used: 0 }, schmerztoleranz: { value: sp?.system.awakened ? NR.awakened.pain : 3 }, meditation: { value: c.hasMeditation ? Math.max(1, Math.min(5, s.meditation)) - 1 : 0, used: 0 } }, // Stufe 1 liefert der Style-Skill
      tpBase: sp?.system.tp ?? 30,
      infection: { dice: sp?.system.irDice ?? 1, points: sp?.system.irPoints ?? 0, malus: 0 },
      psyche: { base: sp?.system.psyche ?? 80, loss: 0 },
      organismus: { base: sp?.system.organismus ?? 100, loss: 0 },
      money: c.moneyLeft,
      details: { species: sp?.name ?? "", concept: s.concept, gender: s.gender, age: s.age },
      biography: s.biography ? `<p>${foundry.utils.escapeHTML ? foundry.utils.escapeHTML(s.biography) : s.biography}</p>` : "",
      progress: {
        powerLevel: s.powerLevel, gpMoney: s.moneyGp, gpExtra: c.extraGp, butterfly: s.butterfly.choice, butterfly2: s.butterfly.choice2,
        reputation: this._has(s.advantages, "Berühmt") ? 6 : 1,
        xp: { value: 0, total: 0 }, jp: { value: 0, total: 0 }, cp: { value: 0, total: 0 }
      }
    };
    const actor = await Actor.create({ name: s.name || "Namenlos", type: "character", img: s.img, system });
    if (!actor) return null;

    const items = [];
    const add = (doc, patch = {}) => {
      if (!doc) return;
      const obj = doc.toObject();
      delete obj._id;
      foundry.utils.mergeObject(obj, patch);
      foundry.utils.setProperty(obj, "_stats.compendiumSource", doc.uuid);
      items.push(obj);
    };
    // Spezies zuerst (überträgt Startwerte)
    if (sp) await actor.createEmbeddedDocuments("Item", [(() => { const o = sp.toObject(); delete o._id; return o; })()]);
    const skillMods = keys => keys.map(k => ({ target: `skills.${k}`, value: 1 }));
    for (const u of s.abnormalities) {
      const doc = d.byId.get(u);
      if (doc?.name === "N²" && s.n2Skills.length) add(doc, { system: { modifiers: [...(doc.system.modifiers ?? []), ...skillMods(s.n2Skills)] } });
      else if (doc?.name.startsWith("Mysteriöses Implantat") && s.implantSkills.length) add(doc, { system: { modifiers: [...(doc.system.modifiers ?? []), ...skillMods(s.implantSkills)] } });
      else add(doc);
    }
    for (const u of s.hmoPowers) add(d.byId.get(u));
    for (const u of s.designs) {
      const doc = d.byId.get(u);
      add(doc);
      if (doc?.name.includes("Flugtauglich")) items.push({ name: "Fliegen", type: "skill", img: "icons/svg/wing.svg", system: { category: "besondere", attribute: "be", value: 3 } });
    }
    for (const [u, l] of Object.entries(s.bioTraits)) {
      if (l <= 0) continue;
      const doc = d.byId.get(u);
      if (s.retractable.includes(u) && doc?.system.kind === "sichtbar" && doc.system.gp <= 15) add(doc, { name: `${doc.name} (einziehbar)`, system: { level: l, kind: "verborgen", gp: doc.system.gp + 5 } });
      else add(doc, { system: { level: l } });
    }
    for (const [u, l] of Object.entries(s.styleSkills)) if (l > 0) add(d.byId.get(u), { system: { level: l } });
    for (const u of s.advantages) {
      const doc = d.byId.get(u);
      const markers = s.advMarkers[u] ?? doc?.system.markers;
      if (doc?.name.startsWith("Schwaches Attribut") && s.weakAttrs.length) {
        for (const k of s.weakAttrs) add(doc, { name: `Schwaches Attribut ${NR.attributes[k].label}`, system: { markers } });
      } else if (doc?.name.startsWith("Meisterschaft") && s.masterySkills.length) {
        for (const k of s.masterySkills) add(doc, { name: `Meisterschaft (${NR.skills[k]?.label ?? k})`, system: { markers, modifiers: skillMods([k]) } });
      } else add(doc, { system: { markers } });
    }
    for (const u of s.traits) add(d.byId.get(u));
    const powerKeys = Object.entries(s.psi).filter(([, v]) => v > 0).map(([k]) => k);
    powerKeys.forEach((k, i) => {
      const doc = d.powers.find(p => p.system.key === k);
      add(doc, { system: { value: s.psi[k], free: i < c.freePowers ? 3 : 0 } });
    });
    for (const u of s.psiApps) add(d.byId.get(u));
    // Sprachen
    items.push({ name: `${s.nativeName} (Muttersprache)`, type: "skill", img: "icons/svg/sound.svg", system: { category: "sprache", attribute: "", value: c.nativeLevel, native: true } });
    for (const l of s.languages) items.push({ name: l.name, type: "skill", img: "icons/svg/sound.svg", system: { category: "sprache", attribute: "", value: l.value } });
    // Startausrüstung (S. 135) und Einkäufe
    items.push({ name: "SmartCom", type: "gear", img: "icons/svg/item-bag.svg", system: { ts: 3, quantity: 1 } });
    items.push({ name: "Set schäbige Kleidung", type: "gear", img: "icons/svg/item-bag.svg", system: { ts: 1, quantity: 1 } });
    for (const [u, q] of Object.entries(s.cart)) {
      const doc = d.byId.get(u);
      if (!doc || q <= 0) continue;
      if (["weapon", "armor", "augment"].includes(doc.type)) for (let i = 0; i < q; i++) add(doc, { system: { equipped: doc.type !== "augment", installed: true } });
      else add(doc, { system: { quantity: (doc.system.quantity || 1) * q } });
    }
    if (!items.some(i => i.type === "weapon" && i.name === "Waffenloser Angriff")) {
      const fist = (await game.packs.get("noreturn.waffen")?.getDocuments())?.find(w => w.name === "Waffenloser Angriff");
      if (fist) add(fist);
    }
    await actor.createEmbeddedDocuments("Item", items);
    return actor;
  }
}

/** Öffnet den Charaktergenerator. */
export function openCharacterGenerator() {
  return new NRCharacterGenerator().render(true);
}
