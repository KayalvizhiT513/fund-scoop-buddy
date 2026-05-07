import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface RunRow {
  id: string;
  run_date: string;
  status: string;
  headline: string | null;
  normalized_count: number;
  raw_count: number;
}

export const RunHistory = ({ refreshKey }: { refreshKey: number }) => {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("newsletter_runs_view" as any)
        .select("id, run_date, status, headline, normalized_count, raw_count")
        .order("run_date", { ascending: false })
        .limit(14);
      if (!cancelled) {
        setRuns(((data as unknown) as RunRow[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <div className="rounded-[2rem] border border-border/60 bg-card/85 p-7">
      <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Run History</p>
      <h2 className="mt-3 font-display text-3xl">Past newsletter runs</h2>
      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : runs.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No persisted runs yet. Generate one above.</p>
      ) : (
        <div className="mt-6 divide-y divide-border/60">
          {runs.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-foreground">{r.run_date}</p>
                <p className="text-xs text-muted-foreground">{r.headline ?? "—"}</p>
              </div>
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <span>{r.normalized_count} ranked</span>
                <span className="rounded-full bg-secondary/60 px-2 py-1 text-foreground">{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
