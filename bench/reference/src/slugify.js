export function slugify(input, options = {}) {
  if (typeof input !== "string") throw new TypeError("input must be a string");
  const sep = options.separator ?? "-";
  const words = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z0-9]+/g) ?? [];
  let out = words.join(sep);
  if (options.maxLength != null && out.length > options.maxLength) {
    out = "";
    for (const w of words) { const next = out ? out + sep + w : w; if (next.length > options.maxLength) break; out = next; }
  }
  return out;
}
