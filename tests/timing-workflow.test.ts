import test from "node:test";
import assert from "node:assert/strict";
import { useKaraokeStore } from "../src/stores/karaoke-store";
import { initialState } from "../src/stores/karaoke-store/configs";
import { usePlayerSetupStore } from "../src/hooks/usePlayerSetup";
import { usePlayerHandlersStore } from "../src/hooks/usePlayerHandlers";
import { useTimerStore } from "../src/timer-worker/store";
import { initHistory } from "../src/stores/karaoke-store/history";
import { snapshot } from "../src/stores/karaoke-store/actions/history.actions";
import { moveCellContent, cellsFromLine, insertCellAfter, replaceCellImage, IMAGE_TOKEN } from "../src/lib/karaoke/inline-content";
import { wordDataToLyricsDocument, lyricsDocumentToWordData, lyricsDocumentToEvents } from "../src/lib/karaoke/lyrics-core/timeline";
import { buildKlyrXml } from "../src/lib/karaoke/lyrics-core/xml";

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
test("an image can replace the content of a timed slot without moving that timestamp", async () => {
  setup([1,2,3,4]);
  const cells=cellsFromLine(state().lyricsData[0]);
  cells.push({key:"image",originalIndex:null,kind:"image",text:IMAGE_TOKEN,vocal:"",sticker});
  await state().actions.replaceLineWords(0,moveCellContent(cells,2,1));
  assert.deepEqual(state().lyricsData[0].map(w=>w.at),[1,2,null]);
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
  assert.equal(state().currentIndex, 1);
  assert.deepEqual([...state().timingBuffer!.buffer], before);
  assert.equal(state().lyricsData[0][1].sticker?.id, replacement.id);
  assert.equal(state().lyricsData[0][1].effect?.variant, "storm");
  state().actions.closeEditModal(); await handlers.handleResumeTiming();
  await stamp(2); await stamp(5); await stamp(7);
  assert.deepEqual(state().lyricsData.flat().map(word => word.at), [0, 2, 5, 7]);
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
