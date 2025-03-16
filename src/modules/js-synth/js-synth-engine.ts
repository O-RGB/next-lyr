import { Synthesizer as JsSynthesizer } from "js-synthesizer";
import { JsSynthPlayerEngine } from "./js-synth-player";
import { DEFAULT_SOUND_FONT } from "@/configs/value";

export class JsSynthEngine {
  public synth: JsSynthesizer | undefined;
  public audio: AudioContext | undefined;
  public player: JsSynthPlayerEngine | undefined;
  public preset: number[] = [];
  public analysers: AnalyserNode[] = [];
  public soundfontName: string | undefined;
  public soundfontFile: File | undefined;
  public bassLocked: number | undefined = undefined;

  async startup() {
    const audioContext = new AudioContext();

    const { Synthesizer } = await import("js-synthesizer");
    const synth = new Synthesizer();
    synth.init(audioContext.sampleRate);

    const node = synth.createAudioNode(audioContext, 8192);
    node.connect(audioContext.destination);

    synth.setGain(0.3);

    this.synth = synth;
    this.audio = audioContext;

    this.player = new JsSynthPlayerEngine(synth);
    await this.loadDefaultSoundFont();
  }

  async loadPresetSoundFont(sfId?: number) {
    if (!sfId) {
      return [];
    }
    this.synth?.getSFontObject(sfId)?.getPresetIterable();
  }

  async loadDefaultSoundFont() {
    let arraybuffer: ArrayBuffer | undefined = undefined;
    if (this.soundfontFile) {
      arraybuffer = await this.soundfontFile.arrayBuffer();
    } else {
      const res = await fetch(DEFAULT_SOUND_FONT);
      arraybuffer = await res.arrayBuffer();

      const blob = new Blob([arraybuffer], {
        type: "application/octet-stream",
      });
      const fileBlob = new File([blob], "soundfont.sf2", {
        type: "application/octet-stream",
      });
      this.soundfontFile = fileBlob;
    }

    const sfId = await this.synth?.loadSFont(arraybuffer);
    this.soundfontName = "Default Soundfont sf2";

    this.loadPresetSoundFont(sfId);
  }

  async setSoundFont(file: File) {
    const bf = await file.arrayBuffer();
    try {
      const sfId = await this.synth?.loadSFont(bf);
      this.soundfontName = file.name;
      this.loadPresetSoundFont(sfId);
      return true;
    } catch (error) {
      return false;
    }
  }
}
