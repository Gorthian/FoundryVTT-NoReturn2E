/**
 * Hinweisdialog beim Start einer Welt: KI-generiert, frühe Beta, Fan-Projekt, Rechte.
 * Kann pro Client bis zur nächsten Systemversion ausgeblendet werden.
 */
const { DialogV2 } = foundry.applications.api;

const SYSTEM_ID = "noreturn";
const MANNIFEST_URL = "https://www.mannifest-games.de/";

export function registerNoticeSettings() {
  game.settings.register(SYSTEM_ID, "noticeDismissedVersion", {
    scope: "client", config: false, type: String, default: ""
  });
}

export async function showStartupNotice({ force = false } = {}) {
  const version = game.system.version;
  if (!force && game.settings.get(SYSTEM_ID, "noticeDismissedVersion") === version) return;

  const i18n = game.i18n;
  const e = foundry.utils.escapeHTML ?? (s => s);
  const points = ["Ai", "Beta", "Risk", "Backup", "Bugs", "Unofficial", "Rights"]
    .map(k => `<li>${i18n.format(`NR.Notice.${k}`, {
      version: e(version),
      foundry: e(game.system.compatibility?.verified ?? ""),
      url: MANNIFEST_URL,
      issues: game.system.bugs ?? ""
    })}</li>`).join("");
  const content = `<div class="nr-notice">
    <p><strong>${i18n.localize("NR.Notice.Intro")}</strong></p>
    <ul>${points}</ul>
    <label class="nr-notice-dismiss"><input type="checkbox" name="dismiss"> ${i18n.localize("NR.Notice.Dismiss")}</label>
  </div>`;

  await DialogV2.prompt({
    window: { title: i18n.localize("NR.Notice.Title"), icon: "fa-solid fa-triangle-exclamation" },
    position: { width: 560 },
    content,
    modal: false,
    rejectClose: false,
    ok: {
      label: i18n.localize("NR.Notice.Ok"),
      callback: (event, button) => {
        if (button.form?.elements.dismiss?.checked) {
          return game.settings.set(SYSTEM_ID, "noticeDismissedVersion", version);
        }
      }
    }
  });
}
