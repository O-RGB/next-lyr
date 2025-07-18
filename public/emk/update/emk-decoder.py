import zlib
import struct
import os
from itertools import cycle


class EMKDecoder:
    def __init__(self, emkFile, saveFolder):
        self.magic = True
        self.saveFolder = saveFolder
        self.encoding = False
        
        # เปิดไฟล์และอ่านข้อมูล
        try:
            with open(emkFile, 'rb') as f:
                self.data = bytearray(f.read())
        except Exception as e:
            print(f"Error reading the file: {e}")
            self.magic = False
            return
        
        # การเข้ารหัสด้วย XOR
        xorKey = bytes.fromhex("AFF24C9CE9EA9943")
        for i in range(len(self.data)):
            self.data[i] ^= xorKey[i % len(xorKey)]

        # ตรวจสอบ Magic number
        magic = bytes.fromhex("2e53464453")
        if self.data[:len(magic)] != magic:
            self.magic = False
            print("Invalid magic test")

        # อ่านข้อมูลส่วนหัว
        try:
            headerPos = int.from_bytes(self.data[0x22:0x2a], 'little')
            headerEnd = int.from_bytes(self.data[0x2a:0x32], 'little')
            self.header = self.data[headerPos:headerEnd]
        except Exception as e:
            print(f"Error processing header: {e}")
            self.magic = False
            return

        self.off = 0
        self.sound_info = {}

        self.nameInfo = ""
        self.artistInfo = ""
        self.lyrics = ""
        self.midi = ""
        self.cursor = ""

    def getMagicError(self):
        return self.magic

    def skipBytes(self, n):
        self.off += n

    def readByte(self):
        v = self.header[self.off]
        self.off += 1
        return v

    def readUShort(self):
        v = struct.unpack('<H', self.header[self.off:self.off+2])[0]
        self.off += 2
        return v

    def readUInt(self):
        v = struct.unpack('<I', self.header[self.off:self.off+4])[0]
        self.off += 4
        return v

    def readString(self):
        len = self.readByte()
        str = self.header[self.off:self.off+len].decode('utf8')
        self.off += len
        return str

    def checkMagic(self, magic):
        data = self.header[self.off:self.off+len(magic)]
        if data != magic:
            raise ValueError(f"Invalid magic: {data.hex()} != {magic.hex()}")
        self.off += len(magic)

    def readTag(self):
        tag = self.readByte()
        if tag == 2:
            return self.readByte()
        elif tag == 3:
            return self.readUShort()
        elif tag == 4:
            return self.readUInt()
        elif tag == 6:
            return self.readString()
        else:
            raise ValueError(f"Unknown tag: 0x{tag:x}")

    def setEncodeText(self):
        self.encoding = True

    def decodeEmk(self):
        try:
            magic = bytes.fromhex("53464453")  # SFDS
            while self.off < len(self.header):
                self.checkMagic(magic)
                tag = self.readTag()
                uncompressedSize = self.readTag()
                unk2 = self.readTag()
                dataBegin = self.readTag()
                dataEnd = self.readTag()
                unk5 = self.readTag()
                unk6 = self.readTag()
                self.skipBytes(0x10)
                unk7 = self.readTag()
                unk8 = self.readTag()

                compressedData = self.data[dataBegin:dataEnd]
                rawData = zlib.decompress(compressedData)
                if len(rawData) != uncompressedSize:
                    raise ValueError("Invalid uncompressed size")

                ext = {
                    2: "txt",
                    3: "mid",
                    4: "txt",
                    6: "bin",
                    7: "bin",
                }
                filename = f"{tag}.{ext.get(tag, 'bin')}"

                if not os.path.exists(self.saveFolder):
                    os.makedirs(self.saveFolder)

                mode = 'wb'
                if self.encoding and tag not in [3, 6]:
                    mode = 'w'
                    rawData = rawData.decode("cp874")

                with open(os.path.join(self.saveFolder, filename), mode) as f:
                    f.write(rawData)

            return True
        except Exception as e:
            print(f"Error decoding EMK file: {e}")
            return False

    def getSoundInfo(self):
        return self.nameInfo, self.artistInfo

    def getBase64Data(self):
        return {
            "lyr": self.lyrics,
            "cur": self.cursor,
            "mid": self.midi
        }


# Define file paths
emk_file_path = '/Users/digixtwo/Documents/Project/next-lyr/public/emk/update/emk/H00011.emk'
save_folder = '/Users/digixtwo/Documents/Project/next-lyr/public/emk/update/decoded'

# Decode the file using the modified class
decoder = EMKDecoder(emk_file_path, save_folder)
result = decoder.decodeEmk()