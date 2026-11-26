# Breakpoint 2027

A Solana Breakpoint page with official typography, a React Bits ASCII horizon adapted to native WebGL, and a cylindrical roulette of textured 3D foil packs. The scene dims as the selected pack shrinks, then a brief full-screen white flash silhouettes the torn foil. Twenty-one priced tickets sweep left to right, creeping past the $500 Common pull before the $50 Legendary ticket lands with confetti and a short confirmation sound. The result shows the crossed-out $500 to the left of $50 and a Claim Now link below that opens the Breakpoint event on Luma in a new tab.

Open pack opens the centered pack directly. The carousel starts still and responds to manual selection. On mobile, the two-line headline sits between the logo and the centered packs, with Open pack at the bottom.

```sh
npm run dev
```

Open http://127.0.0.1:5173. No installation is required. The local server uses Python’s standard library, with gzip and safe asset caching.

The authored static site lives in [`breakpoint-2027/dist`](breakpoint-2027/dist). See [`breakpoint-2027/ARCHITECTURE.md`](breakpoint-2027/ARCHITECTURE.md) for behavior, accessibility, branding, and rendering details. The original GradientASCII source and installation reference are in [`breakpoint-2027/vendor/README.md`](breakpoint-2027/vendor/README.md).

The headline types through $100, $75, and $50 on load. The opening effect prepares its particles, ticket texture, and sound buffers during browser idle time. Trimmed Kenney recordings accompany the foil rip, flash impact, ticket flight, Legendary landing, and stub tear. Audio starts after the first pointer or keyboard interaction, subject to the browser’s audio policy.

After editing scripts, styles, or assets, run `python3 breakpoint-2027/tools/prepare-site.py` to refresh inline CSS, the opening audio bank, and content fingerprints. The checked-in compact scripts run without a parser or build dependency. Optional compaction and maintenance details are in [the delivery tools guide](breakpoint-2027/tools/README.md).
