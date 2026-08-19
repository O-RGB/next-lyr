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
/** The shape the karaoke editors already consume. */
export interface ChordEvent {
    chord: string;
    tick: number;
}
export interface ChordSegment extends ChordEvent {
    /** Tick the chord gives way to the next one. */
    endTick: number;
    /** Bar number from 1, and beat within the bar from 1. */
    bar: number;
    beat: number;
    /**
     * Where the chord starts inside its beat: 0 on the beat, 0.5 halfway
     * through. Show it as `beat + beatOffset` — bar 3, beat 2.5 — for a chord
     * that begins between two beats. Zero for everything that starts on one.
     */
    beatOffset: number;
    /** Pitch class of the root, 0 = C. */
    root: number;
    /**
     * How strongly the notes supported this label, 0..1. Low values mark bars
     * worth checking by ear: silence, drum fills, genuinely ambiguous harmony.
     */
    confidence: number;
}
/** A chord annotation found in the file, with a note on whether to believe it. */
export interface ChordMarker extends ChordEvent {
    /** Tick the next chord marker takes over. */
    endTick: number;
    /** Pitch class of the root as written, or -1 if the name was not understood. */
    root: number;
    /**
     * How much of the music under this marker the marker's own chord explains,
     * 0..1 — scored exactly as {@link ChordSegment.confidence} is, so the two can
     * be compared directly.
     *
     * A low value means the annotation does not describe the recording: a chart
     * left in the original key after the song modulated, or one naming the
     * harmony by function rather than by sound. Roughly one marker in twenty
     * explains less than half of what is sounding under it. Scoring a detector
     * against those counts a disagreement between two humans as a machine error,
     * which is worth knowing before trusting an accuracy figure built from them.
     */
    confidence: number;
}
export interface DetectOptions {
    /**
     * Chords a bar may hold, 1..4.
     *
     * A hard cap applied after decoding, dissolving the weakest run in a bar into
     * its neighbour until the count fits. It is a blunt instrument and mostly
     * unnecessary now that the decoder prices a change by where in the bar it
     * falls: over the corpus, tightening it from 4 to 2 costs recall and buys
     * nothing. Set it to 1 for a chart with one chord to a bar whatever the song
     * does.
     * @default 4
     */
    maxChordsPerBar?: number;
    /**
     * `"playable"` uses only the shapes people write on a chord sheet — major,
     * minor, 7, maj7, m7 — which is what someone strumming along needs.
     * `"extended"` adds sus, 6th, diminished, augmented and add9 for
     * transcription.
     * @default "playable"
     */
    vocabulary?: "playable" | "extended";
    /** Resistance to changing chord, roughly 0..1. Higher is blockier. */
    changePenalty?: number;
    /** Pull toward chords diatonic to the estimated key, 0..1. */
    keyBias?: number;
    /**
     * Pull toward the chord qualities people write most often, 0..1.
     *
     * Off by default. Turning it up raises average accuracy by suppressing
     * sevenths — at 0.10 none of the corpus's 725 `maj7` chords were found.
     */
    qualityBias?: number;
    /** 0-based MIDI channel carrying the melody, which is down-weighted. */
    melodyChannel?: number;
    /** Emit slash chords such as `C/E`. */
    detectInversions?: boolean;
    /** Repeat the chord at every bar line rather than merging across bars. */
    repeatEveryBar?: boolean;
    /**
     * Beats of lookahead before a chord is committed; 0 analyses the whole song.
     *
     * Only relevant to a caller that cannot wait for the end of the input. On the
     * test corpus, 4 beats — two seconds at 120bpm — matched whole-song analysis
     * exactly.
     * @default 0
     */
    lookaheadBeats?: number;
    /**
     * Beats of context used to estimate the key, or 0 for one key per piece.
     * @default 0
     */
    keyWindowBeats?: number;
    /**
     * How much harder it is to change chord off the downbeat.
     *
     * What each point in the bar costs is measured rather than guessed: 689
     * hand-written charts put a chord change at 64% of bar lines, 16% of
     * half-bars and 0.57% of the beats in between. At 1 the decoder uses those
     * figures as they stand.
     *
     * Above 1 the gaps between metrical levels are stretched, for a blockier
     * chart; below 1 they are compressed, for a transcription that follows
     * mid-bar movement more readily.
     * @default 1
     */
    weakBeatBias?: number;
    /**
     * Slots cut per beat: 1, 2 or 4.
     *
     * A chord change can only be reported where the grid has a position for it.
     * One slot per beat covers 98.5% of the changes in the corpus; 2 adds the
     * off-beat change, which is where a song that turns its harmony round inside
     * a bar puts one; 4 resolves a sixteenth. Cost is linear in this.
     * @default 1
     */
    beatSubdivisions?: number;
    /**
     * Cut a slot boundary at every note onset as well as on the metrical grid.
     *
     * This is what lets a chord be reported off the beat at all. A finer uniform
     * grid is not the same thing: 31% of the distinct note onsets in the test
     * corpus land on no quarter-beat boundary — swung eighths, triplets, and
     * notes a sequencer nudged — and no subdivision of the beat reaches those.
     * It is also cheaper than subdividing, because an onset is a place the
     * harmony could actually have changed and a grid position often is not.
     * @default true
     */
    onsetGrid?: boolean;
    /**
     * What it costs, in nats, to move harmony at a position off every metrical
     * grid — a swung eighth, a triplet, a note the sequencer nudged.
     *
     * This is the one number the corpus cannot supply. Every chart in it is
     * written on a beat grid: a musician who hears the harmony turn over between
     * two beats writes it on one of them, so there is no denominator to divide by
     * and any figure derived from one is arithmetic rather than evidence.
     *
     * The default is calibrated against the one thing the corpus does say: 1.5%
     * of the chord changes people write land off the beat. At 7 the detector puts
     * 1.2% of its own there, and agreement with the corpus falls by a tenth of a
     * point while the share of playing time labelled correctly does not move.
     * Lower it to follow the notes wherever they go; raise it past 12 to pin
     * every chord to the grid.
     * @default 7
     */
    offBeatCost?: number;
    /**
     * Extra cost, in nats, of changing chord where nothing is struck — where the
     * previous chord is merely sustaining across the position.
     *
     * Harmony moves when notes are played. Without this the decoder takes a
     * metrical position it likes over the position the music actually moved at:
     * a C major struck on the second half of beat four, with a melody note left
     * ringing across beat four itself, comes out named on beat four.
     * @default 4
     */
    silentChangeCost?: number;
}
export interface DetectResult {
    chords: ChordEvent[];
    segments: ChordSegment[];
    /**
     * Share of pitched-note energy explained by the detected chord labels over
     * the analysed harmonic span, 0..1.
     *
     * Useful for quality gates such as `overallConfidence >= 0.8`. This is an
     * evidence-fit score, not a calibrated probability that every label is
     * correct; songs with sparse accompaniment still deserve an ear check.
     */
    overallConfidence: number;
    /**
     * Chord annotations already in the file, if it carries any. Karaoke MIDIs
     * often do, which makes it easy to show a detected progression beside the one
     * a human wrote.
     */
    existingChords: ChordMarker[];
    key: {
        /** Pitch class of the tonic, 0 = C. */
        tonic: number;
        mode: "major" | "minor";
        /**
         * Spelled the way the chords are — `"Bb"` in B flat major, not `"A#"`.
         * Reading the tonic back through a sharp-name table is how a chart comes
         * out headed "A# major" over a page of Bb, Eb and Gm.
         */
        name: string;
    };
    /** Ticks per quarter note, the unit `tick` is measured in. */
    ppq: number;
    durationTicks: number;
    /** Wall time the analysis took, in milliseconds. */
    elapsedMs: number;
}
/**
 * Load the module, once per page.
 *
 * Instantiation costs about a millisecond and the result is cached, so callers
 * do not need to hoist this themselves.
 */
export declare function ready(): Promise<void>;
/** Analyse a Standard MIDI File. */
export declare function detectChords(file: ArrayBuffer | Uint8Array, options?: DetectOptions): Promise<DetectResult>;
