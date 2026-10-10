Timing regression checks use the installed Node.js and esbuild (no browser or
audio device required):

```sh
node --test tests/timing-session.test.mjs tests/sticker-image.test.mjs
./node_modules/.bin/esbuild tests/inline-content.test.mjs --bundle --platform=node --format=cjs --outfile=/tmp/next-lyr-inline-tests.cjs
node --test /tmp/next-lyr-inline-tests.cjs
./node_modules/.bin/esbuild tests/timing-workflow.test.ts --bundle --platform=node --format=cjs --external:js-synthesizer --outfile=/tmp/next-lyr-timing-tests.cjs
./node_modules/.bin/esbuild tests/playback-images.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/next-lyr-playback-tests.cjs
./node_modules/.bin/esbuild tests/block-effects.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/next-lyr-effects-tests.cjs
node --test /tmp/next-lyr-timing-tests.cjs /tmp/next-lyr-playback-tests.cjs /tmp/next-lyr-effects-tests.cjs
```

The workflow tests mock player controls and the worker reply, while exercising
the real store actions and timing handlers. Worker initialization is not used
in these Node tests; the CJS bundler's `import.meta` warnings are expected.

Sticker checks cover file signatures, pixel limits, mobile placement, line edits, and undo/redo. Browser validation additionally covers PNG transparency, animated GIF frame timing, the 1 MB input limit, optimization, and IndexedDB recovery.

Inline content checks cover timestamp slots, mixed text/image layout, deduplication of used images in playback exports, missing-asset failures, playback-only YKR data, large MIDI payloads, and MP3 audio preservation. Browser checks cover gallery persistence and reuse across projects, migration, mouse dragging, touch-sized layouts, and rich XML round trips.

Effect checks cover connected runs, discrete sprite playback, anchored frame origins, yellow untreated lyrics, reduced motion and complete deduplicated atlas export. Artwork uses sixteen independently drawn frames per preset; there is no vector morph or moving-static-image animation.
