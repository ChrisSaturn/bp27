# Breakpoint 2027 architecture

## Experience contract

The page presents the Solana/BP27 lockup, a single-line “earn a $500 ticket for” headline with a typed price sequence, and ten identical purple packs on a cylindrical roulette. The fixed $500 value and animated price use ABC Favorit Bold; remaining text uses Regular. The prefix has an intro glitch and repeats it on opening, without a hover trigger. The price types $100, holds briefly, deletes to type $75, waits one second, then deletes to type $50 and stays there. It scales to 52px on desktop and 24px on mobile. The Open control is small and rounded; the borderless dice has a heavier 24px icon and a 44px hit target.

Every pack opens the same local event-ticket illustration. Selection and dice randomness are aesthetic only. There is no payment, wallet connection, ticket issuance, real prize draw, or persisted reward. Per the owner's request, the page does not show demo/preview wording or a label beneath the packs.

## Files and runtime

- `dist/index.html`: semantic heading, logos, carousel region, controls, and native ticket dialog.
- `dist/styles.css`: font faces, masked perspective viewport, CSS foil-pack depth, responsive layout, and ticket styling.
- `dist/packs.js`: cylindrical positioning, idle motion, drag/keyboard navigation, quintic dice spin, pack opening, and dialog behavior.
- `dist/pack-renderer.js`: shared native WebGL2 pouch drawing, artwork, material setup, and lighting.
- `dist/pack-material-data.js`: worker/shared fallback for exact mesh and numeric normal-map generation.
- `serve.py` (repository root): loopback-only static delivery with gzip and verified fingerprint caching.
- `dist/hyper-text.js`: prefix glitch and native price typing/deleting sequence.
- `dist/pack-sound.js`: procedural Web Audio clicks synchronized to pack selection.
- `dist/gradient-ascii.js`: original React Bits WebGL2 rendering adapted to native DOM mounting.
- `dist/assets/bp27.png`, `dist/assets/solana.svg`, and the font assets: local branding resources.
- `vendor/GradientASCII.jsx` / `.css`: unchanged original renderer reference.
- `vendor/react-bits-LICENSE.md` and `dist/react-bits-LICENSE.md`: source and distribution license.
- `.openai/hosting.json`: existing Sites identity and static output configuration.

Run `npm run dev` from the parent repository and visit http://127.0.0.1:5173. This is native HTML, CSS, and JavaScript with no application dependencies. The local server uses Python’s standard library. WebGL2 is used for the background, with a CSS gradient fallback. No packages were added for the carousel.

## Cylindrical carousel

Interaction reference: https://jup.ag/gacha/packs/pokemon_10

The flat scrolling row is replaced by a perspective viewport and a preserved-3D cylinder. Ten packs are positioned every 36 degrees around a responsive radius. Their shared WebGL geometry has a curved inflated body, sealed top/bottom bands, and joined edge surfaces, with roughly 1.3–2px folded-edge thickness and about 22–24px central thickness in model units. All packs share identical foil artwork and materials. The cylinder translates back by its radius so the front pack stays at the intended scale; a slight X-axis inclination adds curvature to the orbit. Edge masking and angle-based opacity let packs recede and disappear at the rear. Hidden rear packs do not intercept pointers.

A single requestAnimationFrame loop renders rotation. Idle movement advances exactly one 36-degree slot over 1.2 seconds with quintic easing, then holds the centered pack for 2.2 seconds. Hover, keyboard focus, dragging, opening, a visible ticket dialog, hidden tabs, or offscreen placement prevent a new idle step; an already-started idle step completes its alignment instead of freezing between packs. The dice makes at least two full turns over 5.2 seconds with quintic ease-out (`1 - (1 - t)^5`), continuously interpolating the angle rather than jumping between indices. Its icon uses the same easing. The chosen index aligns exactly at the front; idle motion pauses for three seconds after settling. The dice choice does not affect the revealed ticket.

Clicking a pack aligns it with a 750ms eased turn. Horizontal pointer dragging rotates the cylinder; release snaps to the nearest pack. Vertical touch scrolling remains native. Arrow keys wrap between neighbors, Home/End align the first/last pack, and focus follows keyboard selection. Opening aligns the nearest pack before its reveal. Controls are locked during turns and opening to avoid overlapping actions.

Fine pointers retain bounded ±3° X / ±4° Y hover tilt, at most 1.5px artwork parallax, a 12px lift, 4.5% hover enlargement, and a visible moving reflection. These reset on leave, cancellation, locking, or preference changes. Filtering stays outside each 3D root because applying it to that root would flatten side geometry.

Reduced motion disables idle movement, parallax, dice/open animations, and text scrambling; selections update immediately. Native dialog semantics provide Escape dismissal and focus containment. Closing returns focus to Open. The headline has a stable accessible label with decorative animated glyphs hidden from assistive technology. A polite status announces user-triggered selections without narrating idle rotation. The glitch effect creates temporary character spans only while animating and restores ordinary text/strong markup afterward, so the resting headline is a normal text run rather than permanently fragmented glyphs.

## ASCII background

Official reference: https://www.reactbits.dev/backgrounds/gradient-ascii

Original React installation: `npx shadcn@latest add @react-bits/GradientASCII-JS-CSS`. That invocation previously downloaded the CLI into npm's cache but failed framework detection. Instead, original source from `DavidHDev/react-bits` is retained under `vendor` and its React lifecycle wrapper adapted to direct DOM mounting. Source hashes and provenance are in `vendor/README.md`.

The field's vertical coordinate is flipped while glyphs stay upright. The renderer occupies only the lower 52% of the stage and uses a gradual alpha mask, leaving a larger black region behind branding and text. Motion speed is 1.6, softness 0.8, flicker 0.12, glyph opacity 0.6, gradient opacity 0.65, grain 0.04, and layer opacity 0.6. The palette remains `#7c3aed`, `#d0b4f2`, `#a855f7`, `#aa67fb`. Mouse trails and click waves remain disabled. Rendering observes size/intersection, suspends when hidden, honors reduced motion, and releases GPU resources on pagehide.

## Branding

Reference: https://solana.com/breakpoint

The official header was measured at 104.45 × 20px for its BP26 asset and 22.68 × 19.55px for its Solana symbol, with about 7.12px spacing. This page matches those proportions using the adapted BP27 vector and original Solana symbol. BP27 preserves BP2 geometry from `nav-bp26.svg` and redraws the final digit as 7. ABC Favorit Regular and Bold are served locally from the official Solana repository assets. The supplied `/packet` URL was unavailable; measurements came from the Breakpoint header rather than a separate BP27 manual.

## Source and verification

The parent repository owns the website files; ignored `.sites-publish` is a separate hosting synchronization checkout. This review remains local.

Run `node --check` on all five browser scripts and `git diff --check`. Browser review should verify continuous curved motion, back-facing disappearance, exact dice settling, locked controls during spins, drag release, keyboard wrap, opening, restored intro glitch, reduced motion, and mobile overflow.

Browser verification confirmed that a dice spin ended at -936° with pack 7 centered and controls re-enabled. A 140px drag rotated 28° and settled at 36° (pack 10). Reduced-motion selection completed instantly with unlocked controls. At 390 × 844 there was no horizontal overflow, the headline measured 22.23px, and the ASCII layer began at 405px, leaving the upper 48% dark. Opening displayed the ticket, Escape closed it, and focus returned to Open. The intro glitch was observed immediately after reload. The native browser view confirmed branding and headline remain visible above the cylinder.

The headline repaint regression was corrected by restoring its original HTML text/strong runs after each scramble. Browser QA verified those ordinary text runs after both intro and opening, with controls ready and the dialog closed; the headline remained visible in the native browser screenshot.

## Soft edges, focal selection, and controls

The roulette viewport uses intersecting horizontal and vertical alpha gradients, replacing the hard rounded clip. A pack's emphasis is derived continuously from its angular distance to the front: a Gaussian weight drives up to 15% extra scale and 6px lift. This avoids a jump when the selected index changes mid-rotation. The viewport is 420px tall on desktop and 360px on mobile to allow enlarged packs room within the feathered boundary.

Open uses the loaded Bold face with a gentle color, lift, and shadow hover response; reduced motion omits movement. Keyboard focus uses a tinted Open pill with a small inset lower accent, a short underline on the dice, highlighted foil seals for pack buttons, and a lighter close-button fill. These replace the former external focus outline while retaining visible tab navigation cues.

The ASCII script is preloaded, starts its reveal at 15%, and completes the remainder of its intro in about 0.55 seconds (`INTRO_SECONDS = 0.65`), down from 2.4 seconds. The lower background placement and darkness remain unchanged.

Browser verification measured a 1.15 scale on the centered pack versus approximately 1.006 on its neighbor, a 700-weight Open label, and no external focus outline. Both gradient masks were active. At 390 × 844 the 360px roulette viewport had no horizontal overflow and the centered pack remained fully readable within the fade.

## Procedural selection sound

`pack-sound.js` creates a short band-limited noise transient and a rapidly decaying triangle oscillator using native Web Audio. No audio downloads, packages, or global installations are used. One shared AudioContext is created/resumed only on trusted pointer/key interaction; selection events before that are silent. Audio suspends while the document is hidden and resumes only an already-created context when visible. Unsupported or blocked audio does not affect the carousel.

`packs.js` dispatches `pack:tick` when the nearest front-facing slot changes, including during idle motion, dragging, keyboard alignment, and dice spins. Re-selecting the current pack also ticks once. Multiple crossings in a slow frame are capped at three; synthesis is rate-limited to 12ms spacing with no stale click queue. Temporary nodes disconnect after their roughly 32ms lifetime. Volume is deliberately restrained.

## Typed price sequence

Initial HTML and metadata read “earn a $500 ticket for $100” as a no-JavaScript fallback. Once fonts are ready, the price types at 95ms per character, pauses at $100 for 700ms, erases at 45ms per character, types $75, holds for exactly one second, erases, and types $50. The final price stays at $50; there is no looping. A fixed 4.5ch price slot avoids shifting the headline while typing. The caret disappears on completion. The heading's accessible label updates only for completed values, not each keystroke.

The prefix's 600ms glitch is isolated from the price node, so opening a pack cannot reset or corrupt the ongoing price sequence. Hover does not animate the heading. Reduced motion or backgrounding completes the price at $50 and cancels animation timers. Resize restores the prefix without restarting the price sequence. All timers are canceled on pagehide.

Browser QA observed $100, $75, and $50 in order, with each matching accessible label. The elapsed time from the completed $75 observation to $50 was approximately 1.45 seconds, consistent with the one-second hold plus deletion and retyping.

An opening triggered during the initial typing sequence was verified to preserve completion at $50, with the final accessible heading “earn a $500 ticket for $50” and the caret removed. A subsequent roulette spin exercised the procedural sound event path.

## Physical pouch geometry and material maps

The primary pack visuals now use one shared WebGL2 canvas for the entire carousel, rather than flat CSS front planes. `pack-renderer.js` builds a closed pouch mesh with 96 × 96 subdivisions on each front/back surface and connected top, bottom, left, and right edges. The body bulges away from its center plane and tapers toward crimped heat seals. Surface wrinkles displace actual vertices, so the silhouette and light response change with rotation.

Two 1024 × 1536 procedural color maps carry the foil artwork, logo, text, seals, and rear printing. A 512 × 768 normal/roughness map adds smaller irregular wrinkles and fine surface response. The fragment shader combines these with geometric normals, a directional light, view-dependent metallic highlights, and Fresnel edge reflection. Printed white ink has reduced specularity for readability. All maps are generated in browser memory using native Canvas 2D and typed arrays; the existing local logo and fonts are reused. Numeric kernels run in a native worker during startup, with the same code available as a cooperative main-thread fallback. No image-generation service, remote texture download, npm package, or global software installation is required.

`packs.js` emits `packs:render` with the current rotation from the existing animation loop. The renderer uses the same radius, perspective, center weighting, hover angles, and mobile dimensions as the DOM controls. Thus the roulette, click targets, keyboard navigation, dice easing, audio crossings, and opening state retain their existing behavior. The mesh mirrors the opening fade and shake. DOM buttons retain names and focus behavior; a shader tint supplies keyboard focus feedback while their decorative CSS artwork uses display: none during mesh rendering. The WebGL canvas ignores pointers and assistive technology.

Only one additional WebGL context and one set of shared maps/buffers are used for all ten packs. Pixel density is capped at 1.5. There is no second animation loop: rendering follows carousel state events, resize, asset readiness, and focus changes. Source geometry and GPU resources are released on pagehide. The existing CSS packs remain the fallback if WebGL2, shader setup, assets, or the GPU context are unavailable; a lost material context is hidden until reload.

Material preview caching uses a content-hash query on the `pack-renderer.js` script URL. When editing that renderer, refresh the query from the file's SHA-256 prefix so existing browser previews do not retain an earlier shader/material version.

Desktop browser QA confirmed `has-pack-mesh` is active, exactly one pack material canvas is present at 1.5× pixel density, and carousel selection still aligns the intended pack with controls re-enabled. The final material removes high-frequency regular highlights that aliased at card size, retaining larger geometric folds and gentler normal-map detail.

The resting pouch has an 8-degree local yaw so its side depth is visible even when centered. Browser QA confirmed a complete dice spin, re-enabled controls, opening and closing a ticket, and continued mesh rendering afterward. At 390 × 844 the material canvas resized correctly, the page had no horizontal overflow, and no browser errors were reported. CSS fallback remains available but context-loss fallback was not forcibly exercised during review.

## Centered stops and transparent sides

The carousel now uses indexed idle advances instead of unbounded slow drift. Each idle move ends at an exact multiple of 36 degrees and dwells with one pack centered. Hover/focus do not freeze a step midway. User selection, dragging, dice, and opening may interrupt an idle move; release, selection, and opening realign to a slot. An idle move does not lock controls, preserving immediate interaction. During the smooth transition between two slots, packs still move through the cylindrical path; the centered hold applies to every stop rather than freezing one pack while the ring moves behind it.

The side alpha mask now has a broader, multi-stop fade on both edges, reaching full opacity only across the central 32% of the viewport. This applies to the shared WebGL canvas and CSS fallback alike, revealing the background rather than painting a black overlay. The existing vertical fade remains.

Text selection, image dragging, and touch text callouts are disabled only inside `.pack-rail`; native `selectstart` and `dragstart` are prevented there. Headline and other page text retain normal selection behavior. Pack keyboard navigation and vertical touch scrolling remain available.

The mobile side mask keeps the central 48% fully opaque so the enlarged focal pack stays readable. Modified carousel scripts and styles use content-hash query keys in `index.html` to refresh existing local previews.

Selection and dice targets are explicitly quantized to 36-degree slots, and the animation assigns its exact target on completion. This prevents floating-point remainders from leaving the final selection slightly off-center.

Browser checks verified keyboard selection finishes at exactly -36° (pack 2), the following idle advance finishes at exactly -72° (pack 3), and controls remain usable. Dragging across a pack produced no text selection; the card computed to `user-select: none` while the headline retained `auto`.

The updated dice stopped at exactly -1080° (zero remainder modulo 36), then opening and closing the ticket succeeded without browser errors. Mobile review at 390 × 844 confirmed the mesh remained active, no horizontal overflow appeared, and the side alpha fade preserved the focal pack.

The fixed $500 ticket value remains present and bold throughout the price sequence and prefix glitch. Prefix animation preserves inline markup and excludes the fixed value from scrambling. Only the purchase-price field types/deletes $100 → $75 → $50.

Browser verification confirmed the $500 value stays at weight 700 across all three price states, with matching complete accessible labels. The longer headline fits the 390px mobile viewport without horizontal overflow.

## Lifted hover and softer foil

The WebGL material renderer damps hover activation, tilt, and light position with a 90ms exponential response in the existing render loop. Hover adds up to 12px lift, 8px forward depth, and 4.5% scale above the angle-based centered emphasis, easing smoothly on entry and exit. The hit area remains stable to prevent hover flicker as the visible pouch rises. CSS fallback packs use the same lift/scale targets with a smooth cubic curve.

Foil color bands, texture strokes, displaced wrinkles, fine normals, and heat-seal contrast are softened while the pouch's underlying thickness stays intact. Specular highlights are broader and less harsh. A separate soft diagonal sheen follows the pointer across the material; it grows with the smoothed hover amount, and white printed ink is protected from excessive glare. The light direction has a wider pointer response. Zero-percent pointer coordinates are preserved instead of being treated as missing values.

Pointer exit, cancellation, carousel locking, or reduced-motion changes remove hover targets. Reduced motion applies targets without animation and suppresses pointer-driven hover as before. No dependencies were added.

Browser QA confirmed the focal card receives the -12px lift and 1.045 hover-scale targets, pointer movement updates the light position, and pointer exit clears hover state. Reduced-motion preference changes cleared both hover and lift targets. Opening/closing remained functional; the 390 × 844 viewport retained the mesh with no horizontal overflow. No browser errors were reported.

## Larger stylized foil ripples

The pack material uses three broad, flowing body ripples instead of fine repeated wrinkles. The mesh displacement and normal map share a low-frequency wave phase so the visible ridges have consistent volume and lighting. Three broad translucent ribbons reinforce that scale in the color map. Sealed edges use sixteen wide ribs rather than dense fine crimping; the CSS fallback also uses coarser seals. Thickness, soft specularity, hover lift, moving sheen, and carousel behavior remain intact. Material/style cache hashes are updated with these edits.

## Raised printed ink

The BP27 logo and central artwork use separate front/back embossed normal maps. The lower Breakpoint and SOLANA · 2027 text, including the rear BREAKPOINT 2027 footer, remain flat printed ink and are excluded from the height masks. Both maps reuse the exact Canvas 2D print paths at 1024 × 1536, blur the ink silhouette by 2px to form a soft bevel, and derive normals from a 1.1-model-unit raised height. The shader combines these normals with the soft foil map independently of the foil's reduced strength, keeping the text relief visible as the pack and light move. The effect changes surface lighting without altering text placement, mesh silhouette, or interaction. Maps are shared across all ten packs and released with the existing GPU resources; no dependencies were added.

Browser QA confirmed the material mesh loads, raised edges are visible around BP27 and the central artwork, and hover still activates the pack tilt/light response. No browser errors were reported. JavaScript syntax and whitespace checks passed.

## Shaped booster wrapper and clean crimping

Construction references: [TCG foil wrapper mockup](https://www.cgtrader.com/3d-models/sports/game/booster-pack-foil-wrapper-mockup), [MakePlayingCards printed booster pack](https://www.makeplayingcards.com/design/custom-booster-pack.html), and [DielineMaker booster-pack construction](https://dielinemaker.com/dielines/flow-wrap--flow-booster-pack). The first two product images were visually reviewed. References inform the construction; no model, texture, or package was downloaded into the project.

The pouch now has a changing width and thickness instead of a rectangular extrusion. Sealed ends flare outward; the shoulders tuck inward before opening into the softly inflated body. Front/back surfaces converge at narrow side folds and almost-flat heat seals. Broad body ripples remain, with restrained gathered folds at the shoulders, a small tear notch near the top side, subtly serrated cut edges, and a shallow raised rear fin seam. Every connected edge uses the same surface function, so there are no gaps between the body and its edge strips. Geometric normals and tangents are derived from the deformed surface rather than assuming flat rectangular coordinates.

The crimp bands use sixteen broad, rounded pressed channels, a quieter lavender finish, and paired narrow pressed tracks. Seal texture normals follow the same rib frequency as the mesh. The CSS fallback uses a tapered silhouette and coarser bordered seals. The embossed BP27/artwork maps remain; Breakpoint and Solana footer text stays flat.

Mesh validation checked all 19,594 vertex records for finite attributes and all 37,632 triangles for valid indices and nonzero area. Browser QA confirmed a complete dice spin, opening/closing, and continued mesh rendering. At 390 × 844 the new silhouette remained visible with no horizontal overflow; no browser errors were reported. Renderer and style cache hashes were refreshed. No dependencies were added.

## Restrained pouch shaping

The wrapper silhouette is now straighter and cleaner: body narrowing drops from 5.5 to 2.7 model units per side, shoulder pinching from 3.5 to 0.8, and corner-fold displacement from 2.2 to 0.5. Central inflation is reduced to 10.5 units per face while the thin folded perimeter remains. Body ripples keep their broad spacing at roughly half the displacement. Cut-edge serration is reduced to 0.3 units and crimp relief to 0.12, retaining the sixteen wide pressed channels without the pronounced scalloped silhouette. The CSS fallback uses a similarly shallow taper. Printed artwork, selective embossing, and carousel behavior are unchanged. Renderer/style content hashes are refreshed.

Desktop and 390 × 844 browser review confirmed the subtler silhouette and straightened seals. The material mesh remained active, there was no horizontal overflow, and no browser errors were reported. JavaScript syntax and whitespace checks passed.

## Performance pass with visual parity

Mesh subdivisions, texture dimensions, pixel-density caps, shader appearance, typography, timing, and animation curves remain unchanged. No packages or external services were added.

`packs.js` updates transforms, opacity, and accessibility attributes only when rotation or lock state changes. Its existing frame events continue during resting holds so hover easing can settle. A material version changes after hover writes/resets and opening transitions. The mesh renderer redraws only when rotation, radius, material version, focus, size, opening, or unsettled hover requires it. Stable button references, orbit matrices, texture bindings, sampler assignments, and GL state are reused. Hover geometry reads are coalesced into the existing pointer animation frame. Teardown cannot restart that frame loop.

The decorative CSS fallback is removed from layout with display: none only while the mesh is active, retaining the DOM buttons as hit regions. Removing the mesh class restores the fallback immediately. The ASCII renderer keeps its original animated output, but does not install disabled pointer-effect handlers, rebuild an already-loaded glyph atlas, reallocate unchanged render targets, or update empty pointer-effect buffers. The ink-normal kernel reuses row offsets rather than clamping four pixel coordinates per sample; a full-resolution numeric fixture verified byte-for-byte equality for all 6,291,456 output bytes, including image boundaries.

Local Chrome DevTools Performance samples used the same in-app browser viewport, with the idle roulette and ASCII background active. These are development measurements rather than field Core Web Vitals or guarantees for other devices. The baseline window was 48.24 seconds and the final window 23.54 seconds; values below are normalized per elapsed second.

| Main-thread workload | Before (ms/s) | After (ms/s) |
| --- | ---: | ---: |
| JavaScript | 21.53 | 7.34 |
| Style recalculation | 23.42 | 1.81 |
| Total tasks | 68.61 | 22.65 |

Temporary browser counters confirmed zero pack draw calls and zero rail DOM mutations during a settled hold while ASCII rendering continued, then 140 pack draw calls after hover activated. Counters were removed. Dice settled at -828° with controls enabled; keyboard selection reached -864°, drag snapped back to -828°, and reduced-motion selection immediately reached -792° with hover cleared. Opening/closing remained functional. At 390 × 844 the mesh resized with no horizontal overflow. A forced pack-context loss restored visible CSS artwork; reload restored the mesh. No browser errors were reported. All browser scripts passed syntax checks. Modified script and style URLs carry content hashes, including the ASCII preload and script URL.

## Lighthouse load audit

Built-in Lighthouse 13.5.0 was run against the unchanged local site on 21 November 2026. Final default simulated profiles scored **79 mobile** and **95 desktop**, with LCP 1.8s / 0.4s, TBT 860ms / 180ms, and CLS rounded to 0 for both. The mobile bottleneck is startup blocking; a 952ms task remains unattributed and needs trace-level investigation before assigning a cause. Local server caching/compression, render-blocking CSS, and header image sizing are secondary findings. External DevTools throttling was removed for the final runs and prior browser settings were restored afterward. No packages or website code were changed. Full conditions, caveats, findings, reports, screenshots, and audited source hashes are in [the Lighthouse audit](audits/2026-11-21/README.md).

## Coordinated Lighthouse remediation

The staged work and before/after evidence are tracked in [the remediation log](audits/2026-11-21-remediation/README.md).

### Startup work

A 4× CPU profile identified numeric ink/foil normals and mesh construction as substantial main-thread startup costs. `pack-material-data.js` contains the exact prior 96 × 96 mesh and map kernels, now called through one native module worker that starts alongside font decoding and asynchronous shader linking. Canvas artwork and font rasterization stay on the main thread. Height masks are cloned into the worker so failures leave fallback input intact; result typed arrays transfer back, and the worker terminates after setup. On worker unavailability/error, the same helper executes in bounded geometry/16-row normal chunks with scheduler.yield or a timer fallback. Texture uploads are separated by yields. Cancellation stops pending work on pagehide/context loss.

Native validation confirmed identical geometry, indices, foil normals, and full-resolution ink-normal output against the pre-change kernels. Shader source, map resolution, mesh detail, pixel-density caps, and animation timing remain unchanged. Browser review confirmed the numeric kernels disappeared from the main-thread profile with the visual mesh intact. The isolated startup-only Lighthouse mobile checkpoint scored 99, with TBT 50ms, before applying delivery or asset changes.

### Local delivery

`npm run dev` now uses root `serve.py` on 127.0.0.1:5173. HTML and unversioned, stale, or ambiguous asset URLs revalidate with no-cache plus ETag/Last-Modified. Only a sole lowercase SHA-256 v prefix of 10–64 characters matching current bytes grants one-year immutable caching. Text responses >=256 bytes negotiate deterministic gzip and Vary: Accept-Encoding; gzip/identity ETags differ. Cached source bytes are bounded to 128 stat-signature entries and invalidate after edits. Six standard-library HTTP integration tests cover GET/HEAD/304, encoding preference/rejection, byte integrity, edited assets, fingerprints, and served-path boundaries. No third-party server dependency was added.

### CSS, imagery, and script delivery

The existing styles.css remains authoritative and is copied byte-for-byte into the head by `tools/prepare-site.py` after updating font fingerprints. Removing the stylesheet request keeps the exact cascade, first layout, and fallback styling. Header, fallback-pack, and ticket DOM wordmarks now use native 209 × 40 / 314 × 60 PNG renditions with responsive selection; the full 1045 × 200 source is retained for material-map quality. Header display proportions remain unchanged.

All runtime font, image, script, and helper URLs carry matching SHA-256-prefix version keys. The preparation tool selects checked-in compact JS siblings only when source and output hashes match the manifest; otherwise it falls back to current authored scripts. Optional compaction uses an explicit already-installed Acorn path at build time only, with no copied library or runtime dependency. Token/comment bytes, all newlines, literals/templates/shaders, and canonical AST semantics are validated unchanged. The served entry scripts remove 8,848 bytes of horizontal whitespace, with actual delivery also gzipped. See [the tools guide](tools/README.md) for regeneration and source-edit workflow.

A real-browser test with worker-src blocked confirmed cooperative fallback mesh rendering and ticket opening/closing. The temporary server/tab were stopped afterward. The normal shared renderer retains its one-context, one-loop architecture.

### Final remediation verification

All five targeted Lighthouse delivery findings pass. Three final mobile scores were 99, 99, 100 (median 99), with median TBT 100ms versus baseline 865ms. Desktop scored100 with TBT 0ms versus baseline 95/177ms. Final mobile FCP/LCP medians were 0.8s/1.6s, desktop 0.2s/0.4s; CLS remains negligible. Source/data parity, 12 script syntax checks, 6 HTTP regressions, live delivery integrity, normal/cooperative/WebGL fallback, hover, dice, opening, keyboard, reduced motion, and 390px responsive rendering were verified. Full evidence and single-run/host-variance caveats are in [the remediation log](audits/2026-11-21-remediation/README.md). No packages or software were installed.
