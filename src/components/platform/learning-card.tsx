import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
export function LearningCard({
  title,
  description,
  href,
  status,
  icon,
  children,
  planned = false,
}: {
  title: string;
  description: string;
  href?: string;
  status: string;
  icon?: ReactNode;
  children?: ReactNode;
  planned?: boolean;
}) {
  return (
    <article className="learning-path-card">
      <div className="path-card-top">
        {icon}
        <span
          className={
            href && !planned
              ? "availability-badge"
              : "availability-badge planned"
          }
        >
          {status}
        </span>
      </div>
      <h3>
        {href ? (
          <Link href={href}>
            {title}
            <ArrowUpRight size={18} />
          </Link>
        ) : (
          title
        )}
      </h3>
      <p>{description}</p>
      {children}
    </article>
  );
}
