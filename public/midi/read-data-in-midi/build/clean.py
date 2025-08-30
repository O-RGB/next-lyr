import mido
import os

def clear_midi_data(input_path: str, output_path: str):
    """
    Loads a MIDI file, removes all lyric, text, and chord data, and saves it to a new file.

    This function is more aggressive and removes:
    1. All Text events (msg.type == 'text'), which often contain lyrics or other metadata.
    2. All Marker events (msg.type == 'marker'), which are often used for chords.
    3. All standard Lyric events (msg.type == 'lyric').

    It correctly handles the delta times of the messages to ensure the MIDI timing
    remains intact after removing events.

    Args:
        input_path (str): The path to the source MIDI file.
        output_path (str): The path where the cleaned MIDI file will be saved.
    """
    try:
        # Load the original MIDI file
        midi = mido.MidiFile(input_path)
        print(f"🗂️  กำลังอ่านไฟล์: {input_path}")

    except FileNotFoundError:
        print(f"❌ เกิดข้อผิดพลาด: ไม่พบไฟล์ที่ '{input_path}'")
        return
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดในการอ่านไฟล์ MIDI: {e}")
        return

    # Iterate through each track in the MIDI file
    for i, track in enumerate(midi.tracks):
        # A list to hold the messages we want to keep
        new_messages = []
        # This variable will accumulate the delta time of removed messages
        time_accumulator = 0

        # Iterate through each message in the track
        for msg in track:
            # --- Define condition for removing a message ---
            # We will remove any message that is of type 'text', 'marker', or 'lyric'
            is_removable = msg.type in ['text', 'marker', 'lyric']

            if is_removable:
                # Add the message's time to the accumulator. This delta time
                # needs to be passed on to the next valid message.
                time_accumulator += msg.time
                
                # Log what is being removed for clarity
                log_text = (msg.text[:40] + '...') if len(msg.text) > 40 else msg.text
                print(f"   - กำลังลบ '{msg.type}' event ('{log_text.strip()}') จาก Track {i}...")

            else:
                # If we are keeping this message, add the accumulated time
                # from any previously removed messages to its delta time.
                if time_accumulator > 0:
                    msg.time += time_accumulator
                    time_accumulator = 0 # Reset the accumulator
                
                new_messages.append(msg)
        
        # Replace the old track content with the new, filtered content
        track[:] = new_messages

    try:
        # Save the modified MIDI object to the new file
        midi.save(output_path)
        print(f"\n✅ ล้างข้อมูลสำเร็จ! ไฟล์ใหม่ถูกบันทึกที่: {output_path}")
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดในการบันทึกไฟล์ MIDI: {e}")


# --- Example Usage ---
if __name__ == "__main__":
    # --- Configuration ---
    # ❗ โปรดเปลี่ยนเส้นทางไฟล์ด้านล่างให้ตรงกับตำแหน่งไฟล์ของคุณ
    # ❗ Please change the file paths below to match your file locations.
    
    # ใส่พาธของไฟล์ MIDI ที่คุณต้องการล้างข้อมูล
    # --- This path was taken from your log output ---
    INPUT_MIDI_PATH = "/Users/digixtwo/Documents/Project/next-lyr/public/midi/read-data-in-midi/build/MHY27.mid"
    
    # ตั้งชื่อและพาธสำหรับไฟล์ใหม่ที่จะถูกสร้างขึ้น
    OUTPUT_MIDI_PATH = "/Users/digixtwo/Documents/Project/next-lyr/public/midi/read-data-in-midi/build/MHY27_cleaned.mid"

    # --- Run the cleaning function ---
    # Check if the input file exists before running
    if not os.path.exists(INPUT_MIDI_PATH):
         print(f"❌ เกิดข้อผิดพลาด: ไม่พบไฟล์ต้นฉบับที่ '{INPUT_MIDI_PATH}'")
         print("กรุณาตรวจสอบและแก้ไขตัวแปร INPUT_MIDI_PATH ให้ถูกต้อง")
    else:
        clear_midi_data(INPUT_MIDI_PATH, OUTPUT_MIDI_PATH)
