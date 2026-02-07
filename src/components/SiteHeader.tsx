"use client";

import AuthButton from "@/components/AuthButton";
import { useLanguage } from "@/components/LanguageProvider";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { localePath } from "@/lib/locales";

export default function SiteHeader() {
  const { locale } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href={localePath(locale)} className="site-logo">
          <span className="site-logo-icon">🥁</span>
          <span className="site-logo-text">Drum Score Lab</span>
        </Link>
        <nav className="site-nav" aria-label="Primary">
          <Link href={localePath(locale, "/blog")}>Blog</Link>
          <Link href={localePath(locale, "/scores")}>Scores</Link>
          <Link href={localePath(locale, "/faq")}>FAQ</Link>
        </nav>
        <div className="header-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
