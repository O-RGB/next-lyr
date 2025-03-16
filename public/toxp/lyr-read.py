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

cur = read_cursor_file("/Users/digixtwo/Documents/Project/next-lyr/public/emk/NE001.cur")

# ใช้ pprint ให้แสดงผลสวยงาม
pprint(cur, compact=True, width=80)

print("Enter your name:")
x = input()