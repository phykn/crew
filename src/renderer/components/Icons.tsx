// Kit icons drawn on a 20px grid; every tile shares one color, so a new skill needs only its shape
const ICONS: Record<string, { path: React.ReactNode }> = {
  list: { path: <path d="M6 6h9M6 10h9M6 14h9M3.5 6h.5M3.5 10h.5M3.5 14h.5" /> },
  sparkle: { path: <path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6z" fill="currentColor" /> },
  code: { path: <path d="M7.5 6L4 10l3.5 4M12.5 6L16 10l-3.5 4" /> },
  clipboard: { path: <path d="M7.5 3.5h5v3h-5zM7.5 5H5v11.5h10V5h-2.5M7.5 11l2 2 3.5-3.5" /> },
  ruler: { path: <path d="M3 13L13 3l4 4L7 17zM6 10l1.5 1.5M8.5 7.5L10 9M11 5l1.5 1.5" /> },
  wrench: {
    path: (
      <path
        d="M13.5 3.5a3.5 3.5 0 0 0-3.3 4.7L4 14.4 5.6 16l6.2-6.2a3.5 3.5 0 0 0 4.7-3.3l-2 2-2-2z"
        fill="currentColor"
      />
    ),
  },
  eye: {
    path: (
      <>
        <path d="M2.5 10s3-5 7.5-5 7.5 5 7.5 5-3 5-7.5 5-7.5-5-7.5-5z" />
        <circle cx="10" cy="10" r="2" fill="currentColor" />
      </>
    ),
  },
  check: { path: <path d="M4.5 10.5l3.5 3.5 7.5-8" /> },
  bug: {
    path: (
      <>
        <ellipse cx="10" cy="11" rx="3.5" ry="4.5" fill="currentColor" />
        <path d="M10 6.5V4M6.5 9H3.5M16.5 9h-3M6.5 13H3.5M16.5 13h-3M7.5 5l1 1.5M12.5 5l-1 1.5" />
      </>
    ),
  },
  palette: {
    path: (
      <>
        <path d="M10 3a7 7 0 1 0 0 14c1 0 1.5-.7 1.2-1.6-.4-1 .3-1.9 1.3-1.9H15a2 2 0 0 0 2-2A7 7 0 0 0 10 3z" />
        <circle cx="6.5" cy="9" r="1" fill="currentColor" />
        <circle cx="9.5" cy="6.2" r="1" fill="currentColor" />
        <circle cx="13" cy="7.5" r="1" fill="currentColor" />
      </>
    ),
  },
  book: {
    path: <path d="M3.5 4.5h4.5a2 2 0 0 1 2 2V16a2 2 0 0 0-2-2H3.5zM16.5 4.5H12a2 2 0 0 0-2 2V16a2 2 0 0 1 2-2h4.5z" />,
  },
  image: {
    path: (
      <>
        <rect x="3" y="4" width="14" height="12" rx="1.5" />
        <path d="M3.5 14l4-4 3 3 2-2 4 3.5" />
        <circle cx="13" cy="7.5" r="1.2" fill="currentColor" />
      </>
    ),
  },
  user: {
    path: (
      <>
        <circle cx="10" cy="7" r="3" />
        <path d="M4 16.5a6 6 0 0 1 12 0" />
      </>
    ),
  },
  puzzle: { path: <path d="M4 7h3a2 2 0 1 1 4 0h3v3a2 2 0 1 1 0 4v3h-3a2 2 0 1 0-4 0H4v-3a2 2 0 1 0 0-4z" /> },
  scroll: {
    path: <path d="M6 4h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1h9v1a2 2 0 0 0 2 2M6 4a2 2 0 0 0-2 2v7M9 8h3M9 11h3" />,
  },
  browser: {
    path: (
      <>
        <rect x="3" y="4" width="14" height="12" rx="1.5" />
        <path d="M3 7.5h14M5.5 5.8h.5M7.5 5.8h.5" />
      </>
    ),
  },
};

export function KitIcon({ icon, label }: { icon: string; label: string }) {
  const item = ICONS[icon] ?? ICONS.puzzle;
  return (
    <span className="kit-icon" title={label} aria-label={label} role="img">
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {item.path}
      </svg>
    </span>
  );
}
