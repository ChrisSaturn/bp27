# Lighthouse performance audit — 21 November 2026

Audited the unchanged site at http://127.0.0.1:5173/ using built-in Lighthouse 13.5.0 in Brave/Chromium 157 DevTools, in a temporary private window. No CLI, npm package, browser extension, or service was installed. Only Performance was audited, in Navigation mode with Clear storage and default simulated throttling. These are single-run local lab results, not production or field measurements. Browser Energy Saver was already enabled and was left unchanged; host load and power management can affect timing.

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance score | 79 / 100 | 95 / 100 |
| First Contentful Paint | 1.1 s | 0.3 s |
| Largest Contentful Paint | 1.8 s | 0.4 s |
| Total Blocking Time | 860 ms | 180 ms |
| Cumulative Layout Shift | 0 | 0 |
| Speed Index | 1.1 s | 0.4 s |

CLS is rounded to 0 in Lighthouse; raw values are approximately 0.0000109 mobile and 0.0000091 desktop. Mobile used the Moto G Power profile, 150ms RTT, 1.638Mbps throughput, and 4× CPU simulation. Desktop used 40ms RTT, 10.24Mbps throughput, and 1× CPU. Both final reports contain no run warnings. Settings and exact numeric values are retained in the JSON files.

## Findings and next steps

1. **Mobile startup blocking is the main limitation.** TBT is 864.9ms. The largest simulated task is 952ms and is reported as Unattributable; do not assign it to a specific renderer without a CPU trace. Named script CPU costs include about 459ms for the ASCII renderer and 165ms for the pack renderer. Profile the font-ready/graphics startup callbacks with JS sampling, then split or move the expensive work off the main thread while keeping identical generated maps and timing. The named scripts are investigation candidates, not proven attribution of the 952ms task.
2. **Render-blocking stylesheet:** Lighthouse estimates 150ms savings for styles.css. Consider a minimal critical-style path and smaller delivered CSS, preserving initial layout and fallback styling.
3. **Local server delivery:** the Python development server provides no long-lived cache headers or compression. Lighthouse flags approximately 165KiB of repeat-visit caching opportunity and uncompressed HTML. These are findings for this local server; verify the deployed host before making production configuration changes. Fingerprinted assets can receive immutable caching and text responses can use gzip/Brotli at the host.
4. **Header logo sizing:** the 1045 × 200 PNG is displayed near 104 × 20 CSS pixels. Lighthouse estimates 13KiB savings. A separate small header rendition could reduce transfer while retaining the full-resolution source for procedural pack textures; account for the shared-resource tradeoff before introducing another request.
5. **Smaller delivery opportunity:** JavaScript minification is flagged at roughly 10KiB. Prioritize blocking work over this smaller transfer saving.

The steady-state rendering improvements from the earlier performance pass do not eliminate startup work. This audit measured the page load separately. No website code or visuals were changed during the audit.

## Reports and reproduction

- [Mobile HTML](lighthouse-mobile.html), [mobile JSON](lighthouse-mobile.json), [mobile screenshot](lighthouse-mobile.jpg).
- [Desktop HTML](lighthouse-desktop.html), [desktop JSON](lighthouse-desktop.json), [desktop screenshot](lighthouse-desktop.jpg).
- Start the existing local server with `npm run dev`. In a private browser window, open the local URL and DevTools → Lighthouse. Remove external device/network throttling before starting. Select Performance, Navigation, Clear storage, and Simulated throttling, then audit Mobile and Desktop separately.
- The initial setup inherited iPhone/Slow 4G DevTools emulation and produced 75 mobile / 78 desktop. Those preliminary results are excluded. The exported preliminary mobile evidence is retained under `preliminary-mobile-extra-throttling.*`. Final results above were gathered after clearing the extra emulation. Original DevTools device, network, category, and Console settings were restored and the temporary private window was closed.
- [Official Lighthouse panel documentation](https://developer.chrome.com/docs/devtools/lighthouse) and [throttling reference](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md).

The source fingerprint file identifies the audited static files; audit artifacts live outside dist and are not part of the served page.
