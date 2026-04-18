import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NewsCard, type Article } from "@/components/NewsCard";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle, Newspaper } from "lucide-react";

interface NewsGroup {
  key: string;
  label: string;
  description: string;
  articles: Article[];
  error?: string;
}

interface NewsResponse {
  groups: NewsGroup[];
  fetchedAt: string;
}

const Index = () => {
  const [data, setData] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: fnError } = await supabase.functions.invoke("fetch-news");
      if (fnError) throw fnError;
      setData(res as NewsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visibleGroups =
    activeTab === "all"
      ? data?.groups ?? []
      : (data?.groups ?? []).filter((g) => g.key === activeTab);

  const totalArticles = data?.groups.reduce((s, g) => s + g.articles.length, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-hero text-primary-foreground paper-grain border-b border-border/20">
        <div className="container max-w-6xl py-12 md:py-16">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary-foreground/60 mb-6">
            <Newspaper className="h-3.5 w-3.5" />
            <span>Finnhub Wire · Live Feed</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-medium leading-[0.95] mb-4 max-w-3xl">
            The Banking <em className="text-accent not-italic">Brief</em>
          </h1>
          <p className="text-base md:text-lg text-primary-foreground/70 max-w-xl leading-relaxed">
            Curated newsroom tracking HDFC Bank, HSBC Holdings, and Parag Parikh
            mentions across global financial press.
          </p>
          {data && (
            <div className="mt-8 flex flex-wrap items-center gap-4 text-xs uppercase tracking-widest text-primary-foreground/60">
              <span>{totalArticles} stories</span>
              <span className="opacity-40">|</span>
              <span>Updated {new Date(data.fetchedAt).toLocaleTimeString()}</span>
              <Button
                onClick={load}
                size="sm"
                variant="ghost"
                className="ml-auto h-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-accent"
                disabled={loading}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      {data && (
        <nav className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="container max-w-6xl py-3 flex gap-1 overflow-x-auto">
            {[{ key: "all", label: "All Stories" }, ...data.groups.map((g) => ({ key: g.key, label: g.label }))].map(
              (t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider rounded whitespace-nowrap transition-colors ${
                    activeTab === t.key
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {t.label}
                </button>
              ),
            )}
          </div>
        </nav>
      )}

      {/* Content */}
      <main className="container max-w-6xl py-12">
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-sm uppercase tracking-widest">Fetching latest stories…</p>
          </div>
        )}

        {error && (
          <div className="border border-destructive/30 bg-destructive/5 rounded p-6 flex gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive mb-1">Couldn't load news</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {data &&
          visibleGroups.map((group) => (
            <section key={group.key} className="mb-16">
              <div className="flex items-baseline justify-between border-b-2 border-foreground pb-3 mb-8">
                <div>
                  <h2 className="font-display text-3xl md:text-4xl font-semibold">
                    {group.label}
                  </h2>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
                    {group.description}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  {group.articles.length} {group.articles.length === 1 ? "story" : "stories"}
                </span>
              </div>

              {group.error ? (
                <div className="border border-destructive/30 bg-destructive/5 rounded p-4 text-sm text-destructive">
                  {group.error}
                </div>
              ) : group.articles.length === 0 ? (
                <p className="text-muted-foreground italic py-8 text-center">
                  No recent stories found in the last 14 days.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.articles.map((a) => (
                    <NewsCard key={`${group.key}-${a.id}`} article={a} />
                  ))}
                </div>
              )}
            </section>
          ))}
      </main>

      <footer className="border-t border-border py-8 text-center text-xs uppercase tracking-widest text-muted-foreground">
        Powered by Finnhub · Built with Lovable
      </footer>
    </div>
  );
};

export default Index;
