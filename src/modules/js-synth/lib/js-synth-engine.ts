import { Synthesizer as JsSynthesizer } from "js-synthesizer";
import { JsSynthPlayerEngine } from "./js-synth-player";
import { DEFAULT_SOUND_FONT } from "@/configs/value";

export class JsSynthEngine {
  public synth: JsSynthesizer | undefined;
  public audio: AudioContext | undefined;
  private node: AudioNode | undefined;
  public player: JsSynthPlayerEngine | undefined;

  constructor() {}

  public async startup(): Promise<void> {
    if (this.audio) {
      return;
    }

    try {
      const audioContext = new AudioContext();
      this.audio = audioContext;

      const synth = new JsSynthesizer();
      await synth.init(audioContext.sampleRate);
      this.synth = synth;

      const node = synth.createAudioNode(audioContext, 8192);
      node.connect(audioContext.destination);
      this.node = node;

      synth.setGain(0.3);

      this.player = new JsSynthPlayerEngine(synth, audioContext);

      const res = await fetch(DEFAULT_SOUND_FONT);
      const arraybuffer = await res.arrayBuffer();
      this.synth?.loadSFont(arraybuffer);
      console.info("JsSynthEngine started up successfully.");
    } catch (error) {
      console.error("Error during JsSynthEngine startup:", error);

      this.shutdown();
      throw error;
    }
  }

  public shutdown(): void {
    if (!this.audio) {
      return;
    }

    this.player?.destroy();
    this.node?.disconnect();

    if (this.audio.state !== "closed") {
      this.audio
        .close()
        .catch((e) => console.error("Error closing AudioContext:", e));
    }

    this.synth = undefined;
    this.audio = undefined;
    this.player = undefined;
    this.node = undefined;
    console.info("JsSynthEngine instance shut down.");
  }
}
