import base64
import zlib

# 1. เปิดไฟล์ MIDI
with open("/Users/digixtwo/Documents/Project/next-lyr/public/midi/read-data-in-midi/T0001.mid", "rb") as f:
    midi_data = f.read()

# 2. หา Meta Event ที่มี "LyrHdr1"
text_marker = b"LyrHdr1"
pos = midi_data.find(text_marker)
if pos == -1:
    raise ValueError("ไม่พบ LyrHdr1 ในไฟล์ MIDI")

# 3. ดึงข้อมูลหลัง LyrHdr1 จนกว่าจะเจอ byte สิ้นสุดของข้อความ (0x00 หรือ 0xFF)
start = pos + len(text_marker)
end = midi_data.find(b'\x00', start)
if end == -1:
    end = len(midi_data)

raw_base64 = midi_data[start:end].decode('latin1')

# 4. ถอดรหัส Base64
compressed = base64.b64decode(raw_base64)

# 5. Decompress ด้วย zlib
try:
    decompressed = zlib.decompress(compressed)
    print("Decompressed Text (preview):", decompressed[:2000].decode('utf-8', errors='replace'))
except zlib.error as e:
    print("การ Decompress ล้มเหลว:", e)
