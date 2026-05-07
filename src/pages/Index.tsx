import { useEffect, useState } from "react";
import {
  AlertCircle,
  Bot,
  Layers3,
  Loader2,
  LogOut,
  Radar,
  RefreshCw,
  Scale,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatTimestamp } from "@/lib/newsletter";
import { Button } from "@/components/ui/button";
import type { NewsletterResponse } from "@/types/newsletter";
import { MetricCard } from "@/components/newsletter/MetricCard";
import { HoldingPill } from "@/components/newsletter/HoldingPill";
import { SourceStatusCard } from "@/components/newsletter/SourceStatusCard";
import { NewsletterItemCard } from "@/components/newsletter/NewsletterItemCard";
import { ScoreBar } from "@/components/newsletter/ScoreBar";
import { RunHistory } from "@/components/newsletter/RunHistory";
import { useAuth } from "@/hooks/useAuth";

const pipelineSteps = [
  {
    title: "Ingest",
    description: "Finnhub, Google News RSS, SEBI, and phase-gated Moneycontrol entry points.",
    icon: Layers3,
  },
  {
    title: "Normalize",
    description: "Common event schema with entities for stocks, funds, fund houses, sectors, and regulatory topics.",
    icon: Radar,
  },
  {
    title: "Compose",
    description: "Ranked portfolio-linked newsletter sections with actionability and watchlist cues.",
    icon: Sparkles,
  },
  {
    title: "Evaluate",
    description: "Grounding, relevance, usefulness, style, and compliance checks surfaced per run.",
    icon: Scale,
  },
];

const Index = () => {
  const { user, signOut } = useAuth();
  const [data, setData] = useState<NewsletterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke("fetch-news", {
        body: {
          runDate: new Date().toISOString().slice(0, 10),
        },
      });

      if (fnError) {
        throw fnError;
      }

      setData(response as NewsletterResponse);
      setHistoryKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate newsletter");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const totalItems = data?.newsletter?.sections?.reduce((sum, section) => sum + section.items.length, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="hero-mesh absolute inset-x-0 top-0 -z-10 h-[48rem]" />

      <header className="container max-w-7xl pt-8 md:pt-12">
        <div className="mb-4 flex items-center justify-end gap-3 text-sm text-muted-foreground">
          <span>{user?.email}</span>
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
        <div className="rounded-[2rem] border border-white/60 bg-white/72 px-6 py-6 shadow-[0_40px_120px_-70px_rgba(15,23,42,0.5)] backdrop-blur md:px-10 md:py-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                <Bot className="h-3.5 w-3.5" />
                Personalized Daily Finance Newsletter
              </div>
              <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[0.95] md:text-7xl">
                Portfolio-aware news, scored and composed into a daily brief.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
                This rewrite turns the repo into the product described in the spec: multi-source
                ingestion, normalized event mapping, deterministic relevance scoring, newsletter
                composition, and run-level evaluation in one workflow.
              </p>
            </div>

            <div className="min-w-[18rem] rounded-[1.75rem] border border-border/60 bg-card/85 p-5">
              <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                Latest Run
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {data ? formatTimestamp(data.fetchedAt) : "Generating"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Daily digest target: 5-15 ranked items, grounded in source URLs and filtered
                against a synthetic portfolio.
              </p>
              <Button
                onClick={() => void load()}
                className="mt-5 h-11 rounded-full px-5"
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Regenerate run
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl pb-20 pt-10 md:pt-14">
        {loading && !data && (
          <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-[2rem] border border-border/60 bg-card/70">
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
            <p className="mt-4 text-sm uppercase tracking-[0.22em] text-muted-foreground">
              Running ingestion, normalization, scoring, and composition
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-[1.75rem] border border-destructive/25 bg-destructive/5 p-6">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Newsletter generation failed</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{error}</p>
              </div>
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-12">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Raw Items"
                value={data.rawCount}
                caption="After source fetches and before portfolio-aware filtering."
              />
              <MetricCard
                label="Ranked Events"
                value={data.normalizedCount}
                caption="Normalized events that cleared hard filters and minimum score."
              />
              <MetricCard
                label="Newsletter Items"
                value={totalItems}
                caption="Delivered across portfolio, MF, regulatory, and market sections."
              />
              <MetricCard
                label="Watchlist Cues"
                value={data.newsletter.watchlist.length}
                caption="Entities and topics worth carrying into subsequent runs."
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[2rem] border border-border/60 bg-card/85 p-7">
                <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  Synthetic Portfolio
                </p>
                <h2 className="mt-3 font-display text-3xl">Tracked holdings and themes</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                  Portfolio filtering is the hard gate. Items are promoted only when they match a
                  holding, fund house, sector, theme, or regulatory topic relevant to this
                  portfolio.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {data.portfolio.holdings.map((holding) => (
                    <HoldingPill key={holding.id} holding={holding} />
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-border/60 bg-card/85 p-7">
                <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  Pipeline
                </p>
                <div className="mt-4 space-y-4">
                  {pipelineSteps.map((step) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.title} className="flex gap-4 rounded-[1.25rem] bg-secondary/45 p-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white">
                          <Icon className="h-5 w-5 text-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{step.title}</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[2rem] border border-border/60 bg-card/85 p-7">
                <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  Source Strategy
                </p>
                <h2 className="mt-3 font-display text-3xl">Operational source status</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {data.sourceRuns.map((run) => (
                    <SourceStatusCard key={run.source} run={run} />
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-border/60 bg-card/85 p-7">
                <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  Evaluation
                </p>
                <h2 className="mt-3 font-display text-3xl">Run quality checks</h2>
                <div className="mt-6 space-y-5">
                  <ScoreBar label="Grounding" value={data.evaluation.grounding} />
                  <ScoreBar label="Relevance" value={data.evaluation.relevance} />
                  <ScoreBar label="Usefulness" value={data.evaluation.usefulness} />
                  <ScoreBar label="Style" value={data.evaluation.style} />
                  <ScoreBar label="Compliance" value={data.evaluation.compliance} />
                </div>
                <div className="mt-6 rounded-[1.25rem] bg-secondary/45 p-4">
                  {data.evaluation.notes.map((note) => (
                    <p key={note} className="text-sm leading-7 text-muted-foreground">
                      {note}
                    </p>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-border/60 bg-card/85 p-7">
              <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                Newsletter Output
              </p>
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="font-display text-4xl">{data.newsletter.headline}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                    {data.newsletter.summary}
                  </p>
                </div>
                <div className="rounded-[1.25rem] bg-secondary/45 px-4 py-3 text-sm text-muted-foreground">
                  Run date {data.runDate}
                </div>
              </div>

              <div className="mt-8 space-y-10">
                {data.newsletter.sections.map((section) => (
                  <div key={section.key}>
                    <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                      <div>
                        <h3 className="font-display text-3xl">{section.title}</h3>
                        <p className="text-sm leading-7 text-muted-foreground">
                          {section.description}
                        </p>
                      </div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {section.items.length} item{section.items.length === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                      {section.items.map((item) => (
                        <NewsletterItemCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-[2rem] border border-border/60 bg-card/85 p-7">
                <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  Watchlist
                </p>
                <h2 className="mt-3 font-display text-3xl">Carry-forward entities</h2>
                <div className="mt-6 flex flex-wrap gap-3">
                  {data.newsletter.watchlist.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border/70 bg-white px-3 py-2 text-sm text-foreground"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-border/60 bg-card/85 p-7">
                <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  Rule Log
                </p>
                <h2 className="mt-3 font-display text-3xl">Deterministic guardrails</h2>
                <div className="mt-6 space-y-3">
                  {data.ruleLog.map((rule) => (
                    <div key={rule} className="rounded-[1.25rem] bg-secondary/45 p-4 text-sm leading-7 text-muted-foreground">
                      {rule}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
