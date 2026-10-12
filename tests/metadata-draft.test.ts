import test from 'node:test';
import assert from 'node:assert/strict';
import { createMetadataDraft, normalizeSongMetadata, reconcileMetadataDraft, changedMetadataFields, importedMidiMetadata, METADATA_FIELD_KEYS } from '../src/lib/karaoke/metadata-draft';
import { getMissingRequiredSongInfo } from '../src/lib/karaoke/metadata-validation';
import { DEFAULT_SONG_INFO, type SongInfo } from '../src/lib/karaoke/midi/types';

test('empty numeric fields remain empty and clearing saves the empty string', () => {
  const base = normalizeSongMetadata({ TEMPO: '200', YEAR: '1999' });
  const empty = { ...base, TEMPO: '', YEAR: '' };
  assert.equal(normalizeSongMetadata(empty).TEMPO, '');
  assert.deepEqual(changedMetadataFields(base, empty), { TEMPO: '', YEAR: '' });
  assert.deepEqual(getMissingRequiredSongInfo({ ...empty, TITLE:'Song', ARTIST:'Artist' }), ['TEMPO']);
});
test('legacy numbers normalize to the same visible and validated strings', () => {
  const legacy = { TEMPO:200, YEAR:1999, TITLE:'Song', ARTIST:'Artist' } as unknown as SongInfo;
  const normalized = normalizeSongMetadata(legacy);
  assert.equal(normalized.TEMPO, '200');
  assert.equal(normalized.YEAR, '1999');
  assert.deepEqual(getMissingRequiredSongInfo(normalized), []);
  assert.deepEqual(changedMetadataFields(legacy, normalized), {});
});
test('every metadata field preserves pending edits while untouched fields refresh', () => {
  for (const key of METADATA_FIELD_KEYS) {
    const current = createMetadataDraft(DEFAULT_SONG_INFO);
    current.value = { ...current.value, [key]:'pending' };
    const incoming = { ...current.base, [key]:'external', COPYRIGHT:'updated' };
    const merged = reconcileMetadataDraft(current, incoming, false);
    assert.equal(merged.value[key], 'pending');
    assert.deepEqual(changedMetadataFields(incoming, merged.value), { [key]:'pending' });
    assert.equal(reconcileMetadataDraft(current, incoming, true).value[key], 'external');
    assert.equal(reconcileMetadataDraft(current, current.value, false), current);
  }
});
test('missing optional fields do not produce phantom changes on blur', () => {
  const partial = { TITLE:'Song', ARTIST:'Artist', TEMPO:'200' };
  assert.deepEqual(changedMetadataFields(partial, normalizeSongMetadata(partial)), {});
});
test('MIDI tempo fallback uses only that import and never overwrites an explicit value', () => {
  const blank = { ...DEFAULT_SONG_INFO, TEMPO:'' };
  assert.equal(importedMidiMetadata(blank, 180).TEMPO, '180');
  assert.equal(importedMidiMetadata({ ...blank, TEMPO:'160' }, 180).TEMPO, '160');
  for (const value of [undefined, NaN, Infinity, 0, -1]) assert.equal(importedMidiMetadata(blank, value).TEMPO, '');
});
