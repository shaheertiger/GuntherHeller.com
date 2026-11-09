export const SITE = {
  name: "Gunther Heller",
  mark: "GH",
  url: "https://www.guntherheller.com",
  email: "hello@guntherheller.com",
  /** Date the numbers were last checked against the FoodKeeper release. Change only when you re-verify. */
  verifiedISO: "2026-11-02",
  verifiedLabel: "November 2026",
  verifiedShort: "Nov 2026",
  ogImage: "/og.png",
};

export const abs = (path: string) => new URL(path, SITE.url).toString();

export const reportHref = (pagePath: string) =>
  `mailto:${SITE.email}?subject=${encodeURIComponent("Wrong number on " + pagePath)}&body=${encodeURIComponent(
    `Page: ${abs(pagePath)}\nWhich number looks wrong:\nWhat it should be (and your source):\n`,
  )}`;
