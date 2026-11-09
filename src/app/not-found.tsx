import Link from "next/link";
export default function NotFound() {
  return (
    <html lang="en">
      <body>
        <main style={{ padding: "10%", fontFamily: "sans-serif" }}>
          <h1>404 — Page not found</h1>
          <Link href="/en">English</Link> · <Link href="/ja">日本語</Link>
        </main>
      </body>
    </html>
  );
}
