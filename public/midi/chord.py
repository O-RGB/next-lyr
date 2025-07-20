from mido import MidiFile

midi_path = "/Users/digixtwo/Documents/Project/next-lyr/public/midi/MHY27.mid"

midi = MidiFile(midi_path)
chords = []

for i, track in enumerate(midi.tracks):
    abs_time = 0
    for msg in track:
        abs_time += msg.time
        if msg.type == 'marker':
            chords.append({
                "chord": msg.text.strip(),
                "tick": abs_time
            })

print("🎸 คอร์ดที่พบพร้อม tick:")
for chord in chords:
    print(chord)

# ถ้าอยากแปลงเป็น JSON:
import json
print("\n📦 JSON Output:")
print(json.dumps(chords, ensure_ascii=False, indent=2))
