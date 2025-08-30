import re

def analyze_midi_headers(file_path):
    try:
        with open(file_path, "rb") as f:
            midi_data = f.read()
    except Exception as e:
        print(f"❌ เปิดไฟล์ไม่สำเร็จ: {file_path} ({e})")
        return

    print(f"📄 กำลังวิเคราะห์ไฟล์: {file_path}\n")

    pattern = b"\xFF\x01(.{4,64}?)\x00"
    matches = re.findall(pattern, midi_data, re.DOTALL)

    if not matches:
        print("🤷 ไม่พบ meta text events ในรูปแบบ \xFF\x01")
        return

    print("🔎 พบข้อความที่อาจเป็น Header หรือ Metadata:")
    for i, raw in enumerate(matches, 1):
        try:
            text = raw.decode("latin1", errors="ignore").strip()
        except Exception:
            text = "(อ่านไม่ได้)"
        print(f"  {i:02d}. {text}")

    print(f"\n📊 รวมทั้งหมด {len(matches)} meta events\n")

# 🧪 ตัวอย่างการใช้งาน
if __name__ == "__main__":
    midi_path = "/Users/digixtwo/Desktop/นะหน้าทอง (1).mid"
    analyze_midi_headers(midi_path)
