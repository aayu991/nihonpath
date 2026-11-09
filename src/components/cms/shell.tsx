"use client";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, Link } from "@/i18n/navigation";
import {
  Menu,
  BookOpen,
  LayoutDashboard,
  FileText,
  Languages,
  Library,
  Image,
  Users,
  Settings,
  Search,
  Bell,
  ChevronLeft,
} from "lucide-react";
import { logout } from "@/actions/auth";
const links = [
  ["/admin", "Overview", LayoutDashboard],
  ["/admin/courses", "Courses", BookOpen],
  ["/admin/lessons", "Lessons", FileText],
  ["/admin/vocabulary", "Vocabulary", Languages],
  ["/admin/kanji", "Kanji", Languages],
  ["/admin/questions", "Question banks", Library],
  ["/admin/exams", "Examinations", Library],
  ["/admin/guides", "Japan Life Guide", BookOpen],
  ["/admin/media", "Media library", Image],
  ["/admin/editor/translation", "Translations", Languages],
  ["/admin/editor/program", "Learning programs", BookOpen],
  ["/admin/editor/module", "Course modules", Library],
  ["/admin/operations", "Operations & support", Settings],
] as const;
const subscribeMobile = (callback: () => void) => {
  const query = window.matchMedia("(max-width:760px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
};
const mobileSnapshot = () => window.matchMedia("(max-width:760px)").matches;
export function CmsShell({
  children,
  email,
  role,
  locale,
  reviewCount,
  superAdmin,
}: {
  children?: ReactNode;
  email: string;
  role: string;
  locale: string;
  reviewCount: number | null;
  superAdmin: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobile = useSyncExternalStore(
    subscribeMobile,
    mobileSnapshot,
    () => false,
  );
  const pathname = usePathname();
  return (
    <div
      className={`cms-shell ${collapsed ? "cms-collapsed" : ""} ${mobileOpen ? "cms-mobile-open" : ""}`}
      lang="en"
    >
      <aside className="cms-sidebar" id="cms-sidebar">
        <button
          className="cms-mobile-close"
          type="button"
          onClick={() => setMobileOpen(false)}
        >
          Close navigation
        </button>
        <Link
          href="/admin"
          className="cms-studio-brand"
          aria-label="NihonPath Studio"
        >
          <BookOpen aria-hidden="true" /> <span>NihonPath Studio</span>
        </Link>
        <p className="cms-sidebar-label">CONTENT WORKSPACE</p>
        <nav aria-label="Administration">
          {links
            .filter(([href]) => href !== "/admin/operations" || superAdmin)
            .map(([href, title, Icon]) => (
              <Link
                key={href}
                href={href}
                aria-label={title}
                onClick={() => setMobileOpen(false)}
                aria-current={pathname === href ? "page" : undefined}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{title}</span>
              </Link>
            ))}
          {superAdmin && (
            <Link href="/admin/users" aria-label="Users & permissions">
              <Users size={19} aria-hidden="true" />
              <span>Users & permissions</span>
            </Link>
          )}
        </nav>
        <Link
          className="cms-return"
          href="/courses"
          aria-label="View learning site"
        >
          <ChevronLeft size={18} aria-hidden="true" />
          <span>View learning site</span>
        </Link>
      </aside>
      <div className="cms-workspace">
        <header className="cms-topbar">
          <button
            type="button"
            className="cms-icon-button"
            aria-label={
              (mobile ? !mobileOpen : collapsed)
                ? "Expand admin navigation"
                : "Collapse admin navigation"
            }
            aria-expanded={mobile ? mobileOpen : !collapsed}
            aria-controls="cms-sidebar"
            onClick={() =>
              mobile ? setMobileOpen(!mobileOpen) : setCollapsed(!collapsed)
            }
          >
            <Menu />
          </button>
          <form
            action={`/${locale}/admin/search`}
            className="cms-global-search"
          >
            <label className="sr-only" htmlFor="cms-global-q">
              Search all content
            </label>
            <Search size={18} aria-hidden="true" />
            <input
              id="cms-global-q"
              name="q"
              maxLength={100}
              placeholder="Search all content…"
            />
            <button type="submit">Search</button>
          </form>
          <Link
            href="/admin/reviews"
            className="cms-notifications"
            aria-label={
              reviewCount === null
                ? "Review queue unavailable"
                : `${reviewCount} items awaiting review`
            }
          >
            <Bell size={20} />
            {reviewCount !== null && <span>{reviewCount}</span>}
          </Link>
          <details className="cms-profile">
            <summary>{role.replaceAll("_", " ")}</summary>
            <div>
              <p>{email}</p>
              <Link href="/dashboard/notifications">
                Notification preferences
              </Link>
              <form action={logout.bind(null, locale)}>
                <button type="submit">Sign out</button>
              </form>
            </div>
          </details>
        </header>
        <div className="cms-main">{children}</div>
      </div>
    </div>
  );
}
