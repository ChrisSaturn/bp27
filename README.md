# Breakpoint 2027

A Solana Breakpoint page with official typography, an original React Bits ASCII horizon adapted to native WebGL, and a cylindrical roulette of identical textured 3D foil packs with an aesthetic dice selector.

```sh
npm run dev
```

Open http://127.0.0.1:5173. No installation is required. The local server uses Python’s standard library, with gzip and safe asset caching.

The authored static site lives in [`breakpoint-2027/dist`](breakpoint-2027/dist). See [`breakpoint-2027/ARCHITECTURE.md`](breakpoint-2027/ARCHITECTURE.md) for behavior, accessibility, branding, and rendering details. The original GradientASCII source and installation reference are in [`breakpoint-2027/vendor/README.md`](breakpoint-2027/vendor/README.md).

The headline types through $100, $75, and $50 on load. Procedural selection clicks activate after the first pointer or keyboard interaction, subject to the browser’s audio policy.

After editing scripts, styles, or assets, run `python3 breakpoint-2027/tools/prepare-site.py` to refresh inline CSS and content fingerprints. The checked-in compact scripts run without a parser or build dependency. Optional compaction and maintenance details are in [the delivery tools guide](breakpoint-2027/tools/README.md).
