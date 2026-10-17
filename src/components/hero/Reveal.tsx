"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { reducedTransition, spring } from "@/lib/motion";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "section";
}

/** Subtle scroll-triggered fade-up. Opacity only under reduced motion. */
export function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const isReduced = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={isReduced ? reducedTransition : { ...spring.gentle, delay }}
    >
      {children}
    </Tag>
  );
}
