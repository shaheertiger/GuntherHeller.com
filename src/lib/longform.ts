/**
 * Long-form copy for food and variant pages: what the food is, why it spoils, mistakes,
 * buying tips, ways to use it up, and a longer FAQ. Prose is written per food group and
 * follows FSIS / USDA consumer guidance; every duration is pulled from the FoodKeeper record.
 * {name} = food name in sentence case (lowercase), {Name} = capitalised.
 */
import { type Food, cellsFor, fmt, isNum, getCategory, lc, does, itThey } from "./data";
import { groupOf, freezeVerdict, zoneFor } from "./content";

type Copy = { about: string; spoil: string; mistakes: string[]; buying: string[]; useUp: string[]; container: string };

const C: Record<string, Copy> = {
  meat: {
    about: "Raw meat is one of the most perishable foods in the kitchen. Its surface carries bacteria from processing, and the juices it releases are an easy route for those bacteria to reach other food. That is why the safe fridge window is short and the freezer is your friend: freezing stops bacterial growth completely, so meat you cannot cook in time can simply go into the freezer on the day you buy it.",
    spoil: "Spoilage bacteria such as Pseudomonas and lactic-acid bacteria multiply on the surface of raw meat even at fridge temperature, producing the sour smell and sticky film you notice when it turns. Pathogens such as Salmonella and E. coli do not change the smell or look at all, so a piece of meat can seem fine and still be unsafe once it is past its window. Ground meat spoils fastest because grinding spreads surface bacteria through the whole batch.",
    mistakes: ["Thawing it on the counter: the outside reaches room temperature while the centre is still frozen.", "Storing it on a top shelf, where juices can drip onto ready-to-eat food.", "Rinsing it in the sink, which splashes bacteria around the kitchen instead of removing them.", "Counting the fridge days from the sell-by date instead of the day you bought it.", "Refreezing meat that was thawed in cold water or the microwave without cooking it first."],
    buying: ["Pick it up last, just before checkout, and take it home within an hour or two.", "Choose packs that are cold, tightly sealed and free of tears or pooled liquid.", "Bag it separately from produce and ready-to-eat food."],
    useUp: ["Cook it, then freeze the cooked meat in portions for quick meals.", "Turn it into a stew, chilli or pasta sauce that freezes well.", "Marinate and freeze it raw so it is ready to cook straight from the freezer."],
    container: "the original store pack, overwrapped in foil or a freezer bag, set on a plate or in a tray",
  },
  seafood: {
    about: "Fresh fish and shellfish are among the shortest-lived foods you can buy. Their delicate flesh contains enzymes and natural bacteria that keep working even in the fridge, and the fats in oily fish oxidise quickly. Most seafood should be cooked or frozen within a day or two of purchase; the freezer keeps quality for months.",
    spoil: "Bacteria break down the amino acids in fish flesh into compounds such as trimethylamine, which gives spoiling fish its strong 'fishy' or ammonia smell. Enzymes soften the texture at the same time. Some fish, including tuna and mackerel, can also form histamine if they warm up, which causes scombroid poisoning and is not destroyed by cooking.",
    mistakes: ["Storing live shellfish in water or a sealed plastic bag, which suffocates them.", "Leaving fish in the warmest part of the fridge instead of on ice or the bottom shelf.", "Refreezing seafood thawed at room temperature.", "Cooking shellfish whose shells stay open when tapped."],
    buying: ["Fresh fish should smell like the sea, with firm flesh that springs back when pressed.", "Whole fish should have clear eyes and bright red gills.", "Live clams, mussels and oysters should close when you tap them."],
    useUp: ["Cook it the day you buy it, then keep the cooked fish 3–4 days.", "Freeze fillets flat in freezer bags with the air squeezed out.", "Flake leftover cooked fish into fish cakes, pasta or salads within a few days."],
    container: "the coldest part of the fridge, in a covered dish or on a bed of ice",
  },
  cooked: {
    about: "Cooked dishes and leftovers follow the same simple rules: cool them fast, refrigerate within two hours, and eat them within a few days. Cooking kills most bacteria, but some survive as heat-resistant spores, and new bacteria arrive from hands, utensils and air. How you cool and store the food after cooking matters more than how it was cooked.",
    spoil: "Spores of bacteria such as Bacillus cereus and Clostridium perfringens survive cooking. When cooked food sits warm, the spores germinate and multiply quickly, and some produce toxins that reheating does not destroy. In the fridge they grow slowly, which is why cooked food has a window of a few days rather than weeks.",
    mistakes: ["Leaving a big pot to cool on the stove for hours instead of dividing it into shallow containers.", "Putting a deep, hot container straight into the fridge, which keeps the centre warm for hours.", "Reheating the same leftovers more than once.", "Tasting food to check whether it has gone off."],
    buying: ["For takeaway and deli food, get it home and into the fridge within two hours.", "Choose hot food that is steaming hot and cold food that feels cold.", "Check the prepared-on date for store-made dishes and count the fridge days from it."],
    useUp: ["Freeze portions on day one or two if you will not eat them in time.", "Turn leftovers into soups, fried rice, frittatas or wraps.", "Label containers with the date so you know exactly how long they have been in the fridge."],
    container: "shallow, airtight containers, cooled quickly and labelled with the date",
  },
  cured: {
    about: "Cured, smoked and processed meats last longer than fresh meat because salt, smoke, nitrites and lower moisture slow bacterial growth. They are not shelf-stable, though: once the package is opened, air and handling start the clock, and sliced products spoil faster than whole pieces because there is more exposed surface.",
    spoil: "Curing slows most spoilage bacteria, but Listeria monocytogenes can grow at fridge temperature on ready-to-eat meats such as deli slices and hot dogs. That is the main reason opened packs have a short window, and why pregnant women and older adults are advised to heat deli meats until steaming.",
    mistakes: ["Keeping an opened pack well past its opened window because the printed date is still weeks away.", "Leaving sliced meats out on a platter for hours at a party.", "Storing opened packs without rewrapping, so they dry out and pick up odours.", "Using the same knife or board for raw and ready-to-eat meats."],
    buying: ["Check that vacuum packs are tight with no air pockets or bulging.", "Buy deli-sliced meat in amounts you will finish within the opened window.", "Pick packs from the back of the chiller, where they stay coldest."],
    useUp: ["Freeze unopened packs if you will not open them before the date.", "Use up opened slices in toasties, omelettes, pasta or pizza.", "Divide large packs into portions and freeze what you will not use soon."],
    container: "its original pack, resealed, or an airtight container",
  },
  dairy: {
    about: "Milk, cream, yogurt and other fresh dairy foods are pasteurised, which kills harmful bacteria, but they are still perishable once opened. Their fridge life depends heavily on temperature: dairy kept at the back of a cold shelf lasts noticeably longer than dairy kept in the fridge door, which warms every time it opens.",
    spoil: "Lactic-acid and psychrotrophic bacteria that survive pasteurisation or enter after opening ferment the milk sugar, producing acid. That acid causes the sour smell, curdling and lumps you see in spoiled dairy. Moulds can also grow on the surface of yogurt, sour cream and similar products.",
    mistakes: ["Storing it in the fridge door, the warmest spot.", "Pouring unused milk back into the original carton.", "Leaving it on the table through a long meal.", "Freezing it and expecting the same texture for drinking; frozen dairy is best for cooking."],
    buying: ["Pick it up near the end of your shop and take it straight home.", "Choose containers from the back of the chiller with the latest date.", "Make sure lids and seals are intact."],
    useUp: ["Bake with it: pancakes, muffins, scones and sauces all use dairy.", "Freeze it in small portions or ice-cube trays for cooking.", "Blend it into smoothies before the end of its window."],
    container: "its original, tightly closed container on a middle shelf",
  },
  cheese: {
    about: "Cheese is milk preserved by acid, salt and the removal of moisture, so it keeps far longer than milk. How long it lasts depends mostly on moisture: hard, aged cheeses keep for weeks or months, while soft and fresh cheeses behave more like fresh dairy and keep only days to a couple of weeks once opened.",
    spoil: "Mould is the main way cheese goes off. On hard cheese, mould roots cannot travel far, so you can cut away at least 2.5 cm (1 inch) around and below a spot. On soft, shredded or crumbled cheese, mould spreads unseen through the whole piece, so the whole piece should be thrown away. Bacteria also produce an ammonia smell as soft cheese ages past its best.",
    mistakes: ["Wrapping it tightly in cling film, which traps moisture and encourages slime and mould.", "Cutting mould off soft or shredded cheese and eating the rest.", "Leaving it out for hours on a cheese board in a warm room.", "Freezing soft cheese and expecting the same texture."],
    buying: ["Buy hard cheese in a piece rather than pre-shredded if you want it to last longer.", "Check that packs are sealed and free of moisture or mould.", "Buy soft cheese in amounts you will finish within its opened window."],
    useUp: ["Grate and freeze hard cheese for cooking.", "Melt it into sauces, toasties, gratins and omelettes.", "Use soft cheese in dips, pasta or baked dishes before its window ends."],
    container: "wax or parchment paper, then a loose bag, in the cheese drawer",
  },
  eggs: {
    about: "Eggs keep for weeks in the fridge because the shell and the membranes inside it are a natural barrier. In the US, eggs are washed before sale, which removes a protective coating on the shell, so they must stay refrigerated. Once cracked, cooked or separated, the clock speeds up dramatically.",
    spoil: "The main safety risk with eggs is Salmonella, which can be present inside an egg that looks perfectly normal. Over time, eggs also lose moisture and carbon dioxide through the shell, the white thins and the yolk flattens. A truly spoiled egg produces a sulphur smell from bacterial breakdown of proteins.",
    mistakes: ["Storing eggs in the fridge door, where the temperature swings.", "Washing eggs before storing them.", "Leaving refrigerated eggs out for more than two hours: a cold egg that sweats can draw bacteria through the shell.", "Freezing eggs in the shell, which makes them crack."],
    buying: ["Open the carton and check that no eggs are cracked or dirty.", "Buy from a refrigerated case.", "Keep them in their carton, which protects them and shows the pack date."],
    useUp: ["Hard-boil a batch: they keep a week in the fridge.", "Beat and freeze extra eggs for baking.", "Use them in frittatas, quiches, custards and baking."],
    container: "the original carton on a middle shelf",
  },
  produce: {
    about: "Fresh fruit and vegetables are still alive after harvest: they keep breathing, ripening and losing moisture. How long they last depends on the type, how ripe they are when you buy them, and whether they are whole or cut. Many keep best in the fridge's crisper drawer, but some ripen and taste better on the counter first.",
    spoil: "Produce goes bad through a mix of over-ripening, moisture loss and microbial growth. Ripening fruit releases ethylene gas, which speeds up the ripening of everything near it. Bruises and cuts break cell walls, letting moulds and bacteria in, which is why cut produce must be refrigerated and used within days.",
    mistakes: ["Washing produce before storing it, which adds moisture and speeds up mould.", "Storing ethylene producers (apples, bananas, avocados) next to produce that over-ripens.", "Leaving cut fruit or vegetables at room temperature for more than two hours.", "Sealing produce in airtight bags with no airflow."],
    buying: ["Choose produce without bruises, soft spots or mould.", "Buy a mix of ripe and less-ripe pieces so they do not all ripen at once.", "Pick up cut produce from a refrigerated display."],
    useUp: ["Freeze ripe fruit for smoothies and baking.", "Roast or sauté vegetables that are starting to soften.", "Blend tired produce into soups, sauces and juices."],
    container: "the crisper drawer, unwashed, in a loose or perforated bag",
  },
  leafy: {
    about: "Leafy greens and fresh herbs are mostly water held in thin leaves, so they wilt and spoil faster than almost any other produce. The two things that shorten their life are too much moisture, which turns leaves slimy, and too little, which makes them wilt. Stored dry, cold and loosely wrapped, they keep for days to a couple of weeks.",
    spoil: "Bacteria and moulds break down leaf tissue that has been damaged by bruising or excess water, producing the slimy, dark patches and sour smell of spoiled greens. Leafy greens are also a known carrier of E. coli and Listeria from the field, which is why bagged salads should be kept cold and used by their date.",
    mistakes: ["Storing greens wet after washing.", "Packing them tightly so leaves bruise.", "Keeping them near ethylene-producing fruit.", "Freezing them for salads; frozen greens are only good for cooking."],
    buying: ["Choose crisp leaves with no slime, yellowing or dark spots.", "Check bagged salad for liquid in the bag and a date well ahead.", "Buy herbs with perky stems and a fresh smell."],
    useUp: ["Wilt soft greens into soups, pasta, curries and omelettes.", "Blend herbs into pesto or freeze them in oil in ice-cube trays.", "Add a handful to smoothies."],
    container: "a container or bag lined with a paper towel, in the crisper drawer",
  },
  bakery: {
    about: "Bread and baked goods are low in moisture compared with fresh food, so they rarely become unsafe quickly, but they do go stale and eventually mouldy. Staling is a change in the starch, not spoilage, and it actually happens faster in the fridge. Mould is the real limit, and it grows faster in warm, humid kitchens.",
    spoil: "Mould spores land on bread from the air and grow into fuzzy patches within days in warm, humid conditions. The visible patch is only part of it: thread-like roots spread through soft bread, so the whole loaf should be thrown away once mould appears. Cream- or custard-filled pastries are different and must be refrigerated like dairy.",
    mistakes: ["Keeping bread in the fridge, which makes it stale faster.", "Cutting off a mouldy patch and eating the rest of a soft loaf.", "Storing bread in a sealed bag while still warm, which traps moisture.", "Leaving cream-filled pastries at room temperature."],
    buying: ["Check the bag for condensation or mould spots.", "Buy loaf sizes you will finish within a few days, or plan to freeze half.", "Pick bakery items with the latest baked-on date."],
    useUp: ["Freeze sliced bread and toast it straight from frozen.", "Turn stale bread into croutons, breadcrumbs or bread pudding.", "Use soft fruit breads for French toast."],
    container: "a bread box or sealed bag at room temperature, or the freezer",
  },
  dry: {
    about: "Dry pantry staples last a long time because microbes need water to grow. Their enemies are moisture, heat, light, air and pantry pests. Most of them do not become unsafe after their best-by date; they slowly lose flavour, aroma and texture. Whole-grain products and anything containing natural oils are the exception, because those oils can go rancid.",
    spoil: "In dry foods, quality declines through oxidation and moisture rather than bacteria. Oils in whole grains, nuts and seeds slowly oxidise and turn rancid, giving a bitter, paint-like smell. Moisture lets mould grow and makes powders clump, and warm storage invites pantry moths and beetles.",
    mistakes: ["Storing it above the stove, kettle or dishwasher, where heat and steam speed spoilage.", "Leaving bags open instead of transferring to airtight containers.", "Mixing new stock into old so the oldest never gets used.", "Scooping with a damp spoon."],
    buying: ["Check packages for holes, webbing or clumping.", "Buy whole-grain flours and nuts in quantities you will use within a few months.", "Look for the latest best-by date."],
    useUp: ["Keep older stock at the front so it is used first.", "Freeze whole-grain flours and nuts to stop rancidity.", "Plan a 'pantry week' of meals built around what you already have."],
    container: "an airtight container in a cool, dark, dry cupboard",
  },
  fat: {
    about: "Butter, oils, nuts, seeds and nut butters are rich in fat, which bacteria do not grow on easily, so their main enemy is rancidity rather than food poisoning. Rancid fat is not usually dangerous in small amounts, but it tastes bitter and stale. Cool, dark, airtight storage slows it down; refrigeration slows it down further.",
    spoil: "Oxygen, light and heat react with the fats, breaking them into compounds that smell like crayons, paint or old nuts. Unsaturated fats, found in nut and seed oils, go rancid faster than saturated fats like butter. Moisture and crumbs introduced with a dirty knife can also let mould grow on butters and spreads.",
    mistakes: ["Storing oils next to the stove.", "Keeping clear bottles in sunlight.", "Leaving lids loose so air gets in.", "Buying large containers of nut oils or nuts that you will not finish before they turn rancid."],
    buying: ["Choose dark glass or tins for oils.", "Buy nuts and seeds from shops with a high turnover, or in sealed packs.", "Check the best-by date and buy sizes you will use within a few months."],
    useUp: ["Refrigerate or freeze nuts and seeds to keep them fresh longer.", "Use up nut butters in sauces, dressings and baking.", "Smell oils before using them: if they smell stale, replace them."],
    container: "an airtight, dark container away from heat and light",
  },
  condiment: {
    about: "Condiments, sauces and canned goods are designed to last: acid, sugar, salt and sealed packaging keep microbes out. Unopened, most keep for months or years in the pantry. Once opened, air, moisture and crumbs from utensils get in, and most need the fridge and have a much shorter window.",
    spoil: "In opened jars, yeasts and moulds are the usual culprits: they show up as fuzz on the surface, fizzing, or a fermented smell. Low-acid canned foods carry a rare but serious risk of Clostridium botulinum if a can is damaged, which is why bulging, leaking or deeply dented cans must be thrown away unopened.",
    mistakes: ["Double-dipping or using a dirty knife, which adds crumbs and bacteria.", "Storing opened jars in the pantry when the label says to refrigerate.", "Keeping food in an opened can in the fridge; move it to a covered container.", "Using cans that are bulging, rusted or deeply dented."],
    buying: ["Check cans for bulges, deep dents on the seams and rust.", "Make sure jar lids are sealed and pop when first opened.", "Buy condiment sizes you will finish within the opened window."],
    useUp: ["Write the opening date on the lid.", "Use the last of a jar in marinades, dressings or sauces.", "Freeze leftover sauces in ice-cube trays."],
    container: "the original jar or bottle, tightly closed; opened canned food moved to a covered container",
  },
  drink: {
    about: "Drinks range from shelf-stable to highly perishable. Unopened bottles, cans and cartons often keep for months, but once opened, fresh juices and dairy-free milks behave like fresh food and need the fridge. Coffee and tea do not become unsafe but lose aroma, and wine and spirits change with air exposure.",
    spoil: "In juices and milk alternatives, yeasts and bacteria ferment sugars once the seal is broken, producing fizz, sour smells and off flavours. Coffee and tea lose their aromatic oils to air, heat and light. Opened wine oxidises and slowly turns to vinegar.",
    mistakes: ["Leaving opened juice or plant milk out of the fridge.", "Drinking straight from the bottle, which introduces bacteria.", "Storing coffee in a clear jar on the counter.", "Keeping opened wine at room temperature with no cork."],
    buying: ["Check that seals and caps are intact.", "For fresh juices, buy from a refrigerated case.", "Buy coffee in quantities you will use within a few weeks of opening."],
    useUp: ["Freeze juice in ice-cube trays for smoothies.", "Use leftover wine in cooking or freeze it for sauces.", "Brew extra coffee into cold brew or use it in baking."],
    container: "the original container, tightly closed, in the fridge once opened",
  },
  frozen: {
    about: "Food bought frozen is safe for as long as it stays frozen solid at -18°C (0°F); freezer times are about quality, not safety. Over months, freezer burn and ice crystals slowly dry out and toughen the food. The key is to keep it frozen from shop to home and to reseal opened bags well.",
    spoil: "Freezing stops bacteria from growing but does not kill them. When food thaws, they become active again. Freezer burn, the dry grey-white patches you sometimes see, happens when air reaches the food and moisture evaporates from its surface: it is safe to eat but dry and tasteless.",
    mistakes: ["Letting it thaw on the way home and refreezing it.", "Leaving opened bags unsealed, which causes freezer burn.", "Overloading the freezer so cold air cannot circulate.", "Thawing it on the counter."],
    buying: ["Pick frozen food last and pack it together so it stays cold.", "Avoid packs with heavy frost or ice crystals inside, a sign of thawing and refreezing.", "Check that boxes are not crushed or torn."],
    useUp: ["Rotate older packs to the front.", "Keep a list on the freezer door of what is inside.", "Cook from frozen where the package allows it."],
    container: "the original pack, resealed tightly, or a freezer bag with the air pressed out",
  },
  baby: {
    about: "Baby foods, formula and breast milk have stricter storage rules than most food, because babies are more vulnerable to food-borne illness. Always follow the label and your pediatrician's advice first. Once a feed has started, bacteria from the baby's mouth enter the bottle or jar, so leftovers should not be saved.",
    spoil: "Prepared formula and opened baby food are moist, nutrient-rich and low in acid: ideal conditions for bacteria. Powdered formula is not sterile and can contain Cronobacter, which is why prepared formula has a short window and why water and equipment hygiene matter.",
    mistakes: ["Saving a half-finished bottle or jar for the next feed.", "Feeding straight from the jar and refrigerating the rest.", "Warming bottles in the microwave, which creates hot spots.", "Keeping prepared formula at room temperature for longer than the label allows."],
    buying: ["Check that jar lids are sealed and pop when opened.", "Never buy damaged, bulging or leaking cans of formula.", "Check the use-by date on formula; it is a federally required safety date."],
    useUp: ["Spoon portions into a bowl instead of feeding from the jar.", "Prepare formula one feed at a time.", "Freeze homemade purées in ice-cube trays and thaw a portion at a time."],
    container: "the original container or clean, sealed storage bottles, labelled with the date and time",
  },
};

const copyFor = (f: Food) => C[groupOf(f)] ?? C.dry;

/** One paragraph about the food built from its data, plus the group explainer. */
export function aboutFor(f: Food): string[] {
  const c = copyFor(f);
  const cat = getCategory(f.category).name;
  const s = f.states[0];
  const cells = cellsFor(f, s, 0);
  const facts: string[] = [];
  const notes: string[] = [];
  if (s.fridge) (isNum(s.fridge) ? facts.push(`${cells.fridge.value.toLowerCase()} in the fridge`) : notes.push(`In the fridge, follow the package's use-by date.`));
  if (s.pantry) (isNum(s.pantry) ? facts.push(`${cells.pantry.value.toLowerCase()} in the pantry`) : s.pantry.text === "Until ripe" ? facts.push("on the counter until ripe") : s.pantry.text === "Indefinitely" ? facts.push("indefinitely in the pantry") : null);
  const fz = f.states.map((x) => x.freezer).find(Boolean);
  if (fz) (isNum(fz) ? facts.push(`${fmt(fz)} in the freezer`) : notes.push(fz.text === "Not recommended" ? "Freezing is not recommended." : `Freezer: ${fz.text.toLowerCase()}.`));
  const list = facts.length > 1 ? `${facts.slice(0, -1).join(", ")} and ${facts.at(-1)}` : facts[0];
  const zone = zoneFor(f);
  const pl = f.plural;
  const source = f.derivedNote ? ` ${f.derivedNote}` : f.fkName && f.fkName !== f.name ? ` In the USDA FoodKeeper database ${pl ? "they are" : "it is"} listed as “${f.fkName}”.` : "";
  const intro = `${f.name} ${pl ? "belong" : "belongs"} to our ${cat.toLowerCase()} category.${source} ${list ? `According to USDA FoodKeeper${f.extraSource ? ` and the ${f.extraSource.name}` : ""}, ${itThey(f)} ${pl ? "keep" : "keeps"} ${list}.` : ""} ${notes.join(" ")} ${f.perishable ? `Like all perishable food, ${pl ? "they" : "it"} should not sit at room temperature for more than 2 hours.` : `${pl ? "They are" : "It is"} not a high-risk perishable food, so the main concern is quality rather than safety.`} Where to keep ${pl ? "them" : "it"}: ${zone.why.charAt(0).toLowerCase()}${zone.why.slice(1)}`.replace(/\s+/g, " ");
  return [intro, c.about];
}
export const spoilFor = (f: Food) => copyFor(f).spoil;
export const mistakesFor = (f: Food) => copyFor(f).mistakes;
export const buyingFor = (f: Food) => copyFor(f).buying;
export const useUpFor = (f: Food) => copyFor(f).useUp;

/** Extra FAQ entries (40–60 words each) to sit after the core FAQ. */
export function faqExtraFor(f: Food): [string, string][] {
  const c = copyFor(f);
  const name = lc(f);
  const D = does(f).toLowerCase();
  const s = f.states[0];
  const fr = cellsFor(f, s, 0).fridge.value.toLowerCase();
  const v = freezeVerdict(f);
  const zone = zoneFor(f);
  const them = itThey(f) === "they" ? "them" : "it";
  const out: [string, string][] = [
    [`What temperature should I keep ${name} at?`, `Keep your fridge at 4°C (40°F) or colder and your freezer at -18°C (0°F). Many fridges run warmer than their dial suggests, so an inexpensive appliance thermometer is worth having. Every few degrees above 4°C noticeably shortens the ${fr} fridge window for ${name}.`],
    [`What is the best container for ${name}?`, `Use ${c.container}. The goal is to keep out air and moisture, stop odours spreading, and make it easy to see how old the food is. Write the date on a label or the lid so you are never guessing how long it has been stored.`],
    [`Can I keep ${name} in the fridge door?`, zone.zone === "door" ? `Yes. The door is the warmest part of the fridge, but ${name} ${f.plural ? "resist" : "resists"} spoilage well enough to be stored there. Close the lid tightly after each use.` : zone.zone === "pantry" || zone.zone === "freezer" ? `${zone.why}` : `It is better not to. The door is the warmest part of the fridge and warms up every time it opens. ${zone.why}`],
    [`Can you refreeze ${name}?`, v.tone === "no" ? `Freezing ${name} is not recommended in the first place, so refreezing is not advised either. Keep ${them} in the fridge and use ${them} within the fridge window instead.` : `Only if ${itThey(f)} thawed in the fridge and ${f.plural ? "have" : "has"} not been left out. Food thawed in cold water or the microwave should be cooked before freezing again. Each freeze-thaw cycle lowers quality, so freeze in portions you will use at once.`],
    [`Does freezing kill bacteria in ${name}?`, `No. Freezing at -18°C (0°F) stops bacteria from multiplying but does not kill them. When ${name} ${f.plural ? "thaw" : "thaws"}, any bacteria present become active again, so thaw in the fridge and cook or reheat to a safe temperature where appropriate.`],
    [`Is ${name} safe if ${itThey(f)} ${f.plural ? "smell" : "smells"} fine but ${f.plural ? "are" : "is"} past the storage time?`, f.perishable ? `Not necessarily. The bacteria that cause food poisoning usually do not change the smell, look or taste of food. If ${name} ${f.plural ? "have" : "has"} been in the fridge longer than ${fr}, throw ${them} out even if ${itThey(f)} ${f.plural ? "seem" : "seems"} fine.` : `For a low-risk food like ${name}, past the storage time usually means lower quality rather than danger. Check for mould, off smells or an unusual taste, and throw ${them} out if anything seems wrong.`],
  ];
  return out;
}

/** What freezing does to each food group (freeze pages). */
const FREEZE_SCIENCE: Record<string, string> = {
  meat: "Freezing turns the water inside muscle fibres into ice crystals. Fast freezing makes small crystals and keeps the texture close to fresh; slow freezing makes larger crystals that rupture cells, so the meat loses more juice when it thaws. Wrapping tightly and freezing in thin, flat packs helps it freeze quickly.",
  seafood: "Fish has delicate, watery flesh, so ice crystals affect it more than meat. Freeze it as fresh as possible, in thin portions, and wrapped airtight: oily fish such as salmon and mackerel also oxidise in the freezer, which is why their quality window is shorter than lean white fish.",
  cooked: "Cooked dishes with plenty of liquid — soups, stews, sauces, casseroles — freeze best. Dry, crisp or creamy textures change more: rice and pasta soften slightly, cream sauces can separate, and fried coatings lose their crunch. Cool the food quickly before freezing so it spends as little time as possible in the danger zone.",
  cured: "Salt and smoke already preserve cured meats, but freezing extends their life further. Salt lowers the freezing point and can speed up rancidity of the fat, so cured meats have a shorter freezer window than fresh meat. Sliced deli meats can become slightly watery after thawing.",
  dairy: "Freezing separates the fat and water in milk and cream, so after thawing the texture can be grainy or watery. It is perfectly safe, and fine for cooking, baking and smoothies, but often not as pleasant to drink or spoon straight from the pot. Shake or whisk well after thawing.",
  cheese: "Hard cheeses freeze reasonably well but become crumblier, so frozen cheese is best grated or melted. Soft and fresh cheeses lose their creamy texture and can turn watery or grainy. Freeze cheese in small blocks or shredded, wrapped airtight, and thaw it slowly in the fridge.",
  eggs: "Raw eggs cannot be frozen in the shell because the contents expand and crack it. Beaten whole eggs, or separated whites and yolks, freeze well; yolks need a pinch of salt or sugar to stop them turning gel-like. Cooked egg whites become rubbery in the freezer.",
  produce: "Fruit and vegetables are mostly water, so freezing breaks their cell walls and they come out softer. That is why frozen produce is best cooked, baked or blended. Most vegetables keep better colour and flavour if blanched for a minute or two before freezing, which stops the enzymes that cause browning.",
  leafy: "Leaves are thin and full of water, so they collapse when frozen. They cannot be used for salads afterwards, but blanched greens and herbs frozen in oil keep their flavour well for soups, sauces and stir-fries.",
  bakery: "Bread and baked goods freeze very well because they contain little water. Freezing actually slows staling, which speeds up in the fridge. Wrap them tightly to prevent freezer burn and thaw them in the wrapping so the moisture goes back into the crumb.",
  dry: "Dry goods do not need freezing to stay safe, but the freezer can help: it kills pantry insects and their eggs and slows the rancidity of whole-grain flours, nuts and seeds. Let containers reach room temperature before opening so condensation does not form inside.",
  fat: "Fats freeze well. Butter keeps its quality for months, and nuts and seeds stay fresh far longer in the freezer because the cold slows rancidity. Oils may turn cloudy or solid in the cold, which is harmless and reverses at room temperature.",
  condiment: "Most condiments are already preserved by acid, sugar or salt and do not need freezing. Emulsions such as mayonnaise and creamy dressings separate when frozen. Tomato-based sauces, pesto and stocks freeze well in small portions.",
  drink: "Liquids expand by about 9% when they freeze, so always leave headspace in the container. Juices freeze well; carbonated drinks lose their fizz and cans or glass bottles can burst. Freezing does not improve wine or coffee, but frozen wine cubes are handy for cooking.",
  frozen: "Food bought frozen was frozen quickly at very low temperatures, which keeps ice crystals small. Your home freezer is warmer and opens often, so quality slowly declines. Keep the freezer at -18°C (0°F), avoid overfilling it, and reseal bags tightly.",
  baby: "Breast milk and homemade purées freeze well in small, labelled portions. Prepared infant formula should not be frozen; make it fresh for each feed. Thaw frozen baby food in the fridge or in warm water, never in the microwave, and do not refreeze it.",
};
export const freezeScienceFor = (f: Food) => FREEZE_SCIENCE[groupOf(f)] ?? FREEZE_SCIENCE.dry;

/** Real-life left-out scenarios (left-out pages). */
export function scenariosFor(f: Food): [string, string][] {
  const name = lc(f);
  const fr = cellsFor(f, f.states[0], 0).fridge.value.toLowerCase();
  return [
    ["Party buffet", `Set out small amounts of ${name} and swap in fresh, cold servings from the fridge every couple of hours. Keep cold platters on ice. Anything that sat out for more than 2 hours goes in the bin, not back in the fridge.`],
    ["Picnic or barbecue", `Pack ${name} in an insulated cooler with ice packs, keep the cooler in the shade, and open it as little as possible. On a hot day above 32°C (90°F), the limit outside the cooler drops to 1 hour.`],
    ["Power cut", `A closed fridge keeps food cold for about 4 hours, and a full freezer holds its temperature for about 48 hours (24 if half full). After a longer cut, throw out ${name} if it has been above 4°C (40°F) for more than 2 hours.`],
    ["Forgotten overnight", `By morning, ${name} left on the counter has spent many hours in the danger zone. It may look and smell normal, but it should be thrown away. If it had been refrigerated promptly, it would have kept ${fr}.`],
  ];
}

/** Date labels explained, with the food's own numbers (go-bad and freeze pages). */
export function datesExplained(f: Food): string[] {
  const name = lc(f);
  const s = f.states[0];
  const c = cellsFor(f, s, 0);
  return [
    `Most dates printed on ${name} packaging are about quality, not safety. In the US, the only federally required date is the use-by date on infant formula; everything else is chosen by the manufacturer. “Best if used by” tells you when flavour and texture are at their best. “Sell-by” is for the shop's stock rotation and you can store food at home for its normal storage time after it. “Use-by” is the last date the manufacturer recommends for peak quality.`,
    `That is why this page counts storage time from the day you buy, cook or open ${name}, rather than from the printed date: ${c.fridge.value.toLowerCase()} in the fridge${s.pantry ? ` and ${c.pantry.value.toLowerCase()} in the pantry` : ""}. If food has been stored correctly, it can be fine past a best-by date; if it has been stored badly, it can spoil well before it.`,
  ];
}
