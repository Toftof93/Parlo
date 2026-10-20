// A speech bubble whose words become code: Parlo's mark.
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M6 4h20a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H14l-6.5 5.2a.8.8 0 0 1-1.3-.62V24H6a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z" fill="currentColor" />
      <path d="M12.5 10.5 9 14l3.5 3.5M19.5 10.5 23 14l-3.5 3.5" stroke="var(--paper)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="26.5" cy="5.5" r="3.2" fill="var(--accent)" stroke="var(--paper)" strokeWidth="1.6" />
    </svg>
  );
}
