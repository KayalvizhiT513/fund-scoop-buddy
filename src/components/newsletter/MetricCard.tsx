interface MetricCardProps {
  label: string;
  value: string | number;
  caption: string;
}

export function MetricCard({ label, value, caption }: MetricCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-border/60 bg-card/90 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.5)]">
      <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-4xl text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{caption}</p>
    </div>
  );
}
