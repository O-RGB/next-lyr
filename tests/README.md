Timing regression checks use the installed Node.js and esbuild (no browser or
audio device required):

```sh
node --test tests/timing-session.test.mjs tests/sticker-image.test.mjs
./node_modules/.bin/esbuild tests/inline-content.test.mjs --bundle --platform=node --format=cjs --outfile=/tmp/next-lyr-inline-tests.cjs
node --test /tmp/next-lyr-inline-tests.cjs
./node_modules/.bin/esbuild tests/timing-workflow.test.ts --bundle --platform=node --format=cjs --external:js-synthesizer --outfile=/tmp/next-lyr-timing-tests.cjs
./node_modules/.bin/esbuild tests/playback-images.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/next-lyr-playback-tests.cjs
./node_modules/.bin/esbuild tests/block-effects.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/next-lyr-effects-tests.cjs
./node_modules/.bin/esbuild tests/effect-editor.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/next-lyr-effect-editor-tests.cjs
./node_modules/.bin/esbuild tests/gif-canvas.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/next-lyr-gif-canvas-tests.cjs
./node_modules/.bin/esbuild tests/nature-effects.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/next-lyr-nature-effects-tests.cjs
./node_modules/.bin/esbuild tests/weather-effects.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/next-lyr-weather-effects-tests.cjs
node --test /tmp/next-lyr-timing-tests.cjs /tmp/next-lyr-playback-tests.cjs /tmp/next-lyr-effects-tests.cjs /tmp/next-lyr-effect-editor-tests.cjs
node --test /tmp/next-lyr-gif-canvas-tests.cjs
node --test /tmp/next-lyr-nature-effects-tests.cjs
node --test /tmp/next-lyr-weather-effects-tests.cjs
```

The workflow tests mock player controls and the worker reply, while exercising
the real store actions and timing handlers. Worker initialization is not used
in these Node tests; the CJS bundler's `import.meta` warnings are expected.

Sticker checks cover file signatures, pixel limits, mobile placement, line edits, and undo/redo. Browser validation additionally covers PNG transparency, animated GIF frame timing, the 1 MB input limit, optimization, and IndexedDB recovery.

Inline content checks cover timestamp slots, mixed text/image layout, deduplication of used images in playback exports, missing-asset failures, playback-only YKR data, large MIDI payloads, and MP3 audio preservation. Browser checks cover gallery persistence and reuse across projects, migration, mouse dragging, touch-sized layouts, and rich XML round trips.

Effect checks cover connected runs, discrete sprite playback, anchored frame origins, yellow untreated lyrics, reduced motion and complete deduplicated atlas export. Artwork uses sixteen independently drawn frames per preset; there is no vector morph or moving-static-image animation.

Nature-effect checks cover floating hearts, pinned leaf stems across changing source roots, rain density and its exact glyph span, darker sung palettes, and deduplicated three-preset playback export with attachment metadata. Browser checks confirm distinct sixteen-frame loops, single-canvas composition, new preset selection/range restoration and mobile overflow handling. Rain is composited behind text with additional headroom so falling drops remain visible without covering the letter faces.

Weather checks cover the three rain styles and three sunny styles, family-specific variant validation, separate adjacent groups, and at most three floating objects. Clouds, sun and birds stay smaller than the lyric height and use restrained opacity. Browser validation covers the same canvas composition on desktop/mobile, variant persistence on save/reopen, unchanged timing slots, and shared decoded lightning. Exports include only needed sprite components: XML repeats an ID through `<DATA ref="id"/>`, while YKR repeats the binding with an empty `base64` and resolves it by ID. Readers hydrate these references before rendering; missing or conflicting required payloads fail export.

Editor effect checks cover visual boundary blocks, exact group ranges, raised grouped words, restored selection on reopening, draft range recovery and undo/redo. Effect controls never create timing slots. Browser validation covers persistence, mobile scrolling over both words and effect controls, and direct group editing.

Canvas GIF checks cover transparent patches, disposal modes 2 and 3, opaque backgrounds, loop resets, variable frame delays, finite loops and reduced motion. Browser validation covers a single presentation canvas with no inline DOM images, shared decoders across repeated image cells and both viewports, animated pixels while lyrics are paused, and releasing workers/bitmaps when the media leaves the scene. The renderer keeps only the current decoded GIF frame and a bounded composition screen, rather than expanding all frames into the project or export.
