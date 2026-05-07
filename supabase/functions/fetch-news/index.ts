import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SourceKey = "finnhub" | "google_rss" | "sebi" | "moneycontrol";
type SourceType = "api" | "rss" | "web";
type HoldingKind = "stock" | "mutual_fund";
type EventType = "portfolio_update" | "fund_update" | "regulatory_update" | "market_context";

interface PortfolioHolding {
  id: string;
  kind: HoldingKind;
  name: string;
  weight: number;
  symbol?: string;
  fundHouse?: string;
  sector?: string;
  themes: string[];
  aliases: string[];
}

interface PortfolioInput {
  userId: string;
  runDate?: string;
  holdings: PortfolioHolding[];
}

interface SourceRun {
  source: SourceKey;
  label: string;
  type: SourceType;
  status: "ok" | "degraded" | "skipped" | "error";
  fetched: number;
  accepted: number;
  notes: string[];
}

interface RawItem {
  id: string;
  source: SourceKey;
  sourceLabel: string;
  sourceType: SourceType;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  topic: string;
}

interface NormalizedEvent {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: SourceKey;
  sourceLabel: string;
  sourceType: SourceType;
  publishedAt: string;
  topic: string;
  eventType: EventType;
  entities: {
    stocks: string[];
    mutualFunds: string[];
    fundHouses: string[];
    sectors: string[];
    regulatoryTopics: string[];
  };
  relevance: number;
  importance: number;
  score: number;
  matchedHoldingIds: string[];
  whyItMatters: string[];
  actionability: string[];
}

interface NewsletterSection {
  key: string;
  title: string;
  description: string;
  items: NormalizedEvent[];
}

interface EvaluationSummary {
  grounding: number;
  relevance: number;
  usefulness: number;
  style: number;
  compliance: number;
  notes: string[];
}

interface NewsletterResponse {
  runDate: string;
  fetchedAt: string;
  portfolio: PortfolioInput;
  sourceRuns: SourceRun[];
  rawCount: number;
  normalizedCount: number;
  items: NormalizedEvent[];
  newsletter: {
    headline: string;
    summary: string;
    sections: NewsletterSection[];
    watchlist: string[];
  };
  evaluation: EvaluationSummary;
  ruleLog: string[];
}

const DEFAULT_PORTFOLIO: PortfolioInput = {
  userId: "demo-user",
  holdings: [
    {
      id: "hdfc-bank",
      kind: "stock",
      name: "HDFC Bank",
      symbol: "HDB",
      weight: 26,
      sector: "banking",
      themes: ["large-cap", "banking", "india"],
      aliases: ["hdfc bank", "hdb", "housing development finance corporation"],
    },
    {
      id: "icici-bank",
      kind: "stock",
      name: "ICICI Bank",
      symbol: "IBN",
      weight: 18,
      sector: "banking",
      themes: ["large-cap", "private bank", "india"],
      aliases: ["icici bank", "ibn"],
    },
    {
      id: "ppfas-flexi-cap",
      kind: "mutual_fund",
      name: "Parag Parikh Flexi Cap Fund",
      fundHouse: "PPFAS",
      weight: 31,
      sector: "multi-asset",
      themes: ["mutual fund", "equity", "flexi cap"],
      aliases: ["parag parikh flexi cap", "ppfas", "parag parikh"],
    },
    {
      id: "sbi-small-cap",
      kind: "mutual_fund",
      name: "SBI Small Cap Fund",
      fundHouse: "SBI Mutual Fund",
      weight: 25,
      sector: "small cap",
      themes: ["mutual fund", "small cap", "domestic equities"],
      aliases: ["sbi small cap fund", "sbi mutual fund"],
    },
  ],
};

const SOURCE_LABELS: Record<SourceKey, string> = {
  finnhub: "Finnhub",
  google_rss: "Google News RSS",
  sebi: "SEBI",
  moneycontrol: "Moneycontrol",
};

const REGULATORY_KEYWORDS = [
  "sebi",
  "mutual fund",
  "expense ratio",
  "disclosure",
  "compliance",
  "circular",
  "consultation paper",
  "regulation",
];

const MARKET_CONTEXT_KEYWORDS = [
  "inflation",
  "interest rate",
  "rbi",
  "liquidity",
  "banking",
  "earnings",
  "flows",
  "markets",
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function buildRunDate(input?: string): string {
  if (!input) {
    return formatDate(new Date());
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? formatDate(new Date()) : formatDate(parsed);
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return formatDate(date);
}

function safeText(value: string | undefined | null): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function stripHtml(value: string | undefined | null): string {
  const decoded = value
    ?.replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

  return safeText(decoded?.replace(/<[^>]+>/g, " "));
}

function cleanSummary(value: string | undefined | null): string {
  const stripped = stripHtml(value);
  return stripped.replace(/\s*Read more\s*$/i, "").trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function truncate(text: string, max = 280): string {
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 1).trim()}…`;
}

function textBlob(...parts: string[]): string {
  return parts
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function matchesAnyAlias(blob: string, aliases: string[]): boolean {
  return aliases.some((alias) => blob.includes(alias.toLowerCase()));
}

function extractXmlItems(xml: string): Array<Record<string, string>> {
  const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

  return itemMatches.map((match) => {
    const item = match[1];
    const getTag = (tag: string) => {
      const tagMatch = item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return stripHtml(
        tagMatch?.[1]
          ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"),
      );
    };

    return {
      title: getTag("title"),
      link: getTag("link"),
      description: getTag("description"),
      pubDate: getTag("pubDate"),
      guid: getTag("guid"),
    };
  });
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "fund-scoop-buddy/1.0",
      Accept: "application/json, text/plain, */*",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 180)}`);
  }

  return response.json();
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "fund-scoop-buddy/1.0",
      Accept: "application/rss+xml, application/xml, text/xml, text/plain, */*",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 180)}`);
  }

  return response.text();
}

async function ingestFinnhub(
  portfolio: PortfolioInput,
  runDate: string,
  apiKey: string | undefined,
): Promise<{ sourceRun: SourceRun; items: RawItem[] }> {
  const sourceRun: SourceRun = {
    source: "finnhub",
    label: SOURCE_LABELS.finnhub,
    type: "api",
    status: "ok",
    fetched: 0,
    accepted: 0,
    notes: [],
  };

  if (!apiKey) {
    sourceRun.status = "skipped";
    sourceRun.notes.push("FINNHUB_API_KEY missing; source skipped.");
    return { sourceRun, items: [] };
  }

  const stockHoldings = portfolio.holdings.filter((holding) => holding.kind === "stock" && holding.symbol);
  const allItems: RawItem[] = [];
  const from = daysAgo(5);

  for (const holding of stockHoldings) {
    const url =
      `https://finnhub.io/api/v1/company-news?symbol=${holding.symbol}&from=${from}&to=${runDate}&token=${apiKey}`;

    try {
      const payload = await fetchJson(url) as Array<Record<string, unknown>>;
      sourceRun.fetched += payload.length;

      for (const article of payload.slice(0, 12)) {
        const title = safeText(String(article.headline ?? ""));
        const summary = cleanSummary(String(article.summary ?? ""));
        const itemUrl = safeText(String(article.url ?? ""));

        if (!title || !itemUrl) {
          continue;
        }

        allItems.push({
          id: `finnhub-${article.id ?? slugify(`${holding.symbol}-${title}`)}`,
          source: "finnhub",
          sourceLabel: SOURCE_LABELS.finnhub,
          sourceType: "api",
          title,
          summary,
          url: itemUrl,
          publishedAt: new Date(Number(article.datetime ?? 0) * 1000 || Date.now()).toISOString(),
          topic: safeText(String(article.category ?? "company news")),
        });
      }
    } catch (error) {
      sourceRun.status = "degraded";
      sourceRun.notes.push(`${holding.name}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  sourceRun.accepted = allItems.length;
  if (!allItems.length && sourceRun.status === "ok") {
    sourceRun.status = "degraded";
    sourceRun.notes.push("No articles returned for tracked stock holdings.");
  }

  return { sourceRun, items: allItems };
}

async function ingestGoogleNews(portfolio: PortfolioInput): Promise<{ sourceRun: SourceRun; items: RawItem[] }> {
  const sourceRun: SourceRun = {
    source: "google_rss",
    label: SOURCE_LABELS.google_rss,
    type: "rss",
    status: "ok",
    fetched: 0,
    accepted: 0,
    notes: [],
  };

  const queries = unique(
    portfolio.holdings.flatMap((holding) => [holding.name, ...holding.aliases.slice(0, 2)]),
  ).slice(0, 8);

  const items: RawItem[] = [];

  for (const query of queries) {
    const rssUrl =
      `https://news.google.com/rss/search?q=${encodeURIComponent(`"${query}" finance OR market`)}&hl=en-IN&gl=IN&ceid=IN:en`;

    try {
      const xml = await fetchText(rssUrl);
      const entries = extractXmlItems(xml).slice(0, 8);
      sourceRun.fetched += entries.length;

      for (const entry of entries) {
        if (!entry.title || !entry.link) {
          continue;
        }

        items.push({
          id: `google-${slugify(entry.guid || `${query}-${entry.title}`)}`,
          source: "google_rss",
          sourceLabel: SOURCE_LABELS.google_rss,
          sourceType: "rss",
          title: entry.title,
          summary: truncate(cleanSummary(entry.description || query)),
          url: entry.link,
          publishedAt: entry.pubDate ? new Date(entry.pubDate).toISOString() : new Date().toISOString(),
          topic: "broad coverage",
        });
      }
    } catch (error) {
      sourceRun.status = "degraded";
      sourceRun.notes.push(`${query}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  sourceRun.accepted = items.length;
  return { sourceRun, items };
}

async function ingestSebi(): Promise<{ sourceRun: SourceRun; items: RawItem[] }> {
  const sourceRun: SourceRun = {
    source: "sebi",
    label: SOURCE_LABELS.sebi,
    type: "rss",
    status: "ok",
    fetched: 0,
    accepted: 0,
    notes: [],
  };

  try {
    const xml = await fetchText("https://www.sebi.gov.in/sebirss.xml");
    const entries = extractXmlItems(xml).slice(0, 20);
    sourceRun.fetched = entries.length;

    const items = entries
      .filter((entry) => entry.title && entry.link)
      .map((entry) => ({
        id: `sebi-${slugify(entry.guid || entry.title)}`,
        source: "sebi" as const,
        sourceLabel: SOURCE_LABELS.sebi,
        sourceType: "rss" as const,
        title: entry.title,
        summary: truncate(cleanSummary(entry.description || entry.title)),
        url: entry.link,
        publishedAt: entry.pubDate ? new Date(entry.pubDate).toISOString() : new Date().toISOString(),
        topic: "regulatory updates",
      }));

    sourceRun.accepted = items.length;
    return { sourceRun, items };
  } catch (error) {
    sourceRun.status = "error";
    sourceRun.notes.push(error instanceof Error ? error.message : "Unknown error");
    return { sourceRun, items: [] };
  }
}

function ingestMoneycontrolPlaceholder(): { sourceRun: SourceRun; items: RawItem[] } {
  return {
    sourceRun: {
      source: "moneycontrol",
      label: SOURCE_LABELS.moneycontrol,
      type: "web",
      status: "skipped",
      fetched: 0,
      accepted: 0,
      notes: ["Deferred intentionally. Spec requires cautious scraping and robots compliance."],
    },
    items: [],
  };
}

function dedupeRawItems(items: RawItem[]): RawItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.url}|${item.title.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function detectEventType(blob: string, holdingKinds: HoldingKind[]): EventType {
  if (REGULATORY_KEYWORDS.some((keyword) => blob.includes(keyword))) {
    return "regulatory_update";
  }

  if (holdingKinds.includes("mutual_fund")) {
    return "fund_update";
  }

  if (MARKET_CONTEXT_KEYWORDS.some((keyword) => blob.includes(keyword))) {
    return "market_context";
  }

  return "portfolio_update";
}

function normalizeItems(items: RawItem[], portfolio: PortfolioInput): NormalizedEvent[] {
  return items.map((item) => {
    const blob = textBlob(item.title, item.summary, item.topic);
    const matchedHoldings = portfolio.holdings.filter((holding) => matchesAnyAlias(blob, holding.aliases));
    const holdingKinds = unique(matchedHoldings.map((holding) => holding.kind));
    const matchedHoldingIds = matchedHoldings.map((holding) => holding.id);
    const stocks = matchedHoldings.filter((holding) => holding.kind === "stock").map((holding) => holding.name);
    const mutualFunds = matchedHoldings
      .filter((holding) => holding.kind === "mutual_fund")
      .map((holding) => holding.name);
    const fundHouses = matchedHoldings
      .map((holding) => holding.fundHouse)
      .filter((value): value is string => Boolean(value));
    const sectors = matchedHoldings
      .map((holding) => holding.sector)
      .filter((value): value is string => Boolean(value));
    const regulatoryTopics = REGULATORY_KEYWORDS.filter((keyword) => blob.includes(keyword));
    const eventType = detectEventType(blob, holdingKinds);
    const recencyHours = Math.max(
      1,
      Math.round((Date.now() - new Date(item.publishedAt).getTime()) / 36e5),
    );
    const matchedWeight = matchedHoldings.reduce((sum, holding) => sum + holding.weight, 0);
    const relevance = Math.min(
      100,
      matchedWeight +
        matchedHoldings.length * 12 +
        (eventType === "regulatory_update" ? 18 : 0) +
        (item.source === "finnhub" ? 8 : 4),
    );
    const importance = Math.max(
      20,
      Math.min(
        100,
        100 -
          Math.min(recencyHours, 72) +
          (regulatoryTopics.length ? 16 : 0) +
          (eventType === "market_context" ? 6 : 0),
      ),
    );
    const score = Math.round(relevance * 0.6 + importance * 0.4);

    const whyItMatters = unique([
      matchedHoldings.length
        ? `Matched ${matchedHoldings.length} portfolio holding${matchedHoldings.length > 1 ? "s" : ""}.`
        : "Market context item included for portfolio backdrop.",
      eventType === "regulatory_update"
        ? "Touches regulatory or compliance topics that can affect fund operations and disclosures."
        : "Relevant because the title or summary references tracked holdings, sectors, or fund houses.",
      recencyHours <= 24 ? "Fresh item from the last 24 hours." : "Older but still within the current newsletter window.",
    ]);

    const actionability = unique([
      matchedHoldings.length ? "Review the linked source and compare against recent portfolio notes." : "Keep on watchlist for theme monitoring.",
      eventType === "regulatory_update"
        ? "Check if this changes disclosure, compliance, or fund-process assumptions."
        : "Track whether this needs follow-up in the next newsletter run.",
    ]);

    return {
      id: item.id,
      title: item.title,
      summary: cleanSummary(item.summary),
      url: item.url,
      source: item.source,
      sourceLabel: item.sourceLabel,
      sourceType: item.sourceType,
      publishedAt: item.publishedAt,
      topic: item.topic,
      eventType,
      entities: {
        stocks: unique(stocks),
        mutualFunds: unique(mutualFunds),
        fundHouses: unique(fundHouses),
        sectors: unique(sectors),
        regulatoryTopics: unique(regulatoryTopics),
      },
      relevance,
      importance,
      score,
      matchedHoldingIds,
      whyItMatters,
      actionability,
    };
  });
}

function filterRankedEvents(events: NormalizedEvent[]): NormalizedEvent[] {
  return events
    .filter((event) => event.score >= 35)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
    });
}

function buildNewsletter(events: NormalizedEvent[]): NewsletterResponse["newsletter"] {
  const topEvents = events.slice(0, 15);

  const makeSection = (key: string, title: string, description: string, filter: (event: NormalizedEvent) => boolean): NewsletterSection => ({
    key,
    title,
    description,
    items: topEvents.filter(filter).slice(0, 4),
  });

  const sections: NewsletterSection[] = [
    makeSection(
      "portfolio-updates",
      "Portfolio Updates",
      "Direct company and holding-linked developments.",
      (event) => event.eventType === "portfolio_update" && event.matchedHoldingIds.length > 0,
    ),
    makeSection(
      "mf-updates",
      "MF Updates",
      "Fund-house and mutual-fund items touching tracked schemes.",
      (event) => event.eventType === "fund_update",
    ),
    makeSection(
      "regulatory-watch",
      "Regulatory Watch",
      "SEBI and compliance signals with downstream portfolio implications.",
      (event) => event.eventType === "regulatory_update",
    ),
    makeSection(
      "market-context",
      "Market Context",
      "Macro and sector cues worth watching alongside holdings.",
      (event) => event.eventType === "market_context",
    ),
  ].filter((section) => section.items.length > 0);

  const watchlist = unique(
    topEvents.flatMap((event) => [
      ...event.entities.stocks,
      ...event.entities.mutualFunds,
      ...event.entities.fundHouses,
      ...event.entities.regulatoryTopics,
    ]),
  ).slice(0, 8);

  const topTitles = topEvents.slice(0, 3).map((event) => event.title);

  return {
    headline: "Personalized Daily Finance Newsletter",
    summary: topTitles.length
      ? `Top signals today: ${topTitles.join(" | ")}`
      : "No high-confidence portfolio-linked items were found in the current run.",
    sections,
    watchlist,
  };
}

function evaluateRun(events: NormalizedEvent[], sourceRuns: SourceRun[]): EvaluationSummary {
  const sourceCoverage = sourceRuns.filter((run) => run.status === "ok" || run.status === "degraded").length;
  const groundedEvents = events.filter((event) => Boolean(event.url && event.sourceLabel)).length;
  const directMatches = events.filter((event) => event.matchedHoldingIds.length > 0).length;
  const complianceBase = sourceRuns.some((run) => run.source === "moneycontrol" && run.status === "skipped") ? 96 : 92;

  return {
    grounding: Math.min(100, 60 + groundedEvents * 3),
    relevance: Math.min(100, 45 + directMatches * 5),
    usefulness: Math.min(100, 40 + events.slice(0, 8).length * 6),
    style: events.length ? 88 : 72,
    compliance: Math.min(100, complianceBase + sourceCoverage * 1),
    notes: [
      "Deterministic scoring used before narrative composition.",
      "Only headline, snippet, and source URL are retained.",
      "Skipped sources are surfaced explicitly instead of silently ignored.",
    ],
  };
}

Deno.serve(async (req: Request) => {
async function ensurePortfolio(admin: any, userId: string, portfolio: PortfolioInput): Promise<string> {
  const { data: existing } = await admin
    .schema("newsletter")
    .from("portfolios")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: created, error } = await admin
    .schema("newsletter")
    .from("portfolios")
    .insert({ user_id: userId, name: "Default Portfolio", is_synthetic: true })
    .select("id")
    .single();
  if (error) throw error;

  const portfolioId = created.id as string;
  await admin.schema("newsletter").from("portfolio_holdings").insert(
    portfolio.holdings.map((h) => ({
      portfolio_id: portfolioId,
      external_id: h.id,
      holding_kind: h.kind,
      name: h.name,
      symbol: h.symbol ?? null,
      fund_house: h.fundHouse ?? null,
      sector: h.sector ?? null,
      weight: h.weight,
      themes: h.themes,
      aliases: h.aliases,
    })),
  );
  return portfolioId;
}

async function persistRun(
  admin: any,
  portfolioId: string,
  runDate: string,
  response: NewsletterResponse,
  rawItems: RawItem[],
): Promise<void> {
  const ns = admin.schema("newsletter");
  const overallStatus =
    response.sourceRuns.some((s) => s.status === "error")
      ? "partial"
      : response.sourceRuns.some((s) => s.status === "degraded")
      ? "partial"
      : "completed";

  // Upsert run
  const { data: run, error: runErr } = await ns
    .from("newsletter_runs")
    .upsert(
      {
        portfolio_id: portfolioId,
        run_date: runDate,
        status: overallStatus,
        headline: response.newsletter.headline,
        summary: response.newsletter.summary,
        raw_count: response.rawCount,
        normalized_count: response.normalizedCount,
        watchlist: response.newsletter.watchlist,
        source_runs: response.sourceRuns,
        rule_log: response.ruleLog,
        completed_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
      },
      { onConflict: "portfolio_id,run_date" },
    )
    .select("id")
    .single();
  if (runErr) throw runErr;
  const runId = run.id as string;

  // Wipe children for idempotency
  await ns.from("raw_items").delete().eq("run_id", runId);
  await ns.from("newsletter_section_items").delete().in(
    "section_id",
    (await ns.from("newsletter_sections").select("id").eq("run_id", runId)).data?.map((s: any) => s.id) ?? [],
  );
  await ns.from("newsletter_sections").delete().eq("run_id", runId);
  await ns.from("normalized_events").delete().eq("run_id", runId);
  await ns.from("evaluations").delete().eq("run_id", runId);

  // Insert raw items
  if (rawItems.length) {
    await ns.from("raw_items").insert(
      rawItems.map((r) => ({
        run_id: runId,
        source_key: r.source,
        source_type: r.sourceType,
        external_id: r.id,
        title: r.title,
        snippet: r.summary,
        url: r.url,
        published_at: r.publishedAt,
        topic: r.topic,
      })),
    );
  }

  // Insert events and remember mapping by external_id
  const eventIdByExternal = new Map<string, string>();
  if (response.items.length) {
    const { data: insertedEvents, error: evErr } = await ns
      .from("normalized_events")
      .insert(
        response.items.map((e) => ({
          run_id: runId,
          external_id: e.id,
          event_type: e.eventType,
          title: e.title,
          summary: e.summary,
          url: e.url,
          source_key: e.source,
          source_label: e.sourceLabel,
          source_type: e.sourceType,
          published_at: e.publishedAt,
          topic: e.topic,
          entities: e.entities,
          why_it_matters: e.whyItMatters,
          actionability: e.actionability,
          matched_holding_ids: e.matchedHoldingIds,
          relevance_score: e.relevance,
          importance_score: e.importance,
          final_score: e.score,
        })),
      )
      .select("id, external_id");
    if (evErr) throw evErr;
    for (const row of insertedEvents ?? []) {
      eventIdByExternal.set(row.external_id, row.id);
    }
  }

  // Insert sections + items
  for (let i = 0; i < response.newsletter.sections.length; i++) {
    const section = response.newsletter.sections[i];
    const { data: sec, error: sErr } = await ns
      .from("newsletter_sections")
      .insert({
        run_id: runId,
        section_key: section.key,
        title: section.title,
        description: section.description,
        position: i,
      })
      .select("id")
      .single();
    if (sErr) throw sErr;
    const items = section.items
      .map((it, idx) => ({
        section_id: sec.id,
        event_id: eventIdByExternal.get(it.id),
        position: idx,
      }))
      .filter((r) => r.event_id);
    if (items.length) await ns.from("newsletter_section_items").insert(items);
  }

  // Evaluation
  await ns.from("evaluations").insert({
    run_id: runId,
    evaluator_key: "deterministic",
    grounding_score: response.evaluation.grounding,
    relevance_score: response.evaluation.relevance,
    usefulness_score: response.evaluation.usefulness,
    style_score: response.evaluation.style,
    compliance_score: response.evaluation.compliance,
    notes: response.evaluation.notes,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body =
      req.method === "POST" ? await req.json().catch(() => ({})) : {};

    const portfolio = DEFAULT_PORTFOLIO;
    const runDate = buildRunDate(
      (body as { runDate?: string }).runDate ?? portfolio.runDate,
    );

    const apiKey = Deno.env.get("FINNHUB_API_KEY");
    const ruleLog = [
      "Hard filters: dedupe by title+URL, drop empty title/link records, keep snippets only.",
      "Relevance = portfolio exposure + entity matches + source confidence.",
      "Importance = recency + regulatory weight + market-context boost.",
      "Composition: cap newsletter to 15 total ranked items and 4 items per section.",
      "Compliance: Moneycontrol remains phase-2 and is skipped unless legal usage is verified.",
    ];

    const [finnhub, google, sebi] = await Promise.all([
      ingestFinnhub(portfolio, runDate, apiKey),
      ingestGoogleNews(portfolio),
      ingestSebi(),
    ]);
    const moneycontrol = ingestMoneycontrolPlaceholder();

    const sourceRuns = [finnhub.sourceRun, google.sourceRun, sebi.sourceRun, moneycontrol.sourceRun];
    const rawItems = dedupeRawItems([
      ...finnhub.items,
      ...google.items,
      ...sebi.items,
      ...moneycontrol.items,
    ]);
    const normalizedEvents = filterRankedEvents(normalizeItems(rawItems, portfolio));
    const newsletter = buildNewsletter(normalizedEvents);
    const evaluation = evaluateRun(normalizedEvents, sourceRuns);

    const response: NewsletterResponse = {
      runDate,
      fetchedAt: new Date().toISOString(),
      portfolio,
      sourceRuns,
      rawCount: rawItems.length,
      normalizedCount: normalizedEvents.length,
      items: normalizedEvents,
      newsletter,
      evaluation,
      ruleLog,
    };

    try {
      const portfolioId = await ensurePortfolio(admin, userId, portfolio);
      await persistRun(admin, portfolioId, runDate, response, rawItems);
    } catch (persistError) {
      console.error("persist failed:", persistError);
    }

    return jsonResponse(response);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
