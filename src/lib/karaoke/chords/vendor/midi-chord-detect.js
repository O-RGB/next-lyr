/**
 * midi-chord-detect — chord detection for MIDI.
 *
 * Give it a `.mid` and it returns the progression as `ChordEvent[]`, reading
 * every pitched instrument rather than following the bass or melody alone.
 *
 * The analysis is the C core in `core/`, reached through WebAssembly, which is
 * the same code Flutter calls over FFI. The wasm is embedded in this module, so
 * `import` works in Next.js, Vite, webpack and a plain `<script type=module>`
 * with no bundler configuration.
 *
 *   import { detectChords } from "midi-chord-detect";
 *   const { chords } = await detectChords(await file.arrayBuffer());
 *   // [{ chord: "Am", tick: 480 }, ...]
 */
/** Mirrors `cd_status` in chorddetect.h. */
const STATUS_MESSAGES = {
    1: "not a MIDI file",
    2: "SMPTE time division is not supported; the file has no bars to analyse",
    3: "out of memory",
    4: "no pitched notes to analyse",
};
/**
 * `cd_chord` as laid out by the compiler: eight 32-bit fields under wasm32,
 * where a pointer is four bytes.
 */
const CHORD_STRUCT_WORDS = 9;
/* Every field of `cd_options`, including the ones this binding does not expose.
   `cd_options_init` writes the whole struct, so allocating short of it corrupts
   whatever the allocator put next — which is what a missing `key_window_beats`
   was doing here. */
const OPTION_STRUCT_WORDS = 15;
let modulePromise = null;
/**
 * Load the module, once per page.
 *
 * Instantiation costs about a millisecond and the result is cached, so callers
 * do not need to hoist this themselves.
 */
export async function ready() {
    await load();
}
async function load() {
    if (!modulePromise) {
        modulePromise = import("../wasm/chorddetect.mjs").then((factory) => factory.default());
    }
    return modulePromise;
}
function writeOptions(wasm, pointer, options) {
    // Start from the C defaults, so a field this file does not know about keeps
    // whatever the core considers sensible.
    wasm._cd_options_init(pointer);
    const words = pointer >> 2;
    const floats = new Float32Array(wasm.HEAP32.buffer);
    if (options.maxChordsPerBar !== undefined)
        wasm.HEAP32[words] = options.maxChordsPerBar;
    if (options.vocabulary !== undefined) {
        wasm.HEAP32[words + 1] = options.vocabulary === "extended" ? 1 : 0;
    }
    if (options.changePenalty !== undefined)
        floats[words + 2] = options.changePenalty;
    if (options.keyBias !== undefined)
        floats[words + 3] = options.keyBias;
    if (options.qualityBias !== undefined)
        floats[words + 4] = options.qualityBias;
    if (options.melodyChannel !== undefined)
        wasm.HEAP32[words + 5] = options.melodyChannel;
    if (options.detectInversions !== undefined) {
        wasm.HEAP32[words + 6] = options.detectInversions ? 1 : 0;
    }
    if (options.repeatEveryBar !== undefined) {
        wasm.HEAP32[words + 7] = options.repeatEveryBar ? 1 : 0;
    }
    if (options.lookaheadBeats !== undefined)
        wasm.HEAP32[words + 8] = options.lookaheadBeats;
    if (options.keyWindowBeats !== undefined)
        wasm.HEAP32[words + 9] = options.keyWindowBeats;
    if (options.weakBeatBias !== undefined)
        floats[words + 10] = options.weakBeatBias;
    if (options.beatSubdivisions !== undefined) {
        wasm.HEAP32[words + 11] = options.beatSubdivisions;
    }
    if (options.onsetGrid !== undefined) {
        wasm.HEAP32[words + 12] = options.onsetGrid ? 1 : -1;
    }
    if (options.offBeatCost !== undefined)
        floats[words + 13] = options.offBeatCost;
    if (options.silentChangeCost !== undefined)
        floats[words + 14] = options.silentChangeCost;
}
function readSegments(wasm, base, count) {
    const segments = new Array(count);
    const words = base >> 2;
    const floats = new Float32Array(wasm.HEAP32.buffer);
    for (let i = 0; i < count; i++) {
        const at = words + i * CHORD_STRUCT_WORDS;
        segments[i] = {
            chord: wasm.UTF8ToString(wasm.HEAP32[at]),
            tick: wasm.HEAP32[at + 1],
            endTick: wasm.HEAP32[at + 2],
            bar: wasm.HEAP32[at + 3],
            beat: wasm.HEAP32[at + 4],
            root: wasm.HEAP32[at + 5],
            beatOffset: floats[at + 7],
            confidence: floats[at + 8],
        };
    }
    return segments;
}
/** Analyse a Standard MIDI File. */
export async function detectChords(file, options = {}) {
    const wasm = await load();
    const bytes = file instanceof Uint8Array ? file : new Uint8Array(file);
    const started = typeof performance !== "undefined" ? performance.now() : Date.now();
    const dataPointer = wasm._malloc(bytes.length);
    const optionsPointer = wasm._malloc(OPTION_STRUCT_WORDS * 4);
    let resultPointer = 0;
    try {
        wasm.HEAPU8.set(bytes, dataPointer);
        writeOptions(wasm, optionsPointer, options);
        resultPointer = wasm._cd_detect(dataPointer, bytes.length, optionsPointer);
        if (!resultPointer)
            throw new Error("midi-chord-detect: out of memory");
        const status = wasm._cd_result_status(resultPointer);
        if (status !== 0) {
            throw new Error(`midi-chord-detect: ${STATUS_MESSAGES[status] ?? `failed (${status})`}`);
        }
        const count = wasm._cd_result_count(resultPointer);
        const segments = readSegments(wasm, wasm._cd_result_chords(resultPointer), count);
        const markerCount = wasm._cd_result_marker_count(resultPointer);
        const markers = readSegments(wasm, wasm._cd_result_markers(resultPointer), markerCount);
        const tonic = wasm._cd_result_key_tonic(resultPointer);
        const isMinor = wasm._cd_result_key_is_minor(resultPointer) !== 0;
        return {
            chords: segments.map(({ chord, tick }) => ({ chord, tick })),
            segments,
            overallConfidence: wasm._cd_result_confidence(resultPointer),
            existingChords: markers.map(({ chord, tick, endTick, root, confidence }) => ({
                chord,
                tick,
                endTick,
                root,
                confidence,
            })),
            key: {
                tonic,
                mode: isMinor ? "minor" : "major",
                name: wasm.UTF8ToString(wasm._cd_result_key_name(resultPointer)),
            },
            ppq: wasm._cd_result_ppq(resultPointer),
            durationTicks: wasm._cd_result_duration(resultPointer),
            elapsedMs: (typeof performance !== "undefined" ? performance.now() : Date.now()) - started,
        };
    }
    finally {
        // The result owns its chord names, so it has to outlive the reads above.
        if (resultPointer)
            wasm._cd_free(resultPointer);
        wasm._free(optionsPointer);
        wasm._free(dataPointer);
    }
}
