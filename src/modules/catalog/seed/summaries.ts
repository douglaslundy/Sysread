import rawCatalog from "./summary-catalog.json";

export interface SeedChapter {
  title: string;
  text: string;
}

export interface SeedSummary {
  author: string;
  category: string;
  chapters: SeedChapter[];
  palette: [string, string, string];
  publishedAt: string;
  slug: string;
  title: string;
}

export const SUMMARY_PROVENANCE =
  "public_domain_source_original_readcoach_summary" as const;

export const summaryCatalog = rawCatalog as SeedSummary[];