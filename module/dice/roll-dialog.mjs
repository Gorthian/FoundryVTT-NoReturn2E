import { NR } from "../config.mjs";

const { renderTemplate } = foundry.applications.handlebars;

/**
 * Dialog für Würfelproben: Bonus-/Maluswürfel, Nachteil, Punkte, Mindestwurf, Adrenalin, Passen.
 * @returns {Promise<object|null>}
 */
export async function poolDialog({ title, actor, dice, woundMalus = 0, mw = 10, allowPass = true, resist = false,
  attrKey = null, altAttr = null, skillValue = null, untrained = false, extraBonus = 0, extraPoints = 0, extraContent = "" }) {

  const sys = actor?.system ?? {};
  const attrChoices = (attrKey && altAttr) ? {
    [attrKey]: `${NR.attributes[attrKey].label} (${sys.attr[attrKey].total})`,
    [altAttr]: `${NR.attributes[altAttr].label} (${sys.attr[altAttr].total})`
  } : null;

  const content = await renderTemplate("systems/noreturn/templates/dialog/roll-dialog.hbs", {
    dice, woundMalus, resist, mw, difficulties: NR.difficulties, customMw: !(mw in NR.difficulties),
    adrenalinLeft: sys.adrenalinLeft ?? 0, adrenalinBonus: sys.adrenalinBonus ?? 0,
    meditationLeft: sys.meditationLeft ?? 0, meditationBonus: Math.min(5, sys.meditationMax ?? 0),
    allowPass, attrChoices, attrKey, extraBonus, extraPoints, extraContent,
    malusDetail: sys.malus ? buildMalusDetail(sys.malus) : ""
  });

  return foundry.applications.api.DialogV2.wait({
    window: { title, icon: "fa-solid fa-dice-six" },
    classes: ["noreturn", "nr-roll-dialog"],
    position: { width: 420 },
    content,
    buttons: [{
      action: "roll",
      label: game.i18n.localize("NR.Roll.Roll"),
      icon: "fa-solid fa-dice",
      default: true,
      callback: (event, button) => {
        const f = button.form.elements;
        const mwSel = f.mwSelect?.value;
        const mwVal = mwSel === "custom" ? Number(f.mwCustom.value) : Number(mwSel);
        return {
          bonusDice: Number(f.bonusDice.value) || 0,
          malusDice: Number(f.malusDice.value) || 0,
          disadvantages: Number(f.disadvantages.value) || 0,
          points: Number(f.points.value) || 0,
          mw: Number.isFinite(mwVal) ? mwVal : 0,
          useAdrenalin: f.useAdrenalin?.checked ?? false,
          useMeditation: f.useMeditation?.checked ?? false,
          pass: f.pass?.checked ?? false,
          attr: f.attr?.value ?? attrKey,
          form: button.form
        };
      }
    }, {
      action: "cancel",
      label: game.i18n.localize("Cancel"),
      icon: "fa-solid fa-xmark"
    }],
    render: (event, dialog) => {
      const el = dialog.element;
      const sel = el.querySelector("[name=mwSelect]");
      const custom = el.querySelector("[name=mwCustom]");
      if (sel && custom) {
        const toggle = () => custom.closest(".form-group").classList.toggle("hidden", sel.value !== "custom");
        sel.addEventListener("change", toggle);
        toggle();
      }
    }
  }).then(r => (r === "cancel" || !r) ? null : r).catch(() => null);
}

function buildMalusDetail(m) {
  const parts = [];
  if (m.wounds) parts.push(`Wunden −${m.wounds}`);
  if (m.nonLethal) parts.push(`Betäubung −${m.nonLethal}`);
  if (m.temp) parts.push(`Temporär ${m.temp > 0 ? "−" : "+"}${Math.abs(m.temp)}`);
  if (m.psiCollect) parts.push(`Kraft sammeln −${m.psiCollect}`);
  if (m.hold) parts.push(`Haltung −${m.hold}`);
  return parts.join(", ");
}
