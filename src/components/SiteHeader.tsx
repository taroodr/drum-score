"use client";

import AuthButton from "@/components/AuthButton";
import { useLanguage } from "@/components/LanguageProvider";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";

export default function SiteHeader() {
  const { locale } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href={`/${locale}`} className="site-logo">
          <span className="site-logo-icon">🥁</span>
          <span className="site-logo-text">Drum Score Lab</span>
        </Link>
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
