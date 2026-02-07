import type { Metadata } from "next";
import { supportedLocales, localePath } from "@/lib/locales";

export const metadata: Metadata = {
  title: "Contact | Drum Score Lab",
  description: "Contact Drum Score Lab for questions, feedback, or business inquiries.",
  alternates: {
    canonical: "/contact",
    languages: Object.fromEntries(
      supportedLocales.map((code) => [code, localePath(code, "/contact")])
    ),
  },
};

export default function ContactPage() {
  return (
    <main className="legal-page">
      <h1>Contact</h1>
      <p>
        For questions, feedback, or business inquiries, please use the form
        below.
      </p>
      <div className="contact-form">
        <iframe
          src="https://docs.google.com/forms/d/e/1FAIpQLSftolPQPn0tbax9IJK32hDHAelneZSryFKavU5BpZcbUZU56g/viewform?embedded=true"
          title="Contact form"
          frameBorder="0"
          marginHeight={0}
          marginWidth={0}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        >
          Loading…
        </iframe>
      </div>
      <p className="legal-updated">
        We typically respond within 2–3 business days.
      </p>
    </main>
  );
}
