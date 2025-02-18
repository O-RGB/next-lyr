#!/usr/bin/env python3
import sys

def extract_sections(file_path):
    with open(file_path, "rb") as f:
        data = f.read()
    print(f"[INFO] อ่านไฟล์: {file_path} ({len(data)} bytes)")

    # ตรวจสอบ magic header (HNKF) ถ้ามี
    if data[:4] == b"HNKF":
        print("[INFO] พบ magic header 'HNKF'")
    else:
        print("[WARN] ไม่พบ magic header 'HNKF'")

    # ค้นหา marker สำหรับ MIDI และ Lyric
    midi_offset = data.find(b"MThd")
    lyric_offset = data.find(b"LYRIC")

    # แยกข้อมูล MIDI: เริ่มที่ marker "MThd" จนถึง marker "LYRIC" (ถ้ามี)
    if midi_offset == -1:
        print("[ERROR] ไม่พบ marker 'MThd' สำหรับ MIDI")
        midi_data = None
    else:
        if lyric_offset != -1 and lyric_offset > midi_offset:
            midi_data = data[midi_offset:lyric_offset]
        else:
            midi_data = data[midi_offset:]
        print(f"[INFO] แยกข้อมูล MIDI เรียบร้อย: offset {midi_offset}, ขนาด {len(midi_data)} bytes")

    # แยกข้อมูล Lyric (รวมทั้งส่วนที่อาจมี CUR)
    if lyric_offset == -1:
        print("[ERROR] ไม่พบ marker 'LYRIC' สำหรับ Lyric")
        lyric_data = None
        cur_data = None
    else:
        lyric_block = data[lyric_offset:]
        print(f"[INFO] พบ marker 'LYRIC' ที่ offset {lyric_offset}, ขนาด {len(lyric_block)} bytes")
        try:
            # decode ด้วย cp874 ตามที่คาด
            lyric_text = lyric_block.decode("cp874")
            print("[INFO] decode Lyric ด้วย cp874 สำเร็จ")
        except Exception as e:
            print(f"[ERROR] decode Lyric ด้วย cp874 ล้มเหลว: {e}")
            lyric_text = lyric_block.decode("cp874", errors="replace")
        
        # แบ่งข้อความเป็นบรรทัด
        lines = lyric_text.splitlines()
        # ค้นหาบรรทัดที่เป็น CUR block: ชุดตัวเลขเรียงจาก 0 ขึ้นไป
        cur_start = None
        for i, line in enumerate(lines):
            if line.strip() == "0":
                expected = 0
                valid = True
                for j in range(i, len(lines)):
                    try:
                        num = int(lines[j].strip())
                    except ValueError:
                        valid = False
                        break
                    if num != expected:
                        valid = False
                        break
                    expected += 1
                if valid:
                    cur_start = i
                    break
        
        if cur_start is not None:
            print(f"[INFO] พบ CUR block เริ่มต้นที่บรรทัดที่ {cur_start}")
            lyric_text_only = "\n".join(lines[:cur_start])
            cur_text = "\n".join(lines[cur_start:])
        else:
            print("[INFO] ไม่พบ CUR block (ชุดตัวเลขเรียงจาก 0)")
            lyric_text_only = lyric_text
            cur_text = ""

        # เข้ารหัสกลับเป็นไบต์ด้วย cp874
        lyric_data = lyric_text_only.encode("cp874")
        cur_data = cur_text.encode("cp874") if cur_text else None

    return midi_data, lyric_data, cur_data

def write_file(filename, data):
    if data is None:
        print(f"[WARN] ไม่มีข้อมูลสำหรับเขียนไฟล์ {filename}")
        return
    with open(filename, "wb") as f:
        f.write(data)
    print(f"[INFO] เขียนไฟล์ {filename} สำเร็จ ({len(data)} bytes)")

def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_hnk.py <input_file.hnk>")
        sys.exit(1)
    
    midi_data, lyric_data, cur_data = extract_sections(sys.argv[1])
    write_file("output.mid", midi_data)
    write_file("output.lyr", lyric_data)
    write_file("output.cur", cur_data)

if __name__ == "__main__":
    main()
