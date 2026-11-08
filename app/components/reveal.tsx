"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface RevealProps {
  className?: string;
  children: ReactNode;
}

export function Reveal({ className, children }: RevealProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = sectionRef.current;
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

  return (
    <section
      ref={sectionRef}
      className={"reveal" + (className ? " " + className : "")}
    >
      {children}
    </section>
  );
}
