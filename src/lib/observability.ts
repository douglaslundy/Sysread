import { randomUUID } from "node:crypto";
import { sanitizeAlertFields, sendOperationalAlert, type AlertFields } from "./alerts";

export function correlationId(request?: Request) {
  const supplied = request?.headers.get("x-correlation-id");
  return supplied && /^[a-zA-Z0-9_-]{8,80}$/u.test(supplied) ? supplied : randomUUID();
}

export function logEvent(input: {
  correlationId?: string;
  event: string;
  fields?: AlertFields;
  level?: "error" | "info" | "warn";
}) {
  const fields = sanitizeAlertFields(input.fields);
  const level = input.level ?? "info";
  process.stdout.write(JSON.stringify({
    correlationId: input.correlationId,
    event: input.event,
    level,
    scope: "readcoach",
    timestamp: new Date().toISOString(),
    ...fields,
  }) + String.fromCharCode(10));
  if (level === "error") {
    void sendOperationalAlert({
      correlationId: input.correlationId,
      event: input.event,
      fields,
    });
  }
}