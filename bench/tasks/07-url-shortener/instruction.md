Create an ES module `src/shortener.js` exporting a class `Shortener`, an in-memory URL shortener. The constructor takes `{ baseUrl, codeLength = 6, random = Math.random }`. `baseUrl` is required (throw `TypeError` if missing) and short links are `baseUrl` + `/` + code, with no double slash even when `baseUrl` ends with `/`.

- `shorten(url, { alias } = {})`: `url` must be an absolute `http:` or `https:` URL, else throw `TypeError`. Returns the short link. Shortening the same URL again without an alias returns the same link. Generated codes are `codeLength` characters from `[A-Za-z0-9]`, drawn using `random`, and must not collide with existing codes (retry on collision). With `alias` (1-32 chars of `[A-Za-z0-9_-]`, else `TypeError`), use it as the code; if the alias is already taken by a different URL, throw an `Error` whose `code` property is `"ALIAS_TAKEN"`.
- `resolve(codeOrShortLink)`: accepts a code or a full short link. Returns the original URL and counts one hit, or returns `null` for an unknown code (no hit counted).
- `stats(code)`: returns `{ url, hits }` or `null`.

Add tests.
