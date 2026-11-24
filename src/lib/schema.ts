import { SITE, abs } from "./site";

export const ORG = {
  "@type": "Organization",
  "@id": `${SITE.url}/#org`,
  name: SITE.name,
  url: `${SITE.url}/`,
  email: SITE.email,
  logo: { "@type": "ImageObject", url: abs("/web-app-manifest-512x512.png"), width: 512, height: 512 },
};

export const breadcrumbLd = (items: { name: string; href?: string }[], path: string) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.href ?? path) })),
});

/** ImageObject nodes for a page's generated figures (hero first). Licence fields make them eligible for Google Images' "Licensable" badge. */
export const imageLd = (pageUrl: string, cards: { id: string; src: string; w: number; h: number; alt: string; spec?: { lang?: string; title?: string } }[]) =>
  cards.map((c) => ({
    "@type": "ImageObject",
    "@id": `${pageUrl}#fig-${c.id}`,
    contentUrl: abs(c.src),
    url: abs(c.src),
    width: c.w,
    height: c.h,
    encodingFormat: "image/webp",
    caption: c.alt,
    ...(c.spec?.title ? { name: c.spec.title } : {}),
    ...(c.spec?.lang ? { inLanguage: c.spec.lang === "pt-br" ? "pt-BR" : c.spec.lang } : {}),
    representativeOfPage: c.id === "answer",
    creator: { "@id": ORG["@id"] },
    creditText: SITE.name,
    copyrightNotice: `© ${SITE.name}`,
    license: abs("/terms/"),
    acquireLicensePage: abs("/about/"),
    isBasedOn: "https://www.foodsafety.gov/keep-food-safe/foodkeeper-app",
  }));

export const faqLd = (faq: [string, string][]) => ({
  "@type": "FAQPage",
  mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
});

/**
 * Article node for a /calories/ page, modelled on a magazine article: real dates, the editorial team as author, the
 * reviewer as contributor (only when her review covers the current content), the hero ImageObject with credit, the
 * numbered sources as `citation`, and mainEntityOfPage → WebPage carrying the breadcrumb (give the BreadcrumbList
 * node the same "#breadcrumb" @id). Publisher is the Organization node with its publishing principles.
 */
export function articleLd(o: {
  path: string; headline: string; title: string; description: string; published: string; modified: string; about: string;
  section?: string; isBasedOn: string | string[]; image?: { src: string; w: number; h: number; alt: string } | null;
  sources: { name: string; url: string }[]; contributor?: { name: string; url: string; id: string } | null;
}) {
  const url = abs(o.path);
  return {
    "@type": "Article",
    "@id": `${url}#article`,
    headline: o.headline,
    name: o.title,
    description: o.description,
    url,
    inLanguage: "en-US",
    mainEntityOfPage: { "@type": "WebPage", "@id": `${url}#page`, url, name: o.headline, breadcrumb: { "@id": `${url}#breadcrumb` } },
    datePublished: o.published,
    dateModified: o.modified,
    author: { "@type": "Organization", name: `${SITE.name} Editorial Team`, url: abs("/editorial-policy/") },
    ...(o.contributor ? { contributor: { "@type": "Person", "@id": o.contributor.id, name: o.contributor.name, url: o.contributor.url } } : {}),
    publisher: { "@id": ORG["@id"] },
    about: { "@type": "Thing", name: o.about },
    ...(o.section ? { articleSection: o.section } : {}),
    isBasedOn: o.isBasedOn,
    ...(o.image ? { image: { "@type": "ImageObject", contentUrl: abs(o.image.src), url: abs(o.image.src), width: o.image.w, height: o.image.h, caption: o.image.alt, creditText: SITE.name } } : {}),
    ...(o.sources.length ? { citation: o.sources.map((s) => ({ "@type": "CreativeWork", name: s.name, url: s.url })) } : {}),
  };
}
/** Organization node for article pages: adds where the editorial and corrections policies live. */
export const ORG_ARTICLE = { ...ORG, publishingPrinciples: abs("/editorial-policy/"), correctionsPolicy: abs("/contact/") };
