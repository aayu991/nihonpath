import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-2xl border border-slate-200 bg-white text-navy",
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="card-header" className={cn("p-6", className)} {...props} />
  );
}
export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 pb-6", className)}
      {...props}
    />
  );
}
