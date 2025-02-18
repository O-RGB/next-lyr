import struct
import zlib


class EMK:
    def __init__(self, midi_data: bytes, lyrics_data: str, cursor_data: bytes, xor_key: bytes):
        self.midi_data = midi_data
        self.lyrics_data = lyrics_data.encode("cp874")  # แปลงเป็น CP874
        self.cursor_data = cursor_data
        self.xor_key = xor_key

    def compress_data(self, data: bytes) -> bytes:
        """บีบอัดข้อมูลด้วย zlib"""
        return zlib.compress(data)

    def create_header(self, midi_size: int, lyrics_size: int, cursor_size: int) -> bytearray:
        """สร้าง Header สำหรับไฟล์ EMK"""
        header = bytearray()
        header += bytes.fromhex("53464453")  # Magic bytes "SFDS"
        header += struct.pack("<Q", midi_size)    # ขนาด MIDI
        header += struct.pack("<Q", lyrics_size)  # ขนาด Lyrics
        header += struct.pack("<Q", cursor_size)  # ขนาด Cursor
        return header

    def xor_encrypt(self, data: bytearray) -> bytearray:
        """ทำ XOR Encrypt"""
        key_length = len(self.xor_key)
        return bytearray(data[i] ^ self.xor_key[i % key_length] for i in range(len(data)))

    def create_emk(self, output_file: str):
        """สร้างไฟล์ EMK"""
        compressed_midi = self.compress_data(self.midi_data)
        compressed_lyrics = self.compress_data(self.lyrics_data)
        compressed_cursor = self.compress_data(self.cursor_data)

        # สร้าง Header
        header = self.create_header(len(compressed_midi), len(
            compressed_lyrics), len(compressed_cursor))

        # รวมข้อมูลทั้งหมด
        emk_data = header + compressed_midi + compressed_lyrics + compressed_cursor

        # ทำ XOR Encrypt
        encrypted_emk = self.xor_encrypt(bytearray(emk_data))

        # บันทึกไฟล์
        with open(output_file, "wb") as f:
            f.write(encrypted_emk)

        print(f"✅ ไฟล์ EMK ถูกสร้างเรียบร้อย: {output_file}")


# 🔹 ตัวอย่างการใช้งาน
if __name__ == "__main__":
    # อ่านข้อมูลจากไฟล์
    midi_path = "/Users/digixtwo/Documents/Project/next-lyr/public/emk/WN00849.mid"
    lyric_path = "/Users/digixtwo/Documents/Project/next-lyr/public/emk/WN00849.lyr"
    cursor_path = "/Users/digixtwo/Documents/Project/next-lyr/public/emk/WN00849.cur"

    with open(midi_path, "rb") as f:
        midi_data = f.read()

    with open(lyric_path, "r", encoding="cp874") as f:
        lyric_data = f.read()

    with open(cursor_path, "rb") as f:
        cursor_data = f.read()

    # Key ที่ใช้ XOR
    xor_key = bytes.fromhex("AFF24C9CE9EA9943")

    # สร้างไฟล์ EMK
    emk = EMK(midi_data, lyric_data, cursor_data, xor_key)
    emk.create_emk(
        "/Users/digixtwo/Documents/Project/next-lyr/public/emk/WN00849NEW.emk")
