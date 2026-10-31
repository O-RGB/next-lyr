"use client";

import Image from "next/image";
import Link from "next/link";
import { liveQuery } from "dexie";
import {
  ArrowUpRight,
  AudioLines,
  Clock3,
  FileMusic,
  FolderOpen,
  Globe,
  HardDrive,
  LayoutDashboard,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import NewProjectModal from "@/components/modals/project/new-project-modal";
import ProjectLoading from "@/components/modals/project/project-loading";
import { deleteProject, getAllProjectSummaries, type ProjectSummary } from "@/lib/database/db";
import { useSettingsStore } from "@/features/settings/settings-store";
import { text as localizedText } from "@/features/settings/locale";
import { useKaraokeStore } from "@/stores/karaoke-store";
import styles from "./dashboard.module.css";

export default function Home() {
  const language = useSettingsStore((state) => state.uiLocale);
  const updateSettings = useSettingsStore((state) => state.set);
  const text = (thai: string, english: string) => localizedText(language, thai, english);
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("updated");
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const subscription = liveQuery(getAllProjectSummaries).subscribe({
      next: (rows) => { setProjects(rows); setLoadError(false); },
      error: () => setLoadError(true),
    });
    return () => subscription.unsubscribe();
  }, []);

  const rows = (projects ?? [])
    .filter((project) => `${project.name} ${project.mode}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => sort === "name"
      ? a.name.localeCompare(b.name, language)
      : new Date(b[sort === "created" ? "createdAt" : "updatedAt"]).getTime() - new Date(a[sort === "created" ? "createdAt" : "updatedAt"]).getTime());
  const lastUpdated = projects?.length
    ? Math.max(...projects.map((project) => new Date(project.updatedAt).getTime()))
    : null;
  const formatDate = (value: Date | number, locale: string) => new Date(value).toLocaleDateString(locale === "th" ? "th-TH" : "en-US");
  const newProject = () => setCreating(true);

  async function removeProject() {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      await deleteProject(deleting.id);
      if (useKaraokeStore.getState().projectId === deleting.id) useKaraokeStore.getState().actions.clearProject();
      setDeleting(null);
    } catch {
      toast.error(text("ลบโปรเจกต์ไม่สำเร็จ กรุณาลองอีกครั้ง", "Could not delete the project. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`dashboard-shell bg-base text-foreground ${styles.workspace}`}
    >
      <div className="flex min-h-full">
        <aside
          className={`sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-panel px-5 py-7 lg:flex ${styles.sidebar}`}
        >
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/icon-app.png"
              alt=""
              width={40}
              height={40}
              className=""
            />
            <div>
              <p className="font-semibold tracking-tight">NextLyricsEditor</p>
              <p className="mt-0.5 text-[10px] tracking-[0.16em] text-dim">
                PROJECT WORKSPACE
              </p>
            </div>
          </Link>
          <p className="mb-3 mt-12 text-[10px] font-semibold uppercase tracking-[0.16em] text-dim">
            {text("พื้นที่ทำงาน", "Workspace")}
          </p>
          <Link
            href="/"
            aria-current="page"
            className={`flex items-center gap-3 px-3 py-3 text-sm font-medium ${styles.activeNav}`}
          >
            <LayoutDashboard className="size-4" />
            {text("โปรเจกต์ทั้งหมด", "All projects")}
          </Link>
          <Link
            href="/guide"
            className="mt-1 flex items-center gap-3 px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-base hover:text-primary"
          >
            <FileMusic className="size-4" />
            {text("วิธีใช้งาน", "User guide")}
          </Link>
          <div
            className={`mt-auto border border-line bg-base p-4 ${styles.localStorage}`}
          >
            <HardDrive className="mb-3 size-5 text-primary" />
            <p className="text-xs font-medium">
              {text("จัดเก็บบนอุปกรณ์นี้", "Stored on this device")}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {text(
                "โปรเจกต์ของคุณอยู่ใน browser นี้ พร้อมกลับมาทำงานต่อได้เสมอ",
                "Your projects live in this browser, ready for your next session.",
              )}
            </p>
          </div>
          <Link
            href="/guide"
            className="mt-5 text-xs text-dim hover:text-primary"
          >
            {text("เกี่ยวกับ NextLyricsEditor", "About NextLyricsEditor")}
          </Link>
        </aside>

        <div className="min-w-0 flex-1">
          <header
            className={`flex min-h-20 items-center justify-between gap-3 border-b border-line bg-panel px-5 sm:px-9 ${styles.header}`}
          >
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <FolderOpen className="size-4 text-primary" />
              <span className="font-medium lg:hidden">NextLyricsEditor</span>
              <span className="hidden text-muted-foreground lg:inline">
                {text("พื้นที่ทำงาน", "Workspace")}
              </span>
              <span className="hidden text-dim sm:inline">/</span>
              <span className="hidden sm:inline">
                {text("โปรเจกต์", "Projects")}
              </span>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="size-4" />
              <select
                aria-label={text("ภาษา", "Language")}
                value={language}
                onChange={(event) => updateSettings("uiLocale", event.target.value as "th" | "en")}
                className="max-w-28 bg-transparent py-2"
              >
                <option value="th">ไทย</option>
                <option value="en">English</option>
              </select>
            </label>
          </header>

          <main
            className={`mx-auto max-w-7xl px-5 py-8 sm:px-9 sm:py-10 ${styles.main}`}
          >
            <div
              className={`flex flex-wrap items-end justify-between gap-5 ${styles.intro}`}
            >
              <div className="min-w-0">
                <p
                  className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary ${styles.eyebrow}`}
                >
                  LYRICS PROJECT MANAGER
                </p>
                <h1
                  className={`text-3xl font-semibold tracking-tight ${styles.title}`}
                >
                  {text("โปรเจกต์ของคุณ", "Your projects")}
                </h1>
                <p className="mt-3 hidden text-sm text-muted-foreground sm:block">
                  {text(
                    "จัดการไฟล์เพลงและกลับไปทำงานต่อ จากที่เดียว",
                    "Manage your songs and pick up where you left off.",
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/guide" />}
                  className="hidden h-11 gap-2 px-5 sm:inline-flex"
                >
                  <FileMusic className="size-4" />
                  {text("วิธีใช้งาน", "User guide")}
                </Button>
                <Button
                  onClick={newProject}
                  className={`h-11 gap-2 px-5 ${styles.createButton}`}
                >
                  <Plus className="size-4" />
                  <span className="sm:hidden">{text("สร้างใหม่", "New")}</span>
                  <span className="hidden sm:inline">
                    {text("สร้างโปรเจกต์", "New project")}
                  </span>
                </Button>
              </div>
            </div>

            <div className="my-8 hidden gap-4 sm:grid sm:grid-cols-3">
              {[
                {
                  icon: FolderOpen,
                  label: text("โปรเจกต์ทั้งหมด", "Total projects"),
                  value: projects ? projects.length : "—",
                },
                {
                  icon: AudioLines,
                  label: text("โปรเจกต์ MIDI", "MIDI projects"),
                  value: projects ? projects.filter((project) => project.mode === "midi").length : "—",
                },
                {
                  icon: Clock3,
                  label: text("แก้ไขล่าสุด", "Last updated"),
                  value: lastUpdated ? formatDate(lastUpdated, language) : "—",
                },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className={`flex items-center gap-4 border border-line bg-panel p-5 ${styles.statCard}`}
                >
                  <span
                    className={`grid size-11 shrink-0 place-items-center ${styles.statIcon}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p
                      className={`mt-1 text-lg font-semibold tabular-nums ${styles.statValue}`}
                    >
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <section
              className={`overflow-hidden border border-line bg-panel ${styles.library}`}
            >
              <div
                className={`flex flex-wrap items-center justify-between gap-4 border-b border-line p-5 ${styles.libraryToolbar}`}
              >
                <h2 className="text-sm font-semibold">
                  {text("รายการโปรเจกต์", "Project library")}{" "}
                  <span
                    className={`ml-2 px-2 py-0.5 text-xs ${styles.countBadge}`}
                  >
                    {rows.length}
                  </span>
                </h2>
                <div
                  className={`flex w-full flex-wrap gap-3 sm:w-auto ${styles.filters}`}
                >
                  <label
                    className={`flex min-w-0 flex-1 items-center gap-2 border border-line bg-base px-3 sm:w-64 ${styles.search}`}
                  >
                    <Search className="size-4 shrink-0 text-dim" />
                    <input
                      aria-label={text("ค้นหาโปรเจกต์", "Search projects")}
                      placeholder={text(
                        "ค้นหาชื่อโปรเจกต์ หรือประเภท…",
                        "Search projects or format…",
                      )}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="h-10 min-w-0 w-full bg-transparent text-xs outline-none"
                    />
                  </label>
                  <select
                    aria-label={text("เรียงโปรเจกต์", "Sort projects")}
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    className={`border border-line bg-panel px-3 py-2 text-xs ${styles.sort}`}
                  >
                    <option value="updated">
                      {text("แก้ไขล่าสุด", "Recently updated")}
                    </option>
                    <option value="created">
                      {text("สร้างล่าสุด", "Recently created")}
                    </option>
                    <option value="name">
                      {text("ชื่อโปรเจกต์", "Project name")}
                    </option>
                  </select>
                </div>
              </div>

              {loadError ? (
                <div role="alert" className="p-12 text-center">
                  <p>
                    {text(
                      "อ่านรายการโปรเจกต์ไม่สำเร็จ",
                      "Unable to load projects",
                    )}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    {text("ลองอีกครั้ง", "Try again")}
                  </Button>
                </div>
              ) : !projects ? (
                <div
                  role="status"
                  className="flex justify-center gap-2 p-16 text-sm text-muted-foreground"
                >
                  <Loader2 className="size-4 animate-spin" />
                  {text("กำลังโหลดโปรเจกต์…", "Loading projects…")}
                </div>
              ) : rows.length === 0 ? (
                <div className={`px-5 py-16 text-center ${styles.emptyState}`}>
                  <span
                    className={`mx-auto grid size-16 place-items-center text-primary ${styles.emptyIcon}`}
                  >
                    <FolderOpen className="size-7" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">
                    {query
                      ? text("ไม่พบโปรเจกต์ที่ค้นหา", "No matching projects")
                      : text("เริ่มต้นเพลงแรกของคุณ", "Start your first song")}
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    {query
                      ? text(
                          "ลองค้นหาด้วยชื่ออื่น หรือเคลียร์คำค้นหา",
                          "Try another name or clear your search.",
                        )
                      : text(
                          "สร้างโปรเจกต์จาก MIDI หรือ MP3 แล้วเริ่มแก้ไขเนื้อร้อง",
                          "Create a project from MIDI or MP3 and start editing lyrics.",
                        )}
                  </p>
                  <Button
                    className="mt-6 gap-2"
                    variant="outline"
                    onClick={query ? () => setQuery("") : newProject}
                  >
                    {query ? (
                      text("ล้างคำค้นหา", "Clear search")
                    ) : (
                      <>
                        <Plus className="size-4" />
                        {text("สร้างโปรเจกต์แรก", "Create first project")}
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  <ul className={styles.mobileProjects}>
                    {rows.map((project) => (
                      <li key={project.id} className={styles.mobileProject}>
                        <Link
                          href={`/project/${encodeURIComponent(project.id)}`}
                          aria-label={`${text("เปิด", "Open")} ${project.name}`}
                          className={styles.mobileProjectLink}
                        >
                          <span
                            className={`grid size-9 shrink-0 place-items-center ${styles.projectIcon}`}
                          >
                            <FileMusic className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {project.name}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {project.mode.toUpperCase()}
                              <span className="mx-2 text-dim">·</span>
                              {formatDate(project.createdAt, language)}
                            </span>
                          </span>
                          <ArrowUpRight className="size-4 shrink-0 text-primary" />
                        </Link>
                        <button
                          type="button"
                          aria-label={`${text("ลบ", "Delete")} ${project.name}`}
                          onClick={() => setDeleting(project)}
                          className={`grid size-11 shrink-0 place-items-center text-dim hover:bg-destructive/10 hover:text-destructive ${styles.deleteProject}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <thead
                        className={`border-b border-line bg-base/60 text-xs text-muted-foreground ${styles.tableHead}`}
                      >
                        <tr>
                          <th className="px-5 py-3 font-medium">
                            {text("ชื่อโปรเจกต์", "Project name")}
                          </th>
                          <th className="px-4 py-3 font-medium">
                            {text("ประเภท", "Format")}
                          </th>
                          <th className="px-4 py-3 font-medium">
                            {text("สร้างเมื่อ", "Created")}
                          </th>
                          <th className="px-4 py-3 font-medium">
                            {text("แก้ไขล่าสุด", "Updated")}
                          </th>
                          <th className="px-5 py-3 text-right font-medium">
                            {text("จัดการ", "Actions")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((project) => (
                          <tr
                            key={project.id}
                            className={`group border-b border-line-soft transition-colors last:border-0 ${styles.projectRow}`}
                          >
                            <td className="px-5 py-5">
                              <Link
                                href={`/project/${encodeURIComponent(project.id)}`}
                                className="flex items-center gap-3"
                              >
                                <span
                                  className={`grid size-11 shrink-0 place-items-center ${styles.projectIcon}`}
                                >
                                  <FileMusic className="size-5" />
                                </span>
                                <span className="min-w-0">
                                  <span className="block max-w-64 truncate font-medium group-hover:text-primary">
                                    {project.name}
                                  </span>
                                  <span className="mt-1 block max-w-64 truncate text-xs text-dim">
                                    {text("โปรเจกต์เนื้อร้อง", "Lyrics project")}
                                  </span>
                                </span>
                              </Link>
                            </td>
                            <td className="px-4 py-5 tabular-nums">
                              {project.mode.toUpperCase()}
                            </td>
                            <td className="px-4 py-5 tabular-nums text-muted-foreground">
                              {formatDate(project.createdAt, language)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-5 text-xs text-muted-foreground">
                              {formatDate(project.updatedAt, language)}
                            </td>
                            <td className="px-5 py-5">
                              <div className="flex items-center justify-end gap-3">
                                <Link
                                  aria-label={`${text("เปิด", "Open")} ${project.name}`}
                                  href={`/project/${encodeURIComponent(project.id)}`}
                                  className={`inline-flex items-center gap-1 text-xs font-medium text-primary ${styles.openProject}`}
                                >
                                  {text("เปิดโปรเจกต์", "Open project")}
                                  <ArrowUpRight className="size-4" />
                                </Link>
                                <button
                                  type="button"
                                  aria-label={`${text("ลบ", "Delete")} ${project.name}`}
                                  onClick={() => setDeleting(project)}
                                  className={`grid size-9 place-items-center text-dim hover:bg-destructive/10 hover:text-destructive ${styles.deleteProject}`}
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <div
                className={`flex flex-wrap justify-between gap-2 border-t border-line px-5 py-3 text-[11px] text-dim ${styles.libraryFooter}`}
              >
                <span>
                  {text("แสดง", "Showing")} {rows.length} /{" "}
                  {projects?.length ?? 0} {text("โปรเจกต์", "projects")}
                </span>
                <Link href="/guide" className="text-primary sm:hidden">{text("วิธีใช้งาน", "User guide")}</Link>
                <span className="hidden items-center gap-1.5 sm:flex">
                  <HardDrive className="size-3" />
                  {text(
                    "บันทึกใน browser บนอุปกรณ์นี้",
                    "Saved in this browser on this device",
                  )}
                </span>
              </div>
            </section>
          </main>
        </div>
      </div>
      <NewProjectModal open={creating && !loading} onClose={() => setCreating(false)} onLoadingChange={setLoading} />
      {loading ? <ProjectLoading message={text("กำลังสร้างโปรเจกต์...", "Creating project...")} /> : null}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text("ลบโปรเจกต์", "Delete project")}</AlertDialogTitle>
            <AlertDialogDescription>
              {text(`ลบ “${deleting?.name ?? ""}” ออกจากเครื่องนี้หรือไม่? ไม่สามารถกู้คืนได้`, `Delete “${deleting?.name ?? ""}” from this device? This cannot be undone.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {text("ยกเลิก", "Cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void removeProject()}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                text("ลบ", "Delete")
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
