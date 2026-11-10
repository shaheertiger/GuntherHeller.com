import { SITE, abs } from "./site";
import { type Food, cellsFor, getCategory, META } from "./data";

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

/** Article + breadcrumb + FAQ + organisation + the durations as a Dataset of PropertyValues. */
export function foodGraph(opts: { food: Food; path: string; title: string; headline: string; description: string; crumbs: { name: string; href?: string }[]; faq: [string, string][]; figures?: { id: string; src: string; w: number; h: number; alt: string }[] }) {
  const { food: f, path, headline, description, crumbs, faq, figures = [] } = opts;
  const url = abs(path);
  const values = f.states.flatMap((s, i) => {
    const c = cellsFor(f, s, i);
    const tag = s.label ? ` (${s.label.toLowerCase()})` : "";
    return [
      { "@type": "PropertyValue", name: `Room temperature${tag}`, value: c.pantry.value, description: c.pantry.note },
      { "@type": "PropertyValue", name: `Refrigerator${tag}`, value: c.fridge.value, description: c.fridge.note },
      { "@type": "PropertyValue", name: `Freezer${tag}`, value: c.freezer.value, description: c.freezer.note },
    ];
  });
  return {
    "@context": "https://schema.org",
    "@graph": [
      ORG,
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline,
        description,
        url,
        mainEntityOfPage: url,
        image: figures.length ? { "@id": `${url}#fig-${figures[0].id}` } : abs(`/images/foods/${f.slug}.webp`),
        datePublished: SITE.verifiedISO,
        dateModified: SITE.verifiedISO,
        author: { "@id": ORG["@id"] },
        publisher: { "@id": ORG["@id"] },
        about: { "@type": "Thing", name: f.name },
        articleSection: getCategory(f.category).name,
        isBasedOn: { "@id": `${url}#data` },
      },
      {
        "@type": "Dataset",
        "@id": `${url}#data`,
        name: `${f.name} storage times`,
        description: `Counter, refrigerator and freezer storage times for ${f.name.toLowerCase()}.`,
        url,
        license: "https://creativecommons.org/publicdomain/zero/1.0/",
        isAccessibleForFree: true,
        creator: { "@type": "Organization", name: "USDA Food Safety and Inspection Service" },
        isBasedOn: f.source.url,
        version: String(META.version),
        dateModified: SITE.verifiedISO,
        variableMeasured: values,
        ...(figures.length ? { image: figures.map((c) => ({ "@id": `${url}#fig-${c.id}` })) } : {}),
      },
      ...imageLd(url, figures),
      breadcrumbLd(crumbs, path),
      ...(faq.length ? [faqLd(faq)] : []),
    ],
  };
}
