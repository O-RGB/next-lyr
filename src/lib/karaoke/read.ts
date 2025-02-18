import { EMK_FILE_TYPE } from "@/configs/value";
import { parseEMKFile } from "./emk";
import { readCursorFile, readLyricsFile, validateSongFileTypes } from "./ncn";

export const onSelectTestMusic = async (
  _: File | undefined,
  FileList: FileList
) => {
  if (FileList.length === 1) {
    const file = FileList.item(0);
    if (!file?.name.toLowerCase().endsWith(EMK_FILE_TYPE)) {
      return;
    }
    const decode = await parseEMKFile(file);
    if (decode.cur && decode.lyr && decode.mid) {
      var song: SongFilesDecode = {
        mid: decode.mid,
        cur: (await readCursorFile(decode.cur)) ?? [],
        lyr: await readLyricsFile(decode.lyr),
      };
      return song;
    }
  } else if (FileList.length === 3) {
    const valid = validateSongFileTypes(FileList);
    if (!valid) {
      return;
    }
    var song: SongFilesDecode = {
      mid: valid.mid,
      cur: (await readCursorFile(valid.cur)) ?? [],
      lyr: await readLyricsFile(valid.lyr),
    };
    return song;
  }
};

export const readSong = async (
  file: FileList
): Promise<SongFiltsEncodeAndDecode[]> => {
  let song: SongFiltsEncodeAndDecode[] = [];
  const groups = groupFileTrackList(file);

  await Promise.all(
    Object.values(groups).map(async (group) => {
      if (group.emk) {
        let lyr: string[] = [];
        try {
          const decode = await parseEMKFile(group.emk);
          lyr = decode.lyr ? await readLyricsFile(decode.lyr) : [];
          if (decode.cur && decode.lyr && decode.mid) {
            const read: SongFiltsEncodeAndDecode = {
              mid: decode.mid,
              cur: (await readCursorFile(decode.cur)) ?? [],
              lyr: lyr,
              emk: group.emk,
            };
            song.push(read);
          }
        } catch (error) {
          song.push({
            cur: [],
            lyr: lyr,
            mid: new File([], group.emk.name),
            error: true,
          });
        }
      } else if (group.mid && group.cur && group.lyr) {
        const read: SongFiltsEncodeAndDecode = {
          mid: group.mid,
          cur: (await readCursorFile(group.cur)) ?? [],
          lyr: await readLyricsFile(group.lyr),
          encode: {
            cur: group.cur,
            lyr: group.lyr,
            mid: group.mid,
          },
        };
        song.push(read);
      }
    })
  );

  return song;
};

export const groupFileTrackList = (fileList: FileList): FileGroup[] => {
  const files: File[] = Array.from(fileList);
  const groups: FileGroup[] = [];
  const fileMap: { [key: string]: FileGroup } = {};

  files.map((file) => {
    const fileNameParts = file.name.split(".");
    const fileExtension = fileNameParts.pop()?.toLowerCase();
    const fileName = fileNameParts.join(".");

    if (fileExtension === "emk") {
      groups.push({ emk: file });
    } else {
      if (!fileMap[fileName]) {
        fileMap[fileName] = {};
      }

      if (fileExtension === "mid") {
        fileMap[fileName].mid = file;
      } else if (fileExtension === "lyr") {
        fileMap[fileName].lyr = file;
      } else if (fileExtension === "cur") {
        fileMap[fileName].cur = file;
      }
    }
  });

  Object.values(fileMap).map((group) => {
    groups.push(group);
  });

  return groups;
};

export const getTracklistFile = (file: File) => {};
