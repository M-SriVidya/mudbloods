# mudbloods

Self-improving, architecture-first build pipeline for Claude Code, by team Mudbloods.

## Install (plugin)

In Claude Code:

```
/plugin marketplace add M-SriVidya/mudbloods
/plugin install mudbloods@mudbloods
```

Restart Claude Code, then:

```
/mudbloods:build <instruction>
```

Atomic commands: `/mudbloods:architecture`, `/mudbloods:plan`, `/mudbloods:code`,
`/mudbloods:review`, `/mudbloods:judge`, `/mudbloods:learn`, `/mudbloods:bench`,
`/mudbloods:status`.

## Install (bare `/mudbloods build ...`)

```
git clone https://github.com/M-SriVidya/mudbloods
node mudbloods/mudbloods/install.mjs
```

Full docs: [mudbloods/README.md](mudbloods/README.md).
