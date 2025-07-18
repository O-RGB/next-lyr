import json
def generate_segment(lyric, tick, BPM):
    step = round(864 / BPM)
    timings = [tick[0]]
    
    for i, word in enumerate(lyric):
        for j in range(len(word)):
            if i == len(lyric) - 1:
                timings.append(tick[i + 1] + j * step)
            else:
                timings.append(tick[i + 1] + j)
    
    return timings

def reverse_generate_segment(lyric, tick):
    result = []
    index = 0

    for i in range(len(lyric)):
        word = lyric[i]
        start = tick[index]
        cursors = tick[index + 1 : index + 1 + len(word)]
        end = cursors[len(cursors)-1]
        result.append({
            "lyrics": word, 
            "start": start, 
            "end": end, 
            "word_count": len(word), 
            "cursor_count":len(cursors), 
            "cursors":cursors
        })
        index += len(word) + 1
    
    return result

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

lyric_data = []
with open("/Users/digixtwo/Documents/Project/next-lyr/public/emk/WN00849.lyr", "r", encoding="cp874") as f:
    lyric_data = f.read()
lyric_data = lyric_data.split("\n")
lyric_data = (lyric_data[4:len(lyric_data)-1])

cursors = read_cursor_file("/Users/digixtwo/Documents/Project/next-lyr/public/emk/WN00849.cur")
result = sum(len(word) for word in lyric_data)

print("cursors All:", len(cursors))
print("lyric char All:", result)
print("Last Cursor:", cursors[len(cursors) -1])


reverse = reverse_generate_segment(lyric_data, cursors)
print("Process Line:",len(reverse))
print(json.dumps(reverse, indent=2, ensure_ascii=False))
input()