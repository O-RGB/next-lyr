import struct
import zlib
import struct
import zlib
import hashlib

class EMKBuilder:
    def __init__(self):
        self.xor_key = bytes.fromhex("AFF24C9CE9EA9943")
        self.magic = bytes.fromhex("2e53464453")  # 5 bytes
        # ต้องการให้ prefix (magic + padding) รวมกัน 34 bytes → padding = 29 bytes
        self.padding = bytes(29)  # ใช้ค่า 0 หากไม่มีข้อมูลเฉพาะ
        self.sections = []  # sections สำหรับ MIDI_DATA, LYRIC_DATA, CUR_DATA

    def add_section(self, tag: str, raw_data: bytes):
        """เพิ่มข้อมูล section (สำหรับ MIDI, LYRIC, CUR) พร้อมบีบอัด"""
        if tag == "LYRIC_DATA":
            # แปลง newline เป็น \r\n และเข้ารหัส windows-874
            if isinstance(raw_data, str):
                raw_data = raw_data.replace("\n", "\r\n").encode("cp874")
            elif isinstance(raw_data, bytes):
                raw_data = raw_data.decode("cp874").replace("\n", "\r\n").encode("cp874")
        compressed = zlib.compress(raw_data, level=9)
        self.sections.append({
            'tag': tag,
            'raw_data': raw_data,
            'compressed': compressed,
            'uncompressed_size': len(raw_data)
        })

    def build(self) -> bytes:
        """
        สร้างไฟล์ .emk ตามสเปค:
          [prefix (34 bytes)] +
          [header positions (16 bytes: start and end header list)] +
          [main_data (concatenated compressed section data)] +
          [header list (header records for each section)]
        """
        # 1. สร้าง main_data จาก section data (MIDI, LYRIC, CUR)
        main_data = bytearray()
        section_offsets = []  # เก็บตำแหน่ง (start, end) ของแต่ละ section
        # main_data จะเริ่มที่ offset = 34 (prefix) + 16 (header positions) = 50
        current_pos = 50
        for section in self.sections:
            start = current_pos
            main_data.extend(section['compressed'])
            current_pos += len(section['compressed'])
            end = current_pos
            section_offsets.append((start, end))

        # 2. สร้าง header list (header records)
        header_list = bytearray()
        # 2.1 เพิ่ม header record สำหรับ EMK metadata (HEADER)
        header_list.extend(self.build_header_record(
            tag="HEADER",
            uncompressed_size=0,
            data_start=0,
            data_end=0,
            raw_data=b""
        ))
        # 2.2 สำหรับ section ที่เพิ่มเข้ามา (MIDI_DATA, LYRIC_DATA, CUR_DATA)
        for i, section in enumerate(self.sections):
            offsets = section_offsets[i]
            header_list.extend(self.build_header_record(
                tag=section['tag'],
                uncompressed_size=section['uncompressed_size'],
                data_start=offsets[0],
                data_end=offsets[1],
                raw_data=section['raw_data']
            ))

        # 3. คำนวณตำแหน่ง header list
        prefix_length = len(self.magic) + len(self.padding)  # 34 bytes
        header_positions_size = 16  # 2 x 8-byte u64
        header_start = prefix_length + header_positions_size + len(main_data)
        header_end = header_start + len(header_list)

        # 4. สร้าง decrypted_data ตามลำดับ: prefix + header positions + main_data + header list
        decrypted_data = bytearray()
        decrypted_data.extend(self.magic)
        decrypted_data.extend(self.padding)
        # เขียน header positions เป็น u64 (little-endian)
        decrypted_data.extend(struct.pack("<Q", header_start))
        decrypted_data.extend(struct.pack("<Q", header_end))
        decrypted_data.extend(main_data)
        decrypted_data.extend(header_list)

        # 5. เข้ารหัส XOR ทีละไบต์
        emk_data = bytearray()
        for i in range(len(decrypted_data)):
            emk_data.append(decrypted_data[i] ^ self.xor_key[i % len(self.xor_key)])

        return bytes(emk_data)

    def build_header_record(self, tag: str, uncompressed_size: int, data_start: int, data_end: int, raw_data: bytes) -> bytes:
        """
        สร้าง header record ตามลำดับ field ตามเอกสาร:
          - Tag: (string) → prefix 0x06, 1 ไบต์ความยาว, แล้วตามด้วยข้อมูลตัวอักษร (ASCII)
          - Uncompressed size: (32-bit int) → prefix 0x04, ตามด้วย 4 ไบต์
          - Data start offset: (32-bit int) → prefix 0x04, 4 ไบต์
          - Data end offset: (32-bit int) → prefix 0x04, 4 ไบต์
          - Unknown field (0x01): → prefix 0x02, 1 ไบต์
          - Unknown field (0x00): → prefix 0x02, 1 ไบต์
          - MD5 hash (16 bytes) ของ uncompressed data
          - Unknown (empty string): → prefix 0x06, 1 ไบต์ความยาว 0
          - Unknown (0x00): → prefix 0x02, 1 ไบต์
        """
        record = bytearray()
        # Tag (string)
        record.append(0x06)
        record.append(len(tag))
        record.extend(tag.encode('ascii'))
        # Uncompressed size (32-bit)
        record.append(0x04)
        record.extend(struct.pack("<I", uncompressed_size))
        # Data start offset
        record.append(0x04)
        record.extend(struct.pack("<I", data_start))
        # Data end offset
        record.append(0x04)
        record.extend(struct.pack("<I", data_end))
        # Unknown: 0x01 (single byte)
        record.append(0x02)
        record.append(0x01)
        # Unknown: 0x00 (single byte)
        record.append(0x02)
        record.append(0x00)
        # MD5 hash (16 bytes) ของ raw_data
        md5hash = hashlib.md5(raw_data).digest()
        record.extend(md5hash)
        # Unknown: empty string (prefix 0x06 + 0)
        record.append(0x06)
        record.append(0x00)
        # Unknown: 0x00 (single byte)
        record.append(0x02)
        record.append(0x00)
        return bytes(record)


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
    with open("/Users/digixtwo/Documents/Project/next-lyr/public/emk/WN00849CLAUDEV4.emk", "wb") as f:
        f.write(emk_data)
