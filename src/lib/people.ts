/**
 * The people behind the site. Facts here are shown on /authors/{slug}/ and in Person structured data, so keep them
 * to what the person has confirmed and publishes about themselves.
 *
 * Page reviews: a page shows "Reviewed by … on {date}" (and gets reviewedBy / lastReviewed in its JSON-LD) only when
 * its path is listed in data/reviewed.json with the date the reviewer actually checked it. Add entries as reviews
 * happen; never add a page that has not been reviewed.
 */
import reviewedRaw from "../../data/reviewed.json";
import { SITE, abs } from "./site";

export type Person = {
  slug: string;
  name: string;
  credentials: string;
  honorific: string;
  role: string;
  jobTitle: string;
  summary: string;
  location: string;
  sameAs: string[];
  credentialList: { name: string; by: string }[];
  books: string[];
  experience: { role: string; org: string; years: string }[];
  disclosure: string;
};

export const REVIEWER: Person = {
  slug: "karman-meyer",
  name: "Karman Meyer",
  credentials: "RDN, LDN",
  honorific: "RDN, LDN, RYT",
  role: "Nutrition reviewer",
  jobTitle: "Registered Dietitian Nutritionist",
  summary:
    "Karman Meyer is a registered dietitian nutritionist based in the Nashville area. She runs Meyer Nutrition Communications, where she works with food companies, commodity boards and national media, speaks on nutrition for better sleep, energy and well-being, and creates employee wellness programs. She is the author of two books.",
  location: "Greater Nashville Area, Tennessee",
  sameAs: ["https://www.linkedin.com/in/karmanmeyer/", "https://karmanmeyer.com/"],
  credentialList: [
    { name: "Registered Dietitian Nutritionist (RDN)", by: "Commission on Dietetic Registration" },
    { name: "Licensed Dietitian Nutritionist (LDN)", by: "State licensure" },
    { name: "Registered Yoga Teacher (RYT)", by: "Yoga Alliance" },
  ],
  books: [
    "Eat to Sleep: What to Eat and When to Eat It for a Good Night's Sleep",
    "The Everything DASH Diet Meal Prep Cookbook",
  ],
  experience: [
    { role: "Owner", org: "Meyer Nutrition Communications", years: "2015–present" },
    { role: "Co-founder", org: "NourishWell Network", years: "2021–present" },
    { role: "Director, Journey to Wellness", org: "Faith Family Medical Center", years: "2022–2023" },
    { role: "Dietitian, Health & Influencer Communications", org: "Tennessee Beef Industry Council", years: "2015–2021" },
    { role: "Registered Dietitian Consultant", org: "United States Healthful Food Council", years: "2013–2017" },
    { role: "Director, Nutrition & Environmental Services", org: "Vanderbilt University Medical Center", years: "2014–2015" },
    { role: "Registered Dietitian & Foodservice Director", org: "Cumberland Manor", years: "2011–2013" },
    { role: "Clinical Dietitian", org: "Southern Hills Hospital and Medical Center", years: "2010–2011" },
    { role: "Dietetic Intern", org: "Vanderbilt University Medical Center", years: "2009–2010" },
  ],
  disclosure:
    "Karman has worked with food and commodity organizations, including the Tennessee Beef Industry Council (2015–2021). She has no say over which foods appear on Gunther Heller or how they rank: every number comes from USDA data, and rankings are computed from it.",
};

export const personUrl = (p: Person) => `/authors/${p.slug}/`;

/** Person JSON-LD node (referenced by @id from page graphs). */
export const personLd = (p: Person) => ({
  "@type": "Person",
  "@id": `${SITE.url}${personUrl(p)}#person`,
  name: p.name,
  honorificSuffix: p.honorific,
  jobTitle: p.jobTitle,
  description: p.summary,
  url: abs(personUrl(p)),
  sameAs: p.sameAs,
  homeLocation: { "@type": "Place", name: p.location },
  hasCredential: p.credentialList.map((c) => ({ "@type": "EducationalOccupationalCredential", credentialCategory: "certification", name: c.name, recognizedBy: { "@type": "Organization", name: c.by } })),
  knowsAbout: ["Nutrition", "Dietetics", "Sleep nutrition", "DASH diet", "Employee wellness", "Culinary nutrition"],
});

const REVIEWED = reviewedRaw as { site: string | null; pages: Record<string, string> };
/** The date the reviewer checked this page: its own review, else the site-wide review, else null. */
export const reviewedOn = (path: string): string | null => REVIEWED.pages[path] ?? REVIEWED.site ?? null;
export const siteReviewed = () => REVIEWED.site;
/** This page's own review date only (no site-wide fallback). The 10 deep calorie pages use this. */
export const reviewedPageOn = (path: string): string | null => REVIEWED.pages[path] ?? null;
export const reviewedCount = () => Object.keys(REVIEWED.pages).length;
