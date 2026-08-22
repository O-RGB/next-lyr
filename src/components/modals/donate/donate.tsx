import {
  ExternalLink,
  Heart,
  HeartHandshake,
} from "lucide-react";
import Image from "next/image";
import { text } from "@/features/settings/locale";
import { useSettingsStore } from "@/features/settings/settings-store";

interface DonateProps {
  show?: boolean;
}

const DONATION_URL = "https://ganknow.com/nextfeeder/tip";

const Donate = ({ show = true }: DonateProps) => {
  const locale = useSettingsStore((state) => state.uiLocale);
  const supportCard = (
    <aside className="order-1 flex min-w-0 flex-col rounded-lg border border-line bg-panel-2 p-4 sm:p-5 lg:order-2">
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-panel text-primary shadow-sm ring-1 ring-line">
          <HeartHandshake className="size-4" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold leading-tight text-foreground">
            {text(locale, "ช่วยสนับสนุนโครงการ", "Support the project")}
          </h3>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {text(locale, "การสนับสนุนของคุณช่วยให้เราดูแลและพัฒนา NextLyricsEditor ต่อไปได้", "Your support helps us maintain and improve NextLyricsEditor")}
      </p>

      <a
        href={DONATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/85 active:bg-primary/75"
      >
        <Heart className="size-4 shrink-0" />
        <span>{text(locale, "สนับสนุนผ่าน Ganknow", "Support via Ganknow")}</span>
        <ExternalLink className="size-3.5 shrink-0" />
      </a>

      <a
        href={DONATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 break-all text-center text-xs text-primary underline-offset-2 hover:underline"
      >
        {DONATION_URL}
      </a>

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        {text(locale, "ขอบคุณสำหรับกำลังใจและการสนับสนุนครับ 🙏", "Thank you for your encouragement and support 🙏")}
      </p>
    </aside>
  );

  return (
    <div className="mx-auto max-w-5xl p-3 text-foreground sm:p-4">
      <div
        className={
          show
            ? "grid min-h-0 gap-3 lg:grid-cols-[1.08fr_0.92fr]"
            : "mx-auto max-w-md"
        }
      >
        {show ? (
          <section className="order-2 flex min-w-0 flex-col rounded-lg border border-line bg-panel p-4 sm:p-5 lg:order-1">
            <div className="flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Image
                  src="/images/icon-app.png"
                  alt=""
                  aria-hidden="true"
                  width={512}
                  height={512}
                  className="size-11 rounded-xl object-cover"
                />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold leading-tight text-foreground sm:text-xl">
                  NextLyricsEditor
                </h2>
                <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                  Karaoke Lyrics Editor
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {text(locale, "เครื่องมือสำหรับสร้าง แก้ไข และจัดการเนื้อเพลงคาราโอเกะบนเว็บ พร้อมช่วยเตรียมไฟล์สำหรับใช้งานต่อได้สะดวกขึ้น", "A browser-based tool for creating, editing, and managing karaoke lyrics, with convenient export preparation")}
            </p>

            <div className="mt-4 rounded-lg border border-line-soft bg-panel-2/80 p-3 sm:p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {text(locale, "เกี่ยวกับโปรเจกต์", "About the project")}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {text(locale, "NextLyricsEditor พัฒนาให้การแก้ไขคำร้อง ซับ และจังหวะเพลงทำได้ง่าย ใช้งานได้จากเบราว์เซอร์โดยไม่ต้องติดตั้งโปรแกรมเพิ่มเติม", "NextLyricsEditor makes lyrics, subtitles, and timing easy to edit directly in the browser without extra installation")}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                text(locale, "ใช้งานบนเว็บ", "Web-based"),
                text(locale, "แก้ไขเนื้อเพลง", "Lyrics editing"),
                text(locale, "ใช้ฟรี", "Free to use"),
              ].map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-line bg-panel-2 px-3 py-1 text-[10px] font-medium text-muted-foreground"
                >
                  {badge}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {supportCard}
      </div>
    </div>
  );
};

export default Donate;
