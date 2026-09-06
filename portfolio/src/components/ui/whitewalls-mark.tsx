/**
 * The whitewalls mark: two wall planes angled toward a vanishing point, which
 * is a gallery corner seen from above.
 *
 * Redrawn as a path rather than placed as the source screenshot, for three
 * reasons: the screenshot is black artwork on a light design-tool grid and
 * would sit in a white box on this page; it carries no transparency to key
 * out; and as geometry it can take `currentColor`, so the mark inherits the
 * same ink as the type beside it instead of importing a second black.
 */
export function WhitewallsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={7}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M10 12 L42 26 L42 74 L10 88 Z" />
      <path d="M90 12 L58 26 L58 74 L90 88 Z" />
    </svg>
  );
}
