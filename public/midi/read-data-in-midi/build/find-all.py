import os
import re
import zlib
import base64
import xml.etree.ElementTree as ET
import mido
from tqdm import tqdm  # ติดตั้งด้วย pip install tqdm

THAI_ENCODING = "tis-620"
SONG_ROOT_NAME = "Song"
INFO_FIELDS = [
    "VERSION", "SOURCE", "CHARSET", "TIME_FORMAT", "TITLE", "KEY", "TEMPO",
    "ALBUM", "ARTIST", "ARTIST_TYPE", "AUTHOR", "GENRE", "RHYTHM",
    "CREATOR", "COMPANY", "LANGUAGE", "YEAR", "VOCAL_CHANNEL", "LYRIC_TITLE"
]


def shorten_path(full_path, keyword="Song"):
    parts = full_path.split(os.sep)
    try:
        start_index = parts.index(keyword)
        return os.path.join(*parts[start_index:])
    except ValueError:
        return full_path


# -----------------------------
# ฟังก์ชันตรวจ header แบบยืดหยุ่น
# -----------------------------
def detect_flexible_lyr_header(midi_data):
    """
    ตรวจสอบ header ของ lyrics ใน MIDI data
    โดยยอมรับ pattern ที่มีความยืดหยุ่น เช่น KLyrHdr1, LyrHdr2, LyrHdr เป็นต้น
    """
    pattern = re.compile(rb'(K?LyrHdr\d*)', re.IGNORECASE)
    match = pattern.search(midi_data)
    if match:
        return match.group(0).decode('ascii', errors='ignore')
    return "Unknown"


def detect_lyr_header(file_path):
    try:
        with open(file_path, "rb") as f:
            midi_data = f.read()
    except Exception:
        return "❌ ไม่สามารถอ่านไฟล์"

    return detect_flexible_lyr_header(midi_data)


# -----------------------------
# ฟังก์ชันหาคำร้อง (lyrics)
# -----------------------------
def find_and_parse_lyrics(file_path):
    try:
        with open(file_path, "rb") as f:
            midi_data = f.read()
    except Exception:
        return None

    # ใช้ regex จับ payload หลัง header ที่ยืดหยุ่น
    pattern = re.compile(rb'\xFF\x01.*?(K?LyrHdr\d*)(.*?)\x00', re.DOTALL | re.IGNORECASE)
    match = pattern.search(midi_data)
    if not match:
        return None

    try:
        encoded_payload = match.group(2)
        decompressed_data = zlib.decompress(base64.b64decode(encoded_payload))
        lyrics_xml = decompressed_data.decode(THAI_ENCODING, errors="ignore")
        return parse_xml_lyrics(lyrics_xml)
    except Exception:
        return None


def parse_xml_lyrics(xml_text):
    results = []
    try:
        root = ET.fromstring(xml_text)
    except Exception:
        return []
    for line in root.findall(".//LINE"):
        for word in line.findall(".//WORD"):
            text_elem = word.find("TEXT")
            time_elem = word.find("TIME")
            if text_elem is not None and time_elem is not None:
                text = text_elem.text.strip() if text_elem.text else ""
                time = int(time_elem.text)
                if text:
                    results.append({"name": text, "tick": time})
    return results


# -----------------------------
# ฟังก์ชันหาคอร์ด
# -----------------------------
def extract_chords(file_path):
    try:
        mid = mido.MidiFile(file_path, clip=True)
    except (OSError, EOFError, ValueError) as e:
        print(f"⚠️ ข้ามไฟล์เสีย: {shorten_path(file_path)} ({e})")
        return []

    chords = []
    for track in mid.tracks:
        current_tick = 0
        for msg in track:
            current_tick += msg.time
            if msg.is_meta and msg.type in ["text", "marker"]:
                text = msg.text.strip()
                if text and all(c.upper() in "ABCDEFG#bMAJMIN7SUSDIMAUG0123456789 /" for c in text):
                    chords.append({"chord": text, "tick": current_tick})
    return chords


# -----------------------------
# ฟังก์ชันหาทุกไฟล์ที่มีทั้ง lyrics และ chords
# -----------------------------
def find_valid_midi_files(folder_path):
    valid_files = []
    all_files = []

    # 🔍 สร้างรายการไฟล์ทั้งหมดก่อนเพื่อใช้กับ tqdm
    for dirpath, _, filenames in os.walk(folder_path):
        for filename in filenames:
            if filename.lower().endswith((".mid", ".midi")):
                all_files.append(os.path.join(dirpath, filename))

    print(f"🚀 ตรวจไฟล์ทั้งหมด {len(all_files)} รายการ...")

    for full_path in tqdm(all_files, desc="🔎 กำลังประมวลผล", unit="ไฟล์"):
        lyrics = find_and_parse_lyrics(full_path)
        chords = extract_chords(full_path)
        header_type = detect_lyr_header(full_path)
        if lyrics and chords:
            valid_files.append({
                "short_path": shorten_path(full_path, SONG_ROOT_NAME),
                "header_type": header_type
            })
            print({
                "short_path": shorten_path(full_path, SONG_ROOT_NAME),
                "header_type": header_type
            })
    return valid_files


# 🎬 เรียกใช้
if __name__ == "__main__":
    folder_path = '/Users/digixtwo/Documents/Project/next-lyr/public/midi/read-data-in-midi/MHY27.mid'
    results = find_valid_midi_files(folder_path)

    print("\n🎼 ไฟล์ที่มีทั้ง lyrics และ chords:")
    for item in results:
        print(f"✅ {item['short_path']} ({item['header_type']})")
