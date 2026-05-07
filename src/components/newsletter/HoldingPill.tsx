import type { PortfolioHolding } from "@/types/newsletter";
import { cn } from "@/lib/utils";

interface HoldingPillProps {
  holding: PortfolioHolding;
}

export function HoldingPill({ holding }: HoldingPillProps) {
  return (
    <div className="rounded-full border border-border/70 bg-white/80 px-3 py-2 text-xs shadow-[0_8px_20px_-18px_rgba(15,23,42,0.7)]">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-2.5 w-2.5 rounded-full",
            holding.kind === "stock" ? "bg-[hsl(var(--signal-stock))]" : "bg-[hsl(var(--signal-fund))]",
          )}
        />
        <span className="font-semibold text-foreground">{holding.name}</span>
        <span className="text-muted-foreground">{holding.weight}%</span>
      </div>
    </div>
  );
}
