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
