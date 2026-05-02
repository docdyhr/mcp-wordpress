import { google } from "googleapis";
import type { SERPPositionData, KeywordSuggestion } from "../../../types/seo.js";

type SearchAnalyticsRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

export class SearchConsoleProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private webmasters: any;
  private verifiedSites: string[] | null = null;

  constructor(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
    // Injected in tests to avoid real Google API calls
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webmastersClient?: any,
  ) {
    if (webmastersClient) {
      this.webmasters = webmastersClient;
    } else {
      const auth = new google.auth.OAuth2(clientId, clientSecret);
      auth.setCredentials({ refresh_token: refreshToken });
      this.webmasters = google.webmasters({ version: "v3", auth });
    }
  }

  private dateRange(): { startDate: string; endDate: string } {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 28);
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    return { startDate: fmt(start), endDate: fmt(end) };
  }

  /**
   * Resolves the exact Search Console property URL for a given site URL.
   * Search Console properties may be registered as http while the WordPress
   * site runs on https — this matches by hostname regardless of scheme.
   */
  async resolvePropertyUrl(siteUrl: string): Promise<string> {
    if (!this.verifiedSites) {
      const res = await this.webmasters.sites.list();
      this.verifiedSites = (res.data.siteEntry ?? []).map((s: { siteUrl?: string }) => s.siteUrl ?? "");
    }

    const hostname = new URL(siteUrl).hostname;
    const match = (this.verifiedSites ?? []).find((s) => {
      try {
        return new URL(s).hostname === hostname;
      } catch {
        return false;
      }
    });

    // Fall back to the original URL if no match found
    return match ?? siteUrl;
  }

  /**
   * Fetches real SERP positions for each keyword from Google Search Console.
   * Uses the last 28 days of data.
   */
  async getPositions(siteUrl: string, keywords: string[]): Promise<SERPPositionData[]> {
    const { startDate, endDate } = this.dateRange();
    const resolvedUrl = await this.resolvePropertyUrl(siteUrl);
    const results: SERPPositionData[] = [];

    for (const keyword of keywords) {
      try {
        const response = await this.webmasters.searchanalytics.query({
          siteUrl: resolvedUrl,
          requestBody: {
            startDate,
            endDate,
            dimensions: ["query"],
            dimensionFilterGroups: [
              {
                filters: [{ dimension: "QUERY", operator: "CONTAINS", expression: keyword }],
              },
            ],
            rowLimit: 1,
          },
        });

        const row: SearchAnalyticsRow | undefined = response.data.rows?.[0];

        results.push({
          keyword,
          estimatedPosition: row?.position != null ? Math.round(row.position) : null,
          matchingPosts: [],
          contentScore: 0,
          checkedAt: new Date().toISOString(),
          clicks: row?.clicks ?? 0,
          impressions: row?.impressions ?? 0,
          ctr: row?.ctr ?? 0,
        });
      } catch {
        results.push({
          keyword,
          estimatedPosition: null,
          matchingPosts: [],
          contentScore: 0,
          checkedAt: new Date().toISOString(),
          clicks: 0,
          impressions: 0,
          ctr: 0,
        });
      }
    }

    return results;
  }

  /**
   * Returns top queries from Search Console that contain the seed keyword,
   * sorted by impressions descending, mapped to KeywordSuggestion format.
   */
  async getTopQueries(siteUrl: string, seedKeyword: string, limit = 25): Promise<KeywordSuggestion[]> {
    const { startDate, endDate } = this.dateRange();
    const resolvedUrl = await this.resolvePropertyUrl(siteUrl);

    try {
      const response = await this.webmasters.searchanalytics.query({
        siteUrl: resolvedUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ["query"],
          dimensionFilterGroups: [
            {
              filters: [{ dimension: "QUERY", operator: "CONTAINS", expression: seedKeyword }],
            },
          ],
          rowLimit: limit,
        },
      });

      const rows: SearchAnalyticsRow[] = response.data.rows ?? [];

      // Sort by impressions descending (API doesn't guarantee order)
      rows.sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0));

      return rows.map((row) => {
        const query = row.keys?.[0] ?? seedKeyword;
        const impressions = row.impressions ?? 0;
        const position = row.position ?? 50;
        const isSeed = query === seedKeyword;

        return {
          keyword: query,
          type: isSeed ? "seed" : "related",
          estimatedVolume: impressions,
          // High position (rank 1-10) = high difficulty; lower ranks = lower difficulty
          difficulty: Math.min(100, Math.max(0, Math.round(100 - (position / 100) * 100))),
          relevance: isSeed ? 100 : 80,
          existingCoverage: row.clicks ?? 0,
        } satisfies KeywordSuggestion;
      });
    } catch {
      return [];
    }
  }
}
