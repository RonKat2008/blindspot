"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./landing.module.css";

const SCROLLED_PX = 12;

function Mark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className={styles.mark}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 12 L12 3 A9 9 0 0 1 21 12 Z" className={styles.markWedge} />
    </svg>
  );
}

export function StickyNav() {
  const [isScrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLLED_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={styles.nav} data-scrolled={isScrolled || undefined}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.brand} aria-label="Blind Spot home">
          <Mark />
          <span>Blind Spot</span>
        </Link>
        <nav aria-label="Main" className={styles.navLinks}>
          <Link href="/tour" className={`${styles.navLink} ${styles.navOptional}`}>Tour</Link>
          <Link href="/play" className={`${styles.navLink} ${styles.navOptional}`}>Sandbox</Link>
          <Link href="/why" className={`${styles.navLink} ${styles.navOptional}`}>Why</Link>
          <Link href="/login" className={styles.navLink}>Sign in</Link>
          <Link href="/new" className={styles.navButton}>New board</Link>
        </nav>
      </div>
    </header>
  );
}

export { Mark };
