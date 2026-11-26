# Original GradientASCII source

Official component: https://www.reactbits.dev/backgrounds/gradient-ascii

Original React installation:

```sh
npx shadcn@latest add @react-bits/GradientASCII-JS-CSS
```

Source repository: https://github.com/DavidHDev/react-bits

- `GradientASCII.jsx`: `src/content/Backgrounds/GradientASCII/GradientASCII.jsx`, blob `19c23a47f90fdb264855e0e41b1ffaa7659d60ad`.
- `GradientASCII.css`: same directory, blob `6e42b55a573919ba3ac77cf3fca0b6010560494b`.
- License: `react-bits-LICENSE.md`.

The original React source is preserved here without modification. This repository's live page uses its WebGL2 implementation through `dist/gradient-ascii.js`: constants, GLSL shaders (with a vertical coordinate flip for the requested horizon orientation), atlas construction, color conversion, and multipass rendering are preserved. React refs become plain objects, the mount effect becomes a DOM initializer, and pagehide invokes cleanup. The settings use the owner's palette and density; mouse trails and click waves are disabled as requested. No React package or shadcn setup is needed to run this native adaptation. The previously requested CLI invocation failed framework detection; it did not install the component into a React application.

## Ticket interaction references

The supplied React Bits HoloCard and TearTicket examples informed the ticket's moving foil, tilt, and stub that hinges, stretches its paper fibres, and falls away. The Breakpoint implementation lives in `dist/ticket-reveal.js` and `dist/styles.css` and uses native pointer events, CSS transforms, and gradients.
