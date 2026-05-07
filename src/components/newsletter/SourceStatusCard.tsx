import type { SourceRun } from "@/types/newsletter";
import { cn } from "@/lib/utils";

interface SourceStatusCardProps {
  run: SourceRun;
}

const statusClassMap: Record<SourceRun["status"], string> = {
  ok: "bg-emerald-500/15 text-emerald-800 border-emerald-600/20",
  degraded: "bg-amber-500/15 text-amber-900 border-amber-600/20",
  skipped: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  error: "bg-rose-500/15 text-rose-900 border-rose-600/20",
};

export function SourceStatusCard({ run }: SourceStatusCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-border/60 bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{run.label}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{run.type}</p>
        </div>
        <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", statusClassMap[run.status])}>
          {run.status}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Fetched</p>
          <p className="font-semibold text-foreground">{run.fetched}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Accepted</p>
          <p className="font-semibold text-foreground">{run.accepted}</p>
        </div>
      </div>
      {run.notes.length > 0 && (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {run.notes[0]}
        </p>
      )}
    </div>
  );
}
