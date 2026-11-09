"use client";
import { useRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
export function NavigationDisclosure({
  label,
  children,
  className = "",
  icon,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details
      ref={ref}
      className={`navigation-disclosure ${className}`}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a") && ref.current)
          ref.current.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && ref.current) {
          ref.current.open = false;
          ref.current.querySelector("summary")?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget) && ref.current)
          ref.current.open = false;
      }}
    >
      <summary aria-label={icon ? label : undefined}>
        {icon ?? (
          <>
            {label}
            <ChevronDown size={15} />
          </>
        )}
      </summary>
      {children}
    </details>
  );
}
