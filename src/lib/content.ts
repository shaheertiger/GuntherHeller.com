/**
 * Generated copy. Every number comes from the FoodKeeper record; the prose around it comes
 * from per-kind templates below. Anything in data/overrides.json → content[slug] wins.
 */
import { FOODS, type Food, type State, contentFor, fmt, isNum, days, lc, lasts, does, isAre, itThey, titleCase, cap1, freezerFacts, cellsFor } from "./data";

type Sign = { title: string; text: string; icon: string };
const ICON = {
  smell: "M12 3a7 7 0 017 7c0 5-7 11-7 11S5 15 5 10a7 7 0 017-7z",
  texture: "M4 12h16M4 7h16M4 17h16",
  colour: "M12 21a9 9 0 110-18 9 9 0 010 18z",
  mould: "M12 9v4M12 17h.01M10.3 3.9L2.5 17a2 2 0 001.7 3h15.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  taste: "M5 12h14M12 5v14",
  pack: "M4 7l8-4 8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10",
};

/* ---------------------------------------------------------------- kind groups */
type Group = "meat" | "seafood" | "cooked" | "cured" | "dairy" | "cheese" | "eggs" | "produce" | "leafy" | "bakery" | "dry" | "fat" | "condiment" | "drink" | "frozen" | "baby";
const GROUP: Record<string, Group> = {
  "raw-meat": "meat", "shelf-meat": "dry", "raw-seafood": "seafood", cooked: "cooked", "cured-meat": "cured", milk: "dairy",
  "soft-dairy": "dairy", dip: "cooked", "hard-cheese": "cheese", "soft-cheese": "cheese", eggs: "eggs", butter: "fat",
  fruit: "produce", vegetable: "produce", leafy: "leafy", herb: "leafy", bakery: "bakery", dough: "bakery", "dry-goods": "dry",
  spice: "dry", oil: "fat", nuts: "fat", condiment: "condiment", "sauce-perishable": "cooked", canned: "condiment",
  beverage: "drink", "coffee-tea": "drink", alcohol: "drink", "juice-fresh": "drink", frozen: "frozen", soy: "cooked",
  baby: "baby", "baby-milk": "baby",
};
export const groupOf = (f: Food): Group => GROUP[f.kind] ?? "dry";

export const SIGNS: Record<Group, [string, string][]> = {
  meat: [["Smell", "A sour, sulphur or ammonia smell, even faint."], ["Texture", "Sticky or slimy surface that stays after rinsing."], ["Colour", "Grey-green or brown patches spreading across the meat."], ["Package", "A bloated or leaking pack, or past the date by more than the fridge window."]],
  seafood: [["Smell", "Strong fishy, sour or ammonia odour. Fresh seafood smells of the sea."], ["Texture", "Mushy flesh that does not spring back, or a milky slime."], ["Colour", "Dull, grey or yellowing flesh; dark edges."], ["Shells", "Live shellfish with open shells that do not close when tapped."]],
  cooked: [["Smell", "Sour, yeasty or 'off' instead of how it smelled when cooked."], ["Texture", "Slimy film, or liquid separating where it should not."], ["Colour", "Dull or darkened patches, or any discoloured spots."], ["Mould", "Any fuzzy growth — discard the whole container, not just the spot."]],
  cured: [["Smell", "Sour or rancid smell instead of smoky or salty."], ["Texture", "Slick, slimy surface on slices or links."], ["Colour", "Grey, green or iridescent patches that spread."], ["Mould", "Fuzzy spots on sliced or cooked products — discard."]],
  dairy: [["Smell", "Sour or cheesy smell when it should be clean and mild."], ["Texture", "Lumps, curdling or a thick, slimy body."], ["Colour", "Yellowing or a pink, green or grey tinge."], ["Taste", "Sour or bitter at the first sip — stop and discard."]],
  cheese: [["Smell", "Ammonia or a sharp sour smell beyond the cheese's usual aroma."], ["Texture", "Slimy surface, or very dry and cracked all the way through."], ["Colour", "Darkened or yellowed edges, or new colours that are not part of the cheese."], ["Mould", "On hard cheese, cut 1 inch around the spot. On soft or shredded cheese, discard."]],
  eggs: [["Smell", "A sulphur smell when cracked — unmistakable, discard."], ["Shell", "Slimy, powdery or cracked shells."], ["Inside", "Pink, green or iridescent whites or yolks."], ["Float test", "Shows age only. A floating egg is old; check the smell before deciding."]],
  produce: [["Smell", "Fermented, sour or musty odour."], ["Texture", "Soft, mushy or leaking spots, or wrinkled skin with soft flesh."], ["Colour", "Dark bruising that spreads, or browning inside."], ["Mould", "White, grey or green fuzz — discard soft produce; cut firm produce generously."]],
  leafy: [["Smell", "A sour or rotting smell from the bag or bunch."], ["Texture", "Slimy, wet or wilted leaves that do not perk up in cold water."], ["Colour", "Dark green-black or brown leaves."], ["Mould", "Any fuzzy growth — discard the bag."]],
  bakery: [["Smell", "Musty, sour or alcoholic smell."], ["Texture", "Hard and dry is stale but safe; damp or sticky is not."], ["Colour", "Discoloured spots on the crust or crumb."], ["Mould", "Any visible mould — discard the whole item; roots spread unseen."]],
  dry: [["Smell", "Musty, sour or rancid odour."], ["Texture", "Clumping from moisture, or a damp feel."], ["Pests", "Webbing, holes, or tiny insects in the bag."], ["Flavour", "Flat, stale or bitter taste — quality is gone even if it is safe."]],
  fat: [["Smell", "Rancid: like crayons, paint or old nuts."], ["Taste", "Bitter or soapy aftertaste."], ["Texture", "Sticky or gummy residue around the lid."], ["Colour", "Darkened or cloudy where it should be clear."]],
  condiment: [["Smell", "Fermented, yeasty or sour beyond the product's usual tang."], ["Texture", "Separation that does not stir back, or a slimy layer."], ["Colour", "Darkening or a change in colour at the top of the jar."], ["Mould", "Any fuzz on the surface or lid — discard the jar."]],
  drink: [["Smell", "Vinegary, sour or musty instead of fresh."], ["Taste", "Flat, sour or bitter — quality is gone."], ["Look", "Cloudiness, sediment or film that was not there before."], ["Package", "Bulging carton, cap or can — discard."]],
  frozen: [["Freezer burn", "Dry, greyish-white patches. Safe, but trim them off."], ["Ice crystals", "Heavy ice inside the pack means it has thawed and refrozen."], ["Smell", "Off smell after thawing — discard."], ["Package", "Torn packaging lets air in and speeds quality loss."]],
  baby: [["Smell", "Sour or off smell in prepared formula or food."], ["Texture", "Separation that does not mix back, or clumps."], ["Colour", "Change from the usual colour."], ["Seal", "Jar lids that do not pop on opening, or damaged pouches — discard."]],
};
const ICONS = [ICON.smell, ICON.texture, ICON.colour, ICON.mould];

export function signsFor(f: Food): Sign[] {
  const c = contentFor(f).signs;
  const list = c ? c.map((s) => [s.title, s.text] as [string, string]) : SIGNS[groupOf(f)];
  return list.map(([title, text], i) => ({ title, text, icon: ICONS[i] ?? ICON.pack }));
}

/* ---------------------------------------------------------------- freezing */
export type FreezeVerdict = { tone: "yes" | "no" | "caution"; label: string; detail: string };
const CAUTION_KINDS = new Set(["milk", "soft-cheese", "soft-dairy", "dip", "hard-cheese"]);
export function freezeVerdict(f: Food): FreezeVerdict {
  const d = freezerFacts(f);
  const name = lc(f);
  if (!d) return { tone: "caution", label: "No FoodKeeper figure", detail: `FoodKeeper gives no freezer time for ${name}.` };
  if (!isNum(d)) {
    if (d.text === "Not recommended") return { tone: "no", label: "Not recommended", detail: `Freezing ${name} is not recommended; texture breaks down or the result is unsafe to rely on.` };
    return { tone: "caution", label: d.text, detail: `${d.text}.` };
  }
  const t = fmt(d)!;
  if (CAUTION_KINDS.has(f.kind)) return { tone: "caution", label: `Yes, for cooking — ${t}`, detail: `Quality holds for about ${t} at 0°F / -18°C. Texture changes, so use it in cooked dishes.` };
  return { tone: "yes", label: (days(d) ?? 0) >= 60 ? `Yes — freezes well` : `Yes, short term`, detail: `Quality holds for about ${t} at 0°F / -18°C. Frozen food stays safe indefinitely; only quality declines.` };
}

export const FREEZE_STEPS: Record<Group, string[]> = {
  meat: ["Freeze on or before the last fridge day; the earlier, the better the texture.", "Overwrap the store pack in foil or a freezer bag, or vacuum-seal; squeeze out air.", "Thaw in the fridge (about 24 hours per 5 lb), or in cold water and cook right away."],
  seafood: ["Freeze as fresh as possible, ideally the day you buy it.", "Wrap tightly in plastic, then a freezer bag; press out the air and date it.", "Thaw overnight in the fridge or sealed in cold water; never on the counter."],
  cooked: ["Cool quickly: shallow containers, into the fridge or freezer within 2 hours.", "Portion into freezer bags or airtight tubs, leave headspace for liquids, and label with the date.", "Thaw in the fridge and reheat to 165°F (74°C) until steaming."],
  cured: ["Freeze in the original vacuum pack if unopened; otherwise wrap slices in plastic and foil.", "Freeze in meal-size portions so you only thaw what you need.", "Thaw in the fridge; texture of sliced meats softens slightly after freezing."],
  dairy: ["Pour off a little to leave room for expansion, then seal tightly.", "Freeze flat or upright and date it.", "Thaw in the fridge and shake or whisk well; use for cooking or baking."],
  cheese: ["Cut or portion into blocks of ½ lb or less, or freeze shredded cheese in its bag.", "Wrap in plastic, then a freezer bag, pressing out air.", "Thaw in the fridge; it will be crumblier, so use it melted or cooked."],
  eggs: ["Never freeze eggs in the shell.", "Beat whole eggs (or separate whites and yolks) and pour into a lidded container or ice-cube tray.", "Thaw in the fridge and use only in dishes cooked to 160°F (71°C)."],
  produce: ["Wash, dry and cut into pieces; blanch most vegetables for 1–3 minutes first.", "Spread on a tray to freeze individually, then bag and press out air.", "Use from frozen in cooking or smoothies; thawed produce is soft."],
  leafy: ["Leafy greens and herbs lose their crunch when frozen.", "For cooking, blanch greens or chop herbs into ice-cube trays with oil or water.", "Add straight from frozen to soups, sauces and stir-fries."],
  bakery: ["Freeze on the day you buy or bake it, once fully cool.", "Wrap tightly in plastic, then a freezer bag; slice bread first so you can take what you need.", "Thaw at room temperature in the wrap, or toast or warm from frozen."],
  dry: ["Freezing is optional for dry goods; it mainly stops pests and rancidity.", "Use an airtight container or a well-sealed freezer bag.", "Let it come to room temperature before opening to avoid condensation."],
  fat: ["Freeze in an airtight container or the original sealed pack.", "Portion first (cubes or small jars) so you thaw only what you need.", "Thaw in the fridge; fats and nuts can be used straight from frozen."],
  condiment: ["Most condiments keep well in the fridge and do not need freezing.", "If freezing, use ice-cube trays or small containers and label them.", "Thaw in the fridge and stir well; emulsions may separate."],
  drink: ["Leave headspace in a freezer-safe container; liquids expand.", "Freeze in ice-cube trays for small portions.", "Thaw in the fridge and shake well before using."],
  frozen: ["Keep it at 0°F (-18°C) or colder in the original pack.", "Reseal opened bags tightly or move to a freezer bag.", "Cook from frozen as the package directs, or thaw in the fridge."],
  baby: ["Freeze only what the guidance allows, in clean, sealed containers.", "Label with the date and time.", "Thaw in the fridge or in warm water; never microwave, and do not refreeze."],
};
export const freezeStepsFor = (f: Food) => contentFor(f).freezeSteps ?? FREEZE_STEPS[groupOf(f)];

/* ---------------------------------------------------------------- left out */
export type LeftOut = { tone: "keep" | "caution" | "discard"; label: string; text: string };
export function leftOutFor(f: Food): LeftOut {
  const c = contentFor(f).leftOut;
  const name = lc(f);
  const S = f.states[0];
  if (f.perishable)
    return { tone: "discard", label: "Discard", text: c ?? `${cap1(name)} left at room temperature for more than 2 hours (1 hour above 90°F / 32°C) should be thrown away. Bacteria multiply fastest between 40°F and 140°F, and reheating does not remove every toxin they make.` };
  if (S.pantry && isNum(S.pantry))
    return { tone: "keep", label: "Keep", text: c ?? `${cap1(name)} ${isAre(f)} shelf-stable${f.states.length > 1 ? " until opened" : ""}. A night on the counter is fine — keep ${itThey(f) === "they" ? "them" : "it"} cool, dry and away from sunlight.` };
  if (S.pantry)
    return { tone: "keep", label: "Keep", text: c ?? `Whole ${name} can sit on the counter ${fmt(S.pantry)!.toLowerCase()}. Once cut or cooked, the 2-hour rule applies.` };
  if (f.states.some((s) => s.key === "opened"))
    return { tone: "caution", label: "Check it", text: c ?? `Opened ${name} belongs in the fridge. Overnight at room temperature speeds spoilage; if it smells, looks or tastes off, discard it.` };
  return { tone: "caution", label: "Check it", text: c ?? `${cap1(name)} ${isAre(f)} not a high-risk food, but a night out shortens ${itThey(f) === "they" ? "their" : "its"} fridge life. Refrigerate ${itThey(f) === "they" ? "them" : "it"} and use soon.` };
}

/* ---------------------------------------------------------------- dates */
export function datesFor(f: Food) {
  const c = contentFor(f).dates;
  if (c) return c;
  const name = lc(f);
  const op = f.states.find((s) => s.key === "opened");
  const un = f.states.find((s) => s.key === "unopened") ?? f.states[0];
  const unText = [un.pantry && isNum(un.pantry) ? `${fmt(un.pantry)} in the pantry` : null, un.fridge ? `${fmt(un.fridge)!.toLowerCase()} in the fridge` : null].filter(Boolean).join(" or ");
  return {
    unopened: {
      title: op ? "Unopened" : "Best-by and sell-by",
      text: `${unText ? `FoodKeeper gives unopened ${name} ${unText}, counted from the day you buy it.` : `Follow the package date.`} "Best-by" and "sell-by" describe quality and stock rotation, not safety; only infant formula carries a federally required use-by date.`,
    },
    opened: op
      ? { title: "Opened", text: `Once opened, the printed date no longer applies. Count ${[op.fridge ? `${fmt(op.fridge)!.toLowerCase()} in the fridge` : null, op.pantry ? `${fmt(op.pantry)!.toLowerCase()} in the pantry` : null].filter(Boolean).join(" or ")} from the day you open it.` }
      : { title: "Past the date", text: f.perishable ? `For perishable ${name}, the storage clock matters more than the label: if it has been in the fridge longer than ${fmt(f.states[0].fridge)?.toLowerCase() ?? "the window above"}, discard it even before the printed date.` : `${cap1(name)} past ${f.plural ? "their" : "its"} best-by date ${isAre(f)} usually safe if stored well; check smell, look and taste before using.` },
  };
}

/* ---------------------------------------------------------------- storage tips */
export const STORE: Record<Group, string[]> = {
  meat: ["Refrigerate at 40°F (4°C) or below as soon as you get home; bottom shelf, so juices cannot drip.", "Keep it in the store pack until you use it, or overwrap for the freezer.", "Cook or freeze within the fridge window; the clock starts at purchase."],
  seafood: ["Keep on ice or in the coldest part of the fridge, at 40°F (4°C) or below.", "Store live shellfish in a bowl covered with a damp cloth, never in water or sealed plastic.", "Cook or freeze within the fridge window."],
  cooked: ["Refrigerate within 2 hours of cooking (1 hour above 90°F) in shallow, airtight containers.", "Keep the fridge at or below 40°F (4°C); the door shelf is the warmest spot.", "Reheat leftovers to 165°F (74°C) and only reheat what you will eat."],
  cured: ["Keep refrigerated at 40°F (4°C) or below, even though it is cured.", "Once opened, rewrap tightly or move to an airtight container.", "Use within the opened window regardless of the package date."],
  dairy: ["Store on an inside shelf, not the door, at 40°F (4°C) or below.", "Close the container tightly; dairy absorbs fridge odours.", "Pour what you need and return it to the fridge right away."],
  cheese: ["Wrap in wax or parchment paper, then loosely in plastic, so it can breathe.", "Store in the cheese drawer or a lower shelf at 40°F (4°C) or below.", "Use a clean knife each time to avoid introducing mould."],
  eggs: ["Keep eggs in their carton on an inside shelf, not the door.", "Store at 40°F (4°C) or below; do not wash them before storing.", "Refrigerate hard-boiled eggs within 2 hours of cooking."],
  produce: ["Store unwashed; wash just before eating.", "Keep ethylene producers (apples, bananas, avocados) away from produce that over-ripens.", "Refrigerate once cut, in a covered container."],
  leafy: ["Store dry, wrapped in a paper towel inside a bag or container.", "Keep in the crisper drawer at 40°F (4°C) or below.", "Stand herbs like cilantro and parsley in a glass of water in the fridge, loosely covered."],
  bakery: ["Keep at room temperature in a bread box or sealed bag for the best texture.", "Refrigeration slows mould but makes bread stale faster.", "Freeze what you will not eat in time."],
  dry: ["Store in an airtight container in a cool, dark, dry place.", "Keep away from the stove and dishwasher, where heat and humidity speed spoilage.", "Write the opening date on the pack."],
  fat: ["Keep in a cool, dark place, tightly closed, away from heat.", "Refrigerating nuts, seeds and nut oils extends shelf life significantly.", "Smell before using; rancidity is a quality problem you can detect."],
  condiment: ["Refrigerate after opening unless the label says otherwise.", "Use a clean utensil each time; crumbs and double-dipping shorten shelf life.", "Wipe the rim and close the lid tightly."],
  drink: ["Store unopened in a cool, dark place.", "Refrigerate after opening and close tightly.", "Keep away from light and heat, which flatten flavour."],
  frozen: ["Keep your freezer at 0°F (-18°C) or colder.", "Do not let it thaw and refreeze on the way home; shop for frozen food last.", "Reseal opened bags to prevent freezer burn."],
  baby: ["Follow the label and your pediatrician's instructions first.", "Refrigerate prepared or opened products right away.", "Discard anything left in a bottle or bowl the baby has fed from."],
};
export function storeTipsFor(f: Food): string[] {
  const c = contentFor(f).store;
  if (c) return c;
  const fk = [f.tips.pantry, f.tips.fridge, f.tips.freezer].filter((x): x is string => !!x).map((t) => t.replace(/\.?$/, "."));
  return [...fk, ...STORE[groupOf(f)]].slice(0, 5);
}

/* ---------------------------------------------------------------- methods table */
export function methodsFor(f: Food) {
  const c = contentFor(f).methods;
  if (c) return c;
  const rows: { method: string; duration: string; temp: string; container: string; note: string }[] = [];
  const g = groupOf(f);
  const container = g === "dry" ? "Airtight, dry" : g === "meat" || g === "seafood" ? "Store pack or sealed" : g === "bakery" ? "Sealed bag" : "Airtight";
  f.states.forEach((s, i) => {
    const cells = cellsFor(f, s, i);
    const tag = s.label ? ` (${s.label.toLowerCase()})` : "";
    if (s.pantry || (i === 0 && f.perishable)) rows.push({ method: `Pantry / counter${tag}`, duration: cells.pantry.value, temp: "68–72°F", container, note: cells.pantry.note });
    if (s.fridge) rows.push({ method: `Refrigerator${tag}`, duration: cells.fridge.value, temp: "≤ 40°F / 4°C", container, note: f.tips.fridge && i === 0 ? f.tips.fridge : cells.fridge.note });
    if (s.freezer && (i === 0 || !f.states[0].freezer)) rows.push({ method: `Freezer${f.states.length > 1 && !f.states.every((x) => x.freezer === s.freezer) ? tag : ""}`, duration: cells.freezer.value, temp: "0°F / -18°C", container: "Freezer bag or wrap", note: cells.freezer.note });
  });
  if (f.thawedFridge) rows.push({ method: "Fridge after thawing", duration: fmt(f.thawedFridge)!, temp: "≤ 40°F / 4°C", container: "Covered", note: "Do not refreeze raw food thawed outside the fridge" });
  const safe = f.cooking.find((c) => c.safeTempF);
  if (safe) rows.push({ method: "Cooking", duration: "—", temp: `${safe.safeTempF}°F minimum`, container: "—", note: "Check with a food thermometer" });
  return rows;
}

/* ---------------------------------------------------------------- headline copy */
const phraseFridge = (s: State) => (s.fridge ? (isNum(s.fridge) ? `${fmt(s.fridge)} in the fridge` : s.fridge.text === "Use-by date" ? "until its use-by date in the fridge" : null) : null);
const phraseFreezer = (s: State) => (s.freezer && isNum(s.freezer) ? `${fmt(s.freezer)} in the freezer` : null);

export function quoteFor(f: Food): string {
  const s = f.states[0];
  const parts: string[] = [];
  const fr = phraseFridge(s);
  if (fr) parts.push(fr);
  const fz = phraseFreezer(s);
  if (fz) parts.push(fz);
  if (s.pantry && isNum(s.pantry)) parts.unshift(`${fmt(s.pantry)} in the pantry`);
  else if (s.pantry && !isNum(s.pantry) && s.pantry.text === "Until ripe") parts.unshift("on the counter until ripe");
  else if (f.perishable) parts.push("no more than 2 hours at room temperature");
  const prefix = s.key === "opened" ? "Opened " : "";
  const subj = prefix ? `${prefix}${lc(f)}` : f.name;
  const join = parts.length > 1 ? `${parts.slice(0, -1).join(", ")}${parts.length > 2 ? "," : ""} and ${parts.at(-1)}` : parts[0] ?? "as long as the package date allows";
  let out = `${subj} ${lasts(f)} ${join}.`;
  if (f.states.length > 1) {
    const t = f.states[1];
    const bits = [t.pantry && isNum(t.pantry) ? `${fmt(t.pantry)} in the pantry` : null, phraseFridge(t)].filter(Boolean);
    if (bits.length) out += ` ${t.label!.split(" /")[0]}, ${itThey(f)} ${f.plural ? "keep" : "keeps"} ${bits.join(" or ")}.`;
  }
  const extra = contentFor(f).quote;
  return extra ? `${out} ${extra}` : out;
}

/** The headline duration for titles: fridge first, then pantry. */
export function headline(f: Food): { value: string; where: string } {
  const s = f.states[0];
  // Canned food: people mean the unopened can, so lead with its pantry time.
  const un = f.states.find((x) => x.key === "unopened");
  if (/canned|\bcan\b/i.test(f.name) && un?.pantry && isNum(un.pantry)) return { value: fmt(un.pantry)!, where: "Unopened in the Pantry" };
  // Shelf-stable foods (a month or more in the pantry) answer with the pantry time.
  if (s.pantry && isNum(s.pantry) && (days(s.pantry) ?? 0) >= 30) return { value: fmt(s.pantry)!, where: "in the Pantry" };
  if (s.fridge && isNum(s.fridge)) return { value: fmt(s.fridge)!, where: "in the Fridge" };
  if (s.pantry && isNum(s.pantry)) return { value: fmt(s.pantry)!, where: "in the Pantry" };
  const alt = f.states.find((x) => x.fridge && isNum(x.fridge));
  if (alt) return { value: fmt(alt.fridge)!, where: `in the Fridge (${alt.label?.toLowerCase()})` };
  const p = f.states.find((x) => x.pantry && isNum(x.pantry));
  if (p) return { value: fmt(p.pantry)!, where: "in the Pantry" };
  return { value: "until the use-by date", where: "in the Fridge" };
}

const cap = (s: string, n = 155) => {
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.]$/, "") + "…";
};

export function foodTitle(f: Food) {
  const h = headline(f);
  const fz = freezerFacts(f);
  const fzPart = fz && isNum(fz) ? ` [Freezer ${titleCase(fmt(fz)!)}]` : "";
  return `How Long ${does(f)} ${titleCase(f.name)} Last? ${titleCase(h.value)} ${h.where}${fzPart}`;
}
export function foodDescription(f: Food) {
  const s = f.states[0];
  const h = headline(f);
  const fz = freezerFacts(f);
  let d = `${f.name} ${lasts(f)} ${h.value} ${h.where.toLowerCase()}`;
  if (fz && isNum(fz)) d += ` and ${fmt(fz)} frozen`;
  d += ".";
  if (h.where.startsWith("Unopened")) {
    const op = f.states.find((x) => x.key === "opened");
    if (op?.fridge) d += ` Once opened: ${fmt(op.fridge)} in the fridge.`;
  } else if (f.perishable) d += " Discard after 2 hours at room temperature.";
  else if (f.states.length > 1 && f.states[1].label) {
    const t = f.states[1];
    const v = fmt(t.pantry && isNum(t.pantry) ? t.pantry : t.fridge);
    if (v) d += ` ${t.label}: ${v}.`;
  } else if (s.pantry && !isNum(s.pantry)) d += ` On the counter: ${s.pantry.text.toLowerCase()}.`;
  d += ` Signs ${f.plural ? "they've" : "it's"} gone bad, freezing tips.`;
  return cap(d);
}

/* ---------------------------------------------------------------- FAQ */
export function faqFor(f: Food): [string, string][] {
  const c = contentFor(f).faq;
  const name = lc(f);
  const s = f.states[0];
  const out: [string, string][] = c ? [...c] : [];
  const add = (q: string, a: string) => { if (out.length < 6 && !out.some(([x]) => x.toLowerCase() === q.toLowerCase())) out.push([q, a]); };
  const fr = fmt(s.fridge);
  if (fr) add(`How long ${does(f).toLowerCase()} ${name} last in the fridge?`, `${f.name} ${lasts(f)} ${fr.toLowerCase()} in the fridge at 40°F (4°C) or below${f.states.length > 1 && s.label ? ` once ${s.label.toLowerCase()}` : ""}, according to USDA FoodKeeper.`);
  const v = freezeVerdict(f);
  add(`Can you freeze ${name}?`, v.tone === "no" ? `Not recommended. ${v.detail}` : v.tone === "yes" ? `Yes. ${v.detail}` : v.detail);
  if (f.perishable) add(`How long can ${name} sit out?`, `No more than 2 hours at room temperature, or 1 hour above 90°F (32°C). After that, discard ${itThey(f) === "they" ? "them" : "it"}.`);
  else if (s.pantry && isNum(s.pantry)) add(`${does(f)} ${name} need to be refrigerated?`, `Not ${f.states.length > 1 ? "until opened" : "for safety"}. ${f.name} ${lasts(f)} ${fmt(s.pantry)} in a cool, dry pantry.`);
  if (f.states.length > 1) {
    const [a, b] = f.states;
    add(`How long ${does(f).toLowerCase()} ${stateName(f, b)} last?`, `${[b.pantry && isNum(b.pantry) ? `${fmt(b.pantry)} in the pantry` : null, b.fridge ? `${fmt(b.fridge)!.toLowerCase()} in the fridge` : null].filter(Boolean).join(", ") || "Follow the package date"}. ${a.label}, the clock is shorter: ${[a.fridge ? `${fmt(a.fridge)!.toLowerCase()} in the fridge` : null, a.pantry ? `${fmt(a.pantry)!.toLowerCase()} in the pantry` : null].filter(Boolean).join(", ") || "see the table above"}.`);
  }
  add(`How can you tell if ${name} ${f.plural ? "have" : "has"} gone bad?`, signsFor(f).slice(0, 3).map((x) => `${x.title}: ${x.text.replace(/\.$/, "").toLowerCase()}`).join("; ") + ".");
  const safe = f.cooking.find((x) => x.safeTempF);
  if (safe) add(`What temperature should ${name} be cooked to?`, `${safe.safeTempF}°F (${Math.round(((safe.safeTempF! - 32) * 5) / 9)}°C) minimum internal temperature, checked with a food thermometer.`);
  add(`${does(f)} ${name} go bad past the date?`, datesFor(f).opened.title === "Past the date" ? datesFor(f).opened.text : datesFor(f).unopened.text);
  add(`Where do these numbers come from?`, `USDA FoodKeeper, the storage database maintained by the Food Safety and Inspection Service. We last checked this page in the current release.`);
  return out.slice(0, 6).map(([q, a]) => [q, trimWords(a, 50)]);
}
const trimWords = (s: string, n: number) => {
  const w = s.split(/\s+/);
  return w.length <= n ? s : w.slice(0, n).join(" ").replace(/[,;:]$/, "") + "…";
};

/* ---------------------------------------------------------------- long-form sections */
/** Natural name for a toggle's second state: "dry rice", "dry pasta", "uncooked quinoa", "unopened mayonnaise". */
export function stateName(f: Food, st: State): string {
  const word = (st.label ?? "").split(" /")[0].toLowerCase();
  const alt = st.fromId ? FOODS.find((x) => x.id === st.fromId) : null;
  const base = alt ? alt.name.toLowerCase() : lc(f);
  return base.includes(word) ? base : `${word} ${base}`;
}
/** One short answer per search modifier from the keyword plan ("in the fridge", "after opening", …). */
export function modifierQA(f: Food): [string, string][] {
  const name = lc(f);
  const D = does(f).toLowerCase();
  const s = f.states[0];
  const c = cellsFor(f, s, 0);
  const out: [string, string][] = [];
  const fzi = f.states.findIndex((x) => x.freezer);
  const cz = fzi >= 0 ? cellsFor(f, f.states[fzi], fzi).freezer : c.freezer;
  out.push([`How long ${D} ${name} last in the fridge?`, s.fridge ? `${c.fridge.value} at 4°C (40°F) or colder${s.label && f.states.length > 1 ? ` (${s.label.toLowerCase()})` : ""}. ${f.perishable ? "Count from the day it was cooked, opened or bought." : "Keep it sealed so it does not pick up moisture or odours."}` : `FoodKeeper gives no fridge time for ${name}; ${s.pantry ? `it keeps ${fmt(s.pantry)!.toLowerCase()} in the pantry instead.` : "check the package."}`]);
  out.push([`How long ${D} ${name} last in the freezer?`, isNum(freezerFacts(f)) ? `${cz.value} for best quality at -18°C (0°F). Frozen food stays safe indefinitely; after that, texture and flavour fade.` : `${cz.value}. ${freezeVerdict(f).detail}`]);
  out.push([`How long ${D} ${name} last at room temperature?`, f.perishable ? `No more than 2 hours, or 1 hour above 32°C (90°F). Perishable food left out longer should be thrown away.` : s.pantry ? `${fmt(s.pantry)} in a cool, dry place.` : `It is not meant to be kept at room temperature. Refrigerate it.`]);
  const op = f.states.find((x) => x.key === "opened");
  const un = f.states.find((x) => x.key === "unopened");
  if (op) { const co = cellsFor(f, op, f.states.indexOf(op)); out.push([`How long ${D} ${name} last after opening?`, `${op.fridge ? `${co.fridge.value} in the fridge` : ""}${op.fridge && op.pantry ? ", or " : ""}${op.pantry ? `${co.pantry.value} in the pantry` : ""} once opened. The printed date stops applying the moment you break the seal.`]); }
  if (un) { const cu = cellsFor(f, un, f.states.indexOf(un)); out.push([`How long ${D} unopened ${name} last?`, `${[un.pantry && isNum(un.pantry) ? `${cu.pantry.value} in the pantry` : null, un.fridge ? `${cu.fridge.value} in the fridge` : null].filter(Boolean).join(" or ") || "Until the package date"}, if the seal is intact and it is stored as the label says.`]); }
  if (f.states.length > 1 && !op) { const b = f.states[1]; const cb = cellsFor(f, b, 1); out.push([`How long ${D} ${stateName(f, b)} last?`, `${[b.pantry && isNum(b.pantry) ? `${cb.pantry.value} in the pantry` : null, b.fridge ? `${cb.fridge.value} in the fridge` : null].filter(Boolean).join(" or ") || "See the table above"}.`]); }
  out.push([`How long is ${name} good for past the expiration date?`, datesFor(f).opened.title === "Past the date" ? datesFor(f).opened.text : datesFor(f).unopened.text]);
  out.push([`How can you tell if ${name} ${f.plural ? "are" : "is"} bad?`, signsFor(f).slice(0, 3).map((x) => x.text.replace(/\.$/, "")).join(". ") + "."]);
  if (f.perishable) out.push([`How long can ${name} sit out?`, `2 hours at room temperature, 1 hour on a hot day above 32°C (90°F). Overnight is always too long.`]);
  return out;
}

export type Thaw = [string, string];
export function thawFor(f: Food): Thaw[] {
  const g = groupOf(f);
  if (g === "meat" || g === "seafood" || g === "cooked" || g === "cured")
    return [
      ["In the fridge", "Safest. About 24 hours per 2.3 kg (5 lb); small packs overnight. Raw meat and seafood then keep 1–2 more days."],
      ["In cold water", "Seal it in a leak-proof bag, submerge, and change the water every 30 minutes. About 30 minutes per 0.5 kg (1 lb). Cook right away."],
      ["In the microwave", "Use the defrost setting and cook immediately, because parts of the food may start to cook."],
    ];
  return [
    ["In the fridge", "Move it to the fridge the night before; texture holds best."],
    ["At room temperature", g === "bakery" ? "Bread and baked goods thaw well on the counter, still wrapped, in 1–3 hours." : "Only for shelf-stable foods; perishable food should not thaw on the counter."],
    ["From frozen", "Many foods go straight into soups, sauces, smoothies or the oven."],
  ];
}

/** Reheating rules apply to cooked food and anything cooked from raw meat or seafood. */
export function reheatFor(f: Food): [string, string][] | null {
  const g = groupOf(f);
  if (!["cooked", "meat", "seafood", "cured"].includes(g)) return null;
  return [
    ["Reheat to 74°C (165°F)", "Check the thickest part with a food thermometer; it should be steaming hot all the way through."],
    ["Only once", "Reheat just the portion you will eat. Each cool-and-reheat cycle gives bacteria another chance."],
    ["Cover and stir", "In the microwave, cover the dish and stir halfway so there are no cold spots."],
    ["From the freezer", "Thaw in the fridge first, or reheat straight from frozen and allow extra time."],
  ];
}

export type Zone = "door" | "top" | "middle" | "bottom" | "crisper" | "pantry" | "freezer";
/** Where the food belongs, following FSIS fridge-organisation guidance. */
export function zoneFor(f: Food): { zone: Zone; why: string } {
  const g = groupOf(f);
  const s = f.states[0];
  if (g === "frozen") return { zone: "freezer", why: "Keep it frozen solid at -18°C (0°F) until you are ready to cook." };
  if (!s.fridge && s.pantry) return { zone: "pantry", why: "A cool, dark, dry cupboard is best; the fridge is not needed." };
  if (g === "meat" || g === "seafood") return { zone: "bottom", why: "Raw meat and seafood go on the bottom shelf, in a dish, so juices can never drip onto ready-to-eat food." };
  if (g === "produce" || g === "leafy") return { zone: "crisper", why: "The crisper drawer holds humidity, which keeps produce from wilting." };
  if (g === "condiment" || g === "drink") return { zone: "door", why: "The door is the warmest part of the fridge, fine for condiments and drinks that resist spoilage." };
  if (g === "dairy" || g === "eggs" || g === "cheese" || g === "fat") return { zone: "middle", why: "A middle shelf is best, not the door: the door warms up every time it opens." };
  return { zone: "top", why: "Ready-to-eat and cooked food goes on the upper shelves, above anything raw." };
}
