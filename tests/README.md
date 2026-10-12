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
./node_modules/.bin/esbuild tests/atmosphere-effects.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/next-lyr-atmosphere-effects-tests.cjs
node --test /tmp/next-lyr-timing-tests.cjs /tmp/next-lyr-playback-tests.cjs /tmp/next-lyr-effects-tests.cjs /tmp/next-lyr-effect-editor-tests.cjs
node --test /tmp/next-lyr-gif-canvas-tests.cjs
node --test /tmp/next-lyr-nature-effects-tests.cjs
node --test /tmp/next-lyr-weather-effects-tests.cjs
node --test /tmp/next-lyr-atmosphere-effects-tests.cjs
```

The workflow tests mock player controls and the worker reply, while exercising
the real store actions and timing handlers. Worker initialization is not used
in these Node tests; the CJS bundler's `import.meta` warnings are expected.

Sticker checks cover file signatures, pixel limits, mobile placement, line edits, and undo/redo. Browser validation additionally covers PNG transparency, animated GIF frame timing, the 1 MB input limit, optimization, and IndexedDB recovery.

Inline content checks cover timestamp slots, mixed text/image layout, deduplication of used images in playback exports, missing-asset failures, playback-only YKR data, large MIDI payloads, and MP3 audio preservation. Browser checks cover gallery persistence and reuse across projects, migration, mouse dragging, touch-sized layouts, and rich XML round trips.

Effect checks cover connected runs, discrete sprite playback, anchored frame origins, yellow untreated lyrics, reduced motion and complete deduplicated atlas export. Artwork uses sixteen independently drawn frames per preset; there is no vector morph or moving-static-image animation.

Nature-effect checks cover floating hearts, pinned leaf stems across changing source roots, rain density and its exact glyph span, darker sung palettes, and deduplicated three-preset playback export with attachment metadata. Browser checks confirm distinct sixteen-frame loops, single-canvas composition, new preset selection/range restoration and mobile overflow handling. Rain is composited behind text with additional headroom so falling drops remain visible without covering the letter faces.

Weather checks cover the three rain styles and three sunny styles, family-specific variant validation, separate adjacent groups, and at most three floating objects. Clouds, sun and birds stay smaller than the lyric height and use restrained opacity. Browser validation covers the same canvas composition on desktop/mobile, variant persistence on save/reopen, unchanged timing slots, and shared decoded lightning. Exports include only needed sprite components: XML repeats an ID through `<DATA ref="id"/>`, while YKR repeats the binding with an empty `base64` and resolves it by ID. Readers hydrate these references before rendering; missing or conflicting required payloads fail export.

Storm visibility checks exercise the actual sprite composer with rain and the joined thundercloud atlas. Active and quiet intervals use the same cloud cel; the attached lower discharge appears only during a burst, while reduced motion retains a static discharge. Browser comparisons on the main and draft renderers verify the cloud and lightning form one small decoration. Storm's icon shows the generated cloud and discharge together.

Atmosphere checks cover 30 styled presets, including all nighttime, star, snow, petal, autumn, aurora, sunset and butterfly variants. Every sky composition stays inside its selected span, below the text size, and at most three objects. The generated thundercloud atlas supplies both the cloud and its attached discharge: quiet intervals draw its upper part, flashes draw the matching lower part at the same seam. Seeded schedules avoid the preceding cloud; a second, different site appears only once per five long episodes and cannot become the next episode's site. Reduced motion freezes a static discharge and omits meteors. Export checks include all 30 role bindings with only 18 unique binaries, strict supported-role validation and unchanged timing slot references. Browser validation covers 16 distinct cels in every new PNG, alpha backgrounds, a shared main/draft painter, small mobile layouts, fixed sheet height, bilingual search, lazy visible icon loading, variant persistence, and XML/YKR shared-component references.

Editor effect checks cover visual boundary blocks, exact group ranges, raised grouped words, restored selection on reopening, draft range recovery and undo/redo. Effect controls never create timing slots. Browser validation covers persistence, mobile scrolling over both words and effect controls, and direct group editing.

The Edit Lyrics list mirrors the main screen's effect boundaries vertically, joined by a range bracket around its members. Add Word opens a shared content drawer; image rows open the same gallery to replace their own asset. The drawer captures a stable insertion key before taking focus. Workflow checks cover replacement during an unfinished timing pass, timestamp zero, effect preservation, reordering before insertion, and undo/redo. Browser checks cover desktop side panels, mobile bottom panels, restoring focus, a hidden upload panel until requested, 1 MB validation, shared-file reuse, and saved weather choices. Draft previews and playback call the same inline canvas renderer, media compositor and sprite icon painter.

Keyboard drag visits stable lyric rows and the gaps outside effect groups. Effect caps accept pointer drops into their group; outside gaps remove membership. Adjacent groups share one keyboard gap so arrows cannot get stuck. While a drag handle is active, its up/down arrows reach the drag sensor through Base UI's composite-key trap. Mouse/touch drops still use their final pointer position; keyboard drops use the active slot target. Browser checks confirm both mouse and keyboard reordering preserve each destination timestamp.

The content list displays checkboxes and slot numbers, with only the leading drag handle for moving items. Timestamp labels and move-arrow buttons are omitted; the stored timing slots still stay fixed. Effect selection is a two-column grid including all three rain and three sunshine choices. The prior checkbox selection alone defines the target blocks; adjacent matching blocks connect automatically, and gaps stay separate. There are no secondary type, connect or range controls. Effect panels always open as a fixed `82dvh` bottom sheet, with a scrollable body, fixed header/footer, and a forced nested backdrop for outside dismissal. Browser checks compare its top and height across choices on desktop and on short mobile viewports, verify internal overflow, saved variants, outside dismissal and retained parent drafts.

Canvas GIF checks cover transparent patches, disposal modes 2 and 3, opaque backgrounds, loop resets, variable frame delays, finite loops and reduced motion. Browser validation covers a single presentation canvas with no inline DOM images, shared decoders across repeated image cells and both viewports, animated pixels while lyrics are paused, and releasing workers/bitmaps when the media leaves the scene. The renderer keeps only the current decoded GIF frame and a bounded composition screen, rather than expanding all frames into the project or export.

Shared-package extraction: run next-lyrics's runtime suite for original karaoke slot/draw parity,
then this full regression suite. New default exports use versioned preset IDs without sprite
bodies; explicit legacy atlas exports retain the existing deduplication tests. Karaoke's
`test:lyrics-package-browser` verifies rolling windows, MIDI clocks, isolated custom views,
fire/night sprites, repeated animated GIFs on one visible canvas and final-worker release.

Edit Lyrics regressions cover neutral checkbox selection on ordinary opens, exact manual
selections through undo/redo, and explicit effect-group editing. Saving completes the checkbox selection; only unsaved drafts restore it on an ordinary reopen.
Dropping a text or image block inside an effect bracket (including either cap) adopts its exact preset.
Text timing slots stay in order when images move. Images never consume a stamp, advance playback,
rewind a paused timing target, or become a backtracking target. Legacy image timestamps are ignored
in the shared renderer and omitted from playback exports. Untimed text stays visible and unsung.

Group drag regressions cover Add Word insertion inside a connected range, adopting the exact preset on a drop, leaving through the outside boundaries without moving a timing slot, cancelling off-editor drops, and saved membership through undo/redo. Browser checks exercise the real Add Word drawer followed by drag-in and drag-out on desktop, and whole-group boundary extraction with keyboard and touch.

Free pointer dragging uses one visible insertion marker. Its last painted destination is the committed destination, including a release outside the modal or viewport. Targets outside the visible scroll area cannot steal this marker. Drag previews are portaled to the body so the modal does not clip them; source timing slots stay fixed.
