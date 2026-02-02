export default function RootPage() {
  return (
    <div style={{ padding: "24px", fontFamily: "sans-serif" }}>
      <script
        dangerouslySetInnerHTML={{
          __html: "window.location.replace('/en');",
        }}
      />
      <p>Redirecting…</p>
      <p>
        <a href="/en">English</a> | <a href="/ja">日本語</a>
      </p>
    </div>
  );
}
