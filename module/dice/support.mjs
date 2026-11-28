/**
 * Unterstützende Aktion (S. 85): Makro-/API-Einstieg. Wählt eine Fertigkeit des markierten Tokens
 * (oder des Spielercharakters) und würfelt mit der abgerundeten Hälfte der Würfel.
 */
export async function supportAction() {
  const actor = canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character;
  if (!actor) return ui.notifications.warn(game.i18n.localize("NR.Notify.NoActor"));
  const skills = Object.entries(actor.system.skillList ?? {}).filter(([, s]) => s.trained);
  if (!skills.length) return null;
  const options = skills.map(([key, s]) => `<option value="${key}">${foundry.utils.escapeHTML(s.label)} (${s.pool}W)</option>`).join("");
  const key = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("NR.Roll.SupportCard"), icon: "fa-solid fa-handshake-angle" },
    content: `<p class="nr-hint">${game.i18n.localize("NR.Roll.SupportHint")}</p><div class="form-group"><select name="skill">${options}</select></div>`,
    ok: { label: game.i18n.localize("NR.Roll.Roll"), callback: (event, button) => button.form.elements.skill.value },
    rejectClose: false
  }).catch(() => null);
  if (!key) return null;
  return actor.rollSkill(key, { support: true });
}
