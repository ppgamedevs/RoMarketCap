import { cookies, headers } from "next/headers";
import { DEFAULT_LANG, normalizeLang, type Lang, t, type I18nKey } from "./i18n/shared";

export type { Lang, I18nKey };
export { t, normalizeLang, DEFAULT_LANG };

export async function getLangFromRequest(): Promise<Lang> {
  const c = (await cookies()).get("romc_lang")?.value;
  if (c === "en" || c === "ro") return c;

  const al = (await headers()).get("accept-language") ?? "";
  if (al.toLowerCase().includes("en")) return "en";
  return DEFAULT_LANG;
}


