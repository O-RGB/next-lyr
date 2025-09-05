// "use client";

// import { useState, ChangeEvent, useCallback } from "react";
// import * as MidiEditer from "./lib/processor";
// import { ParseResult } from "./lib/processor";
// import {
//   BiCode,
//   BiUpload,
//   BiSave,
//   BiCheckCircle,
//   BiXCircle,
// } from "react-icons/bi";
// import { SiTypescript } from "react-icons/si";

// interface JsonEditorProps {
//   title: string;
//   value: string;
//   onChange: (value: string) => void;
//   rows?: number;
// }

// const JsonEditor = ({ title, value, onChange, rows = 8 }: JsonEditorProps) => (
//   <div className="bg-white rounded-lg p-4 ring-1 ring-gray-200 shadow-sm">
//     <label className="block text-sm font-medium text-gray-700 mb-2">
//       {title}
//     </label>
//     <textarea
//       value={value}
//       onChange={(e) => onChange(e.target.value)}
//       rows={rows}
//       className="w-full bg-gray-50 text-gray-800 p-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm transition"
//       spellCheck="false"
//     />
//   </div>
// );

// interface StatusBoxProps {
//   status: { message: string; type: "success" | "error" };
// }

// const StatusBox = ({ status }: StatusBoxProps) => {
//   const isSuccess = status.type === "success";
//   const bgColor = isSuccess ? "bg-green-100" : "bg-red-100";
//   const textColor = isSuccess ? "text-green-800" : "text-red-800";
//   const ringColor = isSuccess ? "ring-green-300" : "ring-red-300";
//   const Icon = isSuccess ? BiCheckCircle : BiXCircle;

//   return (
//     <div
//       className={`flex items-center gap-3 p-4 my-6 rounded-lg ring-1 ${bgColor} ${textColor} ${ringColor}`}
//     >
//       <Icon size={20} />
//       <span className="font-medium">{status.message}</span>
//     </div>
//   );
// };

// // --- Main Component ---

// export default function MidiEditorComponent() {
//   const [parsedData, setParsedData] = useState<ParseResult | null>(null);
//   const [infoJson, setInfoJson] = useState<string>("");
//   const [lyricsJson, setLyricsJson] = useState<string>("");
//   const [chordsJson, setChordsJson] = useState<string>("");
//   const [status, setStatus] = useState<{
//     message: string;
//     type: "success" | "error";
//   } | null>(null);
//   const [fileName, setFileName] = useState<string>("");

//   const showStatus = (message: string, type: "success" | "error") => {
//     setStatus({ message, type });
//     setTimeout(() => setStatus(null), 5000);
//   };

//   const handleFileChange = useCallback(
//     async (e: ChangeEvent<HTMLInputElement>) => {
//       const file = e.target.files?.[0];
//       if (!file) return;

//       setFileName(file.name);
//       setStatus(null);
//       setParsedData(null);

//       try {
//         const result = await MidiEditer.loadMidiFile(file);

//         setParsedData(result);
//         setInfoJson(JSON.stringify(result.info, null, 2));
//         setLyricsJson(JSON.stringify(result.lyrics, null, 2));
//         setChordsJson(JSON.stringify(result.chords, null, 2));

//         showStatus("อ่านไฟล์ MIDI สำเร็จ!", "success");
//       } catch (error) {
//         const err = error as Error;
//         console.error("Error parsing MIDI file:", err);
//         showStatus(`เกิดข้อผิดพลาด: ${err.message}`, "error");
//       }
//     },
//     []
//   );

//   const handleSave = useCallback(() => {
//     if (!parsedData) {
//       showStatus("กรุณาโหลดไฟล์ MIDI ก่อน", "error");
//       return;
//     }

//     try {
//       const newSongInfo: MidiEditer.SongInfo = JSON.parse(infoJson);
//       const newLyricsData: MidiEditer.LyricEvent[][] = JSON.parse(lyricsJson);
//       const newChordsData: MidiEditer.ChordEvent[] = JSON.parse(chordsJson);

//       const newMidiBuffer = MidiEditer.buildModifiedMidi({
//         originalMidiData: parsedData.midiData,
//         newSongInfo,
//         newLyricsData,
//         newChordsData,
//         headerToUse: parsedData.detectedHeader,
//       });

//       const blob = new Blob([newMidiBuffer as BlobPart], {
//         type: "audio/midi",
//       });
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = `${newSongInfo.TITLE || "edited_song"}.mid`;
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
//       URL.revokeObjectURL(url);

//       showStatus("บันทึกไฟล์สำเร็จ!", "success");
//     } catch (error) {
//       const err = error as Error;
//       console.error("Error saving MIDI file:", err);
//       showStatus(`เกิดข้อผิดพลาดตอนบันทึก: ${err.message}`, "error");
//     }
//   }, [parsedData, infoJson, lyricsJson, chordsJson]);

//   return (
//     <div className="bg-gray-50 text-gray-900 min-h-screen w-full font-sans p-4 sm:p-8">
//       <main className="max-w-5xl mx-auto">
//         {/* Header */}
//         <header className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-200">
//           <div className="flex items-center gap-3 mb-4 sm:mb-0">
//             <BiCode size={32} className="text-blue-600" />
//             <h1 className="text-2xl font-bold text-gray-800">
//               LyrEdit Decoder
//             </h1>
//           </div>
//           <a
//             href="/processor.txt"
//             target="_blank"
//             rel="noopener noreferrer"
//             className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors border border-gray-300"
//           >
//             <SiTypescript />
//             View Processor Code
//           </a>
//         </header>

//         {/* Description Section - Updated with user's summary */}
//         <div className="p-6 bg-white rounded-lg ring-1 ring-gray-200 shadow-sm">
//           <h3 className="text-lg font-semibold text-gray-700 mb-2">
//             ⚙️ กระบวนการอ่าน (Parsing)
//           </h3>
//           <p className="text-gray-600 mb-3">
//             เมื่อทำการอ่านไฟล์ MIDI, processor.ts
//             จะเริ่มจากการวิเคราะห์โครงสร้างหลักของไฟล์ (Header, Tracks, Events)
//             จากนั้นจะค้นหา Meta Event พิเศษที่เก็บข้อมูล KLyr
//             ซึ่งมักซ่อนอยู่ภายใต้แท็ก LyrHdr...
//             ข้อมูลนี้จะถูกถอดรหัสทีละขั้นตอน:
//           </p>
//           <ol className="list-decimal list-inside text-gray-600 space-y-1 pl-4">
//             <li>แปลงข้อมูลจาก Base64</li>
//             <li>คลายการบีบอัดด้วย Pako</li>
//             <li>ถอดรหัสอักขระแบบ TIS-620 จนได้ข้อมูลในรูปแบบ XML</li>
//             <li>
//               สุดท้ายจึงแยกส่วนของ XML
//               นี้ออกมาเพื่อดึงรายละเอียดของเพลงและเนื้อร้อง แล้วแปลงให้อยู่ในรูป
//               JSON เพื่อให้ระบบสามารถนำไปใช้งานหรือแก้ไขได้สะดวก
//             </li>
//           </ol>
//           <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">
//             🛠️ กระบวนการสร้าง (Building)
//           </h3>
//           <p className="text-gray-600">
//             ในกระบวนการสร้างไฟล์ MIDI ขึ้นใหม่, processor.ts
//             จะนำข้อมูลเพลงและเนื้อร้องที่แก้ไขแล้วมาสร้างเป็น XML ใหม่
//             ก่อนที่จะเข้ารหัสกลับด้วยลำดับขั้นตรงกันข้าม คือแปลงอักขระเป็น
//             TIS-620, บีบอัดด้วย Pako และเข้ารหัส Base64 หลังจากนั้นจึงสร้างแทร็ก
//             MIDI
//             สำหรับเก็บข้อมูลเนื้อเพลงและฝังข้อมูลที่ถูกเข้ารหัสแล้วกลับเข้าไปในแทร็กนั้น
//             เมื่อทุกแทร็กถูกประกอบเข้าด้วยกัน ก็จะได้ไฟล์ MIDI
//             ไบนารีสมบูรณ์ที่พร้อมใช้งาน
//           </p>
//         </div>

//         {/* Upload Section */}
//         <div className="bg-white rounded-lg p-6 ring-1 ring-gray-200 shadow-sm mb-6">
//           <label
//             htmlFor="midi-upload"
//             className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-lg cursor-pointer transition-colors bg-gray-50 hover:bg-gray-100"
//           >
//             <div className="flex flex-col items-center justify-center pt-5 pb-6">
//               <BiUpload className="w-10 h-10 mb-3 text-gray-400" />
//               <p className="mb-2 text-sm text-gray-500">
//                 <span className="font-semibold text-blue-600">
//                   คลิกเพื่ออัปโหลด
//                 </span>{" "}
//                 หรือลากไฟล์ .mid มาวาง
//               </p>
//               {fileName && (
//                 <p className="text-xs text-gray-500 mt-2">
//                   ไฟล์ล่าสุด: {fileName}
//                 </p>
//               )}
//             </div>
//             <input
//               id="midi-upload"
//               type="file"
//               accept=".mid,.midi"
//               className="hidden"
//               onChange={handleFileChange}
//             />
//           </label>
//         </div>

//         {/* Status Messages */}
//         {status && <StatusBox status={status} />}

//         {/* Editor Section */}
//         {parsedData && (
//           <div className="animate-fade-in">
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
//               <JsonEditor
//                 title="🎵 Music Info (JSON)"
//                 value={infoJson}
//                 onChange={setInfoJson}
//                 rows={10}
//               />
//               <JsonEditor
//                 title="🎤 Lyrics (JSON)"
//                 value={lyricsJson}
//                 onChange={setLyricsJson}
//                 rows={10}
//               />
//               <div className="lg:col-span-2">
//                 <JsonEditor
//                   title="🎸 Chords (JSON)"
//                   value={chordsJson}
//                   onChange={setChordsJson}
//                   rows={8}
//                 />
//               </div>
//             </div>

//             <div className="flex justify-center">
//               <button
//                 onClick={handleSave}
//                 className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg font-semibold text-lg text-white transition-all transform hover:scale-105 shadow-md"
//               >
//                 <BiSave size={20} />
//                 บันทึกไฟล์ MIDI ที่แก้ไขแล้ว
//               </button>
//             </div>
//           </div>
//         )}
//       </main>
//     </div>
//   );
// }
