export type SummaryRequestRecord = {
  authorRequested: string;
  id: string;
  status: "pending" | "in_production" | "published" | "rejected";
  titleRequested: string;
  userId: string;
};

export type CreateSummaryRequest = {
  authorNormalized: string;
  authorRequested: string;
  titleNormalized: string;
  titleRequested: string;
  userId: string;
};

export interface SummaryRequestRepository {
  create(input: CreateSummaryRequest): Promise<SummaryRequestRecord>;
  findDuplicate(input: CreateSummaryRequest): Promise<SummaryRequestRecord | null>;
}

export class DuplicateSummaryRequestError extends Error {
  readonly code = "SUMMARY_ALREADY_REQUESTED";
  readonly status = 409;

  constructor(public readonly existing: SummaryRequestRecord) {
    super("This summary has already been requested.");
    this.name = "DuplicateSummaryRequestError";
  }
}

export class SummaryRequestService {
  constructor(private readonly repository: SummaryRequestRepository) {}

  async create(input: {
    author: string;
    title: string;
    userId: string;
  }): Promise<SummaryRequestRecord> {
    const normalized: CreateSummaryRequest = {
      authorNormalized: normalizeBookField(input.author),
      authorRequested: input.author.trim(),
      titleNormalized: normalizeBookField(input.title),
      titleRequested: input.title.trim(),
      userId: input.userId,
    };
    const duplicate = await this.repository.findDuplicate(normalized);
    if (duplicate) throw new DuplicateSummaryRequestError(duplicate);
    return this.repository.create(normalized);
  }
}

export function normalizeBookField(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}