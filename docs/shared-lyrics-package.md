# Lyrio — Karaoke Lyrics Engine

The sibling `lyrio` repository owns the complete LyricsCanvas component/controller,
karaoke cache/timing/CPU tiers, streaming window updates, text/PNG/GIF/effect rendering,
asset URLs, GIF worker and decoder, and authoring/draft layouts. Both apps consume one
versioned tarball from vendor. No PNG files, asset synchronization, GIF vendor code or
Canvas rendering loop are maintained in the consuming apps.

The project folder, npm package, imports and new playback library ID use `lyrio`.
The editor app remains `next-lyr`. Existing playback files remain supported;
consumers install versioned `lyrio-<version>.tgz` archives from `vendor`.

App adapters pass clocks, song/timeline data, appearance/configuration and storage callbacks.
The editor keeps its editing controls, gallery and project persistence. Karaoke keeps its
audio engine, settings and custom font loader. Pixel drawing and media lifetime belong to
the package. The app bundler publishes package asset URL/worker imports automatically.

To update, change/test `lyrio`, bump the version and run its release-local script with
both app folders. Install dependencies using npm in next-lyr and pnpm in karaoke-web-online,
then check/build both apps. Commit the tarball and lockfile. No separate asset-copy step.

New playback exports use stable built-in preset IDs and library version 1. Uploaded images
remain embedded once per ID; explicit legacy sprites and untimed image blocks stay supported.

## Renderer update — 2026-10-20

The editor consumes `lyrio@0.2.26-safari.1`, upgraded from `0.2.20`.
The archive is identical to the one installed in `karaoke-web-online`; it includes
the Safari text alignment/fill fixes and the shared renderer improvements.
Authoring and inline previews continue to use their existing package adapters.
Player-only composition optimizations remain scoped to the layouts that support
them; this update does not enable player clipping on the authoring canvas.
Reduce Motion continues to select stationary effect frames by design.
Physical iPad acceptance remains separate from the package upgrade.
