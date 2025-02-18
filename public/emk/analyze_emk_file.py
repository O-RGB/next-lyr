import struct
import zlib
from typing import List, Dict, Tuple


class EMKAnalyzer:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.xor_key = bytes.fromhex("AFF24C9CE9EA9943")
        with open(file_path, 'rb') as f:
            self.encrypted_data = f.read()
        self.decrypted_data = self._decrypt_data()

    def _decrypt_data(self) -> bytes:
        """Decrypt the entire file using XOR key"""
        decrypted = bytearray()
        for i in range(len(self.encrypted_data)):
            decrypted.append(
                self.encrypted_data[i] ^ self.xor_key[i % len(self.xor_key)])
        return bytes(decrypted)

    def _read_string(self, data: bytes, offset: int) -> Tuple[str, int]:
        """Read a length-prefixed string from data at offset"""
        length = data[offset]
        string = data[offset + 1:offset + 1 + length].decode('ascii')
        return string, offset + 1 + length

    def analyze_header(self) -> Dict:
        """Analyze the file header structure"""
        magic = self.decrypted_data[:5]
        padding = self.decrypted_data[5:34]
        header_pos = struct.unpack("<I", self.decrypted_data[34:38])[0]
        header_end = struct.unpack("<I", self.decrypted_data[38:42])[0]

        return {
            'magic_hex': magic.hex().upper(),
            'magic_ascii': magic.decode('ascii', errors='ignore'),
            'padding_hex': padding.hex().upper(),
            'header_pos': header_pos,
            'header_end': header_end,
            'main_data_size': header_pos - 42
        }

    def analyze_sections(self) -> List[Dict]:
        """Analyze all sections in the file"""
        header_pos = struct.unpack("<I", self.decrypted_data[34:38])[0]
        header_data = self.decrypted_data[header_pos:]
        sections = []
        offset = 0

        while offset < len(header_data):
            # Check if we have enough data for a complete section
            if offset + 4 > len(header_data):
                break

            section = {}

            # Read SFDS magic
            section['section_magic'] = header_data[offset:offset+4].hex().upper()
            offset += 4

            if offset + 1 > len(header_data):
                break

            # Read tag type and string
            tag_type = header_data[offset]
            offset += 1
            if tag_type == 6:  # String type
                try:
                    tag, offset = self._read_string(header_data, offset)
                    section['tag'] = tag
                except:
                    break

            # Read section data
            try:
                if offset + 4 > len(header_data):
                    break

                # Uncompressed size
                section['uncompressed_size'] = struct.unpack(
                    "<I", header_data[offset:offset+4])[0]
                offset += 5  # Including type byte

                # Compression type
                section['compression_type'] = struct.unpack(
                    "<I", header_data[offset:offset+4])[0]
                offset += 5

                # Data positions
                section['data_begin'] = struct.unpack(
                    "<I", header_data[offset:offset+4])[0]
                offset += 5
                section['data_end'] = struct.unpack(
                    "<I", header_data[offset:offset+4])[0]
                offset += 5

                # Try to decompress data
                compressed_data = self.decrypted_data[section['data_begin']
                    :section['data_end']]
                try:
                    decompressed = zlib.decompress(compressed_data)
                    section['decompression_successful'] = True
                    section['decompressed_size'] = len(decompressed)
                    # For LYRIC_DATA, try to decode as CP874
                    if section.get('tag') == 'LYRIC_DATA':
                        try:
                            section['decoded_sample'] = decompressed[:100].decode(
                                'cp874')
                        except:
                            section['decoded_sample'] = None
                except:
                    section['decompression_successful'] = False

                # Skip remaining section header data
                offset += 48  # Skip remaining fields and padding

            except:
                break

            sections.append(section)

        return sections

    def print_analysis(self):
        """Print detailed analysis of the file"""
        print(f"=== EMK File Analysis: {self.file_path} ===")
        print(f"File size: {len(self.encrypted_data)} bytes")

        print("\n=== Header Analysis ===")
        header = self.analyze_header()
        for key, value in header.items():
            print(f"{key}: {value}")

        print("\n=== Section Analysis ===")
        sections = self.analyze_sections()
        for i, section in enumerate(sections):
            print(f"\nSection {i+1}:")
            for key, value in section.items():
                if key == 'decoded_sample' and value:
                    print(f"{key}: {value[:50]}...")  # Show first 50 chars
                else:
                    print(f"{key}: {value}")


def compare_emk_files(original_path: str, generated_path: str):
    """Compare two EMK files in detail"""
    print("Analyzing original file...")
    original = EMKAnalyzer(original_path)
    original.print_analysis()

    print("\nAnalyzing generated file...")
    generated = EMKAnalyzer(generated_path)
    generated.print_analysis()


# Example usage:
analyzer = EMKAnalyzer("/Users/digixtwo/Documents/Project/next-lyr/public/emk/WN00849.emk")
analyzer.print_analysis()
# #
# # Or to compare:
# compare_emk_files("/Users/digixtwo/Documents/Project/next-lyr/public/emk/WN00849.emk", "/Users/digixtwo/Documents/Project/next-lyr/public/emk/.emk")
