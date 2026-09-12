# personal-website — architecture review & cleanup

Reviewed the `redesign` work at `joncheng.ca/personal-website` (Next.js 16 / React 19 / TypeScript / pnpm, targeting Vercel). This is a scaffold, not a finished site — most page content is intentionally a placeholder — but the *systems* underneath it (nav, scroll, theming, cursor) are fully built out and unusually well documented in-line. Below: how it's pieced together, the notable design decisions, and what I cleaned up.

## 1. Overall architecture

Standard Next.js App Router layout, nothing exotic in the shape of it:

- `app/` — routes. `layout.tsx` is the single root shell every page mounts inside; `page.tsx` is the home page; `me/`, `experience/`, `art/` are stand-in content pages; `not-found.tsx` is the custom 404.
- `components/` — mostly client components, each paired with its own co-located `.css` file (no CSS-in-JS, no Tailwind — plain stylesheets imported per-component).
- `lib/` — framework-free logic: module-level singletons and pure functions that components read from, rather than React context.
- `content/` — small hand-edited data files (nav items, social links, the photo manifest) that stand in for a CMS.

No test suite, no CI config, no Tailwind — all consistent with the project doc's stated scope ("bare scaffold, not a design").

### The root shell (`app/layout.tsx`)

Every page mounts through one `RootLayout`: it loads two fonts (Unbounded for display type, Geist Sans as an installed-but-inactive alternative — swapping which one is "active" is a single CSS variable redirect in `globals.css`, not a code change), mounts `<SmoothScroll />` and `<GlobalCursor />` globally, and injects a `beforeInteractive` inline script that applies the visitor's stored theme (and derived nav-chrome tone) to `<html>` before first paint — the standard no-flash-of-wrong-theme technique, implemented with a `try/catch` around `localStorage` and `suppressHydrationWarning` scoped to just that one attribute.

## 2. State management approach: module singletons, not React state or context

The single most consistent architectural decision in this codebase: anything that changes on a hot path (pointer position, scroll-linked geometry) lives in a **plain module-level variable**, not `useState`/context. Three parallel instances of the same pattern:

- `lib/lenis-store.ts` — holds the live Lenis instance so the nav drawer can stop/start scrolling without prop-drilling or a context provider.
- `lib/chrome-tone.ts` — holds the registered "tone targets" (nav icon, logo, cursor) and drives a self-starting/self-stopping `requestAnimationFrame` loop for as long as at least one target is registered.
- `lib/cursor/store.ts` — holds pointer position/velocity/current mode; read every tick inside a GSAP ticker callback.

The reasoning stated consistently in the code comments: routing a `pointermove` handler through `useState` would re-render React on every single pointer event. Instead, position/velocity update a plain object in place, and the one component that needs to react to *discrete* changes (a mode switch, not continuous motion) subscribes via a small pub/sub (`subscribeToModeChange`). This is a deliberate, recurring pattern rather than three unrelated shortcuts.

## 3. The nav / chrome-tone system

This is the most elaborate piece of the codebase. Two systems work together:

**Chrome-tone geometry (`lib/chrome-tone.ts`)** solves "how does a fixed white logo/icon stay legible against a page whose background can be black, white, or lime, and can change mid-scroll or mid-drawer-animation?" Rather than sampling backdrop pixels (a discarded earlier approach using SVG filters), any background region tags itself declaratively with `data-chrome-tone="light-on-dark"` or `"dark-on-light"`. A UI element that needs to stay legible ("a target") registers two pre-colored copies of itself. On every animation frame, the module reads every tagged region's `getBoundingClientRect()`, intersects those rectangles against each target's box (respecting DOM nesting, so a more specific nested region wins over its ancestor), and clips each colored copy to a computed `clip-path: path(...)` — a real per-pixel rectangle clip, so a tone boundary can fall mid-glyph or mid-icon-stroke and still resolve correctly. The loop is self-managing: it starts the moment a target registers and stops once the last one unregisters, so it costs nothing when the nav/cursor aren't in play.

**The liquid wipe (`lib/liquid-clip.ts`)** is the nav drawer's open/close transition: a `clip-path: polygon(...)` whose leading edge is two superimposed sine waves rather than a flat line, giving a "liquid front" look. The wave's amplitude envelope (`sin(π · progress)`) is exactly zero at both fully-closed and fully-open, so the drawer always rests on a flat edge and never "pops" when the animation isn't running. Because chrome-tone only understands axis-aligned rectangles and can't resolve an actual wavy polygon boundary, the same module also exports `buildLiquidToneBands`, which approximates the same wave as 28 flat horizontal bands, each sized to the *minimum* (most conservative) reveal reached across that band — deliberately conservative in the direction that never claims a lime background before it's actually painted.

Together these mean the nav bar's MENU/CLOSE label, hamburger icon, and logo all resolve their own light/dark rendering live, every frame, against whatever's actually behind them — including through the drawer's own liquid-wipe animation — with no per-page manual wiring beyond tagging a background region.

**Route transitions**: clicking a nav link doesn't close the drawer immediately. It wraps `router.push` in `useTransition`, and only closes the drawer once React confirms the destination route has actually mounted underneath — so the liquid wipe always reveals real content rather than a placeholder or a flash of the old page.

## 4. Scroll system

- **Lenis + GSAP** (`components/smooth-scroll.tsx`): inertia-eased scrolling synced to GSAP's own ticker (not its own `requestAnimationFrame` loop) so ScrollTrigger-driven animations and the smoothed scroll position never drift a frame apart. Respects `prefers-reduced-motion` automatically (Lenis's own behavior).
- **Home page horizontal scroll** (`components/horizontal-scroll.tsx`): above 900px width and without reduced motion, GSAP `matchMedia` pins the section and translates its children horizontally as the visitor scrolls vertically — an Apple-product-page pattern. Below that breakpoint, or with reduced motion, it's a plain vertical stack — `matchMedia`'s own teardown means there's no separate cleanup branch to maintain for the breakpoint crossing.
- **Scroll memory** (`components/scroll-memory.tsx`): persists the home page's scroll position to `sessionStorage` across a visit to another route and back (Next's router otherwise always scrolls new pages to the top). Uses `useLayoutEffect` specifically so the restore happens before paint and after the horizontal-scroll pin has already set up its scrollable height.

## 5. Theming

A conventional `data-theme` attribute + CSS custom properties setup (`lib/theme-store.ts`, `app/globals.css`), notable mainly for how it stays synchronized with the chrome-tone system: every place the theme is set (the no-flash inline script, `applyTheme()`) also writes the derived ambient `data-chrome-tone` on `<html>`, using the identical resolution order in both places, so the two systems can't disagree. Pages that don't have their own fixed background (About/Resume/Art, via the shared `PageShell` wrapper) opt into `data-chrome-tone-follow-theme`, which the tone engine keeps mirrored to the live theme automatically — no per-page logic needed.

## 6. The cursor system

The largest single subsystem (`lib/cursor/*`, `components/cursor/*`), and the one with a full pre-written architecture doc (currently sitting at the repo root as `stuff i need to get to` — see Findings below). Framework-free data/logic in `lib/cursor` (types, a named-mode registry, a morph-technique decision table, the position/mode store) versus one persistent, never-remounted DOM tree in `components/cursor/global-cursor.tsx`.

Key decisions:
- **One shell, many modes.** The cursor never unmounts between states — a "simple" shape layer (div, cheap CSS tweening) and an "svg" shape layer (always mounted, opacity-toggled) coexist, and mode changes retarget an in-flight GSAP timeline rather than queuing behind it.
- **Morphing is a decision table, not a per-call-site choice** (`lib/cursor/morph-strategy.ts`): simple→simple never touches SVG (cheaper, visually equivalent); anything touching an "svg" shape bridges through GSAP's `MorphSVGPlugin` in a shared 100×100 coordinate space, converting simple shapes to an equivalent rounded-rect path just-in-time.
- **Blend mode is a property of the shape, not the mode** — so a plain dot and a "difference"-blended dot are two distinct named shapes sharing one geometry (`withBlend()`), rather than a flag on the mode config.
- **Delegated hover resolution** (`cursor-target.tsx`): one `pointerover`/`pointerout` listener on `window` walks up from the real event target to find the innermost opt-in (`<CursorTarget>`, `data-cursor`, or a bare link/button), so nested targets resolve correctly and a plain `<a>` gets cursor behavior for free with no markup changes.
- **Media pooling** (`lib/cursor/media-pool.ts`): a capped LRU pool (6) of kept-alive `<img>`/`<video>` elements addressed by `src`, so repeatedly hovering the same preview never re-mounts/re-decodes it; inactive video drops to `preload="metadata"` and pauses rather than staying fully decoded.

## 7. Accessibility & responsive conventions

Applied consistently rather than bolted on per-feature: every animated piece checks `prefers-reduced-motion` and has a real static fallback (not just a faster version of the same motion); the cursor and 404 mouse-dodge effect both gate on `pointer: fine` so touch devices get the native cursor; the nav drawer traps focus and closes on Escape; a `[data-native-cursor]` escape hatch exists for any element that genuinely needs the OS cursor back. `prefers-reduced-motion` is also enforced globally as a blanket rule in `globals.css` (near-zero animation/transition durations) as a safety net under the feature-level checks.

## 8. Cleanup performed

I removed code with no remaining callers:

- **`components/nav.tsx`** — a leftover `const letters = wrapper.querySelectorAll(".menu-letter")` that was superseded by the `realLetters`/`cloneLetters` split used a few lines later, but never itself deleted. Removed.
- **`lib/cursor/store.ts`** — `getCurrentModeName()` and `getCurrentTargetElement()` were exported but had zero call sites anywhere in the codebase; removing them also exposed that the `currentModeName` variable they read was itself write-only (set, never read) once they were gone. Removed all three.

Both changes are behavior-preserving — pure removal of code nothing depended on.

I also updated **`readme.md`**'s "Scroll animation foundation" section, which documented `components/pinned-scrub-example.tsx` and the `/scroll-demo` route as a "throwaway demo... delete once real sections exist." Per your call, those are being removed now rather than left in reference, so I rewrote that section to point at `components/horizontal-scroll.tsx` as the proven-out real implementation of the same pin+scrub pattern instead.

### What I couldn't finish

I'm not able to delete files or folders on your machine from here — this session only has read/write file transfer to your computer, not a shell, and permanently deleting data is something I hold back from doing myself regardless. Per your answers, please remove these three yourself:

- `app/scroll-demo/` (the whole folder, containing `page.tsx`)
- `components/pinned-scrub-example.tsx`
- `app/placeholder/` (the whole folder, containing `page.tsx`)

Nothing else references any of these three after the readme update above, so deleting them is safe — `pnpm build`/`pnpm dev` will pick up the route removal automatically.

## 9. Other findings, not yet acted on

Two smaller things worth your attention, left alone because fixing them changes runtime behavior rather than just removing dead code:

- **`stretchWithVelocity` doesn't actually gate anything.** `lib/cursor/types.ts` documents this flag as "off by default: most modes read as broken if they stretch," and only the `media` mode sets it `true` in `lib/cursor/modes.ts`. But the squash/stretch calculation in `components/cursor/global-cursor.tsx`'s ticker runs unconditionally for every mode — it reads `tracking?.maxStretch` but never checks `tracking?.stretchWithVelocity` first. Right now every cursor mode gets velocity-driven stretch, not just the ones that opted in. Worth a one-line gate if the other modes are visibly stretching more than intended.
- **Stale doc reference.** Several files (`lib/gsap.ts`, `components/cursor/global-cursor.tsx`, `lib/cursor/*`) point to `claude/cursor-system-architecture.md` as the cursor system's design doc. That path doesn't exist in the repo — the actual document is the root-level file named `stuff i need to get to`. Worth either moving/renaming that file to the path the comments expect, or updating the comments to match wherever it actually lives.

## 10. What's explicitly still scaffolding (by design, not oversight)

Per the project doc and readme, these are known-incomplete rather than bugs: the photo gallery (`content/photos.ts` is an empty stub), the resume auto-sync from a private LaTeX repo, final visual design/typography (Unbounded is a placeholder display font pending a real direction), and the About/Resume/Art pages themselves (all three are one-paragraph stand-ins via the shared `PageShell`).
