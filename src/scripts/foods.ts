/** Client helpers shared by the home widget, search page and calculators. */
export type Row = { s: string; n: string; k: string; c: string; f: string; z: string; fd: number | null; fx: number | null; zx: number | null; zd: number | null; p: 0 | 1; fv: string; sl: string | null; r: number; v: [number, number] };
let cache: Promise<Row[]> | null = null;
export const loadFoods = () => (cache ??= fetch("/search-index.json").then((r) => r.json()));
export const foodHref = (r: Row) => `/how-long-does-${r.s}-last/`;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
export function search(rows: Row[], q: string, limit = 8): Row[] {
  const nq = norm(q);
  if (!nq) return [];
  const words = nq.split(" ");
  const scored: [number, Row][] = [];
  for (const r of rows) {
    const name = norm(r.n);
    const hay = `${name} ${norm(r.k)}`;
    if (!words.every((w) => hay.includes(w) || hay.includes(w.replace(/s$/, "")))) continue;
    let score = r.r / 1000;
    if (name === nq) score -= 100;
    else if (name.startsWith(nq)) score -= 50;
    else if (name.includes(nq)) score -= 20;
    scored.push([score, r]);
  }
  return scored.sort((a, b) => a[0] - b[0]).slice(0, limit).map((x) => x[1]);
}
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Fill a <datalist> for an input marked data-picker and resolve the typed name back to a row. */
export async function picker(input: HTMLInputElement) {
  const rows = await loadFoods();
  const f = input.dataset.picker;
  const list = rows.filter((r) => (f === "perishable" ? true : f === "freezer" ? r.zd != null : f === "fridge" ? r.fd != null : true)).sort((a, b) => a.n.localeCompare(b.n));
  const dl = document.getElementById(input.getAttribute("list")!)!;
  dl.innerHTML = list.map((r) => `<option value="${esc(r.n)}"></option>`).join("");
  return (): Row | null => {
    const v = input.value.trim().toLowerCase();
    if (!v) return null;
    return list.find((r) => r.n.toLowerCase() === v) ?? search(list, v, 1)[0] ?? null;
  };
}
export const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 864e5);
export const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
