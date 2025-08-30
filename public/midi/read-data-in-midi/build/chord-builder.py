import mido


midi_path = "/Users/digixtwo/Documents/Project/next-lyr/public/midi/read-data-in-midi/build/MHY27_edited.mid"
output_midi_path = "/Users/digixtwo/Documents/Project/next-lyr/public/midi/read-data-in-midi/build/MHY27_edited.mid"
 
new_chords = [
    {'chord': 'G', 'tick': 480},
    {'chord': 'G', 'tick': 960},
    {'chord': 'Am', 'tick': 1440},
    {'chord': 'F', 'tick': 1920},
    {'chord': 'C', 'tick': 2000}
]

# 3. โหลดไฟล์ MIDI ต้นฉบับ
try:
    midi = mido.MidiFile(midi_path)
except FileNotFoundError:
    print(f"Error: ไม่พบไฟล์ที่ {midi_path}")
    exit()

# 4. สร้าง Track ใหม่สำหรับคอร์ดเท่านั้น
# เรียงลำดับคอร์ดตาม tick ก่อน เพื่อให้คำนวณ delta time ถูกต้อง
new_chords.sort(key=lambda c: c['tick'])

chord_track = mido.MidiTrack()
last_tick = 0
for chord_info in new_chords:
    # คำนวณ delta time จาก absolute tick
    current_tick = chord_info['tick']
    delta_time = current_tick - last_tick
    
    chord_track.append(mido.MetaMessage('marker', text=chord_info['chord'].strip(), time=delta_time))
    
    last_tick = current_tick

# 5. สร้างลิสต์ของ Track ใหม่ โดยลบ Marker เก่าทิ้ง
final_tracks = []
for track in midi.tracks:
    new_track = mido.MidiTrack()
    time_accumulator = 0
    for msg in track:
        # ถ้าไม่ใช่ marker ให้เก็บไว้
        if msg.type != 'marker':
            # รวม delta time ของ marker ที่ถูกลบไปก่อนหน้า เข้ากับ message ปัจจุบัน
            msg.time += time_accumulator
            new_track.append(msg)
            time_accumulator = 0 # รีเซ็ตค่า
        else:
            # ถ้าเป็น marker ให้เก็บค่า time ไว้เพื่อบวกให้กับ message ถัดไป
            time_accumulator += msg.time
    
    # เพิ่มเฉพาะ track ที่มีข้อมูลอยู่
    if len(new_track) > 0:
        final_tracks.append(new_track)

# 6. เพิ่ม Track คอร์ดใหม่ที่เราสร้างไว้
final_tracks.append(chord_track)

# 7. สร้างไฟล์ MIDI ใหม่และบันทึก
output_midi = mido.MidiFile(ticks_per_beat=midi.ticks_per_beat)
output_midi.tracks = final_tracks
output_midi.save(output_midi_path)

print(f"✅ สร้างไฟล์ MIDI ใหม่พร้อมคอร์ดที่อัปเดตแล้วที่: {output_midi_path}")