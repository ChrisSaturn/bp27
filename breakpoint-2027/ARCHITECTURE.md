# Breakpoint 2027 architecture

## Experience contract

The page presents the Solana/BP27 lockup, an “earn a $500 ticket for” headline with a typed price sequence, and ten identical purple packs on a cylindrical roulette. The fixed $500 value and animated price use ABC Favorit Bold. The prefix glitches on intro and opening. The price types $100, holds briefly, deletes to type $75, waits one second, then deletes to type $50 and stays there. The headline stays on one line up to 52px on desktop. At widths up to 600px it is centered on two lines at 32–44px, with the purchase price on the second line.

Every pack opens the same Breakpoint event ticket in a roulette reveal that ends with the $50 Legendary pull. Open pack opens the centered pack directly. The reveal sweeps through 21 priced tickets from left to right. It slows at the $500 Common ticket and then settles on Legendary. The result links to the Breakpoint event on Luma with the `bp27-vibhu` code.

## Files and runtime

- `dist/index.html`: semantic heading, logos, carousel region, controls, and native ticket dialog.
- `dist/styles.css`: font faces, masked perspective viewport, CSS foil-pack depth, responsive layout, and ticket styling.
- `dist/packs.js`: cylindrical positioning, drag and keyboard navigation, direct pack opening, and dialog behavior.
- `dist/ticket-reveal.js`: ticket roulette, Legendary pull indicator, pointer-driven reflection, tear-off stub, and dialog reset.
- `dist/ticket-flight.js`: idle-time ticket artwork baking and a 48-triangle WebGL paper mesh.
- `dist/pack-renderer.js`: shared native WebGL2 pouch drawing, artwork, material setup, and lighting.
- `dist/pack-material-data.js`: worker/shared fallback for exact mesh and numeric normal-map generation.
- `serve.py` (repository root): loopback-only static delivery with gzip and verified fingerprint caching.
- `dist/hyper-text.js`: prefix glitch and native price typing/deleting sequence.
- `dist/pack-sound.js`: Web Audio playback for the selection clicks, foil rip, flash impact, ticket launch, and stub tear.
- `dist/assets/audio/`: trimmed Kenney recordings for the opening and stub cues.
- `dist/gradient-ascii.js`: original React Bits WebGL2 rendering adapted to native DOM mounting.
- `dist/assets/bp27.png`, `dist/assets/solana.svg`, and the font assets: local branding resources.
- `vendor/GradientASCII.jsx` / `.css`: unchanged original renderer reference.
- `vendor/react-bits-LICENSE.md` and `dist/react-bits-LICENSE.md`: source and distribution license.
- `.openai/hosting.json`: existing Sites identity and static output configuration.

Run `npm run dev` from the parent repository and visit http://127.0.0.1:5173. This is native HTML, CSS, and JavaScript with no application dependencies. The local server uses Python’s standard library. WebGL2 is used for the background, with a CSS gradient fallback. No packages were added for the carousel.

## Cylindrical carousel

Interaction reference: https://jup.ag/gacha/packs/pokemon_10

The flat scrolling row is replaced by a perspective viewport and a preserved-3D cylinder. Ten packs are positioned every 36 degrees around a responsive radius. Their shared WebGL geometry has a curved inflated body, sealed top/bottom bands, and joined edge surfaces, with roughly 1.3–2px folded-edge thickness and about 22–24px central thickness in model units. All packs share identical foil artwork and materials. The cylinder translates back by its radius so the front pack stays at the intended scale; a slight X-axis inclination adds curvature to the orbit. Edge masking and angle-based opacity let packs recede and disappear at the rear. Hidden rear packs do not intercept pointers.

The pack carousel starts still and turns in response to selection or dragging. A single requestAnimationFrame loop draws rotation with quintic ease-out (`1 - (1 - t)^5`) on selection and snap-back. Open pack opens the centered pack in place.

Clicking a pack aligns it with a 750ms eased turn. Horizontal pointer dragging rotates the cylinder, and release snaps to the nearest pack. Vertical touch scrolling remains native. Arrow keys wrap between neighbors, Home and End align the first and last pack, and focus follows keyboard selection. If the carousel goes offscreen during a user-triggered turn, it settles on the chosen pack so the action can finish while the page is visible.

Fine pointers retain bounded ±3° X / ±4° Y hover tilt, at most 1.5px artwork parallax, a 12px lift, 4.5% hover enlargement, and a visible moving reflection. These reset on leave, cancellation, locking, or preference changes. Filtering stays outside each 3D root because applying it to that root would flatten side geometry.

Reduced motion disables parallax, opening and ticket animations, and text scrambling. Open pack shows Legendary immediately. Native dialog semantics provide Escape dismissal and focus containment. Closing returns focus to Open pack. The headline has a stable accessible label with decorative animated glyphs hidden from assistive technology. A polite status announces user-triggered selections. The glitch effect creates temporary character spans only while animating and restores ordinary text and strong markup afterward.

## ASCII background

Official reference: https://www.reactbits.dev/backgrounds/gradient-ascii

Original React installation: `npx shadcn@latest add @react-bits/GradientASCII-JS-CSS`. That invocation previously downloaded the CLI into npm's cache but failed framework detection. Instead, original source from `DavidHDev/react-bits` is retained under `vendor` and its React lifecycle wrapper adapted to direct DOM mounting. Source hashes and provenance are in `vendor/README.md`.

The field's vertical coordinate is flipped while glyphs stay upright. The renderer occupies only the lower 52% of the stage and uses a gradual alpha mask, leaving a larger black region behind branding and text. Motion speed is 1.6, softness 0.8, flicker 0.12, glyph opacity 0.6, gradient opacity 0.65, grain 0.04, and layer opacity 0.6. The palette remains `#7c3aed`, `#d0b4f2`, `#a855f7`, `#aa67fb`. Mouse trails and click waves remain disabled. Rendering observes size/intersection, suspends when hidden, honors reduced motion, and releases GPU resources on pagehide.

## Branding

Reference: https://solana.com/breakpoint

The official header was measured at 104.45 × 20px for its BP26 asset and 22.68 × 19.55px for its Solana symbol, with about 7.12px spacing. This page matches those proportions using the adapted BP27 vector and original Solana symbol. BP27 preserves BP2 geometry from `nav-bp26.svg` and redraws the final digit as 7. ABC Favorit Regular and Bold are served locally from the official Solana repository assets. The supplied `/packet` URL was unavailable; measurements came from the Breakpoint header rather than a separate BP27 manual.

## Source and verification

The parent repository owns the website files; ignored `.sites-publish` is a separate hosting synchronization checkout. This review remains local.

Run `node --check` on the browser scripts and `git diff --check`. Browser review should verify the still carousel at rest, drag release, keyboard wrap, opening the centered pack, ticket roulette alignment and stub reset, restored intro glitch, reduced motion, and mobile overflow.

Browser verification confirmed that a dice spin ended at -936° with pack 7 centered and controls re-enabled. A 140px drag rotated 28° and settled at 36° (pack 10). Reduced-motion selection completed instantly with unlocked controls. At 390 × 844 there was no horizontal overflow, the headline measured 22.23px, and the ASCII layer began at 405px, leaving the upper 48% dark. Opening displayed the ticket, Escape closed it, and focus returned to Open. The intro glitch was observed immediately after reload. The native browser view confirmed branding and headline remain visible above the cylinder.

The headline repaint regression was corrected by restoring its original HTML text/strong runs after each scramble. Browser QA verified those ordinary text runs after both intro and opening, with controls ready and the dialog closed; the headline remained visible in the native browser screenshot.

## Soft edges, focal selection, and controls

The roulette viewport uses intersecting horizontal and vertical alpha gradients. A pack's emphasis is derived continuously from its angular distance to the front: a Gaussian weight drives up to 15% extra scale and 6px lift. This avoids a jump when the selected index changes mid-rotation. The viewport is 420px tall on desktop. On mobile it centers between the headline and controls, with pack width and rail height adapting to the available screen dimensions.

Open pack uses the loaded Bold face with a gentle color, lift, and shadow hover response. Reduced motion omits movement. On mobile, the button spans the available width up to 27rem at the bottom of the stage. It has a minimum 56px touch height, a keyboard focus ring, and padding for device safe areas. The headline sits between the logo and the foil packs, with its top gap growing on taller screens. The stage grows when the content is taller than the viewport so the button remains reachable by scrolling. Desktop uses a compact Open pack pill.

The ASCII script is preloaded, starts its reveal at 15%, and completes the remainder of its intro in about 0.55 seconds (`INTRO_SECONDS = 0.65`), down from 2.4 seconds. The lower background placement and darkness remain unchanged.

At 390 × 844, the carousel held its initial angle. After keyboard selection, Open pack opened the centered pack at that same angle. Closing restored focus to the 56px button.

## Pack audio

`pack-sound.js` uses a shared AudioContext created on trusted pointer or keyboard interaction. Audio suspends while the document is hidden and resumes an already-created context when visible. Unsupported or blocked audio leaves the carousel operable.

`packs.js` dispatches `pack:tick` when the nearest front-facing slot changes during manual selection and dragging. Re-selecting the current pack also ticks once. The ticket reel uses the same cue at launch and as each preview crosses center. The clicks spread farther apart as the reel decelerates. Legendary uses its own winner cue. Each click uses a band-limited noise transient and a decaying triangle oscillator. Multiple crossings in a slow frame are capped at three, with at least 12ms between clicks and no stale click queue.

The opening, winner, and stub cues use recordings from Kenney's Casino Audio, Impact Sounds, and Interface Sounds packs, all licensed CC0. The clips are trimmed near the first transient and encoded as mono MP3s.

| Animation cue | Kenney source |
| --- | --- |
| Foil begins to split | Casino Audio · `cards-pack-open-2.ogg` |
| Full-screen flash begins | Impact Sounds · `impactPunch_heavy_002.ogg` |
| The ticket launches as the flash clears | Casino Audio · `cards-pack-take-out-1.ogg` |
| Legendary lands | Interface Sounds · `confirmation_001.ogg` |
| The stub separates along its perforations | Casino Audio · `card-slide-4.ogg` |

## Pack opening and holographic ticket

On Open pack, the intact pouch shrinks and shakes for 760ms on the carousel frame clock while the background, headline, and button gradually dim. The foil starts to separate along the same jagged seam with quintic ease-out (`1 - (1 - t)^5`). A single full-viewport white flash starts 32ms into the split and runs for 75ms. Rip and burst sounds use the same frame clock and the gesture-gated AudioContext.

The opening uses the live pouch mesh through the flash. At the tear, complementary clips show the two halves of the foil. During the pulse the selected foil draws solid black against the white viewport, with the carousel mask and neighboring packs hidden. The frame that clears the flash launches the ticket and the violet afterglow. While the dialog is open, the carousel artwork is hidden in both WebGL and CSS, leaving the impact particles and backdrop behind the ticket. Closing restores the carousel and scene brightness. Direct file loading uses the shared numeric kernels in a classic script and draws the BP27 vector into a local canvas to keep the material maps origin-clean.

The ticket rises face-on out of the seam for 240ms, with a brief bend and crossfade from the cached 48-triangle WebGL strip when available. The horizontal reel sweeps through 19 preview prices across Prism, Aurora, Sapphire, and Rose foils in 2.86 seconds. It then creeps past the silver $500 Common pull for 920ms. The last 480ms accelerate off Common and brake with quintic ease-out at the $50 Legendary ticket. Five reusable preview tickets cover the visible strip. The browser animates the strip while the frame clock scales previews and recycles each one outside the viewport. The live ticket and reel share responsive sizing and perforation outlines. At the handoff, the live ticket and prices match the reel at 90% scale and punch up to 107% before settling. Confetti, the plain Legendary Pull label, and the 286ms confirmation cue start with the impact.

The live ticket uses the Solana and BP27 marks, ABC Favorit, the San Francisco event details, and pointer-driven tilt and reflection adapted from the React Bits HoloCard reference. Preview and result prices share a responsive size of 1.75–2.25rem. The result shows the crossed-out $500 at 70% of the $50 offer size, to its left. The result is announced when Claim Now becomes visible. The link sits below the price row with a 56px touch target and visible keyboard focus. It opens Luma in a new tab. Reduced motion presents the result directly. Closing cancels the reveal and restores Prism for the next opening.

The live ticket face clips the foil and emblem to its rounded outer corners, matching the shape baked into the flight texture. The TearTicket adaptation cuts matching perforations into the adjoining edges and anchors the stub at the corner opposite the grab. As the stub pivots, the fibres stretch and snap progressively. A short pull springs back. Once free, the stub stays in the pointer's grip until released, then falls with the release momentum while the face recenters. Closing resets the ticket. Reduced motion skips the wrapper and ticket flight and removes the stub immediately when dragged far enough to tear.

Local browser checks verified full viewport coverage, one flash, solid black foil during the pulse, and the ticket launch on the frame that clears the flash. At 320 × 568 the 286ms confirmation cue played at the winning impact and confetti fired. The price row and 56px Claim Now control fit without horizontal overflow. Claim Now stayed hidden during the $500 Common pull, then received keyboard focus after Legendary landed. Enter opened Luma with the event code intact.

### Opening preparation

After page load, an idle task builds one reusable burst, one pair of CSS fallback foil pieces, the ticket reel, and 36 confetti pieces. The ticket lays out its perforations while hidden. Once the fonts and marks are ready, the flight renderer bakes the texture at the current ticket size and uploads it at a pixel density capped at 1.25. The delivery script inlines the two existing vector marks so they can be used in the texture when opening the page directly from disk. The same preparation can run at the start of the charge if the user opens before the idle task. The WebGL pouch and shaders initialize at startup. The animated split updates two existing poses, and the burst frame positions and shows the prepared layer.

The delivery script inlines the recordings to support playback over HTTP and from a local file. The browser decodes them into reusable Web Audio buffers during idle preparation or on the first interaction. Rip, impact, winner, and stub tear have synthesized fallbacks if their recording is unavailable. The ASCII background holds its last frame from opening until the dialog closes so the pack and ticket can use the rendering budget.

Earlier before/after openings in local Chromium at 390 × 844 and 4× CPU throttling recorded 635–645 ASCII draw calls per opening before preparation and zero after. Each prepared run used two audio buffers for the rip and burst.

Three ticket-flight runs at 390 × 844 and 4× CPU throttling recorded one texture upload before launch and zero during flight, with 95th-percentile frame intervals of 17.4–17.5ms and no interval above 25ms. Browser checks also confirmed the perspective-only fallback, keyboard stub tear, and desktop and mobile layouts. Frame intervals were measured on the development browser with CPU emulation.

## Typed price sequence

Initial HTML and metadata read “earn a $500 ticket for $100” as a no-JavaScript fallback. Once fonts are ready, the price types at 95ms per character, pauses at $100 for 700ms, erases at 45ms per character, types $75, holds for exactly one second, erases, and types $50. The final price stays at $50. Desktop reserves 4.5ch for the price while mobile centers the full second line as the price changes. The caret disappears on completion. The heading's accessible label updates on completed values.

The prefix's 600ms glitch is isolated from the price node, so opening a pack cannot reset or corrupt the ongoing price sequence. Hover does not animate the heading. Reduced motion or backgrounding completes the price at $50 and cancels animation timers. Resize restores the prefix without restarting the price sequence. All timers are canceled on pagehide.

Browser QA observed $100, $75, and $50 in order, with each matching accessible label. The elapsed time from the completed $75 observation to $50 was approximately 1.45 seconds, consistent with the one-second hold plus deletion and retyping.

An opening triggered during the initial typing sequence was verified to preserve completion at $50, with the final accessible heading “earn a $500 ticket for $50” and the caret removed. A subsequent roulette spin exercised the procedural sound event path.

## Physical pouch geometry and material maps

The primary pack visuals now use one shared WebGL2 canvas for the entire carousel, rather than flat CSS front planes. `pack-renderer.js` builds a closed pouch mesh with 96 × 96 subdivisions on each front/back surface and connected top, bottom, left, and right edges. The body bulges away from its center plane and tapers toward crimped heat seals. Surface wrinkles displace actual vertices, so the silhouette and light response change with rotation.

Two 1024 × 1536 procedural color maps carry the foil artwork, logo, text, seals, and rear printing. A 512 × 768 normal/roughness map adds smaller irregular wrinkles and fine surface response. The fragment shader combines these with geometric normals, a directional light, view-dependent metallic highlights, and Fresnel edge reflection. Printed white ink has reduced specularity for readability. All maps are generated in browser memory using native Canvas 2D and typed arrays; the existing local logo and fonts are reused. Numeric kernels run in a native worker during startup, with the same code available as a cooperative main-thread fallback. No image-generation service, remote texture download, npm package, or global software installation is required.

`packs.js` emits `packs:render` with the current rotation from the existing animation loop. The renderer uses the same radius, perspective, center weighting, and hover angles as the DOM controls. It reads the resolved button dimensions when the rail resizes so the mesh and touch targets stay aligned at each viewport size. The mesh supplies the selected pouch artwork for the opening sequence. DOM buttons retain names and focus behavior. A shader tint supplies keyboard focus feedback while their decorative CSS artwork is hidden during mesh rendering. The WebGL canvas ignores pointers and assistive technology.

Only one additional WebGL context and one set of shared maps/buffers are used for all ten packs. Pixel density is capped at 1.5. There is no second animation loop: rendering follows carousel state events, resize, asset readiness, and focus changes. Source geometry and GPU resources are released on pagehide. The existing CSS packs remain the fallback if WebGL2, shader setup, assets, or the GPU context are unavailable; a lost material context is hidden until reload.

Material preview caching uses a content-hash query on the `pack-renderer.js` script URL. When editing that renderer, refresh the query from the file's SHA-256 prefix so existing browser previews do not retain an earlier shader/material version.

Desktop browser QA confirmed `has-pack-mesh` is active, exactly one pack material canvas is present at 1.5× pixel density, and carousel selection still aligns the intended pack with controls re-enabled. The final material removes high-frequency regular highlights that aliased at card size, retaining larger geometric folds and gentler normal-map detail.

The resting pouch has an 8-degree local yaw so its side depth is visible even when centered. Browser QA confirmed a complete dice spin, re-enabled controls, opening and closing a ticket, and continued mesh rendering afterward. At 390 × 844 the material canvas resized correctly, the page had no horizontal overflow, and no browser errors were reported. CSS fallback remains available but context-loss fallback was not forcibly exercised during review.

## Centered stops and transparent sides

A completed manual turn aligns the chosen pack at an exact multiple of 36 degrees. The pack stays centered until the next selection or drag.

The side alpha mask now has a broader, multi-stop fade on both edges, reaching full opacity only across the central 32% of the viewport. This applies to the shared WebGL canvas and CSS fallback alike, revealing the background rather than painting a black overlay. The existing vertical fade remains.

Text selection, image dragging, and touch text callouts are disabled only inside `.pack-rail`; native `selectstart` and `dragstart` are prevented there. Headline and other page text retain normal selection behavior. Pack keyboard navigation and vertical touch scrolling remain available.

On mobile the orbit radius is 45% of the rail width, spreading neighboring packs farther apart around the centered pack. The CSS fallback layers the projected packs by facing angle, and WebGL assigns a separate depth range to each pack in back-to-front order. Both retain the 3D shape of each pack and prevent neighboring foil surfaces from intersecting. The central 82% of the rail stays opaque, with a short fade at each side.

Selection targets are quantized to 36-degree slots, and the animation assigns its exact target on completion. This prevents floating-point remainders from leaving the final selection slightly off-center.

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

A 4× CPU profile identified numeric ink/foil normals and mesh construction as substantial main-thread startup costs. `pack-material-data.js` contains the prior 96 × 96 mesh and map kernels. A native worker starts alongside font decoding and asynchronous shader linking. Canvas artwork and font rasterization stay on the main thread. Height masks are cloned into the worker so failures leave fallback input intact; result typed arrays transfer back, and the worker terminates after setup. On worker unavailability/error, the same helper executes in bounded geometry/16-row normal chunks with scheduler.yield or a timer fallback. Texture uploads are separated by yields. Cancellation stops pending work on pagehide/context loss.

Native validation confirmed identical geometry, indices, foil normals, and full-resolution ink-normal output against the pre-change kernels. Shader source, map resolution, mesh detail, pixel-density caps, and animation timing remain unchanged. Browser review confirmed the numeric kernels disappeared from the main-thread profile with the visual mesh intact. The isolated startup-only Lighthouse mobile checkpoint scored 99, with TBT 50ms, before applying delivery or asset changes.

### Local delivery

`npm run dev` now uses root `serve.py` on 127.0.0.1:5173. HTML and unversioned, stale, or ambiguous asset URLs revalidate with no-cache plus ETag/Last-Modified. Only a sole lowercase SHA-256 v prefix of 10–64 characters matching current bytes grants one-year immutable caching. Text responses >=256 bytes negotiate deterministic gzip and Vary: Accept-Encoding; gzip/identity ETags differ. Cached source bytes are bounded to 128 stat-signature entries and invalidate after edits. Six standard-library HTTP integration tests cover GET/HEAD/304, encoding preference/rejection, byte integrity, edited assets, fingerprints, and served-path boundaries. No third-party server dependency was added.

### CSS, imagery, and script delivery

The existing styles.css remains authoritative and is copied byte-for-byte into the head by `tools/prepare-site.py` after updating font fingerprints. Removing the stylesheet request keeps the exact cascade, first layout, and fallback styling. Header, fallback-pack, and ticket DOM wordmarks now use native 209 × 40 / 314 × 60 PNG renditions with responsive selection; the full 1045 × 200 source is retained for material-map quality. Header display proportions remain unchanged.

All runtime font, image, script, and helper URLs carry matching SHA-256-prefix version keys. The preparation tool selects checked-in compact JS siblings only when source and output hashes match the manifest; otherwise it falls back to current authored scripts. Optional compaction uses an explicit already-installed Acorn path at build time only, with no copied library or runtime dependency. Token/comment bytes, all newlines, literals/templates/shaders, and canonical AST semantics are validated unchanged. The served entry scripts remove 8,848 bytes of horizontal whitespace, with actual delivery also gzipped. See [the tools guide](tools/README.md) for regeneration and source-edit workflow.

A real-browser test with worker-src blocked confirmed cooperative fallback mesh rendering and ticket opening/closing. The temporary server/tab were stopped afterward. The normal shared renderer retains its one-context, one-loop architecture.

### Final remediation verification

All five targeted Lighthouse delivery findings pass. Three final mobile scores were 99, 99, 100 (median 99), with median TBT 100ms versus baseline 865ms. Desktop scored100 with TBT 0ms versus baseline 95/177ms. Final mobile FCP/LCP medians were 0.8s/1.6s, desktop 0.2s/0.4s; CLS remains negligible. Source/data parity, 12 script syntax checks, 6 HTTP regressions, live delivery integrity, normal/cooperative/WebGL fallback, hover, dice, opening, keyboard, reduced motion, and 390px responsive rendering were verified. Full evidence and single-run/host-variance caveats are in [the remediation log](audits/2026-11-21-remediation/README.md). No packages or software were installed.
