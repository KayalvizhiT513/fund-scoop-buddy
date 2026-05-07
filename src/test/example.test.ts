import { describe, expect, it } from "vitest";
import { eventTypeLabel, relativeHours, scoreTone } from "@/lib/newsletter";

describe("newsletter helpers", () => {
  it("maps event types to readable labels", () => {
    expect(eventTypeLabel("regulatory_update")).toBe("Regulatory watch");
  });

  it("maps score ranges to tones", () => {
    expect(scoreTone(84)).toBe("critical");
    expect(scoreTone(67)).toBe("strong");
    expect(scoreTone(51)).toBe("moderate");
    expect(scoreTone(21)).toBe("low");
  });

  it("returns a relative time label", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(relativeHours(twoHoursAgo)).toContain("ago");
  });
});
