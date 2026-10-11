# Shared lyrics package

The sibling next-lyrics repository owns the complete LyricsCanvas component/controller,
karaoke cache/timing/CPU tiers, streaming window updates, text/PNG/GIF/effect rendering,
asset URLs, GIF worker and decoder, and authoring/draft layouts. Both apps consume one
versioned tarball from vendor. No PNG files, asset synchronization, GIF vendor code or
Canvas rendering loop are maintained in the consuming apps.

App adapters pass clocks, song/timeline data, appearance/configuration and storage callbacks.
The editor keeps its editing controls, gallery and project persistence. Karaoke keeps its
audio engine, settings and custom font loader. Pixel drawing and media lifetime belong to
the package. The app bundler publishes package asset URL/worker imports automatically.

To update, change/test next-lyrics, bump the version and run its release-local script with
both app folders. Install dependencies using npm in next-lyr and pnpm in karaoke-web-online,
then check/build both apps. Commit the tarball and lockfile. No separate asset-copy step.

New playback exports use stable built-in preset IDs and library version 1. Uploaded images
remain embedded once per ID; explicit legacy sprites and untimed image blocks stay supported.
