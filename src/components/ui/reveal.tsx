"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Fades content up the first time it scrolls into view.
 *
 * State handling is deliberately observer-driven: the server-rendered
 * markup stays fully visible (`data-state="idle"`), and hiding only
 * begins once the browser reports that the node is off-screen. This
 * avoids a flash of hidden content and never traps content invisible
 * if JavaScript or IntersectionObserver is unavailable.
 */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  children,
}: {
  as?: ElementType;
  /** Stagger in milliseconds. */
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const shownRef = useRef(false);
  const [state, setState] = useState<"idle" | "pending" | "visible">("idle");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // One-way: once revealed, a node can never be hidden again, so
        // scrolling back up (or a late callback) can't blank it out.
        if (entry.isIntersecting) {
          if (shownRef.current) return;
          shownRef.current = true;
          setState("visible");
          observer.disconnect();
        } else if (!shownRef.current) {
          setState("pending");
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-state={state}
      style={
        delay
          ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties)
          : undefined
      }
      className={cn("reveal", className)}
    >
      {children}
    </Tag>
  );
}
