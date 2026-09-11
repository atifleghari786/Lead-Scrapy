import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

type Tone = "amber" | "teal" | "red" | "ink";
type Size = "sm" | "md" | "lg";

const TONE_STYLES: Record<Tone, string> = {
  amber: "bg-signal-amber/15 text-signal-amber",
  teal: "bg-signal-teal/15 text-signal-teal600",
  red: "bg-signal-red/15 text-signal-red",
  ink: "bg-ink-900/[0.06] text-ink-900",
};

const SIZE_STYLES: Record<Size, { box: string; icon: number }> = {
  sm: { box: "h-8 w-8", icon: 16 },
  md: { box: "h-10 w-10", icon: 18 },
  lg: { box: "h-12 w-12", icon: 22 },
};

export function IconBadge({
  icon: Icon,
  tone = "amber",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: Size;
  className?: string;
}) {
  const { box, icon } = SIZE_STYLES[size];
  return (
    <span className={clsx("flex shrink-0 items-center justify-center rounded-lg", box, TONE_STYLES[tone], className)}>
      <Icon size={icon} strokeWidth={1.75} />
    </span>
  );
}
