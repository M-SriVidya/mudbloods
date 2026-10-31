Create an ES module `src/semver.js` with three named exports, following Semantic Versioning 2.0.0.

- `parse(version)`: accepts `MAJOR.MINOR.PATCH` with optional `-prerelease` (dot-separated identifiers) and optional `+build` metadata, and an optional leading `v`. Returns `{ major, minor, patch, prerelease }` where the first three are numbers and `prerelease` is an array of strings (empty if none). Numeric parts must not have leading zeros (`01` is invalid). Invalid input, including non-strings, throws `TypeError`.
- `compare(a, b)`: returns `-1`, `0` or `1`. Compare major, minor, patch numerically. A version with a prerelease is lower than the same version without one. Prerelease identifiers compare left to right: numeric identifiers compare numerically and are lower than alphanumeric ones, alphanumeric compare in ASCII order, and a shorter list that is a prefix of a longer one is lower. Build metadata is ignored.
- `satisfies(version, range)`: `range` is one of: an exact version, `>=X.Y.Z`, `^X.Y.Z` (same major, and when major is 0, same minor), or `~X.Y.Z` (same major and minor), in each case also `>=` the given version. Prerelease versions satisfy a range only if the range's own version has a prerelease with the same major.minor.patch. An unparseable range throws `TypeError`.

Add tests.
