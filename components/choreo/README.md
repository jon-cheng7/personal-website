# choreo

Scroll-driven keyframe layout. One `<Scene>` per page, one config per scene.

```
<Scene choreo={config}>
  <Actor id="portrait">…</Actor>     placed only by config.actors.portrait
</Scene>
```

- Time = screens of scroll (1 = one viewport height).
- `space: "screen"` — on-screen pos (default). `"world"` — canvas pos, panned by `camera`.
- Direction change — camera keys: x moves, then y moves.
- Keys carry over omitted props. `hold` = lock. `look` = named state. `ease` = arriving ease.
- Cues — named times, `"cue ± n"`, may reference other cues.
- Channels — keyframed numbers for components (`useChannel`), e.g. RevealText `reveal`.
- Smoothing `{ start, stop }` s — pickup lag vs glide. World actors follow camera.
- `mobile` — overrides at ≤ breakpoint; actors replaced per id.
- Reduced motion — no smoothing, no blur.
- `?choreo` in URL — overlay: time, cue jumps, outlines, copy keyframe.

Files: `types` config · `units` lengths/times · `engine` pure math · `scene` React · `debug` overlay.
