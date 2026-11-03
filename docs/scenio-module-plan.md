# Scenio — แผนโมดูลภาพฉากตามเวลาเพลง

สถานะ: อยู่ระหว่างพัฒนาและทดสอบ Scenio
วันที่: 2026-11-02

จุดย้อนกลับก่อนเริ่มงาน:
- Lyrio Studio (`next-lyr`): `bc39b39`
- Next Karaoke (`karaoke-web-online`): `d19b3cc`

## 1. ข้อสรุปการออกแบบ

สร้างโปรเจกต์และแพ็กเกจ `scenio` แยกตั้งแต่ต้น เป็น sibling ของ `lyrio`,
`next-lyr` และ `karaoke-web-online` ทั้ง Studio preview และตัวเล่นจริงต้องใช้
Scenio เวอร์ชันเดียวกัน ไม่มีโค้ด fade อีกชุดอยู่ในแต่ละแอป

Scenio รับผิดชอบรูปแบบข้อมูลฉาก การคำนวณสถานะตามเวลา การโหลด/ปล่อยภาพ
และการแสดงภาพ ส่วนหน้าจอแก้ไข การบันทึกโปรเจกต์ การเข้าถึงไฟล์เพลงและเสียง
เป็นหน้าที่ของแอปผู้ใช้แพ็กเกจ

Lyrio แสดงเนื้อร้อง และ Scenio แสดงฉาก เป็นแพ็กเกจอิสระที่รับเวลาเพลงจาก host
เดียวกัน ไม่ให้แพ็กเกจใดควบคุมอีกแพ็กเกจ และไม่ให้ Scenio พึ่ง FluidSynth

## 2. ขอบเขตรุ่นแรก

ทำเพียง:
- นำเข้าภาพนิ่งและเก็บเป็น WebP
- เรียงภาพเป็นรายการฉาก
- กำหนดเวลาเริ่มของแต่ละฉาก และระยะ fade เข้าฉากนั้น
- แสดงภาพค้างจนถึงฉากถัดไป และ crossfade ตามเวลาเพลง
- ดู preview, play/pause และ seek ร่วมกับเพลงและเนื้อร้อง
- บันทึกและเปิดโปรเจกต์ที่มีฉากได้

ยังไม่ทำ 2.5D, parallax, depth map, กล้อง, วิดีโอ, GIF/Animated WebP,
shader, keyframe animation, เอฟเฟกต์อื่น หรือ JavaScript ที่ผู้ใช้เขียนเอง
รุ่นแรกไม่มีระบบ plugin ที่รันโค้ดจากไฟล์เพลง

## 3. โครงสร้างแพ็กเกจ

```text
scenio/
  src/
    core/       # types, validation, timeline lookup และการคำนวณ fade
    runtime/    # asset cache, clock binding, renderer และ lifecycle
    react/      # React adapter ขนาดเล็ก
    format/     # อ่าน/เขียน scene JSON และรวบรวม asset ที่อ้างอิง
  tests/
  scripts/
  package.json
  README.md
```

Public entry points:
- `scenio/core`: types, validateDocument(), evaluateSceneAt()
- `scenio/runtime`: createScenioPlayer()
- `scenio/react`: ScenioView
- `scenio/format`: parse/serialize JSON, collectReferencedAssets()

ใช้ TypeScript + ESM และไฟล์ declaration แบบเดียวกับ Lyrio
React เป็น peer dependency ของ adapter เท่านั้น การ import core ต้องทำได้ใน
Node/worker โดยไม่เข้าถึง window/document หรือโหลด React/ตัว decoder
ไม่เพิ่ม audio engine, WASM decoder หรือ renderer ของ Lyrio ในแพ็กเกจนี้

## 4. ข้อมูลฉากรุ่น 1

```ts
interface ScenioDocument {
  format: 'scenio';
  version: 1;
  timeUnit: 'ms';
  backgroundColor: '#000000';
  assets: ScenioAsset[];
  scenes: ScenioScene[];
}

interface ScenioAsset {
  id: string;           // SHA-256 ของ WebP ที่จัดเก็บจริง
  mime: 'image/webp';
  width: number;
  height: number;
  bytes: number;
}

interface ScenioScene {
  id: string;           // ID ของการใช้ภาพครั้งนี้ ไม่ใช่ ID ไฟล์
  assetId: string;
  startMs: number;
  transition: {
    type: 'fade';
    durationMs: number;
  };
}
```

ภาพเดียวใช้หลายฉากได้ แต่เก็บ binary ครั้งเดียวต่อ asset ID
เอกสาร JSON ไม่ใส่ Blob, object URL, absolute filesystem path หรือ base64
ตำแหน่งจัดเก็บ binary อยู่ใน storage adapter ของ host
ชื่อเดิมของภาพใช้เป็น metadata ของ editor ไม่ใช้เป็นคีย์ค้นหาไฟล์

เก็บความละเอียดเวลาเป็น integer milliseconds แสดงใน editor แบบ
`mm:ss.mmm` ไม่เก็บคำสั่งรอเวลาเป็นลำดับ และไม่อ้างเวลา wall clock ของเครื่อง

## 5. กติกาเวลาและ fade ที่แน่นอน

- แต่ละฉากหมายถึง “เริ่ม fade เข้ามาที่ startMs”
- ฉากแรก fade จากสีดำ ถ้าเริ่มหลัง 0 ก่อนหน้านั้นแสดงสีดำ
- ระยะ fade เป็น 0 หมายถึงเปลี่ยนภาพทันที
- ภาพปัจจุบันค้างจนกว่าฉากถัดไปจะเริ่ม ฉากสุดท้ายค้างจนเพลงจบ
- เอกสารว่างแสดงว่าไม่มีฉากเพลง ให้ host ใช้ wallpaper ปกติ
- เวลาเริ่มต้องไม่ติดลบ และเรียงเพิ่มขึ้นอย่างเคร่งครัด ห้ามฉากเวลาเริ่มซ้ำกัน
- fade ต้องจบก่อนหรือพอดีกับฉากถัดไป จึงมีภาพที่กำลังผสมไม่เกินสองภาพ
- durationMs ต้องไม่ติดลบและเป็นค่าจำกัด ไม่รับ NaN/Infinity
- เมื่อทราบความยาวเพลง ห้ามฉากเริ่มหลังเพลงจบหรือ fade เกินเวลาจบเพลง
- ข้อมูลผิดเงื่อนไขต้องแสดงข้อผิดพลาดและไม่ให้บันทึก/export ไม่แก้เวลาของผู้ใช้เงียบ ๆ
- จำกัดรุ่นแรก 1,000 ฉาก, 128 ภาพไม่ซ้ำ, JSON 1 MB และภาพรวม 32 MB ต่อเพลง
  ตรวจขนาด/จำนวนก่อน decode และตรวจ asset ID/hash/MIME/dimensions ก่อนใช้ไฟล์

ตัวอย่าง: ภาพ A เริ่ม 0 ms, fade 500 ms; ภาพ B เริ่ม 10,000 ms, fade 2,000 ms
ที่ 11,000 ms ต้องได้ A/B ผสมกัน 50% ไม่ว่ามาถึงเวลานี้ด้วยการเล่นปกติหรือ seek

`evaluateSceneAt(document, positionMs)` เป็น pure function ค้นฉากด้วย binary
search แล้วคืน previous/current asset ID, progress และช่วงเวลาที่ต้องวาดต่อ
ต้องไม่ replay ฉากตั้งแต่ต้นเมื่อ seek และไม่อ่าน progress จาก CSS animation

## 6. การเรียงภาพใน editor

รายการเรียงตามเวลาเสมอ ผู้ใช้ลากหรือใช้ปุ่มขึ้น/ลงเพื่อย้ายภาพไปยัง slot เวลา
อื่น โดยคงค่าช่วงเวลาของ slot ไว้ วิธีนี้ไม่ทำให้เวลาทั้งเพลงขยับเมื่อสลับภาพ
เมื่อเพิ่มภาพ ให้ต่อท้ายจาก slot ล่าสุด; เมื่อมีหลายภาพนำเข้า ให้เพิ่มตามลำดับไฟล์
ตรวจว่าเวลาที่เสนอไม่เกินความยาวเพลงก่อนเพิ่ม ผู้ใช้แก้เวลาได้ทุก slot

ค่าเริ่มต้นสำหรับเพลงใหม่: ฉากแรก 0 ms, ฉากถัดไปเพิ่มครั้งละ 10,000 ms,
fade 1,000 ms; ถ้าเพลงสั้นเกินกว่าจะเพิ่ม slot ตามกติกา ให้แจ้งและให้ผู้ใช้กำหนด
เวลาที่เหมาะสมก่อนเพิ่ม ไม่สร้างฉากเวลาซ้ำเพื่อให้เพิ่มได้

เมื่อลบฉาก ไม่เลื่อนเวลาของฉากอื่นอัตโนมัติ ภาพก่อนหน้าจะแสดงค้างนานขึ้น
เมื่อลบภาพออกจากคลัง ลบเฉพาะรายการให้เลือก เก็บ binary ที่ฉากยังอ้างอิง
แบบเดียวกับ Gallery ของเนื้อร้อง ไม่ต้อง duplicate รูปในทุกฉาก

## 7. Clock และการ sync

Host ส่ง clock contract แบบนี้ให้ Scenio:

```ts
interface ScenioClock {
  read(): { positionMs: number; playing: boolean };
  subscribe(listener: () => void): () => void;
}
```

- ใช้ตำแหน่งเสียงจาก transport ของเพลงเดียวกับที่ส่งให้ Lyrio
- MIDI tick ต้องผ่าน tempo map ของ host เป็น milliseconds ก่อนส่ง ไม่ใช้สูตร BPM คงที่
- กำหนด 0 ms ให้ตรงจุดเริ่มเพลง ไม่ใช้เลข beat/เวลาในข้อความบนหน้าจอเป็น clock
- ไม่เอา pre-roll ของ lyrics มาบวกซ้ำกับเวลา scene
- Studio ที่ยังไม่มีเสียงพร้อมสามารถ seek preview ด้วยตำแหน่งชั่วคราวจาก host ได้
- ตอน pause แสดงผลค้าง ณ เวลาเดิม ไม่มี loop วาดต่อ
- ตอน seek, เปลี่ยนเพลง, resume หรือกลับมาเปิดแท็บ คำนวณจาก read() ใหม่ทันที
- Scenio ไม่มี AudioContext, timer เพลง หรือ setInterval ของตัวเอง
- clock subscription ใช้แจ้งการเปลี่ยนสถานะ/seek; ระหว่าง fade จึงใช้ rAF อ่าน clock
  เพื่อปรับภาพ ไม่ให้ host ส่ง React state ใหม่ทุกเฟรม

## 8. Renderer รุ่นแรก

ใช้ DOM สองเลเยอร์สำหรับภาพนิ่ง แต่ละเลเยอร์มีพื้นหลังดำและรูป WebP
ใช้ `object-fit: cover` และกึ่งกลางเป็นค่าเริ่มต้น ไม่มีแถบปรับ fit/position ในรุ่นแรก
ขนาด container มาจาก host ไม่กำหนดตาม window เสมอไป

เลเยอร์ภาพเก่าอยู่ล่างเต็ม opacity ส่วนเลเยอร์ใหม่อยู่บนและปรับ opacity ตาม
progress ของ timeline พื้นหลังดำของแต่ละเลเยอร์ต้องถูกผสมไปด้วย เพื่อให้ภาพ
ที่มี alpha fade ถูกต้อง ไม่กลายเป็นภาพซ้อนผิดสี ไม่ใช้ CSS transition ไล่ตาม
เวลาเครื่อง แต่ตั้ง opacity จาก clock โดยตรง

Scenio อยู่ใต้เนื้อร้องและ UI และใช้ pointer-events: none
React adapter สร้าง/ทำลาย controller; loop และการปรับ style อยู่ใน controller
เมื่อ host resize ไม่เปลี่ยนเวลาเพลงหรือเริ่ม animation ใหม่

## 9. รูปภาพและงบทรัพยากร

- ใช้ WebP ต่อไป เพื่อเน้นการรองรับ Android และลดภาระ decode
- ภาพ wallpaper ต้องมี importer/preset แยกจาก sticker: ห้ามย่อเหลือ 256 px
- จำกัดด้านยาวเริ่มต้นที่ 1920 px โดยไม่ขยายภาพเล็ก และคงอัตราส่วนเดิม
- ตั้งเป้าขนาดไฟล์ 300 KB ต่อภาพ เริ่ม quality ประมาณ 0.78 แล้วทดสอบภาพจริง
  ลด quality ก่อนลด resolution; ต่ำสุดที่ยอมรับใน preset นี้คือ 0.6
- hard limit เริ่มต้นของไฟล์หลังแปลง 1 MB; ถ้ายังเกินให้แจ้งผู้ใช้ ไม่ลดคุณภาพต่อโดยไม่บอก
- จำกัดภาพนำเข้า 20 MB และ 16 ล้าน pixels; ตรวจ dimensions ก่อน decode
- แปลงครั้งเดียวตอนนำเข้าใน worker ใช้ encoder WebP ที่มีอยู่ของ Studio ได้
  แต่ไม่โหลด encoder ตอนเล่นเพลง
- ไฟล์ต้นฉบับของผู้ใช้ไม่ถูกแก้ สติกเกอร์และ wallpaper อาจใช้คนละ asset ID
  ถ้าความละเอียด/ผลบีบอัดต่างกัน แม้เริ่มจากภาพเดียวกัน

Player preload ฉากแรกก่อนเริ่มแสดง และภาพถัดไปอย่างน้อย 2 วินาทีก่อน cue
เก็บ decoded images ตามการใช้งาน: สองภาพที่กำลังแสดง + ภาพถัดไปหนึ่งภาพ
ไม่ decode ภาพทุกภาพของเพลงพร้อมกัน เปลี่ยนเพลงต้องปล่อยทุก reference
ภาพ 1080p RGBA ประมาณ 8 MB ต่อภาพ ตัวเลขนี้ยังไม่รวมสำเนา/texture ของ browser
จึงต้องวัด memory จริง ไม่ใช้ขนาด WebP บนดิสก์แทนงบ RAM

ระหว่างภาพค้างไม่ต้องมี rAF ต่อเนื่อง ใช้ clock notification ร่วมกับ wake-up
ที่จองไว้ก่อน cue ถัดไป; wake-up ใช้แค่ปลุกแล้วอ่าน clock ใหม่ ไม่ใช้สะสมเวลาเพลง
เมื่อ hidden ให้หยุด animation loop และยกเลิก wake-up แล้ว reconcile เมื่อ visible

ภาพไม่พร้อมต้องไม่หยุดหรือเลื่อนเสียง: ถือภาพล่าสุดไว้จนพร้อม แล้วคำนวณภาพ
และ fade จากเวลาเพลงปัจจุบัน ห้ามเริ่ม fade ใหม่จาก 0 เพราะไฟล์มาช้า
ถ้า decode ล้มเหลวให้ข้ามภาพนั้น ใช้ภาพก่อนหน้า/พื้นหลังดำ พร้อมแจ้ง host หนึ่งครั้ง
request ที่มาจากเพลงเก่าต้องถูกทิ้งด้วย generation token หลังเปลี่ยนเพลง/seek

## 10. หน้าจอ Wallpaper Editor ใน Lyrio Studio

เข้าจาก Tools → Wallpaper เปิดเป็น modal/drawer แยก ใช้ component style
เดียวกับหน้าปรับ effects ปัจจุบัน

โครงหน้า:
1. หัวข้อและคำอธิบาย
2. preview ที่ตรึงอยู่ด้านบน พร้อมเพลงและ Lyrio overlay
3. ปุ่มเพิ่มภาพ และ play/pause/ตำแหน่งเวลา ใช้ transport เดียวกับ editor
4. รายการฉากที่เลื่อนได้: thumbnail, ชื่อภาพ, เวลาเริ่ม, fade, ย้ายขึ้น/ลง, ลบ
5. ปุ่มบันทึก/ยกเลิกที่อยู่คงที่ด้านล่าง

กดรายการเพื่อเลือกและ seek ไปเวลาเริ่ม; preview เปลี่ยนทันทีแต่ไม่ auto-play
แก้ข้อมูลใน draft ก่อน บันทึกจึง commit เข้าโปรเจกต์เป็นหนึ่ง undo step
ยกเลิกต้องคืนข้อมูลก่อนเปิด ไม่ทิ้งค่าแก้ครึ่งหนึ่งในโปรเจกต์
บนมือถือ preview และ footer ไม่เลื่อนตามรายการ และ keyboard ต้องไม่ทำให้ปุ่มบันทึกหาย

## 11. Storage ใน Studio

เพิ่ม IndexedDB schema สำหรับ scene document ของแต่ละ project และคลังภาพฉาก
แยก `gallery entry` ออกจาก `binary asset` เหมือนแนวทาง Gallery ที่ใช้อยู่
เก็บ WebP blob ตาม SHA-256 พร้อม metadata และเก็บเพียง asset ID ใน scene
ไม่ยัด base64 ของ wallpaper ลงทุกครั้งที่ autosave เนื้อร้อง

อ่าน scene document เฉพาะโปรเจกต์ที่กำลังเปิด; Project list ใช้ summary เดิม
ไม่โหลด/decode ภาพในรายการโปรเจกต์ การลบโปรเจกต์ไม่ลบไฟล์ที่โปรเจกต์อื่นใช้
รุ่นแรกยังไม่ทำ automatic garbage collection ของ shared binaries

## 12. การส่งฉากไปพร้อมไฟล์เพลง

เป้าหมายคือส่งเพลงไฟล์เดียวแล้วได้ภาพ/เวลาไปครบ แต่ Scenio ไม่เป็นเจ้าของ
codec เสียงหรือ container ของเพลง ให้ `scenio/format` รวบรวม document และ
binary ของภาพที่อ้างอิงจริง แล้วส่งให้ exporter ของ host

สำหรับ NKML ให้เพิ่ม logical entries ใน container เดิม:

```text
scenio.json
scenio-<sha256>.webp
```

โครงข้างบนหมายถึงชื่อ entry ไม่ได้หมายความว่าเปลี่ยน NKML เป็น ZIP:
โค้ดปัจจุบันใช้ NKMLFR01 ผ่าน `packages/nkml-container` อยู่แล้ว จึงต้องรักษา
container/encryption/การอ่าน OGG แบบเดิม
ชื่อ entry ต้องเป็นชื่อแบน: validName() ปัจจุบันไม่รับ `/` หรือ `\\`
container จำกัดรวม 512 entries และ companion entry ไม่เกิน 16 MB
exporter ต้องตรวจจำนวนรวมกับไฟล์เสียง/เนื้อร้องด้วย ไม่ตรวจเฉพาะภาพ
ภาพที่ใช้ซ้ำแนบครั้งเดียว และไม่แนบภาพอื่นทั้ง Gallery

จุดที่ต้องทำจริงก่อนประกาศว่าส่ง wallpaper ติดเพลงได้:
- exporter ของ host ต้องเขียน entries และตรวจครบทุก asset ก่อนสร้างไฟล์
- Next Karaoke ต้องอ่าน `scenio.json` จาก NKML และเปิด asset resolver
  ที่อ่าน/decrypt ภาพเป็นรายไฟล์ล่วงหน้าตามที่ต้องใช้ ไม่แตก OGG ใหม่
- writer ของ NKML Studio เป็น integration แยกที่ต้องแก้ด้วย หากเป็นผู้สร้าง NKML นั้น
- Lyrio Studio ปัจจุบัน export NKM/MP3/YKR เป็นหลัก ยังไม่มี exporter NKML
  จึงห้ามแสดงปุ่ม export wallpaper ลง NKML ว่าพร้อมก่อนทำ integration นี้
- parser ของแต่ละฟอร์แมตต้องรองรับ scene extension ก่อนเปิดตัวเลือก export นั้น
  รุ่นแรกไม่ดัดแปลงเนื้อหาของ legacy NCN/MIDI/MP3 โดยยัดข้อมูลใหม่เงียบ ๆ

การทำ editor/runtime และการทำไฟล์ส่งต่ออยู่ในงานเดียวกันแบบเป็นลำดับ
แต่ acceptance ของสองส่วนต้องแยกให้เห็นชัด: เล่น preview ได้ยังไม่เท่ากับส่งเพลง
แล้วผู้รับเปิดได้ครบ

เพลงเก่าที่ไม่มี scene document เล่นตามเดิม; Scenio version ที่ใหม่กว่าและยังไม่
รองรับให้ข้ามฉากพร้อมแจ้งว่าไม่รองรับ ไม่หยุดเพลง ส่วนคนรับที่ใช้ตัวเล่นเก่าอาจ
ไม่ได้เห็นฉาก จึงไม่รับประกัน compatibility โดยไม่ทดสอบตัวอ่านรุ่นนั้น

## 13. Next Karaoke integration

เพิ่ม song-scoped Scenio adapter ในชั้น wallpaper ปัจจุบัน
ถ้าเพลงมีฉากและผู้ใช้ใช้พื้นหลังเพลง ให้ Scenio แสดงแทน wallpaper ปกติ
ถ้าไม่มีฉาก ใช้พื้นหลังเดิม ผู้ใช้เปิดกล้อง/วิดีโอเองให้มีสิทธิ์เหนือฉากเพลง
และต้องปล่อยภาพ/loop ของ Scenio เมื่อไม่ได้แสดง

แสดงฉากทั้งจอเล่นหลักและจอเนื้อร้องแยก โดยใช้ clock ของการเล่นชุดเดียวกัน
แต่ละ view มี lifecycle ของตัวเอง ไม่ share DOM element ข้ามหน้าต่าง
การ sync ข้ามเครื่องไม่ใช่ขอบเขตรุ่นแรก ไม่ส่งภาพผ่าน clock channel ทุกเฟรม

เปลี่ยนเพลงหรือเข้า medley ต้องตั้ง scene scope ใหม่ทันที ไม่ใช้เวลา absolute
ของเพลงเก่ากับเพลงใหม่ และการโหลดภาพต้องไม่แทรกใน audio worklet

## 14. การเพิ่มเอฟเฟกต์ในอนาคต

เก็บ transition เป็น object มี `type` และ version ของ document ตั้งแต่รุ่นแรก
แต่ v1 รับเพียง `fade` เท่านั้น ไม่เปิดช่อง unknown fields ให้รันเป็นโค้ด
เพิ่ม 2.5D หรือ motion ในรุ่นถัดไปด้วย schema migration และทดสอบ seek ใหม่
ไม่ใส่ state/UI ของ editor ในเอกสาร playback และไม่ผูก document กับ DOM/CSS class

## 15. แผนพัฒนาเป็นลำดับ

1. สร้าง repository/package Scenio, types และ validator พร้อม pure timeline evaluator
2. ทำ renderer สองเลเยอร์, clock adapter, preload/cache/dispose และ React adapter
3. ทำ Studio storage + wallpaper importer + editor draft/preview/save/cancel
4. เชื่อมเวลาเสียงจริงใน Studio และ Next Karaoke รวม pause/seek/เปลี่ยนเพลง
5. ทำ host format adapters สำหรับการแนบ document+ภาพในเพลงตามข้อ 12
6. ทดสอบบน desktop/Android/iOS, pack รุ่นเดียวและติดตั้งทั้งสองแอป แล้วจึง deploy

ไม่เริ่มเพิ่ม effect ใหม่หรือ 2.5D ก่อนผ่าน acceptance รุ่นแรก

## 16. การทดสอบและเกณฑ์รับงาน

Core:
- เวลาเริ่ม, ช่วงค้าง, กลาง fade, จบ fade และหลังฉากสุดท้ายได้ค่าถูกต้อง
- seek ไปเวลาเดียวกันต้องได้สถานะเดียวกันเสมอ แม้ก่อนหน้าจะเล่นคนละลำดับ
- reject เวลาเริ่มซ้ำ/ติดลบ, fade ซ้อน, asset หาย, เวอร์ชันที่ไม่รองรับ

Runtime:
- pause ภาพนิ่ง, resume ตรงเวลา, seek กลาง fade ตรง progress
- ภาพมาช้าไม่เลื่อนเสียง และ request เพลงเก่าไม่เปลี่ยนฉากเพลงใหม่
- มี animation loop เฉพาะตอนจำเป็น; ออกจากหน้า/เปลี่ยนเพลงปล่อย loop, listener,
  object URL และ reference ของภาพครบ
- cache ไม่เพิ่มตามจำนวนภาพของเพลงโดยไม่จำกัด

Studio:
- เรียงภาพ, แก้เวลา, บันทึก/ยกเลิก/undo และเปิดโปรเจกต์ใหม่ได้ค่าตรงเดิม
- preview ไม่เลื่อนตามรายการบนมือถือ
- ลบจาก Gallery แล้วภาพที่วางไว้ยังอยู่

ไฟล์และ host:
- ส่งไฟล์เพลงที่ export ให้ browser profile ใหม่ เปิด offline แล้วเห็นภาพ/เวลาได้ครบ
  โดยไม่อาศัย IndexedDB หรือ object URL ของเครื่องที่สร้าง
- ภาพซ้ำเก็บเพียงครั้งเดียว; missing/corrupt scene ไม่ทำให้เพลงเสีย
- เพลงที่ไม่มีฉากและ wallpaper/กล้องเดิมยังทำงานตามเดิม
- preview และ Next Karaoke ที่ตำแหน่งเพลงเดียวกันคืนฉากและ progress ตรงกัน

Performance:
- วัด decode, memory, frame drops และ audio underrun บน Android เครื่องระดับล่าง
  กับ iPhone จริง ไม่สรุปจาก desktop อย่างเดียว
- เปรียบเทียบเพลงและอุปกรณ์เดียวกันแบบเปิด/ปิด Scenio แล้วต้องไม่ทำให้เกิดเสียงสะดุด
- เป้าหมายรอยต่อภาพใน foreground คลาดไม่เกินหนึ่งเฟรมที่ 30 fps หลังภาพพร้อม
  นี่เป็นเป้าหมายทดสอบ ไม่ใช่การรับประกันเมื่อ browser ถูก throttle

## 17. Release และ rollback

ใช้ versioned tarball `scenio-<version>.tgz` ใน `vendor` ของทั้งสองแอปเหมือน Lyrio
เปลี่ยน package source → ทดสอบ → bump version → pack → อัปเดต dependency/lockfile
ทั้งสองแอป → build → commit → deploy ไม่มีการเขียนทับ tarball เวอร์ชันเดิม

เก็บ schema version แยกจาก package version เพลงที่สร้างแล้วต้องมีความหมายของ
fade เหมือนเดิมหลังอัปเดตแพ็กเกจ การ rollback ต้องเปลี่ยนทั้ง tarball และ lockfile
เป็นคู่ โดยไม่ทำลายข้อมูลโปรเจกต์ที่เพิ่มไว้

## 18. ขอบเขตของเอกสารนี้

นี่เป็นเส้นทางที่เลือกไว้สำหรับ Scenio ไม่ใช่การประกาศว่าระบบถูกสร้างแล้ว
ค่าความละเอียด/งบไฟล์เป็นค่าเริ่มต้นที่จะยืนยันด้วยภาพและอุปกรณ์จริงในขั้นทดสอบ
ก่อนเขียน format adapter ต้องตรวจข้อจำกัดของ container ปัจจุบัน และระบุ
compatibility ของรุ่นส่งออกให้ชัดเจน การเปลี่ยนข้อกำหนดให้แก้เอกสารนี้ก่อนลงโค้ด


## 19. สถานะการลงมือทำ — 2 พฤศจิกายน 2026

สร้าง package แยกที่ `../scenio` รุ่น `0.1.0` และติดตั้ง tarball รุ่นเดียวกัน
ใน Lyrio Studio กับ Next Karaoke แล้ว ขอบเขตที่ทำงานได้ในรอบนี้:

- Core: schema, validator, deterministic timeline และขอบเขตจำนวน/ขนาดภาพ
- Runtime: สองเลเยอร์ fade, host clock, preload, bounded cache และ cleanup
- Studio: เมนู Wallpaper, เพิ่มภาพ, WebP compression, จัดลำดับ, เวลาเริ่ม/fade,
  preview พร้อมเนื้อร้อง, save/cancel, project persistence และ history integration
- Studio ใช้ขอบเขตภาพต้นฉบับ 16 megapixels / ด้านละไม่เกิน 8192 ก่อน decode
  เพื่อจำกัด RAM; ภาพที่บันทึกมีด้านยาวไม่เกิน 1920 และไม่เกิน 1 MB ต่อภาพ
- Next Karaoke: อ่าน `scenio.json` และภาพจาก native NKML และอิงเวลา engine
  ตัวเล่นในเครื่อง โดยกล้อง/วิดีโอมีลำดับความสำคัญสูงกว่าฉากเพลง
- NKML ที่ฉากหายหรือเวอร์ชันไม่รองรับยังอ่านเพลงได้ โดยข้ามเฉพาะฉาก

ตรวจแล้ว: core tests 5 ข้อ, native NKML integration tests 3 ข้อ,
TypeScript และ production build ของทั้งสองแอปผ่าน การทดสอบใน browser
ยืนยันสองภาพผสมที่ 50% เวลา 00:10.500 และบันทึก document ลง IndexedDB ได้

สถานะเพิ่มเติม: ส่วนส่งออกทำเสร็จตามข้อ 20 แล้ว ดูผลทดสอบในข้อ 21
ยังไม่รับรอง performance บน Android/iPhone จริงจนกว่าจะทดสอบอุปกรณ์จริง


## 20. เส้นทางส่งออกสำหรับทดสอบ

Lyrio Studio ส่งออกฉากจากหน้าต่าง Wallpaper เป็นไฟล์ `.scenio` ซึ่งมี document
และ WebP เฉพาะที่ใช้งานจริง จากนั้นแนบไฟล์นี้ในหน้าส่งออก NKML Studio
เพื่อรวม logical entries `scenio.json` และ `scenio-<hash>.webp` ลง NKML เดิม
ผู้รับใช้ไฟล์ NKML ไฟล์เดียว ไม่ต้องส่ง `.scenio` แยกให้ผู้เล่น

ไฟล์ `.scenio` เป็น transport ของ editor: magic `SCENIO01` (8 bytes),
ความยาว JSON uint32 little-endian, JSON UTF-8 และ binary ของ assets
เรียงตาม document ไม่มีการบีบอัด WebP ซ้ำ ไม่มี audio และไม่มี executable code
อ่านด้วย Blob slices พร้อมจำกัด 33 MB, JSON 1 MB และตรวจ hash/dimensions ทุกภาพ
ก่อนยอมรับ ไม่แตก archive ที่อาจขยายขนาดเกินงบ

เพิ่ม import `.scenio` ใน Wallpaper Editor ด้วย เพื่อย้ายฉากข้าม browser/profile
และทดสอบ round-trip ได้ โดย import เป็น draft จนกดบันทึก


## 21. รุ่นพร้อมทดสอบในเครื่อง — Scenio 0.1.1

ใช้แพ็กเกจรุ่นเดียวกันใน Lyrio Studio, NKML Studio และ Next Karaoke

เส้นทางทดสอบ:
1. Lyrio Studio `http://localhost:3012`: เปิดโปรเจกต์ → เครื่องมือแก้ไข → Wallpaper
2. เพิ่มภาพ/ตั้งเวลา/fade แล้วบันทึก ปุ่มลูกศรลงส่งออก `.scenio`
3. NKML Studio `http://localhost:3013`: เปิดโปรเจกต์ที่มีเสียง → Export tracks
   → Wallpaper · Scenio → Attach scenes → Export NKML
4. Next Karaoke `http://localhost:3014/sing`: เปิดไฟล์ NKML ที่ได้

ไฟล์ตัวอย่างอยู่ `/private/tmp/scenio-demo`:
- `demo.scenio`: ภาพสามภาพ เปลี่ยนที่ 0/6/12 วินาที fade 2 วินาที
- `studio-export.nkml`: ไฟล์ที่กดส่งออกจาก UI NKML Studio จริง
- `demo.mid`, `demo.ogg`, `scene-1.webp` ถึง `scene-3.webp`: วัตถุดิบสำหรับลองเอง

ผลตรวจ:
- Core/format 8 tests ผ่าน และ native NKML integration 3 tests ผ่าน
- Runtime Chrome จริง: WebP decode, fade 50%, pause ค้างภาพ, forward/reverse seek,
  dispose ปล่อย listeners/DOM/object URLs ผ่าน
- Next Karaoke player จริง: NKML เสียงหนึ่ง stem และฉากสามฉากเล่นได้
- Studio UI: import bundle, save ลง DB, undo/redo และ cancel ไม่ลบฉากที่บันทึกไว้
- viewport มือถือ 390×844: ไม่มี horizontal overflow, preview ไม่เลื่อนตามรายการ,
  footer อยู่ใน viewport
- Build ทั้งสามแอปผ่าน รวม OpenNext hardening/audit ของ Next Karaoke

หน้าต่างเนื้อร้องแยกในเครื่องเดียวกันรับ encrypted image handles ผ่าน
BroadcastChannel และรับตำแหน่ง milliseconds จาก engine โดยตรง ไม่ใช้ BPM คงที่
คำนวณเวลาฉาก การส่งฉากข้ามเครื่องผ่าน WebRTC ยังไม่ใช่ขอบเขตรุ่นนี้

ยังไม่ได้ deploy และยังต้องทดสอบ Android/iPhone จริงกับเสียง/memory ตามข้อ 16


## 22. Timeline editor สำหรับมือถือ

แทนรายการฉากด้วย timeline แนวนอนพร้อม ruler, playhead และ player slider
อัปโหลดเข้าคลังภาพ Wallpaper แยกก่อน ผู้ใช้เลือกจาก Gallery จึงเพิ่ม clip
กดค้าง clip 450 ms เปิดโหมดเรียงลำดับเป็นภาพจัตุรัส ลากเพื่อสลับลำดับ
ใช้ Pointer Events + pointer capture และ touch-action none เฉพาะ handle/โหมดเรียง
พื้นที่ timeline ปกติยังปัดเลื่อนได้

Clip ขั้นต่ำ 1000 ms ขอบหัว/ท้ายปรับเวลาแบบ ripple: clip ถัดไปเลื่อนตาม
ไม่ตัดเวลาออกจากคลิปข้างเคียง และไม่เกินความยาวเพลง
เพิ่ม optional `endMs` ใน scene v1 เพื่อให้ขอบท้าย clip สุดท้ายมีความหมายจริง
เอกสารเก่าที่ไม่มี endMs ยังค้างจนฉากถัดไป/เพลงจบเหมือนเดิม
Runtime รุ่นเก่าอาจค้างภาพสุดท้าย จึงต้องใช้ Scenio 0.1.2 ขึ้นไปเพื่อเล่น endMs

Transition อยู่ต้น clip ถัดไป แสดงเป็น block แยกตรงรอยต่อ มีตัวเลือก Fade
และ duration เริ่มต้น 1000 ms ขอบทั้งสองลากปรับ duration ได้ (ขั้นต่ำ 100 ms)
ความยาว transition ไม่เกิน clip ปลายทาง และไม่ทำให้ clip สั้นกว่า 1 วินาที
Gallery ลบเฉพาะรายการเลือก โดยเก็บ binary เพื่อไม่ทำลายฉากที่ใช้แล้ว


ผลตรวจ timeline รุ่นมือถือ:
- Scenio core/format 9 tests ผ่าน รวม explicit clip end และขั้นต่ำ 1 วินาที
- Timeline model 3 tests ผ่าน รวม resize ซ้ำ 300 ครั้ง ไม่หลุดขอบเพลง
- Chrome touch gestures: ลาก trim ชนขั้นต่ำ, กดค้างเข้า reorder, ลากสลับภาพ,
  ลากขอบ transition ปรับระยะ ผ่าน
- UI มือถือ 390×844 ไม่มี horizontal overflow ที่หน้า modal, footer อยู่ในจอ
- อัปโหลดภาพทดสอบเข้าคลังแล้วจำนวน clip ไม่เพิ่มจนกว่าจะเลือกภาพ
- Player slider ที่ 7 วินาทีให้ fade progress 0.5 ตรงกับ timeline ตัวอย่าง
- Production build + TypeScript และ lint ของ Wallpaper ผ่าน
- อัปเดตแพ็กเกจ 0.1.2 ทั้งสามแอปแล้ว ยังไม่ได้ deploy

ค่าเริ่มต้นภาพใหม่ 5 วินาที fade 1 วินาที การยืดท้ายใช้พื้นที่ว่างท้ายเพลง
เมื่อ timeline เต็ม ให้ลดความยาว clip ก่อนเพิ่มภาพใหม่


## 23. Gallery navigation ภายในหน้าต่างเดียว

Wallpaper Editor ใช้ modal เพียงตัวเดียว Gallery เป็นหน้าภายใน editor
แทนการเปิด dialog ซ้อน หัว Gallery มีปุ่มกลับไทม์ไลน์เพียงปุ่มเดียว
ไม่มีกากบาทหรือ footer ปิด Gallery; Escape/กดนอกหน้าต่างกลับไทม์ไลน์ก่อน
เลือกภาพแล้วเพิ่มลง draft และกลับ timeline เก็บตำแหน่งเพลง/scroll/selection
ของ timeline ไว้ Preview หยุด render ขณะอยู่ Gallery
ตรวจ browser มือถือจำลองแล้วว่ามี dialog เดียว สลับไปกลับและ Escape
คืนหน้า timeline โดยตำแหน่งเพลงเดิม 7 วินาที


## 24. ห้ามเกิดช่องว่างจากการ trim

ลากหัว clip ที่สองเป็นต้นไปให้ย้ายรอยต่อร่วม: ท้าย clip ก่อนหน้า
เท่ากับหัว clip ที่กำลังลากเสมอ ทั้งสอง clip ขั้นต่ำ 1 วินาที
ปรับ fade ให้ไม่ยาวเกิน clip ที่ถูกย่อ หัว clip แรกยึดเวลาเริ่มเดิม
การลากท้ายยัง ripple clips ถัดไปตามเดิม จึงไม่ทิ้งช่องว่าง
ทดสอบ model ทั้งสองทิศทางและ gesture ซ้ำ 300 ครั้งผ่าน


## 25. Motion zoom แยกจาก transition

เพิ่ม motion ต่อภาพ: none / zoom-in / zoom-out พร้อม amount ค่าเริ่มต้น 12%
คำนวณ scale แบบ linear จากเวลาเพลง ไม่ใช้ CSS animation หรือ timer แยก
motion ต้องมี endMs เพื่อระบุช่วงเวลาแน่นอน ภาพเก่าที่ไม่มี motion ยังนิ่งตามเดิม
ตอน fade ภาพเก่าและใหม่มี scale ของตัวเอง ภาพเก่าซูมต่อจน fade ออกหมด
โดยขยาย motion end ไปถึงท้าย incoming fade ของภาพถัดไปที่ติดกัน
pause/seek/trim/reorder ต้องได้ scale ตรงเวลาใหม่โดยไม่เริ่ม animation ซ้ำ

เมื่อไม่มีภาพ active ให้ renderer โปร่งใสและเผยพื้นหลังเริ่มต้นของ host
รวม before-first, ช่องว่าง, after-last และ document ว่าง Preview ใน Studio
ใช้พื้นหลังเดียวกับหน้าดูเนื้อร้อง ไม่มีการเพิ่ม AudioContext/worker เสียง
เปิด rAF เพิ่มเฉพาะเมื่อภาพที่กำลังแสดงมี zoom และเพลงกำลังเล่น


ผลทดสอบ motion รุ่น 0.1.3:
- Core/format 10 tests ผ่าน รวม zoom-in/out ขณะ fade และ seek ย้อน
- Chrome runtime ภาพ WebP จริง: ทั้งสองภาพซูมต่อใน fade, pause ค้าง scale,
  seek ได้ scale เดิม, ไม่มีภาพแล้ว root/layers โปร่งใสเผยพื้นหลัง host
- Native NKML round-trip คง motion ของภาพที่ใช้ asset เดียวกันต่าง clip
- UI มือถือ 390 px เลือกภาพแล้วมี Still / Zoom in / Zoom out, amount 5–30%
  ค่าเริ่มต้น 12% แผงปรับเลื่อนดูได้โดย preview/footer อยู่กับที่
- แพ็กเกจ 0.1.3 ติดตั้งทั้งสามแอป ยังไม่ deploy


## 26. Autosave และ transport ของ Wallpaper

แก้ไขภาพ/เวลา/transition/motion แล้ว publish เข้า project state และ undo history
ทันที บันทึกลง IndexedDB หลังหยุด gesture 350 ms โดยเรียง write ทีละชุด
พร้อมสถานะ Saving / Saved / Error ปิด editor ต้อง flush สำเร็จก่อนจึงปิด
ไม่มี Save/Cancel เพราะการแก้ไขถูกบันทึกอัตโนมัติแล้ว Gallery ยังเป็นหน้าภายในเดิม
เขียนเฉพาะ field wallpaper กับ updatedAt ไม่ลบ lyric timing drafts หรือแก้ media

ปุ่ม Play ใช้ player controls โดยตรง ไม่ใช้ handler ของหน้าเนื้อร้องที่อาจ
seek กลับไปบรรทัดที่เลือก ระหว่าง scrub ให้ค้าง preview ตามตำแหน่งนิ้ว
pause เสียงชั่วคราว แล้ว seek คำขอล่าสุดตามลำดับ ก่อนกลับมาเล่นถ้าเดิมกำลังเล่น
seek ขณะหยุดจะยังหยุดอยู่ กด Play ทันทีหลังลากต้องรอ seek ล่าสุดเสร็จก่อน
รอ timer worker ยืนยัน seek ก่อนคืน preview ให้ clock จริง

ทดสอบ unit: autosave coalesce/serialize/flush/retry, คำขอ seek เก่าซ้อนใหม่,
กด Play ก่อน debounce หมด, seek ขณะหยุด, lifecycle ของ React Strict Mode ผ่าน


ผลตรวจ browser จริงของ autosave/playback:
- เปลี่ยน Zoom in แล้วตรวจ IndexedDB ขณะ modal ยังเปิด: motion ถูกบันทึกแล้ว
- เล่น MIDI แล้วลากย้อนจาก 14.9 วินาทีไป 1 วินาที: กลับมาเล่นต่อที่ 1.6 วินาที
  หลังรอ ไม่เด้งกลับตำแหน่งเดิม
- กดปิด editor หลัง autosave แล้วปิดได้โดยไม่มี error
- ชุดทดสอบ autosave/playback + trim/reorder รวม 9 ข้อผ่าน; TypeScript/lint
  ของ Wallpaper และ production build ผ่าน


## 27. Gallery drawer และ transport controls (3 พฤศจิกายน 2026)

ตาม UX ล่าสุด Gallery ใช้ EditorDrawer ร่วมกับหน้าคำร้อง: ด้านล่างบนมือถือ
ด้านขวาบน desktop โดย Wallpaper timeline ยังอยู่ด้านหลัง ไม่เปลี่ยนหน้าภายใน
ปิด drawer ต้องปิดเฉพาะ drawer และรักษาตำแหน่งเพลง/scroll/ข้อมูลที่แก้ไว้

ปุ่ม Play/Pause อยู่ซ้ายของ slider แถวเดียวกัน Spacebar เล่น/หยุดด้วย
Wallpaper transport โดยไม่เรียก handler ของเนื้อร้อง ไม่ทำงานขณะพิมพ์ข้อความ
หรือเปิด Gallery ไม่ toggle ซ้ำเมื่อกดค้าง

ตรวจ browser มือถือจริงใน Chrome: Space เล่น/หยุด, ปิด drawer ซ้ำ 3 รอบ
กลับ Wallpaper ที่เวลา 1.9 วินาทีเหมือนเดิม; TypeScript/lint/build ผ่าน


## 28. แถบเวลา, Fit และลาก playhead

แถว transport สูง 40px เท่าปุ่ม Play โดยตัวเลขเวลา 9px อยู่ใต้ slider
Zoom out ลงได้ถึง scale ที่พอดีความยาวเพลงกับ viewport และมีปุ่ม Fit entire song
เพื่อเห็นทั้งเพลงทันที คำนวณ scale ใหม่เมื่อ viewport เปลี่ยนขนาด
ปรับระยะ ruler ticks ตาม scale และตัด overflow ไม่ให้มีส่วนล้นในโหมด Fit

playhead มีพื้นที่จับด้วยนิ้วและใช้ Pointer Capture ลาก seek ต่อเนื่องได้
ruler กดลาก scrub ได้เช่นกัน พร้อมปัดเลื่อน viewport เมื่อถึงขอบ
ทดสอบ touch Chrome ผ่านทั้งลาก cursor และ Fit; UI มือถือวัดแถว 40px
เท่าปุ่มจริง และ content/scroll width เท่ากับ viewport เมื่อ Fit ทั้งเพลง


## 29. Pinch และตำแหน่งอ้างอิงของ zoom

สองนิ้วหุบ/กางใน timeline เพื่อซูม โดยยึดเวลาเดิมใต้จุดกึ่งกลางนิ้ว
ใช้ touch listeners แบบ passive false เฉพาะ pinch; นิ้วเดียวปัด timeline ตามปกติ
เริ่ม pinch ยกเลิก gesture trim/scrub/long-press ที่ยังค้าง และกัน ghost click
ปุ่ม +/- ยึดเวลาเดิมกลาง viewport แล้วปรับ scroll หลัง layout ใหม่
Fit ยังแสดงทั้งเพลงตั้งแต่ต้นตามหน้าที่ของปุ่ม

หัวท้าย clip แสดงจาง 25% เมื่อยังไม่เลือก แตะที่ภาพหรือหัวท้ายครั้งแรก
เพื่อเลือกก่อน จากนั้นหัวท้ายเข้มเต็มและลากปรับเวลาได้
ทดสอบ Chrome touch: pinch เข้า/ออก, ปุ่ม +/- รักษาจุดอ้างอิง, Fit,
trim/reorder/playhead ผ่าน; production build ผ่าน


## 30. แถบ Gallery/Effect และ compact effects drawer

ย้ายคลังภาพไปซ้ายของ toolbar แทนข้อความกดค้างภาพ เมื่อเลือก clip
แสดง Effect ก่อนปุ่ม Fit / - / + ไม่มีแผงเอฟเฟกต์ด้านใต้ timeline
Effect เปิด EditorDrawer แบบ bottom ขนาด compact (สูงตามเนื้อหา สูงสุด 70dvh)
แยกสองหมวดอิสระ: Transition [ไม่มี, Fade] และ Animation [ไม่มี, Zoom in, Zoom out]
Transition ไม่มีใช้ duration 0 (ตัดภาพทันที) และซ่อนบล็อก fade ของรอยต่อนั้น
Animation ไม่มีเอา motion ออกจาก clip ไม่เปลี่ยน transition ที่เลือกไว้
เลือก Fade และ zoom ร่วมกันได้ ปิดทั้งสองหมวดพร้อมกันได้ และ autosave ตามเดิม

ตรวจ UI มือถือ 390×844: toolbar อยู่ในจอ, compact drawer สูง 345px,
ปิด drawer กลับ editor ได้ และเลือกสองหมวดอิสระผ่าน
production build/TypeScript/lint และ touch timeline regression ผ่าน


## 31. Panel เต็มความสูง, deselection และ shared image gallery

เอาปุ่มนำเข้า/ส่งออกด้านบนออกจาก Wallpaper Editor ใช้ panel สูงเต็ม viewport
เว้นขอบ 8px ไม่มี vertical scroll ใน editor หลัก timeline ยังคง pan แนวนอน
Gallery/effects/reorder list ยังเลื่อนเนื้อหาของตัวเองได้

แตะนอก clip/transition/Effect trigger ให้ clear selection โดยไม่เปลี่ยนข้อมูล
ขณะอยู่ effects drawer หรือ reorder ไม่ clear selection จากเหตุการณ์ใน drawer

แยก ImageGalleryPanel เป็น common component แล้วใช้ทั้ง LineStickerPanel
และ WallpaperGallery: header, upload/file input/drop, search, count/bytes,
preview grid, select/delete controls และ busy/notice/error ร่วมกัน
แยก adapter การแปลง/จัดเก็บของ host เดิม: stickers รองรับ GIF และขนาดเล็ก
Wallpaper รองรับภาพนิ่ง 20 MB และเก็บความละเอียดฉาก ไม่ลดลงเป็น sticker

ตรวจมือถือ 390×844 และ 320×640: panel สูง viewport - 16px, ไม่มี
vertical scroll หรือ horizontal overflow, toolbar ทุกปุ่มอยู่ในจอ
แตะพื้นที่ preview แล้ว selection/Effect หาย และ touch regression ผ่าน
TypeScript/lint/build ผ่านหลังแยก shared component


## 32. เปลี่ยนหน้า Wallpaper เป็น image blocks อัตโนมัติ

ยกเลิก UI timeline/trim/zoom ในหน้า Wallpaper เปลี่ยนเป็นบล็อกภาพ
ภาพเดียวเริ่ม 0 จนจบเพลง เพิ่มภาพแล้วแบ่งเวลาทุกภาพเท่ากันอัตโนมัติ
ใช้ integer ms แบ่งส่วนที่เหลือให้ครบจบเพลงโดยไม่มีช่องว่าง
เพิ่ม/ลบ/ลากเรียงแล้วคำนวณเวลาใหม่ ไม่มีช่องกรอกเวลาราย clip

มีตัวเลือก Transition ทุกภาพ (ไม่มี/Fade) และ duration ที่กระทบทุกภาพ
ภาพใหม่เริ่มด้วย fade ตามค่ากลางเริ่มต้น 1 วินาที จำกัด fade ไม่เกินช่วงภาพ
แตะบล็อกเปิด effects drawer เดิมเพื่อปรับ animation/transition ของภาพนั้น
ลากจากไอคอนจับบนแต่ละบล็อกเพื่อเรียงได้ทันที ไม่ต้องเข้าหน้า reorder
Animation คงติดกับภาพเมื่อย้ายตำแหน่ง autosave และ player slider เดิมยังใช้ได้

ขอบเขตรอบนี้แก้เฉพาะ editor/adapters ของ Wallpaper ไม่แก้ Scenio core/runtime
ไม่เปลี่ยน format/engine/Next Karaoke หรือส่วนเนื้อร้อง
เก็บ schema เดิม โดยแปลงนโยบายบล็อกเป็น scene document ตอนแก้ไขเท่านั้น

ทดสอบ model และ autosave/playback 8 ข้อผ่าน; Chrome touch ทดสอบ
เพิ่มภาพ/แบ่งเวลา/Transition ทุกภาพ/animation รายภาพ/ลากเรียง/ลบแล้วเต็มเพลงผ่าน
ตรวจ IndexedDB จริง: เพลง 20 วินาที 3 ภาพได้ช่วง 0–6666–13333–20000 ms
Fade 1500 ms ครบทุกภาพและ animation เดิมยังอยู่; build/TypeScript/lint ผ่าน


## 33. ส่ง Wallpaper ผ่านปุ่ม export MIDI เดิม

ปุ่ม .mid ของ Lyrio Studio ต้องแนบ document และ WebP ที่ใช้จริงลงใน
MTrk metadata ชื่อ @SCENIO ด้วย sequencer-specific meta event 0x7F
แบ่งข้อมูลเป็นชิ้นไม่เกิน 64 KB ต่อ event โดยบรรจุ bundle Scenio เดิม
ไม่เพิ่มช่องเสียง/โน้ต/เวลาเล่น และไม่ยัด base64 ภาพเข้าเนื้อร้อง
ปรับ header format 0 เป็น 1 เมื่อมีหลาย track ตามโครงสร้าง MIDI

Scenio/midi เป็น shared adapter สำหรับแนบและอ่าน blob ตามขอบเขต track
Next Karaoke อ่านเฉพาะ metadata นี้เมื่อเล่น แล้วคืน asset blobs ให้ renderer เดิม
การ import รายการเพลงแบบ basic ไม่ decode ภาพ ไม่แตะ audio worklet
MIDI เก่าไม่มี track นี้เล่นเหมือนเดิม ข้อมูล Wallpaper เสียให้ข้ามเฉพาะภาพ
export ซ้ำลบ metadata track เดิมก่อนแนบใหม่ ภาพซ้ำเก็บครั้งเดียว
งานนี้ต้องทดสอบไฟล์ที่ export ผ่าน UI จริงแล้วเปิดใน Next Karaoke


ผลทดสอบ MIDI export รุ่น Scenio 0.1.4:
- ปุ่ม export .mid ใน Studio แนบ Wallpaper ลงไฟล์จริง พร้อมภาพ WebP,
  scene timing, transition และ animation โดยไม่ต้อง export companion
- รองรับอ่าน metadata กลับเข้าคลัง Wallpaper เมื่อสร้างโปรเจกต์ Studio จาก .mid
- Scenio core/format/MIDI tests 14 ข้อผ่าน รวม bounded chunks, corruption,
  re-export replace/remove และคง note-track bytes เดิม
- Next Karaoke streaming reader integration 3 ข้อผ่าน รวมอ่านไฟล์ที่ export
  จาก Studio UI จริง: 3 images, 3 scenes, 3 MIDI tracks, 19200 ticks
- Chrome เปิดไฟล์เดียวกันใน Next Karaoke player จริงผ่าน: 3 scenes,
  รูป WebP แสดงบนจอ, MIDI playback ไม่มี audio stems
- Production build ทั้ง Studio และ Next Karaoke ผ่าน รวม deployment audit
- เป็นการแก้ในเครื่อง ยังไม่ได้ deploy production

## 34. Preview shading and transport-paced animation

Studio applies a 20% black shade over wallpaper in both lyric and wallpaper previews, below the lyric layer. The default wallpaper receives the same shade; images in the gallery remain unchanged.

Scenio 0.1.6 adds `targetFps` and `createSmoothClock`. Sparse 20 Hz song snapshots are interpolated between updates using the host playback rate; pause/seek re-anchor immediately, with extrapolation bounded to 250 ms if snapshots stall. Fade and zoom share one capped animation loop, with no continuous animation loop for static scenes. Zero FPS means display refresh/unlimited, matching Next Karaoke.

Next Karaoke uses its existing system FPS setting. Studio persists a Preview frame rate setting (24/30/60/120, default 60), shared by wallpaper previews and the lyrics canvas. Frame-rate changes do not recreate the player or decode images again. Browser tests cover sparse-snapshot playback at 60/24/10/unlimited FPS plus pause, reverse seeks, motion during fade and disposal.

## 35. Bounded playback and mobile memory (0.1.7)

Playback opens the MIDI track/chunk headers and Scenio JSON index without hashing every image on startup. Assets remain file-backed compressed Blob slices; each required image is hash/dimension checked before decode. Strict authoring imports continue verifying all assets. JSON timing/effect instructions remain resident (bounded to 1 MB); this is not a promise of zero RAM usage or zero browser Blob backing allocation.

The player owns at most two decoded assets and one compressed prefetch during a fade. It evicts before replacement, reuses decoded image nodes, avoids unchanged DOM/style writes, stops rAF for static scenes, and releases images/URLs when offscreen, hidden or disposed. There is no wallpaper canvas or per-frame bitmap rasterization. Browser/GPU internal caches are outside the app's exact memory control.

Studio gallery state stores metadata only. Thumbnails load near the viewport, decode serially, shrink to at most 240 px and release on exit; transient thumbnails are not saved to IndexedDB. No duplicate thumbnail library or new persistent cache is introduced. When Wallpaper Editor opens, covered normal previews unmount so only the editor preview renders. Canvas DPR uses existing Lyrio CPU profiles: low-capability devices use 1, other coarse-pointer devices cap at 1.5, desktop at 2, without changing chosen FPS or song assets.

Validation: 128 assets / 1,000 scenes, 126 random-access seeks, maximum two decoded assets, compressed prefetch, idle DOM writes, offscreen release and restoration. 128-image gallery initially loads only nine small thumbnails; serial decoding and legacy Image fallback pass. Combined lyrics/wallpaper fixture passes at CPU throttle 4, DPR 3, with low-tier canvas using one ninth of raw DPR-3 pixels. This simulation excludes FluidEngine and does not guarantee performance on every old physical phone. Existing lyric effect atlases use a separate bounded 32 MiB idle cache; active pinned effects and synth/audio memory add to total app RAM.

Chord-analysis integration: Next Karaoke removes the Scenio metadata track from the temporary MIDI Blob sent to the C analyzer. Note-track bytes stay unchanged; the original song container remains intact. This prevents the documented whole-MIDI chord buffer exception from materializing wallpaper image bytes unnecessarily. Integration tests verify note/channel/duration preservation, deferred artwork validation and normal MIDI pass-through. Both apps consume the same immutable scenio-0.1.7 archive.
