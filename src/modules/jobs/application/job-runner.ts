import type { JobKind } from "../infrastructure/job.model";
import type { JobEventSink, JobHandler, JobRepository } from "./types";

export class JobExecutionError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    message: string,
  ) {
    super(message);
  }
}

const silentEvents: JobEventSink = { emit: () => undefined };

export class JobRunner {
  constructor(
    private readonly repository: JobRepository,
    private readonly handlers: Partial<Record<JobKind, JobHandler>>,
    private readonly options: {
      baseRetryMs?: number;
      clock?: () => Date;
      events?: JobEventSink;
      leaseMs?: number;
      maxRetryMs?: number;
    } = {},
  ) {}

  async runNext(): Promise<boolean> {
    const kinds = Object.keys(this.handlers) as JobKind[];
    if (kinds.length === 0) return false;

    const clock = this.options.clock ?? (() => new Date());
    const leaseMs = this.options.leaseMs ?? 60_000;
    const events = this.options.events ?? silentEvents;
    const job = await this.repository.claimNext({ kinds, leaseMs, now: clock() });
    if (!job) return false;

    events.emit({ attempts: job.attempts, jobId: job.id, kind: job.kind, name: "claimed" });
    const handler = this.handlers[job.kind];
    if (!handler) return false;

    try {
      let lastProgress = 0;
      await handler(job, {
        reportProgress: async (progress, statusCode) => {
          const normalized = Math.max(lastProgress, Math.min(99, Math.floor(progress)));
          const safeCode = /^[A-Z][A-Z0-9_]{1,79}$/u.test(statusCode)
            ? statusCode
            : "PROCESSING";
          const updated = await this.repository.reportProgress(
            job,
            normalized,
            safeCode,
            clock(),
            leaseMs,
          );
          if (!updated) {
            throw new JobExecutionError("LEASE_LOST", true, "Worker lease expired.");
          }
          lastProgress = normalized;
        },
      });

      const completed = await this.repository.complete(job, clock());
      events.emit({
        attempts: job.attempts,
        jobId: job.id,
        kind: job.kind,
        name: completed ? "completed" : "lease_lost",
      });
      return true;
    } catch (cause) {
      const failure = cause instanceof JobExecutionError
        ? cause
        : new JobExecutionError(
            "INTERNAL_JOB_ERROR",
            true,
            "The background task failed temporarily.",
          );
      const safeError = {
        code: /^[A-Z][A-Z0-9_]{1,79}$/u.test(failure.code)
          ? failure.code
          : "INTERNAL_JOB_ERROR",
        message: failure.message.slice(0, 500),
      };
      const shouldRetry = failure.retryable && job.attempts < job.maxAttempts;

      if (shouldRetry) {
        const base = this.options.baseRetryMs ?? 5_000;
        const cap = this.options.maxRetryMs ?? 15 * 60_000;
        const delay = Math.min(cap, base * 2 ** Math.max(0, job.attempts - 1));
        const nextAttemptAt = new Date(clock().getTime() + delay);
        const updated = await this.repository.retry(job, safeError, nextAttemptAt);
        events.emit({
          attempts: job.attempts,
          code: safeError.code,
          jobId: job.id,
          kind: job.kind,
          name: updated ? "retry_scheduled" : "lease_lost",
        });
      } else {
        const updated = await this.repository.deadLetter(job, safeError, clock());
        events.emit({
          attempts: job.attempts,
          code: safeError.code,
          jobId: job.id,
          kind: job.kind,
          name: updated ? "dead_lettered" : "lease_lost",
        });
      }
      return true;
    }
  }
}