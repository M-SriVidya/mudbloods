export function parseCSV(text, { delimiter = ",", header = false } = {}) {
  const rows = []; let row = [], f = "", i = 0, q = false, any = false;
  while (i < text.length) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i += 2; continue; } q = false; i++; continue; } f += c; i++; continue; }
    if (c === '"' && f === "") { q = true; any = true; i++; continue; }
    if (c === delimiter) { row.push(f); f = ""; any = true; i++; continue; }
    if (c === "\r" && text[i + 1] === "\n") { i++; continue; }
    if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; any = false; i++; continue; }
    f += c; any = true; i++;
  }
  if (q) throw new SyntaxError("unterminated quote");
  if (any || f !== "" || row.length) { row.push(f); rows.push(row); }
  if (!header) return rows;
  const [h, ...rest] = rows; if (!h) return [];
  return rest.map((r, k) => { if (r.length !== h.length) throw new Error(`record ${k + 2} has ${r.length} fields`); return Object.fromEntries(h.map((key, j) => [key, r[j]])); });
}
