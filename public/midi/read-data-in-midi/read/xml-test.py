import re
import zlib
import base64
import json

# --- กำหนดค่า ---
# KLyrHdr1 Version
MIDI_FILE_PATH_K_VER = "/Users/digixtwo/Documents/Project/next-lyr/public/midi/read-data-in-midi/MHY27.mid"
# LyrHdr1 Version
MIDI_FILE_PATH_L_VER = "/Users/digixtwo/Documents/Project/next-lyr/public/midi/read-data-in-midi/update/MHY27_cleaned-saved.mid"
THAI_ENCODING = "tis-620"  # encoding ที่ใช้กับคาราโอเกะภาษาไทยแบบเก่า

def find_and_decode_karaoke_lyrics(file_path):
    print(f"🔍 กำลังวิเคราะห์ไฟล์: {file_path}")
    
    try:
        with open(file_path, "rb") as f:
            midi_data = f.read()
    except FileNotFoundError:
        print(f"❌ ไม่พบไฟล์ '{file_path}' กรุณาตรวจสอบว่าไฟล์อยู่ในตำแหน่งที่ถูกต้อง")
        return

    # ค้นหา Text Event ที่มี KLyrHdr1 แล้วดึงข้อมูล payload
    pattern = b'\xFF\x01.*?KLyrHdr1(.*?)\x00'
    match = re.search(pattern, midi_data, re.DOTALL)

    if not match:
        print("🤷 ไม่พบข้อมูลเนื้อเพลงในรูปแบบของ Extreme Karaoke (KLyrHdr)")
        return

    print("✅ พบข้อมูลเนื้อเพลงที่เข้ารหัสไว้! กำลังถอดรหัส...")

    encoded_payload = match.group(1)

    try:
        # base64 decode -> zlib decompress
        compressed_data = base64.b64decode(encoded_payload)
        decompressed_data = zlib.decompress(compressed_data)

        # แปลง binary เป็นข้อความภาษาไทย
        lyrics_text = decompressed_data.decode(THAI_ENCODING, errors='ignore')

        # DEBUG: แสดงเนื้อข้อความที่ถอดได้
        print("\n🧪 ข้อมูลที่ถอดรหัสได้ (แสดง 1000 ตัวอักษรแรก):\n")
        print(lyrics_text[:2000])
        print("\n--- กำลังแปลงเป็น JSON ---\n")

        # 🧠 แปลงเป็น array ของ object { name, tick }
        def parse_lyrics_to_json(raw_text):
            pattern = re.compile(r'TIME(\d+)TIME\s*TEXT(.*?)TEXT', re.DOTALL)
            matches = pattern.findall(raw_text)
            results = [{"name": name.strip(), "tick": int(tick)} for tick, name in matches if name.strip()]
            return results

        lyrics_json = parse_lyrics_to_json(lyrics_text)

        print("✅ สำเร็จ! พบคำร้องทั้งหมด:", len(lyrics_json))
        print("\n--- ตัวอย่างผลลัพธ์ JSON ---\n")
        print(json.dumps(lyrics_json[:20], ensure_ascii=False, indent=2))  # แสดง 10 คำแรก
        

        return lyrics_json

    except Exception as e:
        print(f"💥 เกิดข้อผิดพลาดระหว่างการถอดรหัส: {e}")
        print("⚠️ อาจใช้การเข้ารหัสหรือบีบอัดต่างรูปแบบ")

# --- เรียกใช้งาน ---
if __name__ == "__main__":
    find_and_decode_karaoke_lyrics(MIDI_FILE_PATH_K_VER)
    find_and_decode_karaoke_lyrics(MIDI_FILE_PATH_L_VER)
