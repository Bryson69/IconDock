/**
 * IconDock mark: thin mint ring, near-black fill, mint “ID” (matches reference artwork).
 */
const MINT = "#59b687";
const INNER = "#1a1a1a";

export default function IconDockLogo({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="IconDock"
    >
      <circle cx="24" cy="24" r="22" fill={INNER} stroke={MINT} strokeWidth="1.25" />
      <text
        x="24"
        y="24.5"
        textAnchor="middle"
        dominantBaseline="central"
        fill={MINT}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="14"
        fontWeight="800"
        letterSpacing="0.04em"
      >
        ID
      </text>
    </svg>
  );
}
