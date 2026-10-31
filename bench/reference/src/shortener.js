const AL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export class Shortener {
  constructor({ baseUrl, codeLength = 6, random = Math.random } = {}) {
    if (typeof baseUrl !== "string" || !baseUrl) throw new TypeError("baseUrl");
    this.base = baseUrl.replace(/\/+$/, ""); this.len = codeLength; this.rnd = random; this.codes = new Map(); this.byUrl = new Map();
  }
  shorten(url, { alias } = {}) {
    let u; try { u = new URL(url); } catch { throw new TypeError("url"); }
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new TypeError("url");
    if (alias !== undefined) {
      if (typeof alias !== "string" || !/^[A-Za-z0-9_-]{1,32}$/.test(alias)) throw new TypeError("alias");
      const e = this.codes.get(alias);
      if (e && e.url !== url) { const err = new Error("alias taken"); err.code = "ALIAS_TAKEN"; throw err; }
      if (!e) this.codes.set(alias, { url, hits: 0 });
      return `${this.base}/${alias}`;
    }
    if (this.byUrl.has(url)) return `${this.base}/${this.byUrl.get(url)}`;
    let code;
    do { code = ""; for (let i = 0; i < this.len; i++) code += AL[Math.floor(this.rnd() * AL.length)]; } while (this.codes.has(code));
    this.codes.set(code, { url, hits: 0 }); this.byUrl.set(url, code);
    return `${this.base}/${code}`;
  }
  resolve(x) { const code = String(x).split("/").pop(); const e = this.codes.get(code); if (!e) return null; e.hits++; return e.url; }
  stats(code) { const e = this.codes.get(code); return e ? { url: e.url, hits: e.hits } : null; }
}
