/** Simplified Echo companions for controls rendered at small sizes. */
export function TimerActionIcon({ running }: { running: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {running ? (
        <rect x="5" y="5" width="14" height="14" rx="2" />
      ) : (
        <path d="M8 4.5a1 1 0 0 0-1.5.87v13.26a1 1 0 0 0 1.5.87l11-6.63a1 1 0 0 0 0-1.74Z" />
      )}
    </svg>
  );
}
