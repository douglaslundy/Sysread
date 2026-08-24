import type { JobKind, JobState } from "../infrastructure/job.model";

export interface ClaimedJob {
  attempts: number;
  id: string;
  kind: JobKind;
  lockToken: string;
  maxAttempts: number;
  ownerId: string;
  subjectId: string;
}

export interface JobView {
  attempts: number;
  completedAt?: string;
  createdAt: string;
  deadLetteredAt?: string;
  error?: { code: string; message: string };
  id: string;
  kind: JobKind;
  maxAttempts: number;
  progress: number;
  state: JobState;
  statusCode: string;
  updatedAt: string;
}

export interface JobRepository {
  claimNext(input: { kinds: JobKind[]; leaseMs: number; now: Date }): Promise<ClaimedJob | null>;
  complete(job: ClaimedJob, now: Date): Promise<boolean>;
  deadLetter(job: ClaimedJob, error: { code: string; message: string }, now: Date): Promise<boolean>;
  findOwned(jobId: string, ownerId: string): Promise<JobView | null>;
  reportProgress(job: ClaimedJob, progress: number, statusCode: string, now: Date, leaseMs: number): Promise<boolean>;
  retry(job: ClaimedJob, error: { code: string; message: string }, nextAttemptAt: Date): Promise<boolean>;
}

export type JobHandler = (
  job: ClaimedJob,
  context: { reportProgress(progress: number, statusCode: string): Promise<void> },
) => Promise<void>;

export interface JobEventSink {
  emit(event: {
    attempts: number;
    code?: string;
    jobId: string;
    kind: JobKind;
    name: "claimed" | "completed" | "retry_scheduled" | "dead_lettered" | "lease_lost";
  }): void;
}