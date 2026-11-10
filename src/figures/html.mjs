/**
 * Card spec → HTML (one .fig element, 1200×675). Pure functions, no data access: every string and
 * number arrives in the spec, which src/figures/cards.ts builds from the page's own data.
 */
import { icon, SILHOUETTES } from "./icons.mjs";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ZICON = { pantry: "pantry", counter: "counter", fridge: "fridge", freezer: "freezer", danger: "heat" };

export const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rng = (seed) => () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) ^ Math.imul(seed ^ (seed >>> 13), 3266489909)), ((seed ^= seed >>> 16) >>> 0) / 4294967296);

const foot = (spec) => `<footer class="fig-foot"><span class="mark"><i>GH</i>Gunther Heller</span><span>${esc(spec.source ?? "")}</span></footer>`;
const head = (spec) => `<header class="fig-head"><h2 class="fig-title" data-fit="44">${esc(spec.title)}</h2>${spec.sub ? `<p class="fig-sub">${esc(spec.sub)}</p>` : ""}</header>`;
const frame = (spec, body, extraClass = "") =>
  `<div class="fig fig--${spec.type} ${extraClass}" lang="${esc(spec.lang)}" data-zone="${spec.zone ?? "fridge"}">${head(spec)}<div class="fig-body" data-body>${body}</div>${foot(spec)}</div>`;

/* ---------------------------------------------------------------- hero */
export function heroArt(family, zone, seed) {
  const r = rng(hash(seed));
  const shape = Math.floor(r() * 3);
  const tex = Math.floor(r() * 3);
  const Z = { pantry: ["var(--pantry)", "var(--pantry-tint)", "var(--pantry-deep)"], fridge: ["var(--fridge)", "var(--fridge-tint)", "var(--fridge-deep)"], freezer: ["var(--freezer)", "var(--freezer-tint)", "var(--freezer-deep)"], danger: ["var(--danger-zone)", "var(--discard-tint)", "#a8371f"], accent: ["var(--accent)", "#eeecfb", "#3427a8"] }[zone] ?? ["var(--fridge)", "var(--fridge-tint)", "var(--fridge-deep)"];
  const [field, tint, deep] = Z;
  let fieldEl, cx, cy, clip;
  if (shape === 0) {
    const x = 640 + Math.round(r() * 60), y = 40 + Math.round(r() * 40);
    fieldEl = `<rect x="${x}" y="${y}" width="${1240 - x}" height="${720 - y}" rx="28"/>`; cx = (x + 1200) / 2; cy = (y + 675) / 2;
  } else if (shape === 1) {
    const rad = 560 + Math.round(r() * 60);
    fieldEl = `<circle cx="1200" cy="${675 + Math.round(r() * 40)}" r="${rad}"/>`; cx = 1200 - rad * 0.45; cy = 675 - rad * 0.48;
  } else {
    const x = 690 + Math.round(r() * 50), w = 400 + Math.round(r() * 60);
    fieldEl = `<rect x="${x}" y="-30" width="${w}" height="735" rx="28"/>`; cx = x + w / 2; cy = 340;
  }
  clip = `<clipPath id="fc">${fieldEl}</clipPath>`;
  let texture = "";
  if (tex === 0) texture = Array.from({ length: 22 }, (_, i) => `<path d="M560 ${i * 32 + 8}H1240"/>`).join("");
  else if (tex === 1) { for (let y = 12; y < 700; y += 32) for (let x = 600; x < 1220; x += 32) texture += `<circle cx="${x}" cy="${y}" r="3"/>`; }
  else texture = Array.from({ length: 14 }, (_, i) => `<circle cx="1200" cy="675" r="${120 + i * 48}" fill="none"/>`).join("");
  const texStyle = tex === 1 ? `fill="${deep}" stroke="none"` : `fill="none" stroke="${deep}" stroke-width="3"`;
  const scale = 1.0 + r() * 0.35;
  const rot = Math.round((r() - 0.5) * 24);
  const dx = Math.round((r() - 0.5) * 80), dy = Math.round((r() - 0.5) * 60);
  const sil = (SILHOUETTES[family] ?? SILHOUETTES.grains)
    .map(([tone, el]) => {
      const fill = tone === "a" ? tint : tone === "b" ? deep : field;
      return el.includes('fill="none"') ? `<g stroke="${fill}" fill="none">${el}</g>` : `<g fill="${fill}">${el}</g>`;
    })
    .join("");
  return `<svg class="hero-art" viewBox="0 0 1200 675" width="1200" height="675" aria-hidden="true"><defs>${clip}</defs>
<g fill="${field}">${fieldEl}</g>
<g clip-path="url(#fc)" opacity=".22" ${texStyle}>${texture}</g>
<g clip-path="url(#fc)"><g transform="translate(${cx + dx} ${cy + dy}) rotate(${rot}) scale(${scale.toFixed(3)}) translate(-200 -200)">${sil}</g></g>
</svg>`;
}

function answer(spec) {
  const d = spec.data;
  return `<div class="fig fig--answer" lang="${esc(spec.lang)}" data-zone="${spec.zone}">${heroArt(d.family, spec.zone, d.seed)}
<div class="hero-text">
  <div class="hero-name" data-fit="44">${esc(d.name)}</div>
  <div class="hero-num-wrap"><div class="hero-num${d.isWord ? " is-word" : ""}" data-mega>${esc(d.big).replace(/(\d)–(\d)/g, "$1\u200a–\u200a$2")}</div>${d.unit || d.where ? `<div class="hero-unit">${esc(d.unit)}${d.where ? ` <b>${esc(d.where)}</b>` : ""}</div>` : ""}${d.line ? `<div class="hero-line">${esc(d.line)}</div>` : ""}</div>
  <footer class="fig-foot"><span class="mark"><i>GH</i>Gunther Heller</span></footer>
</div></div>`;
}

/* ---------------------------------------------------------------- shelf-life */
function shelfLife(spec) {
  const d = spec.data;
  const max = Math.max(...d.rows.flatMap((r) => r.bars.map((b) => b.days ?? 0)));
  const paired = d.rows.some((r) => r.bars.length > 1);
  const VAL_ROOM = 300; // px kept free for the value label
  const rows = d.rows.map((row) => {
    const bars = row.bars.map((b) => {
      if (b.days == null) return `<div class="bar is-text${b.alt ? " is-alt" : ""}"><span class="val">${esc(b.text)}</span></div>`;
      const pct = max ? b.days / max : 0;
      return `<div class="bar${b.alt ? " is-alt" : ""}"><span class="fill" style="width:calc((100% - ${VAL_ROOM}px) * ${pct.toFixed(5)})"></span><span class="val num">${esc(b.text)}${b.tag ? `<small>${esc(b.tag)}</small>` : ""}</span></div>`;
    }).join("");
    return `<div class="z${row.icon === false ? " is-food" : ""}">${row.icon === false ? "" : icon(ZICON[row.icon ?? row.zone])}${esc(row.label)}</div><div class="track">${bars}</div>`;
  });
  const legend = paired && d.legend ? `<div class="legend"><span><i></i>${esc(d.legend[0])}</span><span><i class="alt"></i>${esc(d.legend[1])}</span></div>` : "";
  const zones = d.rows.map((r) => `z-${r.zone}`);
  return frame(spec, `<div class="bars${paired ? " paired" : ""}${d.foodLabels ? " foods" : ""}">${rows.map((r, i) => r.replace(/<div class="z( is-food)?">/, (m, f) => `<div class="z${f ?? ""} ${zones[i]}">`).replace('<div class="track">', `<div class="track ${zones[i]}">`)).join("")}</div>${legend}`);
}

/* ---------------------------------------------------------------- temperature */
function temperature(spec) {
  const g = spec.data.gauges.map((x) => {
    const pos = (v) => ((v - x.min) / (x.max - x.min)) * 100;
    const safeFrom = x.safe[0] == null ? 0 : pos(x.safe[0]);
    const safeTo = x.safe[1] == null ? 100 : pos(x.safe[1]);
    const ticks = (x.ticks ?? []).map((t) => `<span class="gauge-tick" style="left:${pos(t.v)}%">${esc(t.label)}</span>`).join("");
    const keys = x.keys.map((k) => `<span class="gauge-mark" style="left:${pos(k.v)}%"></span><span class="gauge-tick is-key num" style="left:${pos(k.v)}%">${esc(k.label)}${k.alt ? `<small>${esc(k.alt)}</small>` : ""}</span>`).join("");
    const noteLeft = x.noteAt === "right" ? `right:${100 - safeTo}%` : `left:${safeFrom}%`;
    return `<div class="gauge z-${x.zone}"><div class="gauge-name">${icon(ZICON[x.zone])}${esc(x.label)}</div>
<div class="gauge-scale"><div class="gauge-track"><div class="gauge-safe" style="left:${safeFrom}%;width:${safeTo - safeFrom}%"></div></div>${x.note ? `<div class="gauge-note" style="${noteLeft}">${esc(x.note)}</div>` : ""}${ticks}${keys}</div></div>`;
  });
  return frame(spec, `<div class="gauges">${g.join("")}</div>`);
}

/* ---------------------------------------------------------------- steps */
function steps(spec) {
  const s = spec.data.steps;
  const n = s.length;
  const items = s.map((x, i) => n === 3
    ? `<div class="step"><div class="step-head"><span class="step-no num">${i + 1}</span><span class="step-ic">${icon(x.icon, { size: 64 })}</span></div><p class="step-text" data-fit="26">${esc(x.text)}</p></div>`
    : `<div class="step"><span class="step-no num">${i + 1}</span><p class="step-text" data-fit="26">${esc(x.text)}</p></div>`).join("");
  return frame(spec, `<div class="steps n${n}">${items}</div>`);
}

/* ---------------------------------------------------------------- signs */
function signs(spec) {
  const d = spec.data;
  const rows = d.rows.map((r) => `<div class="sign-name">${icon(r.icon)}${esc(r.name)}</div><div class="sign-text" data-fit="26">${esc(r.text)}</div><div class="sign-x">${icon("cross", { size: 40, disc: "var(--discard)" })}</div>`).join("");
  const key = `<div class="signs-key"><span class="verdict no">${icon("cross", { size: 32, disc: "var(--discard)" })}${esc(d.discard)}</span>${d.ok ? `<span class="signs-ok">${icon("check", { size: 32, disc: "var(--safe)" })}<span data-fit="26">${esc(d.ok)}</span></span>` : ""}</div>`;
  return frame(spec, `<div class="signs">${rows}</div>${key}`);
}

/* ---------------------------------------------------------------- versus */
function versus(spec) {
  const d = spec.data;
  const big = d.cols.every((c) => c.rows.length === 1);
  const cols = d.cols.map((c) => big
    ? `<div class="vs-col z-${c.rows[0].zone}"><div class="vs-name">${icon(ZICON[c.rows[0].icon ?? c.rows[0].zone], { size: 48 })}${esc(c.name)}</div><div class="vs-big${c.rows[0].isText ? " is-text" : " num"}" data-fit="40">${esc(c.rows[0].value)}</div></div>`
    : `<div class="vs-col"><div class="vs-name">${esc(c.name)}</div>${c.rows.map((r) => `<div class="vs-row z-${r.zone}"><span class="k">${icon(ZICON[r.icon ?? r.zone], { size: 38 })}${esc(r.label)}</span><span class="v${r.isText ? " is-text" : " num"}">${esc(r.value)}</span></div>`).join("")}</div>`).join("");
  return frame(spec, `<div class="vs${big ? " big" : ""}">${cols}</div>`);
}

/* ---------------------------------------------------------------- matrix */
function matrix(spec) {
  const d = spec.data;
  const head = `<tr><th style="width:${d.foodWidth ?? 34}%"></th>${d.cols.map((c) => `<th class="zh z-${c.zone}"><span>${icon(ZICON[c.icon ?? c.zone], { size: 34 })}${esc(c.label)}</span></th>`).join("")}</tr>`;
  const rows = d.rows.map((r) => `<tr><td class="food">${esc(r.name)}</td>${r.cells.map((c, i) => `<td class="z-${d.cols[i].zone}${c.isText ? " is-text" : ""}"${c.isText ? ' data-fit="22"' : ""}>${c.isText ? esc(c.value) : `<span class="chip">${esc(c.value)}</span>`}</td>`).join("")}</tr>`).join("");
  return frame(spec, `<table class="mx">${head}${rows}</table>`);
}

/* ---------------------------------------------------------------- callout */
function callout(spec) {
  const d = spec.data;
  return frame(spec, `<div class="callout"><div class="callout-badge">${icon(d.icon ?? "clock", { size: 112 })}</div><div><p class="callout-text" data-fit="40">${esc(d.text)}</p>${d.note ? `<p class="callout-note">${esc(d.note)}</p>` : ""}</div></div>`);
}

const R = { answer, "shelf-life": shelfLife, temperature, steps, signs, versus, matrix, callout };
export function cardHtml(spec) {
  const fn = R[spec.type];
  if (!fn) throw new Error(`unknown card type ${spec.type}`);
  return fn(spec);
}

/**
 * Runs inside the page after a card is inserted: fits the hero number and any [data-fit] text,
 * then reports overflow. Returns { ok, problems: [] }.
 */
export const FIT_SCRIPT = `(() => {
  const fig = document.querySelector('.fig');
  const problems = [];
  const mega = fig.querySelector('[data-mega]');
  if (mega) {
    const box = mega.parentElement;
    let s = parseFloat(getComputedStyle(mega).fontSize);
    const maxW = box.clientWidth + 6;
    while (s > 96 && (mega.scrollWidth > maxW || box.scrollHeight > box.clientHeight + 1)) { s -= 4; mega.style.fontSize = s + 'px'; }
  }
  const body = fig.querySelector('[data-body]');
  const fits = [...fig.querySelectorAll('[data-fit]')];
  const over = () => (body && body.scrollHeight > body.clientHeight + 1) || fig.scrollHeight > fig.clientHeight + 1 || fits.some((e) => e.scrollWidth > e.clientWidth + 1) || fits.some((e) => e.classList.contains('fig-title') && e.getBoundingClientRect().height > 150);
  let guard = 0;
  while (over() && guard++ < 40) {
    let changed = false;
    for (const e of fits) {
      const min = parseFloat(e.dataset.fit);
      const cur = parseFloat(getComputedStyle(e).fontSize);
      if (cur - 1 >= min) { e.style.fontSize = (cur - 1) + 'px'; changed = true; }
    }
    if (!changed) break;
  }
  if (over()) problems.push('content overflows the figure');
  for (const e of fig.querySelectorAll('.val, .v, .gauge-tick, .verdict, .z, .k, .vs-name, td, th, .hero-unit')) {
    if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible') problems.push('clipped: ' + e.textContent.trim().slice(0, 40));
  }
  const fr = fig.getBoundingClientRect();
  for (const e of fig.querySelectorAll('.val, .gauge-tick, .gauge-note, .verdict, .v, .hero-num')) {
    const r = e.getBoundingClientRect();
    if (r.width && (r.right > fr.right - 24 || r.left < fr.left + 24)) problems.push('outside margin: ' + e.textContent.trim().slice(0, 40));
  }
  const min = Math.min(...[...fig.querySelectorAll('p, span, div, td, th')].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((e) => parseFloat(getComputedStyle(e).fontSize)));
  return { ok: problems.length === 0, problems, minFont: min };
})()`;
