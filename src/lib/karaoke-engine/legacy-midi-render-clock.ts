import type { ISequencer, Synthesizer } from "js-synthesizer";

interface RenderClockSample {
  /** FluidSynth tick immediately after this ScriptProcessor block rendered. */
  sequencerTick: number;
  /** AudioContext presentation time at the end of that same block. */
  audioContextTime: number;
}

/**
 * The render clock used by karaoke-web-online's legacy FluidSynth path.
 *
 * FluidSynth's sequencer advances inside `synth.render()`. Capturing its tick
 * next to the output block's presentation time removes the one-buffer phase
 * error caused by reading the sequencer from a window timer.
 */
export class LegacyMidiRenderClock {
  private sequencer: ISequencer | null = null;
  private latestSample: RenderClockSample | null = null;
  private readonly node: ScriptProcessorNode;

  constructor(
    context: AudioContext,
    private readonly synth: Synthesizer,
    frameSize: number
  ) {
    this.node = context.createScriptProcessor(frameSize, 0, 2);
    this.node.addEventListener("audioprocess", this.handleAudioProcess);
  }

  get audioNode(): ScriptProcessorNode {
    return this.node;
  }

  attachSequencer(sequencer: ISequencer): void {
    this.sequencer = sequencer;
    this.latestSample = null;
  }

  getTickAtAudioTime(audioContextTime: number): number | null {
    const sample = this.latestSample;
    if (!sample || !Number.isFinite(audioContextTime)) return null;
    return (
      sample.sequencerTick +
      (audioContextTime - sample.audioContextTime) * 1000
    );
  }

  dispose(): void {
    this.node.removeEventListener("audioprocess", this.handleAudioProcess);
    this.node.disconnect();
    this.sequencer = null;
    this.latestSample = null;
  }

  private readonly handleAudioProcess = (event: AudioProcessingEvent): void => {
    this.synth.render(event.outputBuffer);
    const sequencer = this.sequencer;
    if (!sequencer) return;

    const audioContextTime =
      event.playbackTime + event.outputBuffer.duration;
    void sequencer.getTick().then((sequencerTick) => {
      if (this.sequencer !== sequencer || !Number.isFinite(sequencerTick)) {
        return;
      }
      this.latestSample = { sequencerTick, audioContextTime };
    });
  };
}

