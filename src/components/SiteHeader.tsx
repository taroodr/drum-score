"use client";

import AuthButton from "@/components/AuthButton";
import { useLanguage } from "@/components/LanguageProvider";
import Link from "next/link";

export default function SiteHeader() {
  const { locale } = useLanguage();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href={`/${locale}`} className="site-logo">
          <span className="site-logo-icon">🥁</span>
          <span className="site-logo-text">Drum Score Lab</span>
        </Link>
        <AuthButton />
      </div>
    </header>
  );
}
