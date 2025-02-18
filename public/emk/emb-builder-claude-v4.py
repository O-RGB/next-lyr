import struct
import zlib
import struct
import zlib
import hashlib


class EMKBuilder:
    def __init__(self):
        self.xor_key = bytes.fromhex("AFF24C9CE9EA9943")  # XOR Key
        # Magic (5 bytes; ".SFDS")
        self.magic = bytes.fromhex("2e53464453")
        # ใช้ Padding 28 ไบต์ ตามที่ได้จากไฟล์จริง
        self.padding = bytes.fromhex(
            "0309B106000000000000000000000000000000000105000000000000"
        )[:28]
        # SFDS Magic สำหรับส่วน header
        self.sfds_magic = bytes.fromhex("53464453")
        self.sections = []  # เก็บข้อมูลแต่ละส่วน

    def add_section(self, tag: str, raw_data: bytes):
        """เพิ่มข้อมูลพร้อมบีบอัด"""
        if tag == "LYRIC_DATA":
            # แปลง newline characters เป็น \r\n และเข้ารหัสเป็น windows-874
            if isinstance(raw_data, str):
                raw_data = raw_data.replace("\n", "\r\n").encode("cp874")
            elif isinstance(raw_data, bytes):
                raw_data = raw_data.decode("cp874").replace(
                    "\n", "\r\n").encode("cp874")

        compressed = zlib.compress(raw_data, level=9)  # บีบอัดข้อมูล
        self.sections.append({
            'tag': tag,
            'raw_data': raw_data,
            'compressed': compressed,
            'uncompressed_size': len(raw_data),
        })

    def build(self) -> bytes:
        """สร้างไฟล์ .emk ตามโครงสร้างที่ใช้งานจริง"""
        # --- สร้าง main_data โดยรวมข้อมูลแต่ละ section ที่บีบอัดแล้ว ---
        main_data = bytearray()
        # เก็บตำแหน่ง (เริ่มต้น, สิ้นสุด) ของข้อมูลแต่ละ section ใน main_data
        section_offsets = []
        # คำนวณตำแหน่งเริ่ม main_data:
        # prefix = magic (5 bytes) + padding (28 bytes) + header position fields (8 bytes)
        prefix_length = len(self.magic) + len(self.padding) + \
            8  # 5 + 28 + 8 = 41 bytes
        current_pos = prefix_length

        for section in self.sections:
            start = current_pos
            main_data.extend(section['compressed'])
            current_pos += len(section['compressed'])
            end = current_pos
            section_offsets.append((start, end))

        # --- สร้างส่วน Header (ข้อมูลรายละเอียดของแต่ละ section) ---
        # (ส่วนนี้ยังคงสร้างเหมือนเดิม แต่ไฟล์จริงที่ใช้งานจะใช้ header_end = 0)
        header = bytearray()
        for i, section in enumerate(self.sections):
            header.extend(self.sfds_magic)  # SFDS Magic (4 bytes)

            # Tag (ประเภทข้อมูล)
            header.append(6)  # 6 = String
            header.append(len(section['tag']))
            header.extend(section['tag'].encode('ascii'))

            # Uncompressed Size (4 bytes)
            header.append(4)  # 4 = Uint
            header.extend(struct.pack("<I", section['uncompressed_size']))

            # Compression Type (ใช้ 0)
            header.append(4)
            header.extend(struct.pack("<I", 0))  # Compression Type = 0

            # Data Begin & End (4 bytesต่อค่า)
            header.append(4)
            header.extend(struct.pack("<I", section_offsets[i][0]))
            header.append(4)
            header.extend(struct.pack("<I", section_offsets[i][1]))

            # Unknown 5 & 6
            header.append(4)
            header.extend(struct.pack("<I", 0))
            header.append(4)
            header.extend(struct.pack("<I", 0))

            # Padding 16 bytes (ส่วนที่ไม่ใช้)
            header.extend(bytes(16))

            # Unknown 7 & 8
            header.append(4)
            header.extend(struct.pack("<I", 0))
            header.append(4)
            header.extend(struct.pack("<I", 0))

        # --- สร้างข้อมูล decrypted (ก่อนเข้ารหัส XOR) ---
        decrypted_data = bytearray()
        # เขียน Magic และ Padding
        decrypted_data.extend(self.magic)      # 5 bytes
        decrypted_data.extend(self.padding)      # 28 bytes

        # เขียน Header Position Fields (8 bytes)
        # header_start = prefix_length + len(main_data)
        header_start = prefix_length + len(main_data)
        # จากไฟล์จริง ค่านี้ถูกเก็บในรูปแบบ scaled ด้วย 256
        scaled_header_start = header_start * 256
        # ตามไฟล์จริง header_end ถูกเก็บเป็น 0 (หมายถึงว่า header อยู่จนจบไฟล์)
        scaled_header_end = 0
        decrypted_data.extend(struct.pack("<I", scaled_header_start))
        decrypted_data.extend(struct.pack("<I", scaled_header_end))

        # ต่อด้วย main_data และ header
        decrypted_data.extend(main_data)
        decrypted_data.extend(header)

        # --- เข้ารหัส XOR ---
        emk_data = bytearray()
        for i in range(len(decrypted_data)):
            emk_data.append(decrypted_data[i] ^
                            self.xor_key[i % len(self.xor_key)])

        return bytes(emk_data)


# ตัวอย่างการใช้งาน
if __name__ == "__main__":
    # อ่านข้อมูลจากไฟล์
    with open("/Users/digixtwo/Documents/Project/next-lyr/public/emk/WN00849.mid", "rb") as f:
        midi_data = f.read()

    with open("/Users/digixtwo/Documents/Project/next-lyr/public/emk/WN00849.lyr", "r", encoding="cp874") as f:
        lyric_data = f.read()

    with open("/Users/digixtwo/Documents/Project/next-lyr/public/emk/WN00849.cur", "rb") as f:
        cursor_data = f.read()

    # สร้าง EMK
    builder = EMKBuilder()
    builder.add_section("MIDI_DATA", midi_data)
    builder.add_section("LYRIC_DATA", lyric_data.encode("cp874"))
    builder.add_section("CURSOR_DATA", cursor_data)
    emk_data = builder.build()

    # บันทึกไฟล์
    with open("/Users/digixtwo/Documents/Project/next-lyr/public/emk/WN00849CLAUDEV5.emk", "wb") as f:
        f.write(emk_data)
