import struct
import zlib


class EMKBuilder:
    def __init__(self):
        self.xor_key = bytes.fromhex("AFF24C9CE9EA9943")
        self.magic = bytes.fromhex("2e53464453")
        self.sfds_magic = bytes.fromhex("53464453")
        self.sections = []

    def add_section(self, tag: str, data: bytes | str):
        """เพิ่มข้อมูลส่วนต่างๆ เช่น MIDI, เนื้อเพลง หรือข้อมูล cursor"""
        # แปลงข้อมูลให้เป็นรูปแบบที่ถูกต้อง
        if tag == "LYRIC_DATA":
            if isinstance(data, str):
                raw_data = data.replace("\n", "\r\n").encode("cp874")
            elif isinstance(data, bytes):
                raw_data = data.decode("cp874").replace(
                    "\n", "\r\n").encode("cp874")
        else:
            raw_data = data if isinstance(data, bytes) else data.encode()

        # บีบอัดข้อมูล
        compressed = zlib.compress(raw_data, level=9)

        self.sections.append({
            'tag': tag,
            'raw_data': raw_data,
            'compressed': compressed,
            'uncompressed_size': len(raw_data)
        })

    def build(self) -> bytes:
        """สร้างไฟล์ .emk"""
        # รวบรวมข้อมูลที่บีบอัดแล้ว
        main_data = bytearray()
        section_offsets = []
        current_pos = 42  # 34 (magic+padding) + 8 (header positions)

        # เก็บตำแหน่งข้อมูลแต่ละส่วน
        for section in self.sections:
            start = current_pos
            main_data.extend(section['compressed'])
            current_pos += len(section['compressed'])
            section_offsets.append((start, current_pos))

        # สร้าง header
        header = bytearray()
        for i, section in enumerate(self.sections):
            # SFDS Magic
            header.extend(self.sfds_magic)

            # Tag name
            header.append(6)  # String type
            header.append(len(section['tag']))
            header.extend(section['tag'].encode('ascii'))

            # Uncompressed size
            header.append(4)  # Uint type
            header.extend(struct.pack("<I", section['uncompressed_size']))

            # Compression flag
            header.append(4)
            header.extend(struct.pack("<I", 0xFFFFFFFF))

            # Data positions
            header.append(4)
            header.extend(struct.pack("<I", section_offsets[i][0]))
            header.append(4)
            header.extend(struct.pack("<I", section_offsets[i][1]))

            # Reserved fields
            for _ in range(4):
                header.append(4)
                header.extend(struct.pack("<I", 0))

            # Padding
            header.extend(b'\x00' * 0x10)

        # สร้างไฟล์ที่ยังไม่ได้เข้ารหัส
        decrypted_data = bytearray()
        decrypted_data.extend(self.magic)
        decrypted_data.extend(b'\x00' * 29)

        # ตำแหน่ง header
        header_pos = 42 + len(main_data)
        header_end = header_pos + len(header)
        decrypted_data.extend(struct.pack("<Q", header_pos))
        decrypted_data.extend(struct.pack("<Q", header_end))

        # รวมทุกส่วนเข้าด้วยกัน
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
