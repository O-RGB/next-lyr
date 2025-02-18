#!/usr/bin/env python3
import re
import sys
import zlib

def extract_sections(file_path):
    # อ่านข้อมูลจากไฟล์ .hnk เป็นไบต์
    with open(file_path, "rb") as f:
        raw_data = f.read()

    # พยายามถอดรหัสด้วย zlib (สำหรับกรณีที่ใช้ LZ77/deflate)
    try:
        data = zlib.decompress(raw_data)
        print("ถอดรหัสข้อมูลด้วย zlib สำเร็จ")
    except zlib.error:
        data = raw_data
        print("ข้อมูลไม่ได้ถูกบีบอัดด้วย zlib หรือไม่ใช่รูปแบบ deflate")

    # ค้นหา marker สำหรับ MIDI และ LYRIC
    midi_start = data.find(b"MThd")
    lyric_start = data.find(b"LYRIC")
    
    midi_data = None
    lyric_data = None
    cur_data = None

    if midi_start == -1:
        print("ไม่พบ marker สำหรับ MIDI")
    else:
        if lyric_start != -1 and midi_start < lyric_start:
            midi_data = data[midi_start:lyric_start]
        else:
            midi_data = data[midi_start:]
        print(f"พบข้อมูล MIDI ที่ตำแหน่ง {midi_start}")

    if lyric_start == -1:
        print("ไม่พบ marker สำหรับ LYRIC")
    else:
        # ส่วน LYRIC (รวมทั้งส่วนที่อาจมี CUR อยู่ท้ายไฟล์)
        lyric_and_cur = data[lyric_start:]
        print(f"พบข้อมูล LYRIC ที่ตำแหน่ง {lyric_start}")

        # พยายาม decode เป็น UTF-8
        try:
            text_block = lyric_and_cur.decode("utf-8")
        except UnicodeDecodeError:
            text_block = lyric_and_cur.decode("utf-8", errors="replace")
        
        # แบ่งข้อมูลเป็นบรรทัด
        lines = text_block.splitlines()
        cur_start = None
        # ค้นหาชุดบรรทัดที่เป็นตัวเลขเรียงลำดับตั้งแต่ 0 ขึ้นไป
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.isdigit() and stripped == "0":
                # ตรวจสอบว่าตั้งแต่บรรทัดนี้ไปเป็นตัวเลขเรียงลำดับ 0,1,2,...
                expected = 0
                valid = True
                for j in range(i, len(lines)):
                    cur_line = lines[j].strip()
                    if cur_line.isdigit():
                        if int(cur_line) != expected:
                            valid = False
                            break
                        expected += 1
                    else:
                        valid = False
                        break
                if valid:
                    cur_start = i
                    break

        if cur_start is not None:
            # แบ่งส่วน lyric และ cur ออกจากกัน
            lyric_text = "\n".join(lines[:cur_start])
            cur_text = "\n".join(lines[cur_start:])
            lyric_data = lyric_text.encode("utf-8")
            cur_data = cur_text.encode("utf-8")
            print("พบบล็อกข้อมูล CUR (ตัวเลขเรียงจาก 0 ถึง n)")
        else:
            # ถ้าไม่พบชุดตัวเลขเรียงลำดับ ให้ถือว่าทั้งหมดเป็น lyric data
            lyric_data = lyric_and_cur
            print("ไม่พบบล็อกข้อมูล CUR แบบตัวเลข")

    return midi_data, lyric_data, cur_data

def write_file(filename, data):
    if data is None:
        print(f"ไม่พบข้อมูลสำหรับเขียนไฟล์ {filename}")
    else:
        with open(filename, "wb") as f:
            f.write(data)
        print(f"เขียนไฟล์ {filename} สำเร็จ")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_hnk.py <input_file.hnk>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    midi_data, lyric_data, cur_data = extract_sections(input_file)
    
    write_file("output.mid", midi_data)
    write_file("output.lyr", lyric_data)
    write_file("output.cur", cur_data)
