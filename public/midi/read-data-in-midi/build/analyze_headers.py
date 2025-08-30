import os
import re
from collections import Counter
from tqdm import tqdm  # pip install tqdm

SONG_ROOT_NAME = "Song"

def shorten_path(full_path, keyword="Song"):
    parts = full_path.split(os.sep)
    try:
        start_index = parts.index(keyword)
        return os.path.join(*parts[start_index:])
    except ValueError:
        return full_path

def detect_flexible_lyr_header(midi_data):
    """
    ตรวจสอบ header ของ lyrics ใน MIDI data
    ยอมรับ pattern แบบยืดหยุ่น เช่น KLyrHdr1, LyrHdr2, LyrHdr เป็นต้น
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
        return "❌ไม่อ่านได้"

    return detect_flexible_lyr_header(midi_data)

def analyze_headers(folder_path):
    header_counts = Counter()
    all_files = []

    # 🔍 สร้างรายการไฟล์ MIDI ทั้งหมด
    for dirpath, _, filenames in os.walk(folder_path):
        for filename in filenames:
            if filename.lower().endswith((".mid", ".midi")):
                all_files.append(os.path.join(dirpath, filename))

    print(f"🚀 ตรวจไฟล์ทั้งหมด {len(all_files)} รายการ...")

    # 🏃‍♂️ ทำงานเร็ว: อ่านแต่ละไฟล์แล้วดึง header เท่านั้น
    for full_path in tqdm(all_files, desc="🔎 ตรวจ header", unit="ไฟล์"):
        header_type = detect_lyr_header(full_path)
        header_counts[header_type] += 1

    return header_counts

if __name__ == "__main__":
    folder_path = "/Users/digixtwo/Desktop/karaoke_API/karaoke.env/final-app/eXtreme Karaoke 2025.6/eXtreme Karaoke 2025/Songs/MIDI/NCN/Song"
    header_stats = analyze_headers(folder_path)

    print("\n📊 สรุป header ทั้งหมด:")
    total_files = sum(header_stats.values())
    for header, count in header_stats.most_common():
        percent = (count / total_files) * 100
        print(f"{header:15} {count:5} ไฟล์ ({percent:.2f}%)")

    print(f"\nรวมไฟล์ทั้งหมด {total_files} ไฟล์")
