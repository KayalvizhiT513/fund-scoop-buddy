import { ArrowUpRight, Clock3 } from "lucide-react";
import { eventTypeLabel, formatTimestamp, relativeHours, scoreTone } from "@/lib/newsletter";
import type { NormalizedEvent } from "@/types/newsletter";
import { cn } from "@/lib/utils";

interface NewsletterItemCardProps {
  item: NormalizedEvent;
}

const toneClassMap: Record<string, string> = {
  critical: "bg-rose-500/15 text-rose-900 border-rose-600/20",
  strong: "bg-orange-500/15 text-orange-900 border-orange-600/20",
  moderate: "bg-sky-500/15 text-sky-900 border-sky-600/20",
  low: "bg-slate-500/10 text-slate-700 border-slate-500/20",
};

export function NewsletterItemCard({ item }: NewsletterItemCardProps) {
  const tone = scoreTone(item.score);

  return (
    <article className="group rounded-[1.75rem] border border-border/60 bg-card/95 p-6 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.55)] transition-transform duration-300 hover:-translate-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", toneClassMap[tone])}>
          {item.score} {tone}
        </span>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary-foreground">
          {eventTypeLabel(item.eventType)}
        </span>
        <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.sourceLabel}</span>
      </div>

      <h3 className="mt-4 font-display text-2xl leading-tight text-foreground">
        {item.title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.summary}</p>

      <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/70 px-2.5 py-1">
          <Clock3 className="h-3.5 w-3.5" />
          {relativeHours(item.publishedAt)}
        </span>
        {item.entities.stocks.concat(item.entities.mutualFunds).slice(0, 3).map((entity) => (
          <span key={entity} className="rounded-full bg-secondary/70 px-2.5 py-1">
            {entity}
          </span>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {item.whyItMatters.slice(0, 2).map((reason) => (
          <p key={reason} className="text-sm leading-6 text-foreground/80">
            {reason}
          </p>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {formatTimestamp(item.publishedAt)}
        </p>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors group-hover:text-accent"
        >
          Source <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}
