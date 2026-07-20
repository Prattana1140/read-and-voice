import type { Locale } from "./i18n";

type LocalizedTitle = {
  title?: string | null;
  title_th?: string | null;
  title_en?: string | null;
  subtitle?: string | null;
  subtitle_th?: string | null;
  subtitle_en?: string | null;
};

export function localizedTitle(item: LocalizedTitle | null | undefined, locale: Locale) {
  if (!item) return "";
  const th = String(item.title_th || item.title || "").trim();
  const en = String(item.title_en || "").trim();
  return locale === "en" ? en || th : th || en;
}

export function localizedSubtitle(item: LocalizedTitle | null | undefined, locale: Locale) {
  if (!item) return "";
  const th = String(item.subtitle_th || item.subtitle || "").trim();
  const en = String(item.subtitle_en || "").trim();
  return locale === "en" ? en || th : th || en;
}
