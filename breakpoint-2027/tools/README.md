# Static delivery preparation

Run from the repository root after changing authored scripts, styles, or assets:

```sh
python3 breakpoint-2027/tools/prepare-site.py
```

This synchronizes asset SHA-256 URLs, copies the exact authored styles.css into the marked head style block, and selects compact scripts only if their source/output fingerprints still match the manifest. Edited sources with stale compact artifacts are served as original scripts instead. Fonts, imagery, worker helper, preload, and script URLs must share matching fingerprints for immutable caching. The original full-resolution PNG stays in pack material generation. The carousel uses small responsive PNGs, and the ticket inlines the Solana and BP27 vectors for origin-clean Canvas rendering. The tool embeds the five MP3s in `dist/assets/audio/` in the `pack-audio` data block so a local file can decode them without making network requests.

The committed site runs without Node or a parser build step. Optional regeneration of conservative compact scripts requires an already-installed Acorn module passed explicitly; it never downloads or installs anything:

```sh
python3 breakpoint-2027/tools/prepare-site.py --parser /absolute/path/to/an/already-installed/acorn.mjs
```

On the audited workstation, an existing copy was available at `/Applications/Cursor.app/Contents/Resources/app/node_modules/acorn/dist/acorn.mjs`. That module is used only to tokenize/validate build output and is not copied into this repository or loaded by the website. The compactor preserves raw tokens, comments, every newline, literal/template/shader bytes, and canonical AST/directive structure. It only removes safe horizontal whitespace, retaining readable authored sources next to generated compact siblings. Generated filenames preserve the relative base for worker/import URLs. The manifest records original/compact byte counts, gzip sizes, hashes, and parser version.

The server serves only dist. Start it with `npm run dev`; it binds to 127.0.0.1:5173. HTTP regression checks use only Python’s standard library:

```sh
python3 -m unittest discover -s tests -p 'test_serve.py' -v
```

These local cache/compression settings must also be configured on any different deployment host; this change does not publish or configure a remote service.
