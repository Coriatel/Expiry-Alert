import { cn } from "@/lib/utils";

// The logo with its clock hands painted out, and the hands drawn on top so they can turn.
// Coordinates are in the 512px logo image.
const HUB = { x: 246.5, y: 273.5 };
const HAND_COLOR = "#064B75";

export function AnimatedLogo({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <img
        src="/logo-face-v1.png"
        alt="Expiry Alert"
        className="h-full w-full object-contain"
      />
      <svg
        viewBox="0 0 512 512"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        data-testid="logo-hands"
      >
        <g stroke={HAND_COLOR} strokeWidth="10.5" strokeLinecap="round">
          <line className="logo-hand-long" x1={HUB.x} y1={HUB.y} x2="328" y2="226" />
          <line className="logo-hand-short" x1={HUB.x} y1={HUB.y} x2="300" y2="326" />
        </g>
        <circle cx={HUB.x} cy={HUB.y} r="16" fill={HAND_COLOR} />
      </svg>
    </div>
  );
}
