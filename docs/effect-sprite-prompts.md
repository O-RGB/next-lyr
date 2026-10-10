# Lyric effect frame assets

Tool mode: built-in `image_gen.imagegen` (transparent PNG, 16 drawn cels per effect).

Final assets: `public/effects/sprites/lightning.png`. This commit ships the lightning preset. All placements reuse these atlases, for every selected text run. Roots are aligned to the outer glyph strokes and the frame art is placed at a fixed outward angle. Animation advances through discrete image cells; no animated vector transforms or interpolated shapes.

## Lightning

```text
Use case: stylized-concept
Asset type: production transparent PNG sprite atlas for a lyric text animation.
Composition: EXACTLY 4 columns by 4 rows, 16 equally sized square cells. Each cell is ONE independently drawn consecutive animation frame. Read left to right, top to bottom. No labels or grid lines. True transparent background with completely clean alpha, no background tint or scattered noise. All artwork strictly inside each cell with 8% clear margins. Every frame has the SAME fixed narrow emitter root at x=50%, y=90% within its cell, pointing upward. Same overall length and occupied bounds in ALL 16 frames; no growing then shrinking whole object. Create a continuous energetic loop by redrawing moving contours and internal shapes, not rotating or translating a static image. Frame 16 naturally flows into frame 1.
Style: refined contemporary flat animation cel art, bold fluid silhouettes, few clean shapes and only three flat colors. Less detail. No realism, no glow, no airbrush, no texture. Professional stylized game motion, not a cute icon.
Constraints: NO floor, base platform, oval puddle, shadow, outline stroke, detached floating particles, badge, text, logo, border or watermark. This is an emitting jet attached to a letter, NOT a standing campfire/sticker. A thin tapered root expands into the plume above; the root itself must be narrow enough to merge into a letter stroke.
Primary request: sixteen consecutive cels of a forceful electric discharge emerging from a narrow fixed root. A lean fast zigzag bolt with two small branching arcs, blue outside, cyan inside, a thin white hot channel (#078eff, #32dcff, #f3feff). Use the reference ONLY for the clean three-color treatment; replace the broad standing burst with a slim emitting arc. Keep each frame a full-length strong discharge. Change the zigzag path and branching topology substantially every frame so it crackles rather than sways. Three to five crisp directional bends, clean purposeful shapes, minimal detail. Body occupies about 70% of cell height, 40% width, root only 6% cell width.
```
