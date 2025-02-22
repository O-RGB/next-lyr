import sys


def hexdump(data, width=16):
    """แสดงข้อมูลแบบ Hex Dump พร้อม offset และ ASCII representation"""
    for i in range(0, len(data), width):
        chunk = data[i:i+width]
        hex_str = ' '.join(f'{b:02X}' for b in chunk)
        ascii_str = ''.join(chr(b) if 32 <= b < 127 else '.' for b in chunk)
        print(f"{i:08X}  {hex_str:<{width*3}}  {ascii_str}")


def analyze_hnk(file_path):
    with open(file_path, 'rb') as f:
        data = f.read()

    print("=== Full Raw Data Hex Dump ===")
    hexdump(data)

    # ตรวจสอบ magic header
    magic = data[:4]
    try:
        magic_str = magic.decode('ascii')
    except UnicodeDecodeError:
        magic_str = str(magic)
    print("\nMagic Header:", magic_str)

    # อ่าน header fields ถัดไป (ตัวอย่าง: 12 ไบต์ถัดจาก magic)
    header_fields = data[4:16]
    print("Header Fields (hex):", ' '.join(f'{b:02X}' for b in header_fields))

    # ค้นหา marker "MThd" ที่ใช้ระบุไฟล์ MIDI
    index_mthd = data.find(b'MThd')
    if index_mthd != -1:
        print(f"\nพบ marker 'MThd' ที่ offset {index_mthd:08X}")
    else:
        print("\nไม่พบ marker 'MThd' ในไฟล์")

    # ค้นหา marker ที่อาจบ่งบอกส่วน lyric (เช่น meta event FF 01)
    index_lyr = data.find(b'\xFF\x01')
    if index_lyr != -1:
        print(f"พบ lyric marker (FF 01) ที่ offset {index_lyr:08X}")
    else:
        print("ไม่พบ lyric marker (FF 01)")

    # ค้นหา marker สำหรับ cursor data (ตัวอย่าง: FF 06)
    index_cur = data.find(b'\xFF\x06')
    if index_cur != -1:
        print(f"พบ cursor marker (FF 06) ที่ offset {index_cur:08X}")
    else:
        print("ไม่พบ cursor marker (FF 06)")

    # หากต้องการลองแยกส่วนข้อมูลออกเป็น mid, lyr, cur อาจต้องดูโครงสร้างเพิ่มเติม
    # ตัวอย่าง: สมมุติ header บอกความยาวของแต่ละส่วน (อย่างไรก็ตามข้อมูลนี้ยังไม่ชัดเจน)
    # เราสามารถพิมพ์ข้อมูลส่วนที่อยู่หลัง header (สมมุติ header มีความยาว 0x41 bytes)
    header_length = 0x41  # จากข้อมูลที่เห็น "00 00 00 41" ที่ offset 4
    print(f"\nสมมุติว่า header มีความยาว {header_length} ไบต์")
    body = data[header_length:]
    print("\n=== Body Data Hex Dump (หลัง Header) ===")
    hexdump(body)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python analyze_hnk.py <hnk_file>")
        sys.exit(1)
    analyze_hnk(sys.argv[1])
