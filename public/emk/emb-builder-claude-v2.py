import struct
import zlib


class EMKBuilder:
    def __init__(self):
        self.xor_key = bytes.fromhex("AFF24C9CE9EA9943")  # XOR Key
        # Magic หลังถอดรหัส (5 bytes)
        self.magic = bytes.fromhex("2e53464453")
        # Padding ตามไฟล์จริง (จาก hex string ที่ให้มา)
        self.padding = bytes.fromhex(
            "0309B10600000000000000000000000000000000010500000000000000")
        # Magic ของแต่ละส่วนใน Header
        self.sfds_magic = bytes.fromhex("53464453")
        self.sections = []                               # เก็บข้อมูลแต่ละส่วน

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
        """สร้างไฟล์ .emk ด้วยการคำนวณ offset ที่ถูกต้อง"""
        # เริ่มต้นด้วยการรวมข้อมูลที่บีบอัดแล้วและบันทึกตำแหน่ง (main_data)
        main_data = bytearray()
        section_offsets = []
        # คำนวณความยาวของ prefix (magic + padding)
        prefix = self.magic + self.padding
        # ควรเป็น 5 + 34 = 39 bytes (ตรวจสอบความยาวจริง)
        prefix_length = len(prefix)
        # มี 8 bytes สำหรับ header position fields (header_pos และ header_end)
        current_pos = prefix_length + 8

        for section in self.sections:
            start = current_pos
            main_data.extend(section['compressed'])
            current_pos += len(section['compressed'])
            end = current_pos
            section_offsets.append((start, end))

        # สร้างส่วน header สำหรับแต่ละ section
        header = bytearray()
        for i, section in enumerate(self.sections):
            header.extend(self.sfds_magic)  # SFDS Magic

            # Tag (ประเภทข้อมูล)
            header.append(6)  # 6 = String
            header.append(len(section['tag']))
            header.extend(section['tag'].encode('ascii'))

            # Uncompressed Size (4 bytes)
            header.append(4)  # 4 = Uint
            header.extend(struct.pack("<I", section['uncompressed_size']))

            # Compression Type (ใช้ 0 สำหรับบีบอัดแล้ว)
            header.append(4)
            header.extend(struct.pack("<I", 0))  # Compression Type

            # Data Begin & End (4 bytes ต่อค่า)
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

        # สร้าง decrypted_data โดยเรียงตามลำดับ: prefix, header position fields, main_data, header
        decrypted_data = bytearray()
        decrypted_data.extend(prefix)
        # คำนวณตำแหน่งของ header หลัง main_data
        header_pos = prefix_length + 8 + len(main_data)
        header_end = header_pos + len(header)
        # เขียน header_pos และ header_end (4 bytes ต่อค่า)
        decrypted_data.extend(struct.pack("<I", header_pos))
        decrypted_data.extend(struct.pack("<I", header_end))
        # เพิ่ม main_data และ header
        decrypted_data.extend(main_data)
        decrypted_data.extend(header)

        # เข้ารหัส XOR ทีละ byte
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
    with open("/Users/digixtwo/Documents/Project/next-lyr/public/emk/WN00849CLAUDEV3.emk", "wb") as f:
        f.write(emk_data)
