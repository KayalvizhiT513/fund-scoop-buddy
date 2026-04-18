const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FinnhubArticle {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

interface NewsGroup {
  key: string;
  label: string;
  description: string;
  articles: FinnhubArticle[];
  error?: string;
}

interface CompanyInput {
  key: string;
  label: string;
  description: string;
  type: "company" | "keyword";
  symbol?: string;
  keywords?: string[];
}

const DEFAULT_TARGETS: CompanyInput[] = [
  {
    key: "hdfc",
    label: "HDFC Bank",
    description: "HDB · NYSE-listed Indian banking giant",
    type: "company",
    symbol: "HDB",
  },
  {
    key: "hsbc",
    label: "HSBC Holdings",
    description: "HSBC · Global banking & financial services",
    type: "company",
    symbol: "HSBC",
  },
  {
    key: "parag-parikh",
    label: "Parag Parikh",
    description: "Filtered from general market news feed",
    type: "keyword",
    keywords: ["parag parikh", "ppfas", "parag-parikh"],
  },
];

function log(message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] ${message}`, data);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("FINNHUB_API_KEY");
  if (!apiKey) {
    log("ERROR: FINNHUB_API_KEY is not configured");
    return new Response(
      JSON.stringify({ error: "FINNHUB_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Parse query parameters to get custom company symbols
  const url = new URL(req.url);
  const companiesParam = url.searchParams.get("companies");
  let targets = DEFAULT_TARGETS;

  if (companiesParam) {
    log("Custom companies requested", { companies: companiesParam });
    const symbols = companiesParam.split(",").map((s: string) => s.trim().toUpperCase());
    targets = symbols.map((symbol: string) => ({
      key: symbol.toLowerCase(),
      label: symbol,
      description: `Company symbol: ${symbol}`,
      type: "company" as const,
      symbol,
    }));
  } else {
    log("Using default company targets");
  }

  const today = new Date();
  const past = new Date();
  past.setDate(today.getDate() - 14);
  const from = fmtDate(past);
  const to = fmtDate(today);

  const groups: NewsGroup[] = [];

  for (const t of targets) {
    try {
      let url: string;
      if (t.type === "company" && t.symbol) {
        url = `https://finnhub.io/api/v1/company-news?symbol=${t.symbol}&from=${from}&to=${to}&token=${apiKey}`;
        log(`Fetching news for company: ${t.label} (${t.symbol})`, { url: url.replace(apiKey, "***") });
      } else if (t.type === "keyword") {
        url = `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`;
        log(`Fetching general news for keyword filtering`);
      } else {
        log(`Skipping target ${t.label} - invalid configuration`);
        continue;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text();
        log(`API Error for ${t.label}`, { status: res.status, message: body.slice(0, 200) });
        groups.push({
          key: t.key,
          label: t.label,
          description: t.description,
          articles: [],
          error: `Finnhub error [${res.status}]: ${body.slice(0, 200)}`,
        });
        continue;
      }

      let data = (await res.json()) as FinnhubArticle[];
      log(`Successfully fetched data for ${t.label}`, { articleCount: data.length });

      if (t.type === "keyword") {
        const kws = t.keywords!.map((k: string) => k.toLowerCase());
        const originalCount = data.length;
        data = data.filter((a: FinnhubArticle) => {
          const blob = `${a.headline} ${a.summary}`.toLowerCase();
          return kws.some((k: string) => blob.includes(k));
        });
        log(`Filtered keyword articles for ${t.label}`, { original: originalCount, filtered: data.length });
      }

      data.sort((a: FinnhubArticle, b: FinnhubArticle) => b.datetime - a.datetime);
      log(`Sorted and sliced articles for ${t.label}`, { total: Math.min(data.length, 20) });

      groups.push({
        key: t.key,
        label: t.label,
        description: t.description,
        articles: data.slice(0, 20),
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      log(`Exception while processing ${t.label}`, { error: errorMsg });
      groups.push({
        key: t.key,
        label: t.label,
        description: t.description,
        articles: [],
        error: errorMsg,
      });
    }
  }

  log("Request completed successfully", { groupsCount: groups.length });
  return new Response(
    JSON.stringify({ groups, fetchedAt: new Date().toISOString() }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
