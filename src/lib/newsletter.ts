import type { EventType } from "@/types/newsletter";

export function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function relativeHours(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.max(1, Math.round(diff / 36e5));

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}

export function eventTypeLabel(type: EventType): string {
  switch (type) {
    case "portfolio_update":
      return "Portfolio update";
    case "fund_update":
      return "MF update";
    case "regulatory_update":
      return "Regulatory watch";
    case "market_context":
      return "Market context";
    default:
      return type;
  }
}

export function scoreTone(score: number): string {
  if (score >= 80) {
    return "critical";
  }

  if (score >= 65) {
    return "strong";
  }

  if (score >= 50) {
    return "moderate";
  }

  return "low";
}
