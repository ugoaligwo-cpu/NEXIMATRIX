import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  compact = false,
  showWordmark = false,
  className,
  imgClassName,
  wordmarkClassName,
}: {
  href?: string;
  /** Icon-only, square mark (used in the dashboard rail). */
  compact?: boolean;
  /** Renders the brand name next to the mark. */
  showWordmark?: boolean;
  className?: string;
  imgClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex shrink-0 items-center gap-2.5",
        className,
      )}
      aria-label={`${siteConfig.name} home`}
    >
      <span
        className={cn(
          "relative grid shrink-0 place-items-center overflow-hidden rounded-full",
          compact ? "size-10" : "size-9 sm:size-10",
        )}
      >
        <Image
          src={compact ? "/neximatrix-icon.png" : "/neximatrix-logo.png"}
          alt=""
          width={compact ? 40 : 40}
          height={compact ? 40 : 40}
          priority
          className={cn(
            "h-full w-full object-contain transition-transform duration-300 group-hover:scale-105",
            imgClassName,
          )}
        />
      </span>

      {showWordmark && !compact ? (
        <span
          className={cn(
            "text-[19px] font-extrabold leading-none tracking-[-0.03em] text-white",
            wordmarkClassName,
          )}
        >
          Investin<span className="text-primary">nova</span>
        </span>
      ) : null}
    </Link>
  );
}
