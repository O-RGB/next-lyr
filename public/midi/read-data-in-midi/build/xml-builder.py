 
import mido
import zlib
import base64
import xml.etree.ElementTree as ET


def build_klyr_xml(info: dict, lyrics_lines: list[list[dict]]) -> str:
    root = ET.Element("SONG_LYRIC")

    # --- INFO section ---
    info_elem = ET.SubElement(root, "INFO")
    for key, value in info.items():
        elem = ET.SubElement(info_elem, key)
        elem.text = value

    # --- LYRIC section ---
    lyric_elem = ET.SubElement(root, "LYRIC")
    for line in lyrics_lines:
        if not line:
            continue
        line_elem = ET.SubElement(lyric_elem, "LINE")

        time_elem = ET.SubElement(line_elem, "TIME")
        time_elem.text = str(line[0]["tick"])

        for word in line:
            word_elem = ET.SubElement(line_elem, "WORD")

            ET.SubElement(word_elem, "TIME").text = str(word["tick"])
            ET.SubElement(word_elem, "TEXT").text = word["name"]
            ET.SubElement(word_elem, "VOCAL").text = word.get("vocal", "")

    xml_str = ET.tostring(root, encoding="utf-8", method="xml").decode("utf-8")
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + xml_str


def encode_klyr_payload(xml: str) -> str:
    compressed = zlib.compress(xml.encode("tis-620"))
    encoded = base64.b64encode(compressed).decode("ascii")
    return encoded


def replace_klyr_in_midi_safely(midi_path: str, new_info: dict, new_lyrics: list[list[dict]], output_path: str):
    midi = mido.MidiFile(midi_path)

    # สร้างข้อความใหม่
    new_xml = build_klyr_xml(new_info, new_lyrics)
    encoded_text = encode_klyr_payload(new_xml)
    full_text = "KLyrHdr1" + encoded_text

    # ลบข้อความเดิมที่เป็น KLyrHdr1
    for track in midi.tracks:
        new_msgs = []
        for msg in track:
            if msg.type == "text" and msg.text.startswith("KLyrHdr1"):
                continue  # ลบทิ้ง
            new_msgs.append(msg)
        track[:] = new_msgs

    # เพิ่ม text event ใหม่ใน track แรก
    midi.tracks[0].insert(0, mido.MetaMessage("text", text=full_text, time=0))

    # เขียนไฟล์ใหม่
    midi.save(output_path)
    print(f"✅ เขียน KLyrHdr1 ใหม่เรียบร้อย -> {output_path}")


# ตัวอย่างใช้งาน
if __name__ == "__main__":
    MIDI_FILE_PATH = "/Users/digixtwo/Documents/Project/next-lyr/public/midi/read-data-in-midi/build/MHY27.mid"
    OUTPUT_FILE_PATH = "/Users/digixtwo/Documents/Project/next-lyr/public/midi/read-data-in-midi/build/MHY27_edited.mid"

    # --- INFO ใหม่ ---
    new_song_info = {
        "VERSION": "1.1", "SOURCE": "LYRIC_EDITOR", "CHARSET": "TIS-620",
        "TIME_FORMAT": "MIDI_TIME_24", "TITLE": "นะหน้าทอง (New)", "KEY": "A",
        "TEMPO": "65", "ALBUM": ".", "ARTIST": "โจอี้ ภูวศิษฐ์",
        "ARTIST_TYPE": "M", "AUTHOR": ".", "GENRE": ".", "RHYTHM": ".",
        "CREATOR": "Digix", "COMPANY": ".", "LANGUAGE": "DEFAULT",
        "YEAR": "2025", "VOCAL_CHANNEL": "9",
        "LYRIC_TITLE": "เพลง : นะหน้าทอง ศิลปิน : โจอี้ ภูวศิษฐ์ (Edited)"
    }

        # --- LYRIC ใหม่ (แบบ [[], []]) พร้อม VOCAL
    new_lyrics_array = [
        [
            {"name": "เพลง :", "tick": 22},
            {"name": "นะ", "tick": 41},
            {"name": "หน้า", "tick": 54},
            {"name": "ทอง", "tick": 72}
        ],
        [
            {"name": "ศิลปิน :", "tick": 106},
            {"name": "โจอี้", "tick": 132},
            {"name": "ภูวศิษฐ์", "tick": 164}
        ],
        [
            {"name": "คำร้อง", "tick": 209},
            {"name": "/", "tick": 230},
            {"name": "ทำนอง", "tick": 245},
            {"name": "/", "tick": 255},
            {"name": "เรียบเรียง :", "tick": 273},
            {"name": "รัฐวิชญ์", "tick": 300},
            {"name": "อนันต์", "tick": 318},
            {"name": "พรสิริ", "tick": 336}
        ],
        [
            {"name": "เธอ", "tick": 1050},
            {"name": "คือ", "tick": 1100},
            {"name": "คน", "tick": 1160},
            {"name": "เดียว", "tick": 1230},
            {"name": "ที่", "tick": 1300},
            {"name": "ใจ", "tick": 1370},
            {"name": "ฉัน", "tick": 1440},
            {"name": "เฝ้า", "tick": 1500},
            {"name": "รอ", "tick": 1580}
        ],
        [
            {"name": "แม้", "tick": 1720},
            {"name": "วัน", "tick": 1780},
            {"name": "ที่", "tick": 1840},
            {"name": "เรา", "tick": 1900},
            {"name": "จะ", "tick": 1960},
            {"name": "ห่าง", "tick": 2020},
            {"name": "กัน", "tick": 2080}
        ],
        [
            {"name": "ฉัน", "tick": 2300},
            {"name": "ยัง", "tick": 2350},
            {"name": "คง", "tick": 2400},
            {"name": "ไม่", "tick": 2450},
            {"name": "เปลี่ยน", "tick": 2510},
            {"name": "ใจ", "tick": 2580}
        ],
        [
            {"name": "และ", "tick": 2700},
            {"name": "จะ", "tick": 2760},
            {"name": "มี", "tick": 2820},
            {"name": "แค่", "tick": 2880},
            {"name": "เธอ", "tick": 2940}
        ],
        [
            {"name": "จบเพลง", "tick": 5000}
        ]
    ]


    replace_klyr_in_midi_safely(MIDI_FILE_PATH, new_song_info, new_lyrics_array, OUTPUT_FILE_PATH)
