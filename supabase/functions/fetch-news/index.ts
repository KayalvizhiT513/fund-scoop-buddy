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

const TARGETS = [
  {
    key: "hdfc",
    label: "HDFC Bank",
    description: "HDB · NYSE-listed Indian banking giant",
    type: "company" as const,
    symbol: "HDB",
  },
  {
    key: "hsbc",
    label: "HSBC Holdings",
    description: "HSBC · Global banking & financial services",
    type: "company" as const,
    symbol: "HSBC",
  },
  {
    key: "parag-parikh",
    label: "Parag Parikh",
    description: "Filtered from general market news feed",
    type: "keyword" as const,
    keywords: ["parag parikh", "ppfas", "parag-parikh"],
  },
];

function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("FINNHUB_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "FINNHUB_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const today = new Date();
  const past = new Date();
  past.setDate(today.getDate() - 14);
  const from = fmtDate(past);
  const to = fmtDate(today);

  const groups: NewsGroup[] = [];

  for (const t of TARGETS) {
    try {
      let url: string;
      if (t.type === "company") {
        url = `https://finnhub.io/api/v1/company-news?symbol=${t.symbol}&from=${from}&to=${to}&token=${apiKey}`;
      } else {
        url = `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.text();
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

      if (t.type === "keyword") {
        const kws = t.keywords.map((k) => k.toLowerCase());
        data = data.filter((a) => {
          const blob = `${a.headline} ${a.summary}`.toLowerCase();
          return kws.some((k) => blob.includes(k));
        });
      }

      data.sort((a, b) => b.datetime - a.datetime);
      groups.push({
        key: t.key,
        label: t.label,
        description: t.description,
        articles: data.slice(0, 20),
      });
    } catch (err) {
      groups.push({
        key: t.key,
        label: t.label,
        description: t.description,
        articles: [],
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return new Response(
    JSON.stringify({ groups, fetchedAt: new Date().toISOString() }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
