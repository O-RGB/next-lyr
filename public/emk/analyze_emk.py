import struct
import sys

# XOR Key ที่ใช้ในไฟล์
XOR_KEY = bytes.fromhex("AFF24C9CE9EA9943")

def decrypt_emk(data: bytes, key: bytes) -> bytearray:
    decrypted = bytearray()
    for i, b in enumerate(data):
        decrypted.append(b ^ key[i % len(key)])
    return decrypted

def analyze_emk_file(filename: str):
    with open(filename, "rb") as f:
        data = f.read()

    decrypted = decrypt_emk(data, XOR_KEY)

    # กำหนดความยาวของส่วนต่าง ๆ
    magic_length = 5
    padding_length = 28  # ตามที่เราอ่านได้ในไฟล์จริง
    header_field_length = 8  # 4 bytes สำหรับ header_pos และ 4 bytes สำหรับ header_end

    magic = decrypted[:magic_length]
    padding = decrypted[magic_length:magic_length+padding_length]
    header_pos_field = decrypted[magic_length+padding_length:magic_length+padding_length+header_field_length]

    try:
        stored_header_pos, stored_header_end = struct.unpack("<II", header_pos_field)
    except struct.error:
        print("ไม่สามารถแยก header_pos ได้")
        return

    # เนื่องจากค่าใน field นี้ถูกเก็บในหน่วย 256 ไบต์
    header_pos = stored_header_pos // 256
    header_end = stored_header_end // 256 if stored_header_end != 0 else 0

    # ส่วน prefix รวมกันมีขนาด magic + padding + header field = 5 + 28 + 8 = 41 bytes
    prefix_length = magic_length + padding_length + header_field_length

    # Main data คือข้อมูลระหว่าง prefix กับ header start (ถ้า header_end != 0)
    main_data = decrypted[prefix_length:header_pos] if header_pos <= len(decrypted) else decrypted[prefix_length:]
    header = decrypted[header_pos:header_end] if (header_end > header_pos and header_end <= len(decrypted)) else bytearray()

    print("=== EMK File Analysis ===")
    print(f"File: {filename}")
    print(f"File size: {len(data)} bytes\n")

    print("=== Header Analysis ===")
    print("Magic:")
    print("  Hex  :", magic.hex())
    try:
        print("  ASCII:", magic.decode("ascii"))
    except UnicodeDecodeError:
        print("  (ไม่สามารถ decode เป็น ascii ได้)")
    print("Padding (hex):", padding.hex())
    print("Stored Header Position Field (hex):", header_pos_field.hex())
    print(f"Stored header_pos: {stored_header_pos} (scaled), header_end: {stored_header_end} (scaled)")
    print(f"Actual header start (header_pos): {header_pos}")
    print(f"Actual header end (header_end): {header_end}")
    print(f"Main data size: {len(main_data)} bytes")
    print(f"Header size: {len(header)} bytes")
    print("\n=== Section Analysis ===")

    offset = 0
    section_index = 1
    while offset < len(header):
        if offset + 4 > len(header):
            print("ไม่พอข้อมูลสำหรับ section magic")
            break
        section_magic = header[offset:offset+4]
        offset += 4
        print(f"\nSection {section_index}:")
        print("  Section magic:", section_magic.hex())

        # อ่าน Tag:
        if offset + 2 > len(header):
            print("  ไม่พอข้อมูลสำหรับอ่าน tag type/length")
            break
        tag_type = header[offset]
        offset += 1
        tag_length = header[offset]
        offset += 1
        if offset + tag_length > len(header):
            print("  ไม่พอข้อมูลสำหรับ tag string")
            break
        tag = header[offset:offset+tag_length].decode("ascii", errors="replace")
        offset += tag_length
        print("  Tag:", tag)

        # Uncompressed size:
        if offset + 5 > len(header):
            print("  ไม่พอข้อมูลสำหรับ uncompressed size")
            break
        uncompressed_size_type = header[offset]
        offset += 1
        uncompressed_size = struct.unpack("<I", header[offset:offset+4])[0]
        offset += 4
        print("  Uncompressed size:", uncompressed_size)

        # Compression type:
        if offset + 5 > len(header):
            print("  ไม่พอข้อมูลสำหรับ compression type")
            break
        compression_type_type = header[offset]
        offset += 1
        compression_type = struct.unpack("<I", header[offset:offset+4])[0]
        offset += 4
        print("  Compression type:", compression_type)

        # Data Begin:
        if offset + 5 > len(header):
            print("  ไม่พอข้อมูลสำหรับ data begin")
            break
        data_begin_type = header[offset]
        offset += 1
        data_begin = struct.unpack("<I", header[offset:offset+4])[0]
        offset += 4
        print("  Data begin:", data_begin)

        # Data End:
        if offset + 5 > len(header):
            print("  ไม่พอข้อมูลสำหรับ data end")
            break
        data_end_type = header[offset]
        offset += 1
        data_end = struct.unpack("<I", header[offset:offset+4])[0]
        offset += 4
        print("  Data end:", data_end)

        # Unknown 5:
        if offset + 5 > len(header):
            print("  ไม่พอข้อมูลสำหรับ unknown 5")
            break
        unknown5_type = header[offset]
        offset += 1
        unknown5 = struct.unpack("<I", header[offset:offset+4])[0]
        offset += 4
        print("  Unknown 5:", unknown5)

        # Unknown 6:
        if offset + 5 > len(header):
            print("  ไม่พอข้อมูลสำหรับ unknown 6")
            break
        unknown6_type = header[offset]
        offset += 1
        unknown6 = struct.unpack("<I", header[offset:offset+4])[0]
        offset += 4
        print("  Unknown 6:", unknown6)

        # Padding 16 bytes:
        if offset + 16 > len(header):
            print("  ไม่พอข้อมูลสำหรับ padding 16 bytes")
            break
        padding16 = header[offset:offset+16]
        offset += 16
        print("  Padding 16 (hex):", padding16.hex())

        # Unknown 7:
        if offset + 5 > len(header):
            print("  ไม่พอข้อมูลสำหรับ unknown 7")
            break
        unknown7_type = header[offset]
        offset += 1
        unknown7 = struct.unpack("<I", header[offset:offset+4])[0]
        offset += 4
        print("  Unknown 7:", unknown7)

        # Unknown 8:
        if offset + 5 > len(header):
            print("  ไม่พอข้อมูลสำหรับ unknown 8")
            break
        unknown8_type = header[offset]
        offset += 1
        unknown8 = struct.unpack("<I", header[offset:offset+4])[0]
        offset += 4
        print("  Unknown 8:", unknown8)

        section_index += 1
        print("-" * 40)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_emk.py <filename>")
        sys.exit(1)
    filename = sys.argv[1]
    analyze_emk_file(filename)
