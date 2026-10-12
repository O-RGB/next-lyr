import test from "node:test";
import assert from "node:assert/strict";
import { useKaraokeStore } from "../src/stores/karaoke-store";
import { initialState } from "../src/stores/karaoke-store/configs";
import { usePlayerSetupStore } from "../src/hooks/usePlayerSetup";
import { usePlayerHandlersStore } from "../src/hooks/usePlayerHandlers";
import { useTimerStore } from "../src/timer-worker/store";
import { initHistory } from "../src/stores/karaoke-store/history";
import { snapshot } from "../src/stores/karaoke-store/actions/history.actions";
import { moveCellContent, dropCellContent, cellsFromLine, insertCellAfter, replaceCellImage, IMAGE_TOKEN, type LyricCellDraft } from "../src/lib/karaoke/inline-content";
import { wordDataToLyricsDocument, lyricsDocumentToWordData, lyricsDocumentToEvents } from "../src/lib/karaoke/lyrics-core/timeline";
import { buildKlyrXml } from "../src/lib/karaoke/lyrics-core/xml";
import { hasCompleteLyricTiming } from "../src/lib/karaoke/utils";
import { processLyricsForPlayer } from "../src/stores/karaoke-store/utils";

const originalActions = useKaraokeStore.getState().actions;
const handlers = usePlayerHandlersStore.getState();
const eventTarget = new EventTarget();
Object.assign(globalThis, { window: eventTarget });
let position = 0;
let playing = false;
function setup(at: Array<number | null> = [null, null, null, null]) {
  playing = false; position = 0;
  const lyricsData = [
    [{ text: "หนึ่ง", index: 0, lineIndex: 0, at: at[0] }, { text: "ผิด", index: 1, lineIndex: 0, at: at[1] }],
    [{ text: "สาม", index: 2, lineIndex: 1, at: at[2] }, { text: "สี่", index: 3, lineIndex: 1, at: at[3] }],
  ];
  useKaraokeStore.setState({ ...initialState, lyricsData,
    actions: { ...originalActions, saveCurrentProject: async () => {}, saveTimingDraft: async () => {} },
  }, true);
  useKaraokeStore.getState().actions.syncLyricsDocument();
  useKaraokeStore.setState({ history: initHistory(snapshot(useKaraokeStore.getState()), "เริ่มงาน") });
  useTimerStore.setState({ worker: null });
  usePlayerSetupStore.setState({ playerControls: {
    play: () => { playing = true; useKaraokeStore.getState().actions.setIsPlaying(true); },
    pause: () => { playing = false; useKaraokeStore.getState().actions.setIsPlaying(false); },
    seek: (value) => { position = value; }, getCurrentTime: () => position, isPlaying: () => playing,
  } });
}
const state = () => useKaraokeStore.getState();
const stamp = async (at: number) => { position = at; await handlers.handleTimingForward(); };

test("word spacing survives saving, reopening, playback export and undo/redo", async () => {
  setup([0, 2, 3, 4]);
  const cells = cellsFromLine(state().lyricsData[0]);
  cells[0].text = " หนึ่ง  ";
  cells[1].text = " ผิด ";
  await state().actions.replaceLineWords(0, cells);
  const expected = [" หนึ่ง  ", " ผิด "];
  assert.deepEqual(cellsFromLine(state().lyricsData[0]).map(cell => cell.text), expected);
  assert.deepEqual(state().lyricsDocument!.lines[0].map(word => word.text), expected);
  assert.match(state().lyricsXml!, /<TEXT> หนึ่ง  <\/TEXT>/);
  assert.match(state().lyricsXml!, /<TEXT> ผิด <\/TEXT>/);
  assert.deepEqual(state().lyricsData.flat().map(word => word.at), [0, 2, 3, 4]);
  state().actions.undo();
  assert.deepEqual(state().lyricsData[0].map(word => word.text), ["หนึ่ง", "ผิด"]);
  state().actions.redo();
  assert.deepEqual(state().lyricsData[0].map(word => word.text), expected);
  assert.deepEqual(state().lyricsData.flat().map(word => word.at), [0, 2, 3, 4]);
});

test("adding a spacing block preserves existing timestamps and ignores an empty input", async () => {
  setup([0, 2, 3, 4]);
  await state().actions.addWord(0, "  ");
  await state().actions.addWord(0, " ต่อ ");
  await state().actions.addWord(0, "");
  assert.deepEqual(state().lyricsData[0].map(word => [word.text, word.at]),
    [["หนึ่ง", 0], ["ผิด", 2], ["  ", null], [" ต่อ ", null]]);
  assert.match(state().lyricsXml!, /<TEXT>  <\/TEXT>/);
  state().actions.undo();
  assert.deepEqual(state().lyricsData[0].map(word => word.text), ["หนึ่ง", "ผิด", "  "]);
  state().actions.redo();
  assert.deepEqual(state().lyricsData[0].map(word => word.text), ["หนึ่ง", "ผิด", "  ", " ต่อ "]);
  assert.deepEqual(state().lyricsData[1].map(word => word.at), [3, 4]);
});

test("spacing edits during the first timing pass retain captured stamps and resume at the next word", async () => {
  setup(); await handlers.handleContinueTiming(); await stamp(0);
  state().actions.selectLine(0); state().actions.openEditModal();
  const before = [...state().timingBuffer!.buffer];
  const cells = cellsFromLine(state().lyricsData[0]);
  cells[0].text = "หนึ่ง ";
  cells[1].text = "  ";
  await state().actions.replaceLineWords(0, cells);
  assert.equal(state().currentIndex, 1);
  assert.deepEqual([...state().timingBuffer!.buffer], before);
  state().actions.closeEditModal(); await handlers.handleResumeTiming();
  await stamp(2); await stamp(5); await stamp(7);
  assert.deepEqual(state().lyricsData.flat().map(word => word.at), [0, 2, 5, 7]);
  assert.deepEqual(state().lyricsData[0].map(word => word.text), ["หนึ่ง ", "  "]);
});

test("opening an effect group pauses stamping with its next target and recorded buffer intact", async () => {
  setup(); await handlers.handleContinueTiming(); await stamp(1);
  const before = state().timingBuffer;
  const next = state().currentIndex;
  state().actions.selectLine(0); state().actions.openEditModal([0, 1]);
  assert.equal(playing, false); assert.equal(state().currentIndex, next);
  assert.deepEqual(state().editEffectIndices, [0, 1]);
  assert.deepEqual([...state().timingBuffer!.buffer], [...before!.buffer]);
  state().actions.closeEditModal(); assert.equal(state().editEffectIndices, null);
});

test("pause, fix a typo during the first pass, and resume the next word without losing stamps", async () => {
  setup();
  await handlers.handleContinueTiming();
  await stamp(0); await stamp(2);
  state().actions.selectLine(0); state().actions.openEditModal();
  assert.equal(playing, false);
  await state().actions.replaceLineWords(0, [
    { originalIndex: 0, text: "หนึ่ง", vocal: "" }, { originalIndex: 1, text: "ถูก", vocal: "" },
  ]);
  state().actions.closeEditModal();
  await handlers.handleResumeTiming();
  assert.equal(position, 2);
  assert.equal(state().currentIndex, 2);
  await stamp(5); await stamp(7);
  assert.deepEqual(state().lyricsData.flat().map(w => [w.text, w.at]), [["หนึ่ง", 0], ["ถูก", 2], ["สาม", 5], ["สี่", 7]]);
  assert.equal(state().editingLineIndex, null);
});

test("resume a saved partial song, fill the gap, and keep the later completed word", async () => {
  setup([0, 2, null, 10]);
  await handlers.handleContinueTiming();
  assert.equal(state().currentIndex, 2);
  await stamp(6);
  assert.deepEqual(state().lyricsData.flat().map(w => w.at), [0, 2, 6, 10]);
  assert.equal(playing, false);
});

test("partial retiming preserves the rest of the line when the user stops early", async () => {
  setup([1, 2, 3, 4]);
  await handlers.handleRetiming(0, 0);
  await stamp(1.5);
  await state().actions.stopTiming();
  assert.deepEqual(state().lyricsData.flat().map(w => w.at), [1.5, 2, 3, 4]);
});

test("cancel rolls back timestamps and keeps the corrected spelling", async () => {
  setup([1, 2, 3, 4]);
  await handlers.handleRetiming(0, 0); await stamp(9);
  state().actions.openEditModal();
  await state().actions.replaceLineWords(0, [
    { originalIndex: 0, text: "แก้", vocal: "" }, { originalIndex: 1, text: "ผิด", vocal: "" },
  ]);
  state().actions.closeEditModal();
  await handlers.handleCancelRetiming();
  assert.equal(state().lyricsData[0][0].text, "แก้");
  assert.deepEqual(state().lyricsData.flat().map(w => w.at), [1, 2, 3, 4]);
});

test("insert a missed word, resume that word, and keep earlier captured timestamps", async () => {
  setup(); await handlers.handleContinueTiming(); await stamp(1); await stamp(2);
  state().actions.openEditModal();
  await state().actions.replaceLineWords(0, [
    { originalIndex: 0, text: "หนึ่ง", vocal: "" }, { originalIndex: 1, text: "ผิด", vocal: "" },
    { originalIndex: null, text: "เพิ่ม", vocal: "" },
  ]);
  state().actions.closeEditModal(); await handlers.handleResumeTiming();
  assert.equal(state().currentIndex, 2);
  await stamp(3); await stamp(4); await stamp(5);
  assert.deepEqual(state().lyricsData.flat().map(w => w.at), [1, 2, 3, 4, 5]);
});

test("backtracking discards every later draft timestamp and never mutates a previous buffer", async () => {
  setup(); await handlers.handleContinueTiming(); await stamp(1); await stamp(2); await stamp(3);
  const oldBuffer = state().timingBuffer!;
  state().actions.correctTimingStep(1);
  assert.equal(oldBuffer.buffer.get(1)?.at, 2);
  assert.equal(oldBuffer.buffer.get(2)?.at, 3);
  assert.equal(state().timingBuffer!.buffer.has(1), false);
  assert.equal(state().timingBuffer!.buffer.has(2), false);
  await stamp(8); await stamp(9); await stamp(10);
  assert.deepEqual(state().lyricsData.flat().map(w => w.at), [1, 8, 9, 10]);
});

test("a worker response arriving after Pause cannot stamp the next word", async () => {
  setup(); await handlers.handleContinueTiming();
  let resolve!: (value: any) => void;
  const getCurrentTiming = useTimerStore.getState().getCurrentTiming;
  useTimerStore.setState({ worker: {} as Worker, getCurrentTiming: () => new Promise(done => { resolve = done; }) });
  const pending = handlers.handleTimingForward();
  handlers.handlePauseTiming();
  resolve({ presentationValue: 7 });
  await pending;
  assert.equal(state().timingBuffer!.buffer.size, 0);
  useTimerStore.setState({ worker: null, getCurrentTiming });
});

test("a single-word line completes on its first tap", async () => {
  setup();
  useKaraokeStore.setState({ lyricsData: [[state().lyricsData[0][0]]] });
  await handlers.handleContinueTiming(); await stamp(1);
  assert.equal(state().lyricsData[0][0].at, 1);
  assert.equal(state().editingLineIndex, null);
});

test("deleting the pending gap does not accidentally retime the next saved word", async () => {
  setup([0, 2, null, 10]); await handlers.handleContinueTiming();
  await state().actions.replaceLineWords(1, [{ originalIndex: 3, text: "สี่", vocal: "" }]);
  await handlers.handleResumeTiming();
  assert.deepEqual(state().lyricsData.flat().map(w => w.at), [0, 2, 10]);
  assert.equal(state().editingLineIndex, null);
});

test("disconnected retiming groups never overwrite the lines between them", async () => {
  setup([1, 2, 3, 4]);
  useKaraokeStore.setState({ lyricsData: [...state().lyricsData,
    [{ text: "ห้า", at: 5, index: 4, lineIndex: 2 }]] });
  await handlers.handleRetimingLines([0, 2]);
  await stamp(6); await stamp(7); await stamp(8);
  assert.deepEqual(state().lyricsData.flat().map(w => w.at), [6, 7, 3, 4, 8]);
  assert.equal(state().editingLineIndex, null);
});

test("an empty retiming line ends safely without stamping an unrelated line", async () => {
  setup([1, 2, 3, 4]); await handlers.handleRetiming(0, 0);
  await state().actions.replaceLineWords(0, []);
  await handlers.handleResumeTiming();
  assert.deepEqual(state().lyricsData[1].map(w => w.at), [3, 4]);
  assert.equal(state().editingLineIndex, null);
});

test("inserting a new line while paused resumes its words and keeps the existing buffer", async () => {
  setup(); await handlers.handleContinueTiming(); await stamp(1); await stamp(2);
  handlers.handlePauseTiming();
  await state().actions.insertLineAfter(0, "แทรก|ใหม่");
  await handlers.handleResumeTiming();
  assert.equal(state().currentIndex, 2);
  await stamp(3); await stamp(4); await stamp(5); await stamp(6);
  assert.deepEqual(state().lyricsData.flat().map(w => w.at), [1, 2, 3, 4, 5, 6]);
});

test("cancel after inserting and deleting words retains the edits with the old timestamps", async () => {
  setup([1, 2, 3, 4]); await handlers.handleRetiming(0, 0); await stamp(9);
  await state().actions.replaceLineWords(0, [
    { originalIndex: 1, text: "แก้", vocal: "" }, { originalIndex: null, text: "ใหม่", vocal: "" },
  ]);
  await handlers.handleCancelRetiming();
  assert.deepEqual(state().lyricsData.flat().map(w => [w.text, w.at]), [["แก้", 2], ["ใหม่", null], ["สาม", 3], ["สี่", 4]]);
});

const sticker = { id: "fixture-image", name: "fixture.png", mime: "image/png", width:24,
  height:24, bytes:100, originalBytes:200, position:"before" as const };



test("an untimed decoration does not turn a completed imported song into a retiming session", async () => {
  setup([0, 480, 1920, 2400]);
  const cells = insertCellAfter(cellsFromLine(state().lyricsData[0]),
    { key: "new-image", originalIndex: null, kind: "image", text: IMAGE_TOKEN, vocal: "", sticker }, "slot-0");
  await state().actions.replaceLineWords(0, cells);
  assert.equal(hasCompleteLyricTiming(state().lyricsData), true);
  await handlers.handleContinueTiming();
  assert.equal(playing, false);
  assert.equal(state().editingLineIndex, null);
  assert.equal(state().timingLineGroups, null);
  assert.equal(state().lineSelectionMode, false);
  assert.deepEqual(state().lyricsData.flat().map(word => word.at), [0, null, 480, 1920, 2400]);
});

test("MIDI preview retains every decorated line and its original text timing at any image position", () => {
  setup([0, 480, 1920, 2400]);
  const original = state().lyricsData;
  const midi = { ticksPerBeat: 480 } as NonNullable<typeof initialState.playerState.midi>;
  const baseline = processLyricsForPlayer(original.flat(), "midi", midi)!;
  for (const position of [0, 1, 2]) {
    const decorated = original.map(line => [...line]);
    decorated[0].splice(position, 0, { text: IMAGE_TOKEN, kind: "image", sticker, at: null, index: -1, lineIndex: 0 });
    const timeline = processLyricsForPlayer(decorated.flat(), "midi", midi)!;
    assert.deepEqual(timeline.ranges.map(range => range.key), baseline.ranges.map(range => range.key));
    assert.deepEqual(timeline.ranges.map(range => range.value.value.text), baseline.ranges.map(range => range.value.value.text));
    assert.equal(timeline.ranges[0].value.value.words![position].sticker?.id, sticker.id);
    assert.equal(timeline.search(240)?.lyrics.value.lineIndex, 0);
    assert.equal(timeline.search(2000)?.lyrics.value.lineIndex, 1);
    assert.deepEqual(decorated[0].filter(word => word.kind !== "image").map(word => word.at), [0, 480]);
  }
});

test("moving an image before lyrics never steals their stamps, including after effect removal", async () => {
  setup([0, 480, 1920, 2400]);
  useKaraokeStore.setState({mode:"midi",playerState:{...initialState.playerState,midi:{ticksPerBeat:480} as NonNullable<typeof initialState.playerState.midi>}});
  const cells=[...cellsFromLine(state().lyricsData[0]),{key:"new-image",originalIndex:null,kind:"image" as const,text:IMAGE_TOKEN,vocal:"",sticker}];
  await state().actions.replaceLineWords(0,moveCellContent(cells,2,0));
  const expected=state().lyricsData[0].map(word=>word.text);
  assert.deepEqual(state().lyricsData[0].map(word=>word.at),[null,0,480]);
  assert.deepEqual(state().lyricsProcessed!.ranges[0].value.value.words!.map(word=>word.text),expected);
  await state().actions.replaceLineWords(0,cellsFromLine(state().lyricsData[0]).map(cell=>({...cell,effect:{type:"fire" as const,connected:true}})));
  await state().actions.replaceLineWords(0,cellsFromLine(state().lyricsData[0]).map(cell=>({...cell,effect:undefined})));
  await state().actions.deleteWord(0);
  assert.deepEqual(state().lyricsData[0].map(word=>[word.text,word.at]),[["หนึ่ง",0],["ผิด",480]]);
  assert.deepEqual(state().lyricsProcessed!.ranges[0].value.value.words!.map(word=>word.text),["หนึ่ง","ผิด"]);
  state().actions.undo();
  assert.deepEqual(state().lyricsProcessed!.ranges[0].value.value.words!.map(word=>word.text),expected);
  state().actions.redo();
  assert.deepEqual(state().lyricsProcessed!.ranges[0].value.value.words!.map(word=>word.text),["หนึ่ง","ผิด"]);
});

test("a line with no remaining timestamp still stays in the display timeline without inventing a stamp", async () => {
  setup([null,480,1920,2400]);
  const original=state().lyricsData;
  useKaraokeStore.setState({mode:"midi",playerState:{...initialState.playerState,midi:{ticksPerBeat:480} as NonNullable<typeof initialState.playerState.midi>},lyricsData:[[original[0][0]],original[1]]});
  const cells=[...cellsFromLine(state().lyricsData[0]),{key:"new-image",originalIndex:null,kind:"image" as const,text:IMAGE_TOKEN,vocal:"",sticker}];
  await state().actions.replaceLineWords(0,moveCellContent(cells,1,0));
  await state().actions.deleteWord(0);
  assert.equal(state().lyricsData[0][0].at,null);
  assert.deepEqual(state().lyricsProcessed!.ranges.map(range=>range.value.value.lineIndex),[0,1]);
  assert.equal(state().lyricsProcessed!.ranges[0].value.value.words![0].text,"หนึ่ง");
  assert.equal(state().lyricsProcessed!.search(2000)?.lyrics.value.lineIndex,1);
});

test("a sticker follows its original line when a new line is inserted before it", async () => {
  setup([1,2,3,4]);
  useKaraokeStore.setState({ lineStickers:{1:sticker} });
  await state().actions.insertLineAfter(0,"ใหม่");
  assert.equal(state().lineStickers[2].id,sticker.id);
  assert.equal(state().lineStickers[1],undefined);
});

test("delete only the selected line's sticker and move later stickers with their lyrics", async () => {
  setup([1,2,3,4]);
  useKaraokeStore.setState({ lineStickers:{0:{...sticker,id:"deleted"},1:sticker} });
  await state().actions.deleteLine(0);
  assert.deepEqual(state().lineStickers,{0:sticker});
});

test("an empty line retains its sticker across an insertion", async () => {
  setup();
  useKaraokeStore.setState({ lyricsData:[[],state().lyricsData[1]],lineStickers:{0:sticker} });
  await state().actions.insertLineAfter(-1,"ใหม่");
  assert.equal(state().lineStickers[1].id,sticker.id);
});

test("save a sticker mid-timing without losing the next target or timestamps", async () => {
  setup(); await handlers.handleContinueTiming(); await stamp(1);
  await state().actions.replaceLineWords(0,[
    {originalIndex:0,text:"หนึ่ง",vocal:""},{originalIndex:1,text:"ผิด",vocal:""},
  ],sticker);
  assert.equal(state().currentIndex,1);
  assert.equal(state().timingBuffer!.buffer.get(0)?.at,1);
  assert.equal(state().lineStickers[0].id,sticker.id);
  await handlers.handleCancelRetiming();
  assert.equal(state().lineStickers[0].id,sticker.id);
});

test("sticker-only edits participate in the same undo and redo history", async () => {
  setup();
  await state().actions.replaceLineWords(0,[
    {originalIndex:0,text:"หนึ่ง",vocal:""},{originalIndex:1,text:"ผิด",vocal:""},
  ],sticker);
  state().actions.undo();
  assert.deepEqual(state().lineStickers,{});
  state().actions.redo();
  assert.equal(state().lineStickers[0].id,sticker.id);
});

test("dragging timed text changes content only, leaving every timestamp in its slot", async () => {
  setup([1,2,3,4]);
  const cells=moveCellContent(cellsFromLine(state().lyricsData[0]),1,0);
  await state().actions.replaceLineWords(0,cells);
  assert.deepEqual(state().lyricsData[0].map(w=>w.text),["ผิด","หนึ่ง"]);
  assert.deepEqual(state().lyricsData.flat().map(w=>w.at),[1,2,3,4]);
});
test("reordering during a timing pass leaves the recorded buffer and next slot untouched", async () => {
  setup();await handlers.handleContinueTiming();await stamp(1);
  await state().actions.replaceLineWords(0,moveCellContent(cellsFromLine(state().lyricsData[0]),1,0));
  assert.equal(state().currentIndex,1);
  assert.equal(state().timingBuffer!.buffer.get(0)?.at,1);
  await state().actions.stopTiming();
  assert.deepEqual(state().lyricsData[0].map(w=>[w.text,w.at]),[["ผิด",1],["หนึ่ง",null]]);
});
test("an image moved between timed words remains decorative and preserves both stamps", async () => {
  setup([1,2,3,4]);
  const cells=cellsFromLine(state().lyricsData[0]);
  cells.push({key:"image",originalIndex:null,kind:"image",text:IMAGE_TOKEN,vocal:"",sticker});
  await state().actions.replaceLineWords(0,moveCellContent(cells,2,1));
  assert.deepEqual(state().lyricsData[0].map(w=>w.at),[1,null,2]);
  assert.equal(state().lyricsData[0][1].kind,"image");
  assert.equal(state().lyricsData[0][1].sticker?.id,sticker.id);
  assert.deepEqual(state().lyricsData[1].map(w=>w.at),[3,4]);
});
test("workspace documents retain arbitrary image cells; text exports contain no image markers", () => {
  setup([1,2,3,4]);
  const image={kind:"image" as const,text:IMAGE_TOKEN,sticker,at:1.5,index:1,lineIndex:0};
  const data=[[state().lyricsData[0][0],image,state().lyricsData[0][1]]];
  const doc=wordDataToLyricsDocument({lyricsData:data,source:"LYRIC_EDITOR",timeBase:{kind:"seconds"},info:{}});
  assert.equal(lyricsDocumentToWordData(doc,0)[0][1].sticker?.id,sticker.id);
  assert.deepEqual(lyricsDocumentToEvents(doc)[0].map(w=>w.text),["หนึ่ง","ผิด"]);
  assert.equal(buildKlyrXml(doc).includes(IMAGE_TOKEN),false);
});

test("effect-only edits mid-timing preserve the recorded buffer and next pending slot", async () => {
  setup(); await handlers.handleContinueTiming(); await stamp(0); state().actions.selectLine(0); state().actions.openEditModal();
  const cells = cellsFromLine(state().lyricsData[0]).map(cell => ({...cell,effect:{type:'fire' as const,connected:true}}));
  state().actions.replaceLineWords(0,cells);
  assert.equal(state().timingBuffer?.buffer.get(0)?.at,0);assert.equal(state().currentIndex,1);
  assert.deepEqual(state().lyricsDocument?.lines[0].map(w=>w.effect?.type),['fire','fire']);
  state().actions.closeEditModal();await handlers.handleResumeTiming();await stamp(2);await stamp(5);await stamp(7);
  assert.deepEqual(state().lyricsData.flat().map(w=>w.at),[0,2,5,7]);assert.equal(state().lyricsData[0][0].effect?.type,'fire');
});

test("effect-only saves participate in undo and redo without changing timestamps", () => {
  setup([1,2,3,4]);const cells=cellsFromLine(state().lyricsData[0]);
  cells[0].effect={type:'fire',connected:false};state().actions.replaceLineWords(0,cells);
  assert.equal(state().lyricsData[0][0].effect?.type,'fire');state().actions.undo();assert.equal(state().lyricsData[0][0].effect,undefined);
  state().actions.redo();assert.equal(state().lyricsData[0][0].effect?.connected,false);assert.deepEqual(state().lyricsData.flat().map(w=>w.at),[1,2,3,4]);
});

test("removing an effect clears it instead of inheriting the destination slot's effect", () => {
  setup([1,2,3,4]);state().actions.replaceLineWords(0,cellsFromLine(state().lyricsData[0]).map(c=>({...c,effect:{type:'lightning' as const,connected:true}})));
  state().actions.replaceLineWords(0,cellsFromLine(state().lyricsData[0]).map(c=>({...c,effect:undefined})));
  assert(state().lyricsData[0].every(w=>!w.effect));assert.deepEqual(state().lyricsData.flat().map(w=>w.at),[1,2,3,4]);
});

test("drawer image replacement during the first timing pass keeps its effect, next slot and captured timestamp zero", async () => {
  setup();
  const cells = cellsFromLine(state().lyricsData[0]);
  cells[1] = { ...cells[1], kind: "image", text: IMAGE_TOKEN, sticker,
    effect: { type: "rain", connected: true, variant: "storm" } };
  state().actions.replaceLineWords(0, cells);
  await handlers.handleContinueTiming(); await stamp(0);
  state().actions.selectLine(0); state().actions.openEditModal();
  const replacement = { ...sticker, id: "replacement", name: "replacement.png" };
  const before = [...state().timingBuffer!.buffer];
  state().actions.replaceLineWords(0, replaceCellImage(cellsFromLine(state().lyricsData[0]), "slot-1", replacement));
  assert.equal(state().currentIndex, 2);
  assert.deepEqual([...state().timingBuffer!.buffer], before);
  assert.equal(state().lyricsData[0][1].sticker?.id, replacement.id);
  assert.equal(state().lyricsData[0][1].effect?.variant, "storm");
  state().actions.closeEditModal(); await handlers.handleResumeTiming();
  await stamp(2); await stamp(5); await stamp(7);
  assert.deepEqual(state().lyricsData.flat().map(word => word.at), [0, null, 2, 5]);
  assert.equal(state().lyricsData[0][1].sticker?.id, replacement.id);
});

test("drawer insertion follows its captured block after a reorder while existing timing slots stay fixed", () => {
  setup([0, 2, 5, 7]);
  const initial = cellsFromLine(state().lyricsData[0]), capturedKey = initial[0].key;
  const reordered = moveCellContent(initial, 0, 1);
  const next = insertCellAfter(reordered, { key: "drawer-word", originalIndex: null, kind: "text", text: "ใหม่", vocal: "MAI" }, capturedKey);
  state().actions.replaceLineWords(0, next);
  assert.deepEqual(state().lyricsData[0].map(word => [word.text, word.at]), [["ผิด", 0], ["หนึ่ง", 2], ["ใหม่", null]]);
  assert.deepEqual(state().lyricsData[1].map(word => word.at), [5, 7]);
  state().actions.undo(); assert.deepEqual(state().lyricsData.flat().map(word => word.at), [0, 2, 5, 7]);
  state().actions.redo(); assert.equal(state().lyricsData[0][2].vocal, "MAI");
});

test("images inserted before the first pass never need a right-arrow stamp", async()=>{
  setup();
  const cells=cellsFromLine(state().lyricsData[0]);
  const image=(key:string)=>({key,originalIndex:null,kind:"image" as const,text:IMAGE_TOKEN,vocal:"",sticker});
  await state().actions.replaceLineWords(0,[image("front"),cells[0],image("middle"),cells[1],image("end")]);
  await handlers.handleContinueTiming();
  assert.equal(state().currentIndex,1);
  for(const at of [0,2,5,7]) await stamp(at);
  assert.deepEqual(state().lyricsData.flat().filter(w=>w.kind!=="image").map(w=>w.at),[0,2,5,7]);
  assert(state().lyricsData.flat().filter(w=>w.kind==="image").every(w=>w.at===null));
  assert.equal(state().editingLineIndex,null);
});
test("adding or moving an image during a paused pass does not rewind its next word",async()=>{
  setup();await handlers.handleContinueTiming();await stamp(0);handlers.handlePauseTiming();
  const cells=cellsFromLine(state().lyricsData[0]);
  cells.push({key:"image",originalIndex:null,kind:"image",text:IMAGE_TOKEN,vocal:"",sticker});
  await state().actions.replaceLineWords(0,moveCellContent(cells,2,0));
  assert.equal(state().currentIndex,2);
  assert.equal(state().timingBuffer?.buffer.get(1)?.at,0);
  await handlers.handleResumeTiming();for(const at of [2,5,7]) await stamp(at);
  assert.deepEqual(state().lyricsData.flat().map(w=>w.at),[null,0,2,5,7]);
});
test("backtracking skips decorative images and corrects the preceding word",async()=>{
  setup();const cells=cellsFromLine(state().lyricsData[0]);
  await state().actions.replaceLineWords(0,[cells[0],{key:"image",originalIndex:null,kind:"image",text:IMAGE_TOKEN,vocal:"",sticker},cells[1]]);
  await handlers.handleContinueTiming();await stamp(0);
  assert.equal(state().currentIndex,2);
  await handlers.handleTimingBackward();assert.equal(state().currentIndex,0);
  assert(!state().timingBuffer?.buffer.has(1));
  for(const at of [1,2,5,7])await stamp(at);
  assert.deepEqual(state().lyricsData.flat().map(w=>w.at),[1,null,2,5,7]);
});
test("image-only lines are retained as decorations and cannot start retiming",async()=>{
  setup([0,2,3,4]);await state().actions.replaceLineWords(0,[{originalIndex:null,kind:"image",text:IMAGE_TOKEN,vocal:"",sticker}]);
  assert.equal(state().actions.startTimingFromLines([0]).success,false);
  assert.equal(state().actions.startTimingFromWord(0).success,false);
  assert.equal(hasCompleteLyricTiming(state().lyricsData),true);
});
test("dragging an image into a storm group saves the preset and text times through undo/redo",async()=>{
  setup([0,2,3,4]);const effect={type:"rain" as const,variant:"storm" as const,connected:true};
  const cells: LyricCellDraft[]=cellsFromLine(state().lyricsData[0]).map(c=>({...c,effect}));
  cells.push({key:"image",originalIndex:null,kind:"image",text:IMAGE_TOKEN,vocal:"",sticker});
  await state().actions.replaceLineWords(0,dropCellContent(cells,2,1,effect));
  assert.deepEqual(state().lyricsData[0].map(w=>w.at),[0,null,2]);
  assert(state().lyricsData[0].every(w=>w.effect?.variant==="storm"));
  state().actions.undo();assert.equal(state().lyricsData[0].length,2);
  state().actions.redo();assert.equal(state().lyricsData[0][1].sticker?.id,sticker.id);
  assert.deepEqual(state().lyricsData[0].map(w=>w.at),[0,null,2]);
});

test("opening Edit Lyrics exits batch selection and rejects delayed background selection",async()=>{
  setup([0,2,3,4]);state().actions.setLineSelectionMode(true);state().actions.selectAllLines();
  state().actions.openEditModal();
  state().actions.setLineSelectionMode(true);state().actions.toggleLineSelection(0);state().actions.selectLineRange(1);state().actions.selectAllLines();
  await state().actions.replaceLineWords(0,cellsFromLine(state().lyricsData[0]).map(c=>({...c,text:c.text+" "})));
  state().actions.closeEditModal();
  assert.equal(state().lineSelectionMode,false);assert.deepEqual(state().selectedLineIndices,[]);
  assert.equal(state().lineSelectionAnchor,null);assert.equal(state().editingLineIndex,null);
});

test("playing a line decorated at its beginning starts from its first lyric, never from the image",async()=>{
  setup([2,4,6,8]);const cells=cellsFromLine(state().lyricsData[0]);
  await state().actions.replaceLineWords(0,[{key:"image",originalIndex:null,kind:"image",text:IMAGE_TOKEN,vocal:"",sticker},...cells]);
  state().actions.selectLine(0);await handlers.handlePlayPause();
  assert.equal(position,2);assert.equal(state().playbackIndex,1);
  assert.equal(state().lyricsData[0][0].at,null);
});

test("a newly added word joins and leaves a group without losing text or timing across save and history",async()=>{
  setup([0,480,1920,2400]);const effect={type:"fire" as const,connected:true};
  useKaraokeStore.setState({mode:"midi",playerState:{...initialState.playerState,midi:{ticksPerBeat:480} as NonNullable<typeof initialState.playerState.midi>}});
  const initial=cellsFromLine(state().lyricsData[0]).map(c=>({...c,effect}));
  const cells:LyricCellDraft[]=[...initial,{key:"new",originalIndex:null,kind:"text",text:"ใหม่",vocal:"MAI"}];
  await state().actions.replaceLineWords(0,dropCellContent(cells,2,2,effect));
  assert(state().lyricsData[0].every(w=>w.effect?.type==="fire"));
  const joined=cellsFromLine(state().lyricsData[0]);
  await state().actions.replaceLineWords(0,dropCellContent(joined,2,2));
  assert.deepEqual(state().lyricsData[0].map(w=>[w.text,w.at,w.effect?.type]),[["หนึ่ง",0,"fire"],["ผิด",480,"fire"],["ใหม่",null,undefined]]);
  assert.equal(state().lyricsDocument?.lines[0][2].effect,undefined);
  assert.deepEqual(state().lyricsProcessed?.ranges[0].value.value.words?.map(w=>w.text),["หนึ่ง","ผิด","ใหม่"]);
  state().actions.undo();assert.equal(state().lyricsData[0][2].effect?.type,"fire");
  state().actions.redo();assert.equal(state().lyricsData[0][2].effect,undefined);
  assert.deepEqual(state().lyricsData.flat().map(w=>w.at),[0,480,null,1920,2400]);
});

test("Shift-click enters line selection from the focused line without moving playback or changing timing",()=>{
 setup([0,2,3,4]);state().actions.selectLine(0);
 state().actions.toggleLineSelection(1,true);
 assert.equal(state().lineSelectionMode,true);
 assert.deepEqual(state().selectedLineIndices,[0,1]);
 assert.equal(state().lineSelectionAnchor,0);
 assert.equal(position,0);assert.equal(playing,false);
 assert.deepEqual(state().lyricsData.flat().map(word=>word.at),[0,2,3,4]);
});

test("repeated Shift-click expands, shrinks and reverses a range from its original anchor",()=>{
 setup();useKaraokeStore.setState({lyricsData:Array.from({length:8},(_,index)=>[{text:`line ${index}`,at:index*480,index,lineIndex:index}])});
 state().actions.selectLine(2);state().actions.toggleLineSelection(6,true);
 assert.deepEqual(state().selectedLineIndices,[2,3,4,5,6]);
 state().actions.toggleLineSelection(4,true);assert.deepEqual(state().selectedLineIndices,[2,3,4]);
 state().actions.toggleLineSelection(0,true);assert.deepEqual(state().selectedLineIndices,[0,1,2]);
 assert.equal(state().lineSelectionAnchor,2);
 state().actions.toggleLineSelection(6);assert.equal(state().lineSelectionAnchor,6);
 state().actions.toggleLineSelection(5,true);assert.deepEqual(state().selectedLineIndices,[5,6]);
});

test("Shift selection stays inert while playing, stamping, paused retiming or editing a modal",()=>{
 for(const blocked of [{isPlaying:true},{isTimingActive:true},{editingLineIndex:0},{isEditModalOpen:true},{isAddModalOpen:true}]){
  setup([0,2,3,4]);useKaraokeStore.setState(blocked);
  state().actions.toggleLineSelection(1,true);
  assert.equal(state().lineSelectionMode,false);assert.deepEqual(state().selectedLineIndices,[]);
  assert.deepEqual(state().lyricsData.flat().map(word=>word.at),[0,2,3,4]);
 }
});

test("normal clicks cannot start batch selection after saving and closing Edit Lyrics",async()=>{
 setup([0,2,3,4]);state().actions.selectLine(0);state().actions.openEditModal();
 await state().actions.replaceLineWords(0,cellsFromLine(state().lyricsData[0]));
 state().actions.closeEditModal();state().actions.toggleLineSelection(1);
 assert.equal(state().lineSelectionMode,false);assert.deepEqual(state().selectedLineIndices,[]);
 state().actions.toggleLineSelection(1,true);assert.deepEqual(state().selectedLineIndices,[0,1]);
});
