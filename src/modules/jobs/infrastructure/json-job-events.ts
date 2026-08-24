import { sendOperationalAlert } from "@/lib/alerts";
import type { JobEventSink } from "../application/types";

export class JsonJobEventSink implements JobEventSink {
  emit(event: Parameters<JobEventSink["emit"]>[0]) {
    process.stdout.write(JSON.stringify({
      level: event.name === "dead_lettered" ? "error" : "info",
      metric: "job_event",
      scope: "job_runner",
      ...event,
    }) + String.fromCharCode(10));
    if (event.name === "dead_lettered") {
      void sendOperationalAlert({
        event: "job_dead_lettered",
        fields: {
          attempts: event.attempts,
          code: event.code,
          jobId: event.jobId,
          kind: event.kind,
        },
      });
    }
  }
}