import os
import re
import io
import json
import struct
import zlib
from collections import defaultdict
from tqdm import tqdm
import numpy as np
import mido

# ==============================================================================
#  คลาสสำหรับถอดรหัส EMK
# ==============================================================================
class EMK:
    """
    คลาสสำหรับถอดรหัสข้อมูลจากไฟล์ EMK (Extreme Karaoke)
    """
    def __init__(self, data):
        if not data:
            raise ValueError("Input data cannot be empty.")

        self.data = bytearray(data)
        self.xor_key = np.frombuffer(bytes.fromhex("AFF24C9CE9EA9943"), dtype=np.uint8)
        self.magic = bytes.fromhex("2e53464453")

        self._decrypt_optimized()

        if self.data[:len(self.magic)] != self.magic:
            raise ValueError("Invalid EMK file or incorrect key.")

        header_pos = struct.unpack("<Q", self.data[0x22:0x2a])[0]
        header_end = struct.unpack("<Q", self.data[0x2a:0x32])[0]
        self.header = self.data[header_pos:header_end]
        self.off = 0
        self.midi_data = None
        self._extract_midi_data()

    def _decrypt_optimized(self):
        data_len = len(self.data)
        key_len = len(self.xor_key)
        if data_len == 0:
            return

        key_pattern = np.tile(self.xor_key, (data_len // key_len) + 1)[:data_len]
        data_array = np.frombuffer(self.data, dtype=np.uint8)
        decrypted_bytes = np.bitwise_xor(data_array, key_pattern).tobytes()
        self.data = bytearray(decrypted_bytes)

    def _read_tag(self):
        tag = self.header[self.off]
        self.off += 1
        if tag == 2:
            v = self.header[self.off]; self.off += 1
            return v
        elif tag == 3:
            v = struct.unpack("<H", self.header[self.off:self.off+2])[0]; self.off += 2
            return v
        elif tag == 4:
            v = struct.unpack("<I", self.header[self.off:self.off+4])[0]; self.off += 4
            return v
        elif tag == 6:
            length = self.header[self.off]; self.off += 1
            v_str = self.header[self.off:self.off+length].decode('cp874', errors='ignore')
            self.off += length
            return v_str
        else:
            raise ValueError(f"Unknown tag type in header: 0x{tag:x}")

    def _extract_midi_data(self):
        data_chunk_magic = bytes.fromhex("53464453")
        while self.off < len(self.header):
            if self.header[self.off:self.off + 4] != data_chunk_magic:
                break
            self.off += 4
            tag_name = self._read_tag()
            self._read_tag() # uncompressed_size
            self._read_tag()
            data_begin = self._read_tag()
            data_end = self._read_tag()
            self._read_tag(); self._read_tag()
            self.off += 0x10
            self._read_tag(); self._read_tag()
            if tag_name == "MIDI_DATA":
                try:
                    compressed_data = self.data[data_begin:data_end]
                    self.midi_data = zlib.decompress(compressed_data)
                except Exception:
                    self.midi_data = None
                return

# ==============================================================================
#  ฟังก์ชันตรวจ Lyrics Header
# ==============================================================================
def detect_lyr_header_from_data(midi_data):
    if not midi_data:
        return False, "ไม่มีข้อมูล MIDI"
    pattern = re.compile(rb'(K?LyrHdr\d*)', re.IGNORECASE)
    match = pattern.search(midi_data)
    if match:
        return True, match.group(0).decode('ascii', errors='ignore')
    return False, "ไม่พบ Header"

# ==============================================================================
#  ฟังก์ชันตรวจ Chords
# ==============================================================================
def detect_chords_from_midi_data(midi_data):
    if not midi_data:
        return False, []
    chords = []
    try:
        mid = mido.MidiFile(file=io.BytesIO(midi_data), clip=True)
    except Exception:
        return False, []
    for track in mid.tracks:
        current_tick = 0
        for msg in track:
            current_tick += msg.time
            if msg.is_meta and msg.type in ["text", "marker"]:
                text = msg.text.strip()
                if text and all(c.upper() in "ABCDEFG#BMAJMIN7SUSDIMAUG0123456789 /" for c in text):
                    chords.append({"chord": text, "tick": current_tick})
    return (len(chords) > 0, chords)

# ==============================================================================
#  ฟังก์ชันวิเคราะห์โฟลเดอร์
# ==============================================================================
def analyze_emk_files_in_folder(folder_path):
    analysis_results = []
    all_emk_files = []

    for dirpath, _, filenames in os.walk(folder_path):
        for filename in filenames:
            if filename.lower().endswith(".emk"):
                all_emk_files.append(os.path.join(dirpath, filename))

    if not all_emk_files:
        return None

    print(f"🚀 พบไฟล์ .emk ทั้งหมด {len(all_emk_files)} รายการ! เริ่มการตรวจสอบ...")
    for full_path in tqdm(all_emk_files, desc="🔎 ตรวจสอบไฟล์", unit="ไฟล์"):
        try:
            with open(full_path, "rb") as f:
                emk_binary_data = f.read()
            emk_file = EMK(emk_binary_data)

            # ตรวจ Lyrics
            # has_lyr, lyr_header = detect_lyr_header_from_data(emk_file.midi_data)

            # ตรวจ Chords
            has_chord, chord_list = detect_chords_from_midi_data(emk_file.midi_data)

            analysis_results.append({
                "file": full_path,
                # "lyr": has_lyr,
                # "lyr_header": lyr_header,
                "chord": has_chord,
                "chord_list": chord_list
            })

        except Exception as e:
            analysis_results.append({
                "file": full_path,
                "lyr": False,
                "lyr_header": f"❌ถอดรหัส EMK ไม่ได้: {str(e)}",
                "chord": False,
                "chord_list": []
            })

    return analysis_results

# ==============================================================================
#  ส่วนรันหลัก
# ==============================================================================
if __name__ == "__main__":
    folder_to_scan = "/Users/digixtwo/Desktop/karaoke_API/karaoke.env/final-app/eXtreme Karaoke 2025.6/eXtreme Karaoke 2025/Songs"

    if not os.path.isdir(folder_to_scan):
        print(f"❌ Error: ไม่พบโฟลเดอร์ '{folder_to_scan}'")
    else:
        results = analyze_emk_files_in_folder(folder_to_scan)
        if not results:
            print("ไม่พบไฟล์ .emk ในโฟลเดอร์ที่ระบุ")
        else:
            # บันทึกผลเป็น JSON
            json_path = "analysis_results.json"
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            print(f"\n✅ บันทึกผลการตรวจสอบลงใน {json_path} แล้ว!")
