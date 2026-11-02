import { FOODS, CATEGORIES } from "./data";
import { LOCALES, lurl, hasT } from "./i18n";

export type LocaleRouteProps =
  | { code: string; kind: "home" | "hubIndex" | "method" }
  | { code: string; kind: "food"; slug: string }
  | { code: string; kind: "hub"; cat: string };

/** All static paths under /{code}/ for one locale (empty until its translation files exist). */
export function localePaths(code: string) {
  const L = LOCALES.find((x) => x.code === code);
  if (!L) return [];
  const p = (href: string) => href.replace(`/${code}/`, "").replace(/\/$/, "") || undefined;
  return [
    { params: { path: undefined }, props: { code, kind: "home" } },
    { params: { path: p(lurl.hubIndex(L)) }, props: { code, kind: "hubIndex" } },
    { params: { path: p(lurl.method(L)) }, props: { code, kind: "method" } },
    ...CATEGORIES.map((c) => ({ params: { path: p(lurl.hub(L, c.slug)) }, props: { code, kind: "hub", cat: c.slug } })),
    ...FOODS.filter((f) => hasT(L, f)).map((f) => ({ params: { path: p(lurl.food(L, f)) }, props: { code, kind: "food", slug: f.slug } })),
  ];
}
