#!/usr/bin/env python3
"""
Official restaurant nutrition guides (PDF) → data/restaurants/{chain}.json

    python3 scripts/extract-restaurants.py          # reads research/restaurants/*.pdf (git-ignored)

Each chain publishes its own nutrition guide; USDA does not analyse these menus. We take the numbers exactly as the
chain prints them, and keep a row only if it passes two checks:
  - every column we publish is present, and
  - calories agree with the macros (4 kcal/g protein and carbs, 9 kcal/g fat) within 20% + 20 kcal,
so a column misread from the PDF cannot reach the site. Rejected rows are listed in the output for review.
"""
import json, re, sys, pathlib
import pdfplumber

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "research" / "restaurants"
OUT = ROOT / "data" / "restaurants"
OUT.mkdir(parents=True, exist_ok=True)
KEYS = ["kcal", "fat", "satFat", "transFat", "cholesterol", "sodium", "carbs", "fiber", "sugars", "protein"]

def num(s):
    s = (s or "").strip().replace(",", "")
    if s.startswith("<"): s = s[1:]
    try: return float(s)
    except ValueError: return None

def plausible(r):
    est = 4 * r["protein"] + 4 * r["carbs"] + 9 * r["fat"]
    return abs(est - r["kcal"]) <= 0.2 * max(r["kcal"], est) + 20

def clean_name(s):
    s = re.sub(r"\s+", " ", s.replace("’", "'")).strip()
    s = re.sub(r"\s*Contains:.*$", "", s)
    s = re.sub(r"[†*]+$", "", s).strip()
    s = re.sub(r"^[•·]\s*", "", s).replace("®", "").replace("™", "")
    s = re.sub(r"\s*\(Supplier [A-Z]\)", "", s)
    return s

def finish(slug, name, source, items, rejected):
    seen, out = set(), []
    for it in items:
        it["name"] = it["name"].replace("‘", "'").replace("’", "'").replace("–", "-")
        k = (it["name"].lower(), it.get("serving", ""))
        if k in seen: continue
        seen.add(k); out.append(it)
    data = {"chain": {"slug": slug, "name": name}, "source": source, "count": len(out), "items": out, "rejected": rejected}
    (OUT / f"{slug}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    print(f"{slug}: {len(out)} items, {len(rejected)} rejected")

def weight_first(slug, name, pdf, source):
    """Guides whose rows read: name, serving weight (g), kcal, kcal from fat, fat, sat, trans, chol, sodium, carbs, fiber, sugars, protein."""
    items, rejected = [], []
    with pdfplumber.open(SRC / pdf) as f:
        for page in f.pages:
            for line in (page.extract_text(layout=True) or "").splitlines():
                m = re.match(r"^\s*(.+?)\s+((?:\d+(?:\.\d+)?\s+){11}\d+(?:\.\d+)?)\s*$", line)
                if not m: continue
                nm = clean_name(m.group(1))
                if not re.search(r"[A-Za-z]{3}", nm) or len(nm) > 90: continue
                v = [float(x) for x in m.group(2).split()]
                r = {"name": nm, "g": v[0], **dict(zip(KEYS, [v[1], v[3], v[4], v[5], v[6], v[7], v[8], v[9], v[10], v[11]]))}
                (items if plausible(r) and v[0] > 0 else rejected).append(r)
    finish(slug, name, source, items, rejected)

def fiveguys():
    weight_first("five-guys", "Five Guys", "fiveguys.pdf", {"name": "Five Guys US Nutrition & Allergen Guide", "date": "2026", "url": "https://www.fiveguys.com/nutritional-allergy-information"})

def arbys():
    """Arby's: names and numbers share a text line; columns = weight g, kcal, kcal from fat, fat, sat, trans, chol, sodium, carbs, fiber, sugars, protein."""
    items, rejected = [], []
    with pdfplumber.open(SRC / "arbys.pdf") as pdf:
        for page in pdf.pages:
            for line in (page.extract_text(layout=True) or "").splitlines():
                m = re.match(r"^\s*(.+?)\s+((?:\d+(?:\.\d+)?\s+){11}\d+(?:\.\d+)?)\s*$", line)
                if not m: continue
                name = clean_name(m.group(1))
                if not re.search(r"[A-Za-z]{3}", name) or len(name) > 90: continue
                v = [float(x) for x in m.group(2).split()]
                r = {"name": name, "g": v[0], **dict(zip(KEYS, [v[1], v[3], v[4], v[5], v[6], v[7], v[8], v[9], v[10], v[11]]))}
                (items if plausible(r) and v[0] > 0 else rejected).append(r)
    finish("arbys", "Arby's", {"name": "Arby's Nutrition & Allergen Information (U.S.)", "date": "2026-11", "url": "https://www.arbys.com/nutrition"}, items, rejected)

def dunkin():
    """Dunkin': tables with name, serving size, kcal, fat, sat, trans, chol, sodium, carbs, fiber, sugars, added sugars, protein, …"""
    items, rejected = [], []
    with pdfplumber.open(SRC / "dunkin.pdf") as pdf:
        for page in pdf.pages:
            for t in page.extract_tables():
                for row in t:
                    if not row or len(row) < 13 or not row[0] or num(row[2]) is None: continue
                    name = clean_name(row[0])
                    size = re.sub(r"\s+", " ", (row[1] or "").strip())
                    vals = [num(x) for x in row[2:13]]
                    if any(x is None for x in vals) or not re.search(r"[A-Za-z]{3}", name): continue
                    kcal, fat, sat, trans, chol, na, carbs, fiber, sug, _added, prot = vals
                    r = {"name": name, "serving": size, "kcal": kcal, "fat": fat, "satFat": sat, "transFat": trans, "cholesterol": chol, "sodium": na, "carbs": carbs, "fiber": fiber, "sugars": sug, "protein": prot}
                    (items if plausible(r) else rejected).append(r)
    finish("dunkin", "Dunkin'", {"name": "Dunkin' Nutrition Guide", "date": "2026-10-28", "url": "https://www.dunkindonuts.com/en/menu/nutrition"}, items, rejected)

for fn in (arbys, dunkin, fiveguys):
    fn()
