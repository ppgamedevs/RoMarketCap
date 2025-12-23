/**
 * Plausible Analytics API integration
 * Fetches traffic data for marketing dashboard
 */

const PLAUSIBLE_API_URL = "https://plausible.io/api/v1";

export type PlausibleStats = {
  organicTraffic: {
    current: number;
    previous: number;
    delta: number;
    deltaPercent: number;
  };
  brandSearchTraffic: {
    current: number;
    previous: number;
    delta: number;
    deltaPercent: number;
  };
};

/**
 * Fetch stats from Plausible API
 * Requires PLAUSIBLE_API_KEY env var
 */
export async function fetchPlausibleStats(
  siteId: string,
  period: "7d" | "30d" = "7d",
): Promise<PlausibleStats | null> {
  const apiKey = process.env.PLAUSIBLE_API_KEY;
  if (!apiKey) {
    console.warn("[marketing] PLAUSIBLE_API_KEY not configured, skipping Plausible stats");
    return null;
  }

  try {
    const now = new Date();
    const periodDays = period === "7d" ? 7 : 30;
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Fetch current period
    const currentUrl = new URL(`${PLAUSIBLE_API_URL}/stats/aggregate`);
    currentUrl.searchParams.set("site_id", siteId);
    currentUrl.searchParams.set("period", "custom");
    currentUrl.searchParams.set("date", `${startDate.toISOString().split("T")[0]},${now.toISOString().split("T")[0]}`);
    currentUrl.searchParams.set("metrics", "visitors,pageviews");

    const currentRes = await fetch(currentUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!currentRes.ok) {
      console.error(`[marketing] Plausible API error: ${currentRes.status}`);
      return null;
    }

    const currentData = await currentRes.json();

    // Fetch previous period
    const previousUrl = new URL(`${PLAUSIBLE_API_URL}/stats/aggregate`);
    previousUrl.searchParams.set("site_id", siteId);
    previousUrl.searchParams.set("period", "custom");
    previousUrl.searchParams.set(
      "date",
      `${previousStartDate.toISOString().split("T")[0]},${startDate.toISOString().split("T")[0]}`,
    );
    previousUrl.searchParams.set("metrics", "visitors,pageviews");

    const previousRes = await fetch(previousUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!previousRes.ok) {
      console.error(`[marketing] Plausible API error: ${previousRes.status}`);
      return null;
    }

    const previousData = await previousRes.json();

    const currentVisitors = currentData.results?.visitors?.value ?? 0;
    const previousVisitors = previousData.results?.visitors?.value ?? 0;
    const delta = currentVisitors - previousVisitors;
    const deltaPercent = previousVisitors > 0 ? (delta / previousVisitors) * 100 : currentVisitors > 0 ? 100 : 0;

    // Fetch brand search traffic (filter by referrer containing "romarketcap" or direct)
    // Note: This is simplified - in production would use Plausible's breakdown API
    const brandSearchCurrent = 0; // Placeholder - would need breakdown by referrer
    const brandSearchPrevious = 0;

    return {
      organicTraffic: {
        current: currentVisitors,
        previous: previousVisitors,
        delta,
        deltaPercent,
      },
      brandSearchTraffic: {
        current: brandSearchCurrent,
        previous: brandSearchPrevious,
        delta: brandSearchCurrent - brandSearchPrevious,
        deltaPercent:
          brandSearchPrevious > 0
            ? ((brandSearchCurrent - brandSearchPrevious) / brandSearchPrevious) * 100
            : brandSearchCurrent > 0
              ? 100
              : 0,
      },
    };
  } catch (error) {
    console.error("[marketing] Error fetching Plausible stats:", error);
    return null;
  }
}

