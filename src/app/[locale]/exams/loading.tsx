export default function Loading() {
  return (
    <section className="container exam-page" aria-busy="true">
      <p role="status">Loading examination / 試験を読み込み中…</p>
      <div className="exam-panel animate-pulse h-80 bg-slate-100" />
    </section>
  );
}
