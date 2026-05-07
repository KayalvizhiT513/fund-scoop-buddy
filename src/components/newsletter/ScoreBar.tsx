interface ScoreBarProps {
  label: string;
  value: number;
}

export function ScoreBar({ label, value }: ScoreBarProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary">
        <div
          className="h-2 rounded-full bg-[linear-gradient(90deg,hsl(var(--signal-market)),hsl(var(--signal-reg)))]"
          style={{ width: `${Math.max(8, value)}%` }}
        />
      </div>
    </div>
  );
}
