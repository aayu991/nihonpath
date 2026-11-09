import { Link } from "@/i18n/navigation";
export function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-symbol" aria-hidden="true">
        <svg viewBox="0 0 36 36" fill="none">
          <path
            d="M7 12h22M10 8c5 2 11 2 16 0M11 13v15m14-15v15M9 19h18"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="18" cy="25" r="3" fill="currentColor" />
        </svg>
      </span>
      <span>
        Nihon<span className="text-blue-600">Path</span>
        <span className="brand-jp" lang="ja">
          日本への道
        </span>
      </span>
    </Link>
  );
}
