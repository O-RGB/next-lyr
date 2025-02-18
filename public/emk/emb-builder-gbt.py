import struct
import zlib
class EMKBuilder:
    def __init__(self):
        self.xor_key = bytes.fromhex("AFF24C9CE9EA9943")
        self.magic = bytes.fromhex("2E53464453")  # .SFDS
        # Original padding from the file
        self.padding = bytes.fromhex("0309B10600000000000000000000000000000000010500000000000000")
        self.sections = []

    def add_section(self, tag: str, raw_data: bytes, section_magic: bytes = None):
        """เพิ่มข้อมูลพร้อมบีบอัด"""
        if section_magic is None:
            if tag == "MIDI_DATA":
                section_magic = bytes.fromhex("8CAE2A82")
            elif tag == "LYRIC_DATA":
                section_magic = bytes.fromhex("4C595249")
            elif tag == "CURSOR_DATA":
                section_magic = bytes.fromhex("02010200")
            else:
                section_magic = bytes.fromhex("53464453")

        if tag == "LYRIC_DATA":
            if isinstance(raw_data, str):
                raw_data = raw_data.replace("\n", "\r\n").encode("cp874")
            elif isinstance(raw_data, bytes):
                raw_data = raw_data.decode("cp874").replace("\n", "\r\n").encode("cp874")

        compressed = zlib.compress(raw_data, level=9)
        self.sections.append({
            'tag': tag,
            'magic': section_magic,
            'raw_data': raw_data,
            'compressed': compressed,
            'uncompressed_size': len(raw_data),
        })

    def build(self) -> bytes:
        """สร้างไฟล์ .emk"""
        main_data = bytearray()
        section_offsets = []
        current_pos = 42  # 34 (magic+padding) + 8 (positions)

        for section in self.sections:
            start = current_pos
            main_data.extend(section['compressed'])
            current_pos += len(section['compressed'])
            end = current_pos
            section_offsets.append((start, end))

        header = bytearray()
        for i, section in enumerate(self.sections):
            header.extend(section['magic'])  # ใช้ magic ที่กำหนดเฉพาะแต่ละ section

            # Tag
            header.append(6)
            header.append(len(section['tag']))
            header.extend(section['tag'].encode('ascii'))

            # Uncompressed Size
            header.append(4)
            header.extend(struct.pack("<I", section['uncompressed_size']))

            # Compression Type
            header.append(4)
            header.extend(struct.pack("<I", 0xFFFFFFFF))

            # Data Begin & End
            header.append(4)
            header.extend(struct.pack("<I", section_offsets[i][0]))
            header.append(4)
            header.extend(struct.pack("<I", section_offsets[i][1]))

            # Additional fields from original file
            for _ in range(4):
                header.append(4)
                header.extend(struct.pack("<I", 0))

            # Padding
            header.extend(b'\x00' * 0x10)

            # Last two fields
            header.append(4)
            header.extend(struct.pack("<I", 0))
            header.append(4)
            header.extend(struct.pack("<I", 0))

        decrypted_data = bytearray()
        decrypted_data.extend(self.magic)
        decrypted_data.extend(self.padding)

        header_pos = 42 + len(main_data)
        header_end = header_pos + len(header)
        decrypted_data.extend(struct.pack("<I", header_pos))
        decrypted_data.extend(struct.pack("<I", header_end))

        decrypted_data.extend(main_data)
        decrypted_data.extend(header)

        emk_data = bytearray()
        for i in range(len(decrypted_data)):
            emk_data.append(decrypted_data[i] ^ self.xor_key[i % len(self.xor_key)])

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
    with open("/Users/digixtwo/Documents/Project/next-lyr/public/emk/WN00849GBT.emk", "wb") as f:
        f.write(emk_data)
