"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { localePath } from "@/lib/locales";

const languageOptions = [
  { code: "nl", label: "Nederlands" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "pl", label: "Polski" },
  { code: "pt", label: "Português" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "tr", label: "Türkçe" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
  { code: "th", label: "ไทย" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "简体中文" },
  { code: "ko", label: "한국어" },
] as const;

export default function SiteFooter() {
  const { locale, setLocale, t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const currentLanguage =
    languageOptions.find((option) => option.code === locale) ??
    languageOptions.find((option) => option.code === "en")!;

  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-links">
          <a href={localePath(locale, "/blog")}>Blog</a>
          <span className="footer-sep">·</span>
          <a href={localePath(locale, "/community/scores")}>Community</a>
          <span className="footer-sep">·</span>
          <a href={localePath(locale, "/my/scores")}>My Scores</a>
          <span className="footer-sep">·</span>
          <a href={localePath(locale, "/faq")}>FAQ</a>
          <span className="footer-sep">·</span>
          <a href={localePath(locale, "/privacy")}>{t("footer.privacy")}</a>
          <span className="footer-sep">·</span>
          <a href={localePath(locale, "/contact")}>{t("footer.contact")}</a>
        </div>
        <div className="footer-language">
          <span className="select-icon" aria-hidden>
            🌐
          </span>
          <select
            className="select footer-select"
            value={currentLanguage.code}
            onChange={(event) => {
              const next = event.target.value;
              const code = languageOptions.find(
                (option) => option.code === next
              )?.code;
              if (!code) return;
              setLocale(code);
              const target = localePath(code);
              if (pathname !== target) {
                router.push(target);
              }
            }}
            aria-label="Language selector"
          >
            {languageOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <span className="footer-copy">© 2026 Drum Score Lab</span>
    </footer>
  );
}
