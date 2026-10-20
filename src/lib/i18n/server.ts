// The language on the server: the device's cookie (French without one).
import { cookies } from "next/headers";
import { LANG_COOKIE, isLang, makeT, type Lang } from "./index";

export async function getLang(): Promise<Lang> {
  try {
    const value = (await cookies()).get(LANG_COOKIE)?.value;
    return isLang(value) ? value : "fr";
  } catch {
    return "fr"; // not in a request
  }
}

/** For a server component: the language and its t(). */
export async function getI18n() {
  const lang = await getLang();
  return { lang, t: makeT(lang) };
}
