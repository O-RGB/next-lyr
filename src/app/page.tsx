"use client";

import Image from "next/image";
import {
  AlertTriangle,
  AudioLines,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Download,
  FileMusic,
  FolderOpen,
  Globe,
  LockKeyhole,
  MicVocal,
  Play,
  Settings2,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import ProjectListModal from "@/components/modals/project/project-list";
import { Button } from "@/components/ui/button";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";
import { useUiStore } from "@/features/ui/ui-store";
import { deleteAllProjects } from "@/lib/database/db";

export default function Home() {
  const locale = useSettingsStore((state) => state.uiLocale);
  const updateSettings = useSettingsStore((state) => state.set);
  const requestConfirm = useUiStore((state) => state.requestConfirm);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const openProjectLibrary = () => setIsProjectModalOpen(true);

  const features = [
    {
      icon: FileMusic,
      title: text(locale, "นำเข้าเพลงได้หลายแบบ", "Import your song files"),
      description: text(
        locale,
        "เริ่มงานจาก MIDI, MP3, MP4 หรือ YouTube ตามรูปแบบโปรเจกต์ที่ต้องการ",
        "Start from MIDI, MP3, MP4, or YouTube depending on your project"
      ),
    },
    {
      icon: MicVocal,
      title: text(locale, "แก้คำร้องและซับรายคำ", "Edit lyrics word by word"),
      description: text(
        locale,
        "แก้เฉพาะคำที่ผิด เพิ่มคำ ลบคำ และเติมซับอัตโนมัติได้โดยไม่ต้องรื้อทั้งบรรทัด",
        "Correct, add, delete, and auto-fill subtitles without rebuilding the whole line"
      ),
    },
    {
      icon: Clock3,
      title: text(locale, "จัดจังหวะได้ละเอียด", "Fine timing control"),
      description: text(
        locale,
        "ปาดเวลาเป็นคำหรือเป็นบรรทัด พร้อมดูตัวอย่างและแก้จุดที่ต้องการได้ทันที",
        "Time words or whole lines, preview the result, and retime only what needs fixing"
      ),
    },
    {
      icon: Download,
      title: text(locale, "ส่งออกตาม workflow", "Export for your workflow"),
      description: text(
        locale,
        "เตรียมไฟล์เนื้อร้องและไฟล์เสียงสำหรับนำไปใช้งานต่อในรูปแบบที่เหมาะกับเพลง",
        "Prepare lyric and audio outputs in the format that fits your song"
      ),
    },
  ];

  const guideSteps = [
    [
      text(locale, "เลือก Project", "Choose a project"),
      text(
        locale,
        "กดเริ่มใช้งาน แล้วเปิดงานเดิมหรือสร้าง Project ใหม่จากไฟล์เพลง",
        "Press Start App, then open an existing project or create one from a song file"
      ),
    ],
    [
      text(locale, "เตรียมเนื้อเพลง", "Prepare the lyrics"),
      text(
        locale,
        "นำเข้าเนื้อร้องหรือเริ่มเพิ่มจาก Lyrics Grid แล้วตรวจคำให้เรียบร้อย",
        "Import lyrics or add them from Lyrics Grid, then check the wording"
      ),
    ],
    [
      text(locale, "แก้คำและเติมซับ", "Edit words and subtitles"),
      text(
        locale,
        "เปิด Edit Lyrics เพื่อแก้เฉพาะคำ เพิ่มคำใหม่ หรือลองเติมซับอัตโนมัติ",
        "Use Edit Lyrics to correct individual words, add new words, or auto-fill subtitles"
      ),
    ],
    [
      text(locale, "ปาดและตรวจ Preview", "Time and preview"),
      text(
        locale,
        "เริ่มปาดจากคำหรือบรรทัดที่ต้องการ แล้วตรวจ Lyrics และ Chord Preview ก่อนส่งออก",
        "Time the required words or lines, then check Lyrics and Chord Preview before export"
      ),
    ],
  ];

  const knowledgeSections = [
    [
      text(locale, "Project คือพื้นที่ทำงานของเพลงหนึ่งเพลง", "A project is one song workspace"),
      text(
        locale,
        "แต่ละ Project เก็บข้อมูลเพลง เนื้อร้อง ซับ จังหวะ คอร์ด และไฟล์ที่เกี่ยวข้องแยกจากกัน ทำให้กลับมาแก้ไขงานเดิมได้โดยไม่ปะปนกับเพลงอื่น",
        "Each project keeps the song, lyrics, subtitles, timing, chords, and related files together, so returning to an old song stays organized"
      ),
    ],
    [
      text(locale, "แก้เฉพาะจุดโดยไม่ทำลายเวลาที่ปาดไว้", "Fix words without losing timing"),
      text(
        locale,
        "ถ้าพิมพ์ผิดเพียงบางคำ ให้แก้ใน Edit Lyrics และกดบันทึกเฉพาะคำนั้น เวลาเดิมจะยังอยู่ ไม่จำเป็นต้องปาดทั้งบรรทัดใหม่",
        "When only a few words are wrong, edit and save those words in Edit Lyrics. Existing timing stays intact"
      ),
    ],
    [
      text(locale, "ภาษาและการส่งออก", "Language and export"),
      text(
        locale,
        "ภาษาไทยและภาษาอังกฤษยังใช้เส้นทาง legacy ได้เมื่อข้อมูลเข้ากันได้ ส่วนภาษาอื่นจะใช้ UTF-8 และควรเปิดด้วยเครื่องมือที่รองรับ UTF-8",
        "Thai and English can use the legacy path when the data is compatible. Other languages use UTF-8 and should be opened with a UTF-8-capable tool"
      ),
    ],
  ];

  const faqs = [
    [
      text(locale, "ต้องติดตั้งโปรแกรมไหม?", "Do I need to install anything?"),
      text(
        locale,
        "ไม่ต้อง NextLyricsEditor ทำงานผ่าน browser และเก็บ Project ไว้ในเครื่องของคุณเป็นหลัก",
        "No. NextLyricsEditor runs in the browser and keeps projects primarily on your device"
      ),
    ],
    [
      text(locale, "ไฟล์เพลงถูกอัปโหลดขึ้น server หรือไม่?", "Are my song files uploaded?"),
      text(
        locale,
        "การทำงานปกติใช้ข้อมูลใน browser และ local storage ของอุปกรณ์ ไฟล์จะไม่ถูกส่งขึ้น server เพื่อแก้ไขเพลง",
        "Normal editing uses the browser and local storage on your device. Song files are not uploaded for editing"
      ),
    ],
    [
      text(locale, "ถ้าต้องการแก้แค่คำเดียวทำอย่างไร?", "How do I fix only one word?"),
      text(
        locale,
        "เปิดบรรทัดนั้นใน Edit Lyrics แก้ช่องคำที่ต้องการ แล้วกดบันทึกเฉพาะคำนั้นได้เลย",
        "Open that line in Edit Lyrics, change the required word, and save only that word"
      ),
    ],
    [
      text(locale, "เริ่มใช้งานจากตรงไหน?", "How do I get started?"),
      text(
        locale,
        "กดปุ่มเริ่มใช้งานด้านบนหรือปุ่มหลัก แล้วเลือก Project เดิม หรือกด New Project เพื่อสร้างงานใหม่",
        "Press Start App or the main button, then open an existing project or choose New Project"
      ),
    ],
  ];

  const handleReset = async () => {
    try {
      await deleteAllProjects();
      toast.success(text(locale, "ล้างข้อมูลเรียบร้อย", "Data cleared"), {
        description: text(
          locale,
          "รีเฟรชหน้าเว็บเพื่อเริ่มใหม่",
          "Refresh the page to start again"
        ),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const handleRequestReset = async () => {
    const confirmed = await requestConfirm({
      title: text(locale, "ล้างข้อมูลทั้งหมดหรือไม่?", "Clear all data?"),
      description: text(
        locale,
        "โปรเจกต์ทุกอันที่เก็บอยู่ในเครื่องจะถูกลบและกู้คืนไม่ได้",
        "Every project stored on this device will be deleted and cannot be recovered"
      ),
      tone: "danger",
      confirmLabel: text(locale, "ล้างข้อมูล", "Clear data"),
    });
    if (confirmed) await handleReset();
  };

  return (
    <div className="min-h-dvh bg-base text-foreground selection:bg-primary/10">
      <header className="border-b border-[#d7dee9] bg-white text-[#1c2430] backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <Waves className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-[#1c2430]">
                NextLyricsEditor
              </span>
              <span className="hidden text-[10px] uppercase tracking-[0.15em] text-[#6b7280] sm:block">
                {text(locale, "เครื่องมือแก้ไขเนื้อเพลงคาราโอเกะ", "Karaoke Lyrics Editor")}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <label className="flex h-8 items-center gap-1.5 rounded-md border border-[#d7dee9] bg-white px-2 text-[#6b7280]">
              <Globe className="size-3.5 shrink-0 text-primary" />
              <span className="sr-only">Language</span>
              <select
                aria-label="Language"
                value={locale}
                onChange={(event) =>
                  updateSettings("uiLocale", event.target.value as "th" | "en")
                }
                className="h-7 w-20 cursor-pointer border-0 bg-transparent text-[11px] font-semibold text-[#1c2430] outline-none sm:w-28"
              >
                <option value="th">TH · ไทย</option>
                <option value="en">EN · English</option>
              </select>
            </label>
            <span className="hidden rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-mono text-primary sm:inline-block">
              v0.1.0
            </span>
            <Button size="sm" onClick={openProjectLibrary} className="gap-2">
              <Play className="size-3.5 fill-current" />
              {text(locale, "เริ่มใช้งาน", "Start App")}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        <div className="grid grid-cols-1 gap-4 py-4 md:gap-6 lg:grid-cols-12">
          <div className="flex h-fit flex-col gap-4 md:gap-6 lg:col-span-7">
            <section className="overflow-hidden rounded-lg border border-[#d7dee9] bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-[#d7dee9] bg-[#f8f9fc] px-4 py-3 sm:px-6 sm:py-4">
                <Waves className="size-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wide text-[#374151] sm:text-sm">
                  Next Lyrics Engine
                </span>
              </div>
              <div className="p-4 sm:p-6">
                <h1 className="text-2xl font-extrabold leading-tight text-[#1c2430] sm:text-3xl">
                  NextLyricsEditor
                </h1>
                <p className="mt-1 text-sm font-semibold text-primary sm:text-base">
                  {text(
                    locale,
                    "สร้างและแก้ไขเนื้อเพลงคาราโอเกะบนเว็บ",
                    "Create and edit karaoke lyrics in your browser"
                  )}
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  {text(
                    locale,
                    "พื้นที่ทำงานสำหรับนำเข้าเพลง แก้คำร้อง แยกซับ จัดจังหวะ ตรวจ Preview และส่งออกไฟล์ โดยเริ่มจาก Project ของคุณเอง",
                    "A focused workspace for importing songs, editing lyrics, managing subtitles, timing words, checking previews, and exporting from your own project"
                  )}
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    size="lg"
                    onClick={openProjectLibrary}
                    className="h-12 gap-2 px-6 font-bold"
                  >
                    <Play className="size-4 fill-current" />
                    {text(locale, "เลือกหรือสร้าง Project", "Choose or create a project")}
                  </Button>
                  <a
                    href="#guide"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-line bg-panel px-5 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/50 hover:text-primary"
                  >
                    <BookOpen className="size-4" />
                    {text(locale, "ดูวิธีเริ่มต้น", "How it works")}
                  </a>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <article className="rounded-lg border border-line bg-panel p-4 shadow-sm transition hover:border-brand-2/50 sm:p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <ShieldCheck className="size-5 text-brand-2" />
                  {text(locale, "ข้อมูลอยู่ในเครื่อง", "Your files stay local")}
                </h2>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {text(
                    locale,
                    "Project และไฟล์ที่นำเข้าเก็บใน browser ของอุปกรณ์นี้เป็นหลัก ไม่ต้องสร้างบัญชีเพื่อเริ่มงาน",
                    "Projects and imported files stay primarily in this browser. No account is required to get started"
                  )}
                </p>
              </article>
              <article className="rounded-lg border border-line bg-panel p-4 shadow-sm transition hover:border-primary/50 sm:p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <AudioLines className="size-5 text-primary" />
                  Web Audio Workspace
                </h2>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {text(
                    locale,
                    "ตรวจเสียงและ Preview งานผ่าน browser ได้ทั้ง desktop, tablet และมือถือ",
                    "Review playback and previews through the browser on desktop, tablet, and mobile"
                  )}
                </p>
              </article>
            </div>

            <section className="overflow-hidden rounded-lg border border-line bg-slate-950 shadow-sm">
              <Image
                src="/cover.png"
                alt="NextLyricsEditor lyrics editing preview"
                width={1200}
                height={630}
                priority
                className="h-auto w-full object-cover"
              />
            </section>

            <section id="guide" className="scroll-mt-5 rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
              <h2 className="flex items-center gap-3 border-b border-line pb-3 text-lg font-bold text-foreground sm:text-xl">
                <span className="bg-primary/10 p-2 text-primary">
                  <BookOpen className="size-5" />
                </span>
                {text(locale, "เริ่มใช้งานอย่างไร", "How to get started")}
              </h2>
              <ol className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground">
                {guideSteps.map(([title, description], index) => (
                  <li key={title} className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <span>
                      <strong className="text-foreground">{title}:</strong>{" "}
                      {description}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
              <h2 className="flex items-center gap-3 border-b border-line pb-3 text-lg font-bold text-foreground sm:text-xl">
                <span className="bg-brand-2/10 p-2 text-brand-2">
                  <Settings2 className="size-5" />
                </span>
                {text(locale, "แนวคิดการทำงานของ Editor", "How the editor works")}
              </h2>
              <div className="mt-5 space-y-5 text-sm leading-6 text-muted-foreground">
                {knowledgeSections.map(([title, description]) => (
                  <section key={title}>
                    <h3 className="font-bold text-foreground">{title}</h3>
                    <p className="mt-1">{description}</p>
                  </section>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-line bg-panel p-4 shadow-sm sm:p-6">
              <h2 className="flex items-center gap-3 border-b border-line pb-3 text-lg font-bold text-foreground sm:text-xl">
                <span className="bg-primary/10 p-2 text-primary">
                  <CircleHelp className="size-5" />
                </span>
                {text(locale, "คำถามที่พบบ่อย", "Frequently asked questions")}
              </h2>
              <div className="mt-4 space-y-2">
                {faqs.map(([question, answer]) => (
                  <details key={question} className="group border border-line bg-panel-2">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 p-3 text-sm font-semibold text-foreground transition hover:text-primary">
                      {question}
                      <span className="text-muted-foreground transition-transform group-open:rotate-180">
                        ▼
                      </span>
                    </summary>
                    <p className="border-t border-line p-3 pt-2 text-sm leading-6 text-muted-foreground">
                      {answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          <aside className="flex h-fit flex-col gap-4 md:gap-6 lg:col-span-5">
            <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-sm">
              <div className="border-b border-line bg-panel-2 px-4 py-3 sm:px-6 sm:py-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  {text(locale, "ความสามารถหลัก", "Main features")}
                </h2>
              </div>
              <div className="space-y-2 p-3 sm:p-4">
                {features.map(({ icon: Icon, title, description }, index) => (
                  <div
                    key={title}
                    className="flex items-center gap-3 border border-transparent p-3 transition hover:border-line hover:bg-panel-2"
                  >
                    <div
                      className={`grid size-10 shrink-0 place-items-center ${
                        index % 2 === 0
                          ? "bg-primary/10 text-primary"
                          : "bg-brand-2/10 text-brand-2"
                      }`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-foreground">{title}</h3>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-line bg-panel shadow-sm">
              <div className="border-b border-line bg-panel-2 px-4 py-3 sm:px-6 sm:py-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  {text(locale, "ทำไมต้องใช้ NextLyricsEditor", "Why NextLyricsEditor")}
                </h2>
              </div>
              <div className="space-y-3 p-4 text-xs leading-5 text-muted-foreground sm:p-5">
                {[
                  text(locale, "แยก Project เป็นเพลง ๆ ทำให้งานไม่ปะปนกัน", "Keep one song per project and stay organized"),
                  text(locale, "แก้เฉพาะคำหรือบรรทัดที่มีปัญหาได้", "Fix only the words or lines that need attention"),
                  text(locale, "ดู Lyrics และ Chord Preview ไปพร้อมกับการแก้ไข", "Review lyrics and chords while editing"),
                  text(locale, "เตรียมไฟล์ต่อให้เหมาะกับโปรแกรมหรือ workflow ของคุณ", "Prepare files for the tools and workflow you use"),
                ].map((item) => (
                  <p key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-2" />
                    {item}
                  </p>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-primary/20 bg-primary/10 p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-3">
                <div className="bg-panel p-2 text-primary shadow-sm">
                  <FolderOpen className="size-5" />
                </div>
                <h2 className="text-sm font-bold text-foreground">
                  {text(locale, "Project Library", "Project Library")}
                </h2>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {text(
                  locale,
                  "ทุกครั้งที่กดเริ่มใช้งาน คุณจะเลือกเปิด Project เดิมหรือสร้าง Project ใหม่ได้จากหน้าต่างเดียว",
                  "Start from one place: open an existing project or create a new one from the same library"
                )}
              </p>
              <Button size="sm" onClick={openProjectLibrary} className="mt-3 gap-2">
                <FolderOpen className="size-4" />
                {text(locale, "เปิด Project Library", "Open Project Library")}
              </Button>
            </section>

            <section className="rounded-lg border border-brand-2/25 bg-brand-2/10 p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-3">
                <div className="bg-panel p-2 text-brand-2 shadow-sm">
                  <LockKeyhole className="size-5" />
                </div>
                <h2 className="text-sm font-bold text-foreground">
                  {text(locale, "Local-first workspace", "Local-first workspace")}
                </h2>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {text(
                  locale,
                  "ไฟล์เพลงและข้อมูลการแก้ไขทำงานอยู่ใน browser ของคุณเป็นหลัก คุณจึงควบคุม Project ของตัวเองได้",
                  "Song files and editing data stay primarily in your browser, keeping your projects under your control"
                )}
              </p>
            </section>
          </aside>
        </div>
      </main>

      <footer className="border-t border-line bg-panel px-4 py-5 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} NextLyricsEditor. {text(locale, "เครื่องมือแก้ไขเนื้อเพลงคาราโอเกะบนเว็บ", "Browser-based karaoke lyrics editor")}
            </p>
            <p className="mt-1 text-[11px] text-dim">
              {text(locale, "โปรดใช้ไฟล์ที่คุณมีสิทธิ์ใช้งานตามกฎหมาย", "Use files that you are legally allowed to use")}
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void handleRequestReset()}
          >
            <AlertTriangle />
            {text(locale, "ล้างข้อมูลทั้งหมด", "Clear all data")}
          </Button>
        </div>
      </footer>

      <ProjectListModal
        open={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />
    </div>
  );
}
