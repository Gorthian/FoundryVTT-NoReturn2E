/**
 * Zeitsteuerung: NoReturn-Kalender (IPK), Zeit-API, Kampfzeit und Kopplung an die Szenenbeleuchtung.
 *
 * Zeitrechnung (Corebook S. 10): Woche = 5 Tage, Zonat = 4 Wochen (20 Tage), Jahr = 18 Zonate,
 * dazwischen (in der Jahresmitte) die Befreiungswoche (5 Tage) → 365 Tage. Eine Kampfrunde dauert 3 Sekunden.
 *
 * Der Weltzeit-Nullpunkt (worldTime = 0) ist Jahr 5408 IPK, Zonat 1, Tag 1, 00:00. Alle Berechnungen laufen
 * über eigene Arithmetik (unabhängig von CalendarData-Details); der Foundry-Kalender wird zusätzlich registriert,
 * damit Kernfunktionen und andere Module dieselbe Zeitrechnung sehen.
 */
const SYSTEM_ID = "noreturn";

export const TIME = {
  yearZero: 5408,
  roundSeconds: 3,
  secondsPerDay: 86400,
  daysPerWeek: 5,
  daysPerZonat: 20,
  zonatsPerHalf: 9,
  liberationDays: 5,
  daysPerYear: 365,
  /** Einheiten in Sekunden (für ± Schaltflächen und advance()). */
  units: { round: 3, minute: 60, hour: 3600, day: 86400, week: 432000, zonat: 1728000 },
  /** Foundry-Standard für Sonnenauf-/-untergang (Stunden), einstellbar. */
  sunrise: 6,
  sunset: 20,
  twilight: 1.5,
  nightDarkness: 0.85
};

const mod = (a, n) => ((a % n) + n) % n;

/* -------------------------------------------- */
/*  Kalender-Definition                          */
/* -------------------------------------------- */

/** Foundry-Kalender (CalendarData, v13+): 9 Zonate, Befreiungswoche, 9 Zonate. Namen als Lokalisierungsschlüssel. */
export function calendarConfig() {
  const months = [];
  let ordinal = 1;
  for (let z = 1; z <= 18; z++) {
    if (z === 10) months.push({ name: "NR.Time.Liberation", abbreviation: "NR.Time.LiberationShort", ordinal: ordinal++, days: TIME.liberationDays });
    months.push({ name: `NR.Time.Zonat${z}`, abbreviation: `NR.Time.ZonatShort${z}`, ordinal: ordinal++, days: TIME.daysPerZonat });
  }
  return {
    name: "NR.Time.CalendarName",
    description: "NR.Time.CalendarDescription",
    years: { yearZero: TIME.yearZero, firstWeekday: 0, leapYear: null },
    months: { values: months },
    days: {
      values: [1, 2, 3, 4, 5].map(i => ({ name: `NR.Time.Weekday${i}`, abbreviation: `NR.Time.WeekdayShort${i}`, ordinal: i })),
      daysPerYear: TIME.daysPerYear, hoursPerDay: 24, minutesPerHour: 60, secondsPerMinute: 60
    },
    seasons: { values: [] }
  };
}

/* -------------------------------------------- */
/*  Datum                                        */
/* -------------------------------------------- */

/**
 * Zerlegt eine Weltzeit in Datumsbestandteile.
 * @param {number} [t]  Weltzeit in Sekunden (Standard: aktuelle)
 * @returns {{year:number, liberation:boolean, zonat:number, day:number, weekday:number, hour:number, minute:number, second:number, dayIndex:number, segment:number}}
 *   zonat: 1–18 (0 in der Befreiungswoche), day: 1–20 (bzw. 1–5), weekday: 1–5, segment: 0–18 (laufende Periode im Jahr)
 */
export function getDate(t = game.time.worldTime) {
  const dayIndex = Math.floor(t / TIME.secondsPerDay);
  const secOfDay = mod(Math.floor(t), TIME.secondsPerDay);
  const yearIdx = Math.floor(dayIndex / TIME.daysPerYear);
  const doy = mod(dayIndex, TIME.daysPerYear);
  const firstHalf = TIME.zonatsPerHalf * TIME.daysPerZonat; // 180
  let zonat, day, liberation = false, segment;
  if (doy < firstHalf) {
    zonat = Math.floor(doy / TIME.daysPerZonat) + 1; day = (doy % TIME.daysPerZonat) + 1; segment = zonat - 1;
  } else if (doy < firstHalf + TIME.liberationDays) {
    zonat = 0; day = doy - firstHalf + 1; liberation = true; segment = TIME.zonatsPerHalf;
  } else {
    const r = doy - firstHalf - TIME.liberationDays;
    zonat = TIME.zonatsPerHalf + Math.floor(r / TIME.daysPerZonat) + 1; day = (r % TIME.daysPerZonat) + 1; segment = zonat;
  }
  return {
    year: TIME.yearZero + yearIdx, liberation, zonat, day, weekday: mod(dayIndex, TIME.daysPerWeek) + 1,
    hour: Math.floor(secOfDay / 3600), minute: Math.floor((secOfDay % 3600) / 60), second: secOfDay % 60,
    dayIndex, segment
  };
}

/** Weltzeit aus Datumsangaben. Fehlende Felder werden aus dem aktuellen Datum übernommen. */
export function toWorldTime({ year, zonat, liberation, day, hour, minute, second } = {}) {
  const cur = getDate();
  year = Math.trunc(year ?? cur.year);
  const lib = liberation ?? (zonat === 0 ? true : (zonat === undefined ? cur.liberation : false));
  const half = TIME.zonatsPerHalf * TIME.daysPerZonat;
  let doy;
  if (lib) {
    doy = half + Math.min(Math.max(Math.trunc(day ?? 1), 1), TIME.liberationDays) - 1;
  } else {
    const z = Math.min(Math.max(Math.trunc(zonat ?? (cur.zonat || 1)), 1), 18);
    const d = Math.min(Math.max(Math.trunc(day ?? 1), 1), TIME.daysPerZonat) - 1;
    doy = z <= TIME.zonatsPerHalf ? (z - 1) * TIME.daysPerZonat + d : half + TIME.liberationDays + (z - TIME.zonatsPerHalf - 1) * TIME.daysPerZonat + d;
  }
  const secs = Math.trunc(hour ?? cur.hour) * 3600 + Math.trunc(minute ?? cur.minute) * 60 + Math.trunc(second ?? 0);
  return ((year - TIME.yearZero) * TIME.daysPerYear + doy) * TIME.secondsPerDay + secs;
}

/** Lesbare Datumsangabe, z. B. „Tag 7, Zonat 3, 5408 IPK“. */
export function formatDate(date = getDate(), { time = false } = {}) {
  const i18n = game.i18n;
  const place = date.liberation ? i18n.localize("NR.Time.Liberation") : i18n.localize(`NR.Time.Zonat${date.zonat}`);
  const text = i18n.format("NR.Time.DateFormat", { weekday: i18n.localize(`NR.Time.Weekday${date.weekday}`), day: date.day, zonat: place, year: date.year });
  return time ? `${text}, ${formatTime(date)}` : text;
}

export function formatTime(date = getDate()) {
  const p = n => String(n).padStart(2, "0");
  return `${p(date.hour)}:${p(date.minute)}`;
}

/* -------------------------------------------- */
/*  Zeit vorspulen                               */
/* -------------------------------------------- */

/**
 * Schaltet die Weltzeit weiter (negativ = zurück). Nur Spielleitung.
 * @param {{rounds?:number, seconds?:number, minutes?:number, hours?:number, days?:number, weeks?:number, zonats?:number}} delta
 */
export async function advance(delta = {}) {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("NR.Time.GmOnly"));
  const u = TIME.units;
  const secs = (delta.rounds ?? 0) * u.round + (delta.seconds ?? 0) + (delta.minutes ?? 0) * u.minute + (delta.hours ?? 0) * u.hour
    + (delta.days ?? 0) * u.day + (delta.weeks ?? 0) * u.week + (delta.zonats ?? 0) * u.zonat;
  if (!secs) return game.time.worldTime;
  return game.time.advance(secs);
}

/** Setzt die Weltzeit absolut. Nur Spielleitung. */
export async function setDate(parts) {
  if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("NR.Time.GmOnly"));
  return game.time.advance(toWorldTime(parts) - game.time.worldTime);
}

/* -------------------------------------------- */
/*  Beleuchtung                                  */
/* -------------------------------------------- */

const smooth = x => { const c = Math.min(Math.max(x, 0), 1); return c * c * (3 - 2 * c); };

/** Szenendunkelheit (0 = Tag, 1 = Nacht) für eine Uhrzeit in Stunden (Dezimal). */
export function darknessAt(hours) {
  const { sunrise: sr, sunset: ss, twilight: tw, nightDarkness: night } = TIME;
  let d;
  if (hours >= sr + tw && hours <= ss - tw) d = 0;
  else if (hours >= sr - tw && hours < sr + tw) d = 1 - smooth((hours - (sr - tw)) / (2 * tw));
  else if (hours > ss - tw && hours <= ss + tw) d = smooth((hours - (ss - tw)) / (2 * tw));
  else d = 1;
  return Math.round(d * night * 100) / 100;
}

export function isDaytime(date = getDate()) {
  const h = date.hour + date.minute / 60;
  return h >= TIME.sunrise && h < TIME.sunset;
}

/** Ist die Lichtkopplung für diese Szene aktiv? (Weltschalter und Szenen-Flag, Standard: an). */
export function sceneSynced(scene) {
  return !!scene && game.settings.get(SYSTEM_ID, "timeLightSync") && scene.getFlag(SYSTEM_ID, "timeLight") !== false;
}

/** Wendet die Tageszeit auf die aktive und die angezeigte Szene an (nur Spielleitung, aktiver GM). */
export async function syncLighting() {
  if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
  if (!game.settings.get(SYSTEM_ID, "timeLightSync")) return;
  const date = getDate();
  const target = darknessAt(date.hour + date.minute / 60);
  const scenes = new Set([game.scenes?.active, canvas?.scene].filter(Boolean));
  for (const scene of scenes) {
    if (!sceneSynced(scene)) continue;
    if (Math.abs((scene.environment?.darkness ?? 0) - target) < 0.01) continue;
    await scene.update({ "environment.darkness": target }, { animateDarkness: 2000 });
  }
}

/* -------------------------------------------- */
/*  Hooks und Einstellungen                      */
/* -------------------------------------------- */

/** Foundry-Kalender und Kampfrundendauer – im init-Hook aufrufen, nachdem die Einstellungen registriert sind. */
export function initTime() {
  CONFIG.time.worldCalendarConfig = calendarConfig();
  applyRoundTime();
}

/** Kampfrundendauer: 3 s, wenn der automatische Zeitverlauf aktiv ist. */
export function applyRoundTime() {
  CONFIG.time.roundTime = game.settings.get(SYSTEM_ID, "timeAuto") ? TIME.roundSeconds : 0;
  CONFIG.time.turnTime = 0;
}

export function registerTimeSettings({ onHudChange } = {}) {
  game.settings.register(SYSTEM_ID, "timeAuto", {
    name: "NR.Settings.TimeAuto", hint: "NR.Settings.TimeAutoHint",
    scope: "world", config: true, type: Boolean, default: true,
    onChange: () => applyRoundTime()
  });
  game.settings.register(SYSTEM_ID, "timeHud", {
    name: "NR.Settings.TimeHud", hint: "NR.Settings.TimeHudHint",
    scope: "world", config: true, type: Boolean, default: true,
    onChange: () => onHudChange?.()
  });
  game.settings.register(SYSTEM_ID, "timeHudPlayers", {
    name: "NR.Settings.TimeHudPlayers", hint: "NR.Settings.TimeHudPlayersHint",
    scope: "world", config: true, type: Boolean, default: false,
    onChange: () => onHudChange?.()
  });
  game.settings.register(SYSTEM_ID, "timeLightSync", {
    name: "NR.Settings.TimeLight", hint: "NR.Settings.TimeLightHint",
    scope: "world", config: true, type: Boolean, default: false,
    onChange: () => syncLighting()
  });
}

/** Meldet überschrittene Zeiteinheiten per Hook (für Regelmechaniken wie Strahlung oder Krankheiten). */
function emitAdvanced(worldTime, delta) {
  if (!delta || game.users.activeGM?.id !== game.user.id) return;
  const from = worldTime - delta;
  const crossed = (unit) => Math.floor(worldTime / unit) - Math.floor(from / unit);
  const periods = t => { const d = getDate(t); return (d.year - TIME.yearZero) * 19 + d.segment; };
  const info = {
    from, to: worldTime, delta, date: getDate(worldTime), previous: getDate(from),
    crossed: {
      minutes: crossed(60), hours: crossed(3600), days: crossed(TIME.secondsPerDay),
      zonats: periods(worldTime) - periods(from), years: getDate(worldTime).year - getDate(from).year
    }
  };
  /**
   * @event noreturn.timeAdvanced
   * Wird nur auf dem aktiven GM-Client ausgelöst. `crossed` enthält die Anzahl der überschrittenen Grenzen
   * (negativ bei Rückwärtssprüngen). Zonate zählen auch die Befreiungswoche als eigene Periode.
   */
  Hooks.callAll("noreturn.timeAdvanced", info);
}

export function registerTimeHooks() {
  Hooks.on("updateWorldTime", (worldTime, delta) => {
    emitAdvanced(worldTime, delta);
    syncLighting();
  });
  Hooks.on("canvasReady", () => syncLighting());
}

/** Öffentliche API: `game.noreturn.time`. */
export function timeApi(hud) {
  return {
    constants: TIME,
    calendarConfig,
    getDate, formatDate, formatTime, toWorldTime, advance, setDate, darknessAt, isDaytime, syncLighting,
    get auto() { return game.settings.get(SYSTEM_ID, "timeAuto"); },
    openHud: () => hud.show({ force: true })
  };
}
