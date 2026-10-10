GIF decoding dependency: gifuct-js 2.1.2 and js-binary-schema-parser 2.0.3 (MIT).

Upstream: https://github.com/matt-way/gifuct-js

The local ESM bundle is loaded only by the GIF worker; no CDN or runtime network dependency.
Build with esbuild: `esbuild gifuct-js/src/index.js --bundle --format=esm --platform=browser --minify --outfile=gifuct-js.mjs`.
Licenses for both bundled packages are included here.
