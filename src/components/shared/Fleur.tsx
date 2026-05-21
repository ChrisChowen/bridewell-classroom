// Gold fleur-de-lis — used sparingly as a section marker. Pattern borrowed
// from the KESW Bridewell heritage page (BRAND.md §Iconography). 16–20px.

export function Fleur({ size = 16, title = "" }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : "presentation"}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
      fill="var(--color-gold-500)"
    >
      {title ? <title>{title}</title> : null}
      <path d="M12 2 C11 4 9 6 9 9 C9 11 10 12 12 13 C14 12 15 11 15 9 C15 6 13 4 12 2 Z M5 11 C3 12 2 14 3 16 C4 17 6 17 8 16 C9 15 9 13 8 12 C7 11 6 11 5 11 Z M19 11 C18 11 17 11 16 12 C15 13 15 15 16 16 C18 17 20 17 21 16 C22 14 21 12 19 11 Z M12 14 C11 17 9 19 9 21 H15 C15 19 13 17 12 14 Z" />
      <circle cx="12" cy="13" r="1.2" fill="var(--color-cream-50)" />
    </svg>
  );
}
