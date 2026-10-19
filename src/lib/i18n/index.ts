// The app's languages: French (the original — every text is written in
// French in the code), English and Darija (Moroccan Arabic in Latin
// letters, the way it's typed: 3, 7, 9…). A text is translated by looking
// its French up in the language's dictionary; a text missing there stays in
// French. The language is the device's choice (Paramètres), kept in a
// cookie so the server renders the pages in it.
import { EN } from "./en";
import { DAR } from "./dar";

export const LANGS = ["fr", "en", "dar"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_COOKIE = "gx_lang";

export const LANG_NAMES: Record<Lang, string> = { fr: "Français", en: "English", dar: "Darija" };

/** The <html lang>: Moroccan Arabic written in Latin letters for Darija. */
export const HTML_LANG: Record<Lang, string> = { fr: "fr", en: "en", dar: "ary-Latn" };

export const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang);

const DICTIONARIES: Record<Exclude<Lang, "fr">, Record<string, string>> = { en: EN, dar: DAR };

export type Vars = Record<string, string | number>;

/** `text` (French, with {name} placeholders) in `lang`, `vars` filled in. */
export function translate(lang: Lang, text: string, vars?: Vars): string {
  const out = lang === "fr" ? text : (DICTIONARIES[lang][text] ?? text);
  return vars ? out.replace(/\{(\w+)\}/g, (all, key: string) => (key in vars ? String(vars[key]) : all)) : out;
}

export type T = (text: string, vars?: Vars) => string;

export const makeT =
  (lang: Lang): T =>
  (text, vars) =>
    translate(lang, text, vars);

/** Marks a French text kept in a constant (a menu's labels…) as one to
 *  translate where it's shown, with t(); returns it unchanged. */
export const msg = <S extends string>(text: S): S => text;

// Messages the server sends in French with a part of their own (amounts…):
// matched here so they're shown in the device's language too.
const SERVER_MESSAGES: [RegExp, string, string[]][] = [
  [/^Solde insuffisant : il te reste (.+) en espèces\.$/, msg("Solde insuffisant : il te reste {amount} en espèces."), ["amount"]],
  [/^Solde insuffisant : il te reste (.+) sur la carte\.$/, msg("Solde insuffisant : il te reste {amount} sur la carte."), ["amount"]],
  [/^Il ne reste que (.+) sur cette dette\.$/, msg("Il ne reste que {amount} sur cette dette."), ["amount"]],
  [/^Il ne reste que (.+) à te rendre\.$/, msg("Il ne reste que {amount} à te rendre."), ["amount"]],
  [/^Il n'y a que (.+) dans l'épargne\.$/, msg("Il n'y a que {amount} dans l'épargne."), ["amount"]],
  [/^Déjà (\d+) remboursements reçus : le plan doit en garder au moins autant\.$/, msg("Déjà {n} remboursements reçus : le plan doit en garder au moins autant."), ["n"]],
];

/** A message from the server, in the device's language. */
export function localizeMessage(message: string, t: T): string {
  for (const [pattern, text, names] of SERVER_MESSAGES) {
    const found = message.match(pattern);
    if (found) return t(text, Object.fromEntries(names.map((name, i) => [name, found[i + 1]])));
  }
  return t(message);
}

// Names the app writes itself into what it stores ("Épargne · vacances",
// "Argent prêté · Karim", "Transport - Reste"…): shown in the device's
// language; only the app's own words change, never what the user typed.
const NAME_PREFIXES = [
  msg("Argent prêté"),
  msg("Retrait d'épargne"),
  msg("Épargne"),
  msg("Daret reçue"),
  msg("Dette"),
  msg("Remboursement"),
  msg("Versement"),
];

/** A stored name, with the app's own words in the device's language. */
export function localName(name: string, t: T): string {
  for (const prefix of NAME_PREFIXES) {
    if (name === prefix) return t(prefix);
    if (name.startsWith(`${prefix} · `)) return `${t(prefix)}${name.slice(prefix.length)}`;
  }
  if (name.endsWith(" - Reste")) return `${name.slice(0, -" - Reste".length)} - ${t("Reste")}`;
  return categoryName(name, t); // an income named after its category ("Prime")
}

// The categories every account starts with: their names are shown in the
// device's language as long as they're kept as given (a renamed one shows
// its own name).
const DEFAULT_CATEGORY_NAMES = new Set<string>([
  msg("Alimentation"),
  msg("Courses"),
  msg("Carburant"),
  msg("Transport"),
  msg("Voiture"),
  msg("Famille"),
  msg("Abonnements"),
  msg("Loisirs"),
  msg("Vêtements"),
  msg("Bien-être"),
  msg("Argent prêté"),
  msg("Achats"),
  msg("Santé"),
  msg("Autres"),
  msg("Prime"),
  msg("Freelance"),
  msg("Heures sup"),
  msg("Vente"),
  msg("Cadeau"),
  msg("Remboursement"),
  msg("Loyer reçu"),
  msg("Investissement"),
  msg("Autre"),
]);

/** A category's name: a default one in the device's language. */
export function categoryName(name: string, t: T): string {
  return DEFAULT_CATEGORY_NAMES.has(name) ? t(name) : name;
}
