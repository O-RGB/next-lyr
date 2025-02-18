import struct
import zlib


class EMKBuilder:
    def __init__(self):
        self.xor_key = bytes.fromhex("AFF24C9CE9EA9943")  # XOR Key
        self.magic = bytes.fromhex("2e53464453")          # Magic หลังถอดรหัส
        # Magic ของแต่ละส่วนใน Header
        self.sfds_magic = bytes.fromhex("53464453")
        self.sections = []                                 # เก็บข้อมูลแต่ละส่วน

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
        """สร้างไฟล์ .emk"""
        # รวมข้อมูลที่บีบอัดแล้วและบันทึกตำแหน่ง
        main_data = bytearray()
        section_offsets = []
        # ตำแหน่งเริ่มต้นของ main_data ใน decrypted_data (34 + 8 = 42)
        current_pos = 34 + 8

        for section in self.sections:
            start = current_pos
            main_data.extend(section['compressed'])
            current_pos += len(section['compressed'])
            end = current_pos
            section_offsets.append((start, end))

        # สร้างส่วนหัว (Header)
        header = bytearray()
        for i, section in enumerate(self.sections):
            header.extend(self.sfds_magic)  # SFDS Magic

            # Tag (ประเภทข้อมูล)
            header.append(6)  # 6 = String
            header.append(len(section['tag']))
            header.extend(section['tag'].encode('ascii'))

            # Uncompressed Size
            header.append(4)  # 4 = Uint
            header.extend(struct.pack("<I", section['uncompressed_size']))

            # Unknown 2 (อาจเป็น Compression Type)
            header.append(4)
            header.extend(struct.pack("<I", 0xFFFFFFFF))  # ตัวอย่างค่า

            # Data Begin & End
            header.append(4)
            header.extend(struct.pack("<I", section_offsets[i][0]))
            header.append(4)
            header.extend(struct.pack("<I", section_offsets[i][1]))

            # Unknown 5 & 6
            header.append(4)
            header.extend(struct.pack("<I", 0))
            header.append(4)
            header.extend(struct.pack("<I", 0))

            # ส่วนที่ไม่ใช้ 16 ไบต์
            header.extend(b'\x00' * 0x10)

            # Unknown 7 & 8
            header.append(4)
            header.extend(struct.pack("<I", 0))
            header.append(4)
            header.extend(struct.pack("<I", 0))

        # สร้างข้อมูลที่ยังไม่ได้เข้ารหัส
        decrypted_data = bytearray()
        decrypted_data.extend(self.magic)  # Magic เริ่มต้น (5 bytes)
        decrypted_data.extend(b'\x00' * 29)  # Padding รวมเป็น 34 bytes

        # เขียนตำแหน่ง Header เป็น 4 bytes แทน 8 bytes
        # 34 (magic+padding) + 8 (header_pos and header_end) + len(main_data)
        header_pos = 34 + 8 + len(main_data)
        header_end = header_pos + len(header)
        decrypted_data.extend(struct.pack("<I", header_pos))  # 4 bytes
        decrypted_data.extend(struct.pack("<I", header_end))  # 4 bytes

        # เพิ่ม main_data และ header
        decrypted_data.extend(main_data)
        decrypted_data.extend(header)

        # เข้ารหัส XOR
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
    with open("/Users/digixtwo/Documents/Project/next-lyr/public/emk/WN00849.emk", "wb") as f:
        f.write(emk_data)
