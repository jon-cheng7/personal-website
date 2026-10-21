# personal-website

Jon's personal site — Next.js 16, React 19, GSAP + Lenis. `pnpm dev`.

## Map

```
app/
  layout.tsx              root: fonts, theme, Nav, cursor, smooth scroll, route wipe
  page.tsx                Home content (Scene + Actors)
  _home/home.choreo.ts    Home placement + timing  ← tune here
  _home/sections/hero/    hero content, intro, bubble dialogue
  me/ experience/ art/    placeholder content pages (PageShell)
components/
  choreo/                 scroll keyframe engine (Scene, Actor, useChannel) — see README
  ui/                     reusable looks: SpeechBubble, FrostPanel, RevealText
  cursor/                 custom cursor
  nav.tsx …               site chrome: nav, page shell, route wipe, scroll memory, smooth scroll
lib/                      stores + utilities (gsap, lenis, theme, chrome-tone, intro, cursor/)
content/                  data: nav links, social, photos
public/                   images (photos/ for gallery)
```

## Common tasks

- Move / retime anything on Home → `app/_home/home.choreo.ts`; `?choreo` in URL for the overlay.
- New home element → `<Actor id="x">` in `app/page.tsx` + `actors.x` in the choreo file.
- Nav links → `content/nav.ts`.
- Add photo → file in `public/photos/` (~2400–3000px long edge) + entry in `content/photos.ts`.
- Cursor modes → `lib/cursor/modes.ts`; opt in with `data-cursor="mode"`.
- Display font → `--font-display` in `app/globals.css`.

## Rules

- Responsive: phones → desktop. Mobile can diverge (choreo `mobile` variant).
- Performance first: transforms/opacity only in loops, no idle work.
- `prefers-reduced-motion`: every animation has a calm fallback.
