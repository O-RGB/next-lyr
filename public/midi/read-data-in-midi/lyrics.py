import re
import zlib
import base64
import json
import xml.etree.ElementTree as ET
import mido

MIDI_FILE_PATH = "/Users/digixtwo/Documents/Project/next-lyr/public/midi/MHY27.mid"
THAI_ENCODING = "tis-620"

INFO_FIELDS = [
    "VERSION",
    "SOURCE",
    "CHARSET",
    "TIME_FORMAT",
    "TITLE",
    "KEY",
    "TEMPO",
    "ALBUM",
    "ARTIST",
    "ARTIST_TYPE",
    "AUTHOR",
    "GENRE",
    "RHYTHM",
    "CREATOR",
    "COMPANY",
    "LANGUAGE",
    "YEAR",
    "VOCAL_CHANNEL",
    "LYRIC_TITLE",
]


def find_and_parse_lyrics(file_path):
    print(f"🔍 กำลังวิเคราะห์ไฟล์: {file_path}")

    try:
        with open(file_path, "rb") as f:
            midi_data = f.read()
    except FileNotFoundError:
        print(f"❌ ไม่พบไฟล์ '{file_path}' กรุณาตรวจสอบว่าไฟล์อยู่ในตำแหน่งที่ถูกต้อง")
        return None

    pattern = b"\xFF\x01.*?KLyrHdr1(.*?)\x00"
    match = re.search(pattern, midi_data, re.DOTALL)

    if not match:
        print("🤷 ไม่พบข้อมูลเนื้อเพลงในรูปแบบ KLyrHdr1")
        return None

    print("✅ พบข้อมูลเนื้อเพลงที่เข้ารหัสไว้! กำลังถอดรหัส...")

    encoded_payload = match.group(1)

    try:
        compressed_data = base64.b64decode(encoded_payload)
        decompressed_data = zlib.decompress(compressed_data)
        lyrics_xml = decompressed_data.decode(THAI_ENCODING, errors="ignore")


        def parse_xml_lyrics(xml_text):
            results = []
            root = ET.fromstring(xml_text)
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

        def parse_xml_info(xml_text):
            root = ET.fromstring(xml_text)
            info_elem = root.find("INFO")
            info_data = {}
            if info_elem is not None:
                for field in INFO_FIELDS:
                    el = info_elem.find(field)
                    info_data[field] = (
                        el.text.strip() if el is not None and el.text else ""
                    )
            return info_data

        lyrics_json = parse_xml_lyrics(lyrics_xml)
        info_json = parse_xml_info(lyrics_xml)

        return {"info": info_json, "lyrics": lyrics_json}

    except Exception as e:
        print(f"💥 ถอดรหัสผิดพลาด: {e}")
        return None


def extract_chords(midi_path):
    mid = mido.MidiFile(midi_path)
    chords = []

    for track in mid.tracks:
        current_tick = 0
        for msg in track:
            current_tick += msg.time
            if msg.is_meta and msg.type in ["text", "marker"]:
                text = msg.text.strip()
                if text and all(
                    c.upper() in "ABCDEFG#bmajmin7susdimaug0123456789 /" for c in text
                ):
                    chords.append({"chord": text, "tick": current_tick})
    return chords


if __name__ == "__main__":
    data = find_and_parse_lyrics(MIDI_FILE_PATH)
    if data is None:
        data = {"info": {}, "lyrics": []}

    chords = extract_chords(MIDI_FILE_PATH)

    output = {
        "info": data.get("info", {}),
        "lyrics": data.get("lyrics", []),
        "chords": chords,
    }

    print(output)
