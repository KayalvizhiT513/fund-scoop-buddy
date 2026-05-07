export type SourceKey = "finnhub" | "google_rss" | "sebi" | "moneycontrol";
export type SourceType = "api" | "rss" | "web";
export type HoldingKind = "stock" | "mutual_fund";
export type EventType =
  | "portfolio_update"
  | "fund_update"
  | "regulatory_update"
  | "market_context";

export interface PortfolioHolding {
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

export interface PortfolioInput {
  userId: string;
  runDate?: string;
  holdings: PortfolioHolding[];
}

export interface SourceRun {
  source: SourceKey;
  label: string;
  type: SourceType;
  status: "ok" | "degraded" | "skipped" | "error";
  fetched: number;
  accepted: number;
  notes: string[];
}

export interface NormalizedEvent {
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

export interface NewsletterSection {
  key: string;
  title: string;
  description: string;
  items: NormalizedEvent[];
}

export interface EvaluationSummary {
  grounding: number;
  relevance: number;
  usefulness: number;
  style: number;
  compliance: number;
  notes: string[];
}

export interface NewsletterResponse {
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
