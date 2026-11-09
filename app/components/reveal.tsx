"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface RevealProps {
  className?: string;
  children: ReactNode;
  as?: "section" | "div";
}

export function Reveal({
  className,
  children,
  as = "section",
}: RevealProps) {
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      element.classList.add("in");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const Tag = as;

  return (
    <Tag
      ref={(node) => {
        elementRef.current = node;
      }}
      className={"reveal" + (className ? " " + className : "")}
    >
      {children}
    </Tag>
  );
}
