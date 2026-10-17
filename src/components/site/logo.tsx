export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden>
      <circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="14" cy="14" r="4.2" fill="currentColor" />
      <path d="M14 3 A11 11 0 0 1 24.5 18.5 L14 14 Z" fill="var(--paper)" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
