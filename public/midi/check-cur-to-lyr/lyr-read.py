from pprint import pprint

def read_cursor_file(file_path: str):
    try:
        with open(file_path, "rb") as file:
            data = file.read()

        cursor_data = []
        offset = 0
        data_length = len(data)

        while offset < data_length:
            tmp_byte1 = data[offset]
            if offset + 1 < data_length:
                tmp_byte2 = data[offset + 1]
                if tmp_byte2 == 0xFF:
                    break
                value = tmp_byte1 + (tmp_byte2 << 8)
                cursor_data.append(value)
                offset += 2
            else:
                cursor_data.append(tmp_byte1)
                offset += 1

        return cursor_data
    except Exception as e:
        print("Error loading cursor:", e)
        return []

cur = read_cursor_file("/Users/digixtwo/Documents/Project/next-lyr/public/emk/U001.cur")
with open("/Users/digixtwo/Documents/Project/next-lyr/public/emk/U001.lyr", "r", encoding="cp874") as f:
    lyric_data = f.read()
lyric_data = lyric_data.split("\n")
lyric_data = (lyric_data[4:len(lyric_data)-1])
# ใช้ pprint ให้แสดงผลสวยงาม
# pprint(cur, compact=True, width=80)
print("lyric_data", (lyric_data))

# รวมบรรทัดทั้งหมดเป็นสตริงเดียว
all_text = ''.join(lyric_data)

# นับจำนวนตัวอักษร
char_count = len(all_text)

print("จำนวนตัวอักษรทั้งหมด:", char_count)

# print("cur", len(cur))
print("cur", cur)



